# Amulet — マスタープラン
ハードウェア紐付きゼロトレース秘密情報管理システム

> **注（実装との関係、2026）:** 本書は設計・経緯の記録です。**ソースと矛盾する場合はコードと [README_JA](README_JA.md) を正とします。**「未実装」と明記した項目は計画したが見送ったものです。

---

## ビジョン

Amulet は、秘密情報を seal したホストの OS が報告するマシン識別子に暗号化バインドする CLI ツールです。
平文の秘密情報はディスクに一切書き込まれません。`.env` ファイルも不要です。
AI エージェントやサブプロセスへの漏洩経路を構造的に排除します。
machine_id 違い・パスフレーズ違い・バイナリ改ざん時の復号は、すべてサイレントに失敗します。

---

## マイルストーン

### M1 — 環境調査（フェーズ2） ✅

暗号コードに着手する前に、各対象 OS での OS マシン識別子の取得を検証します。

| OS      | 取得元                              | コマンド / API                                                        |
|---------|-------------------------------------|-----------------------------------------------------------------------|
| Linux   | `/etc/machine-id`                   | `std.fs.File.readAll`                                                 |
| macOS   | IOPlatformUUID（IOKit レジストリ）  | `ioreg -rd1 -c IOPlatformExpertDevice` をシェルアウトして取得         |
| Windows | `HKLM\SOFTWARE\Microsoft\Cryptography\MachineGuid` | `reg query` シェルアウトで取得                         |

成果物: 両プラットフォームでトリム済み UUID を表示し、取得不可なら非ゼロ終了する単体プログラム `probe_id.zig`

---

### M2 — 暗号コア（フェーズ3a） ✅

ファイル: `src/crypto.zig`

**鍵導出（KDF）**
- アルゴリズム: **Argon2id**（メモリハード、サイドチャネル耐性あり）
- Locked Mode の入力: `passphrase ‖ 0x00 ‖ machine_id` + vault ヘッダの 16 バイトランダムソルト
- Portable Mode の入力: `passphrase` のみ + 同じ 16 バイトランダムソルト（machine_id は混入しない）
- ソルト: 常に CSPRNG による 16 バイト乱数。`seal` 時に生成し vault ヘッダに保存。両モード共通。
- パラメータ（初期値、調整可能）:
  - `m_cost`: 65536 KiB（64 MiB）
  - `t_cost`: 3 回
  - `parallelism`: 1
- 出力: 32 バイト導出鍵

**暗号化**
- アルゴリズム: **ChaCha20-Poly1305** のみ（全プラットフォームで定数時間、ハードウェア依存なし）。*AES-256-GCM をコンパイル時代替にする案は **未実装** です。*
- Nonce: `std.crypto.random` による 12 バイト乱数
- AAD: vault フォーマットのバージョンバイト（将来の互換性のため）

**ディスク上の vault ファイル**（`src/main.zig`）: **エントリの連続**。ファイル全体の先頭にグローバルヘッダはない。空の 0 バイトファイルが空の vault として有効。

```
[2 byte big-endian]  キー名長
[キー名長 byte]      キー名（平文インデックス）
[4 byte big-endian]  blob 長
[blob 長 byte]       暗号化済み blob 1 個分（下記レイアウト）
```

**各エントリの暗号化 blob**（`src/crypto.zig` — blob 内部のバイナリ固定レイアウト）

```
[1 byte]  version = 0x01
[1 byte]  flags   (bit 0 = portable mode)
[16 byte] Argon2id ソルト
[12 byte] ChaCha20-Poly1305 nonce
[4 byte]  暗号文長（big-endian u32）
[N byte]  暗号文（N は直前の 4 バイトフィールドの値）
[16 byte] Poly1305 認証タグ
```

**メモリ安全性**
- 導出鍵はスタック `[32]u8` に保持し、`defer` で最終使用直後に `secureZero`
- 中間ヒープバッファ（`kdf_input`・`ciphertext`）は `allocator.free` 前に `secureZero`

---

### M3 — CLI（フェーズ3b） ✅

ファイル: `src/main.zig`

```
amulet seal   [--portable] <key> [--file <vault>]
amulet unseal [--tty]      <key> [--file <vault>]
amulet init                      [--file <vault>]
```

**`seal`** — stdin から秘密情報を読み取り（argv 経由は不可）、暗号化して vault に追記・更新します。`--portable` を指定すると各 blob 先頭の vault ヘッダで `flags` bit 0 がセットされます。パスフレーズは `/dev/tty` からエコーオフで入力します。

**`unseal`** — 各エントリの blob 内 `flags` を読んで Locked / Portable を自動判定します。`unseal` に `--portable` は付けません（受け付けません）。復号した秘密を stdout のみに出力します。失敗時は診断なしで終了コード 1。パスフレーズは **`--tty` 指定時**は `/dev/tty` からエコーオフ（`seal` と同様）、**省略時**は stdin の第 1 行です。

**`init`** — **0 バイトの空ファイル**を新規作成します（Unix ではパーミッション 0600）。ファイル先頭に vault 全体のヘッダはありません（「空ファイル = 空の vault」）。

**stdin プロトコル**
- `seal`: パスフレーズ入力後、**stdin は EOF まで一括読み込み**（`readToEndAlloc`）。パイプで渡したバイト列がそのまま平文になります（**末尾改行を含む場合がある**）。
- `unseal`: `--tty` なしのとき、stdin の第 1 行をパスフレーズとして読みます。復号結果は stdout に出力します。

**comptime によるキー名スキーマ（`schema.zig`）** — **未実装。** 配布バイナリの `amulet` はキー名を **ランタイム** のみ解決します。将来、埋め込み用途向けの Zig ヘルパで検討してもよいが、**コア CLI の必須機能ではない**。

---

### M4 — 統合ラッパー（フェーズ4） ✅

ファイル: `wrappers/node/amulet.ts`

Node.js/TypeScript モジュールの仕様:
1. `amulet unseal <key>` を子プロセスとして spawn する
2. stdout（秘密情報）を `Buffer` に読み込む（`string` には変換しない）
3. コンシューマーコールバックに渡す
4. コールバック完了後に `Buffer` をゼロ埋め（`buf.fill(0)`）する
5. ログ出力・文字列化は一切行わない

Node.js ラッパーが生の鍵マテリアルに直接アクセスすることはなく、不透明な `Buffer` 参照のみを扱います。

---

## OS 別戦略まとめ

| 懸念事項             | Linux                                   | macOS                               | Windows                                      |
|----------------------|-----------------------------------------|-------------------------------------|----------------------------------------------|
| マシン ID 取得元     | `/etc/machine-id`（128 bit hex + 改行） | `IOPlatformUUID`（`ioreg` 経由）    | `MachineGuid`（`reg query` 経由）            |
| 可用性               | systemd ホストで保証                    | 全モダン macOS で保証               | 全 Windows バージョンで保証                  |
| 安定性               | 再起動で維持、再インストールで変わる    | 再起動で維持、ロジックボード交換で変わる | 再起動・多くのハード変更で維持、クリーンインストールやイメージ復元で変わり得る |
| フォールバック       | `/var/lib/dbus/machine-id`              | 不要                                | 不要                                         |
| Portable モード回避  | `--portable` で machine_id をスキップ   | 同左                                | 同左                                         |

---

## 非目標（スコープ外）

- ネットワーク紐付き鍵管理（TPM/HSM 統合は将来の検討事項）
- 秘密情報のローテーション自動化
- マルチユーザーによる vault 共有
