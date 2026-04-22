# Amulet — 環境別運用・移行・Docker Compose

## Locked vs Portable 判断表

| 環境 | 推奨モード | 運用・設計上の注意 |
|------|-----------|-------------------|
| 物理マシン / 固定 VM | **Locked** | 脅威モデル: vault ファイルだけが別ホストへ流出した場合の不正復号を防止。すでにそのマシンにシェルを取られている場合は machine_id も読み取り可能なため、ホスト自体のセキュリティと併用すること。 |
| VM クローン / テンプレート | **Locked** | **ID 一意化が必須:** 各インスタンス展開後に machine-id を再生成すること（例: `systemd-machine-id-setup`）。ID が重複すると、あるインスタンスで sealed した vault を同一 ID を持つ別インスタンスで復号できてしまい、意図した環境分離が機能しない。 |
| Windows（Sysprep） | **Locked** | 再一般化で `MachineGuid` が変わる。ゴールデンイメージに sealed vault を焼き込まず、展開後に各ノードで seal すること。変更後は既存の vault が復号不能になるため、下記の移行手順を事前に準備しておく。 |
| 開発者の個人 PC | **Locked**（各自） | 各開発者が自分のマシンで seal する。 |
| CI（GitHub Actions 等） | **Portable** | ランナーが毎回変わり machine_id が安定しない。CI のシークレットストアから十分な長さのランダムパスフレーズを注入すること。 |
| コンテナ / Kubernetes | **Portable** | Pod の machine_id が安定しない・共有されることが多い。パスフレーズの強度とシークレット注入経路の安全性が主な防御線となる。 |
| 移行・検証用途 | **Portable** | 別マシンでの復号が意図的に必要な場合。 |

> **OS 再インストール・ハードウェア交換時の注意:** machine_id が変わると Locked vault は復号不能になります（Linux: OS 再インストール、macOS: マザーボード交換）。runbook に復旧手順を記載してください。

**チームでの基本パターン:**
- 本番ホスト: サーバ上で seal・unseal（Locked）
- CI・ステージング: CI プラットフォームのシークレット注入か、強いパスフレーズを使った Portable vault
- Locked vault はマシン間で共有しない — 各環境が自前で seal する

### 運用詳細

#### Locked の脅威モデル

Locked は KDF 入力を OS が公開するマシン識別子（Linux: `/etc/machine-id`、macOS: `IOPlatformUUID`、Windows: レジストリの `MachineGuid`）にバインドします。vault ファイルだけが攻撃者の手に渡った場合（machine_id が異なる）、認証付き復号が成立せずシークレットは取り出せません（Argon2id へのブルートフォースを前提としなければ破れない）。ただし、攻撃者がすでに同一ホスト上でシェルを持っている場合は machine_id もプロセスメモリや環境変数も読み取れます — ホスト自体のセキュリティ保護が引き続き必要です。

#### VM クローンと machine-id の一意性

Amulet は machine_id 文字列が一致するホストを「同一マシン」と見なします。Linux では VM イメージをクローンした後に ID を再初期化せず使い続けるケースが頻繁に発生します。その結果:

- **ID 重複:** インスタンス A で sealed した vault を、同じ machine_id を持つインスタンス B でも復号できてしまう。開発環境の vault が本番環境で復号できる、といった意図しない共有が無音で発生する。
- **Seal 後に ID が変わった場合:** seal 時点の machine_id と異なるホストでは永続的に復号不能になる（既存の「OS 再インストール」と同型の問題）。

**推奨:** テンプレートベースの Linux 展開では、ゴールデンイメージで machine-id を空にしておく（`> /etc/machine-id`）ことで、初回起動時に `systemd-machine-id-setup` が自動実行され、seal 前に各インスタンスが固有の ID を持つようになる。

#### CI/CD での Portable モードの利用

GitHub Actions・GitLab CI・Buildkite 等の短命な環境では machine_id が実行ごとに変わる。Portable モードを使い、パスフレーズを CI シークレットから注入すること。machine バインドがない分、パスフレーズが唯一の暗号的防御線となるため、CSPRNG 由来の 32 文字以上のランダム文字列を推奨する。

---

## 移行・複数端末・障害時の注意

### vault ファイルのコピーは「復号できるバックアップ」ではない

| バックアップの種類 | 内容 | machine_id が異なるホストで復旧できるか |
|------------------|------|----------------|
| vault ファイルのコピー | 暗号化済みバイナリ | ❌ Locked: machine_id が異なるホストでは復号不可 |
| 旧マシンで unseal した平文 | 秘密情報の生データ | ✅ 新マシンで re-seal できる |
| Portable vault のコピー | 暗号化済みバイナリ | ✅ パスフレーズさえあれば復号可 |

> **注:** machine_id が同一の VM クローン間では Locked vault を復号できます。[docs/security-ja.md](security-ja.md) の「VM クローンについて」を参照してください。

### 計画的なマシン移行

旧マシンが生きている間に次の手順を踏んでください:

```sh
# 旧マシンで unseal して平文を取り出す
printf "mypassphrase\n" | amulet unseal SECRET_KEY --file secrets.vault

# 新マシンで re-seal（Locked なら新マシンの machine_id にバインドされる）
echo -n "<取り出した値>" | amulet seal SECRET_KEY --file secrets.vault
```

### 突然の故障

旧マシンが起動しなくなった場合、Locked vault は**復号できません**。事前の対策が必要です:
- 秘密情報をパスワードマネージャー等にも保管しておく
- または Portable vault を別途作成してオフラインバックアップとして保管する

### 複数端末での開発

同じ Locked vault を複数端末で共有することはできません。以下のいずれかを選んでください:
- **端末ごとに別 vault** — 各端末で seal する（Locked のまま独立）
- **Portable vault を共有** — パスフレーズを安全に共有し、全端末で同じ vault を使う
- **開発だけ Portable、本番は Locked** — 環境で使い分ける

---

## Docker Compose / Podman Compose との連携

vault を Compose ベースのワークフローに統合するには、**一時ファイル経由**が最も安定した方法です。

### 手順

**1. 一時ファイルを作成して終了時削除を登録:**

```sh
TMP_ENV=$(mktemp)
chmod 0600 "$TMP_ENV"
trap "rm -f '$TMP_ENV'" EXIT
```

> **任意の改善 ― ディスクへの書き込みを減らす（Linux）:** `/dev/shm` が存在する場合（多くのディストリビューションで tmpfs）は `mktemp -p /dev/shm` が有力な選択肢です。デスクトップのログインセッションなど `$XDG_RUNTIME_DIR` が設定されている環境では `mktemp -p "$XDG_RUNTIME_DIR"` もよく使われるパターンです。ただし `:-/tmp` のフォールバックは付けないでください — `/tmp` が tmpfs とは限らず効果がなくなります。いずれもベストエフォートであり、スワップやストレージの構成によっては完全な保証はできません。macOS には `/dev/shm` がないため、macOS では通常の `mktemp` で構いません。

**2. `KEY=value` の1行を書く。** 2 コマンドに分けるのを推奨します — 一部の zsh では同じリダイレクト内にまとめると `unseal` の出力がファイルに乗らないことがあります:

```sh
printf 'OPENAI_API_KEY=' > "$TMP_ENV"
printf "mypassphrase\n" | amulet unseal OPENAI_API_KEY --file secrets.vault >> "$TMP_ENV"
```

bash ではサブシェル1行でも通ることが多い:

```sh
( printf 'OPENAI_API_KEY='; printf "mypassphrase\n" | amulet unseal OPENAI_API_KEY --file secrets.vault ) > "$TMP_ENV"
```

`wc -c "$TMP_ENV"` が `OPENAI_API_KEY=` の文字数だけなら `unseal` が追記されていません — パスフレーズ・キー名・`--file`・Locked のマシン不一致を確認してください。

**3. Compose を実行:**

```sh
docker compose --env-file "$TMP_ENV" config   # 設定確認（ドライラン）
docker compose --env-file "$TMP_ENV" up

# Podman
podman compose --env-file "$TMP_ENV" up
```

**4. 片付け:**

```sh
docker compose down
rm -f "$TMP_ENV"    # または trap を設定したシェルを exit する
```

`--env-file` なしで `compose down` すると `OPENAI_API_KEY` が未設定だと警告することがありますが、削除処理自体には通常影響しません。

### macOS での Podman

`podman compose` が接続できないときは Linux VM が停止しています。`podman machine start`（初回のみ `podman machine init`）を実行してください。

### compose.yaml の `$` エスケープ

Compose は YAML 内の `$VAR` / `${VAR}` を補間します。`command:` ブロックなどではコンテナシェル向けに `$$` と書いてリテラルの `$` にします（例: `$$OPENAI_API_KEY`）。`${#変数名}` のような bash 専用構文は Compose 的に不正な補間になりやすいため避けてください。

> **注意:** 一時ファイルはディスクに短時間平文が出ます。`trap` による削除を必ず設定し、開発用ブリッジとして扱ってください。本番では CI のシークレット注入（GitHub Actions secrets 等）を使用してください。
