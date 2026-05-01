# Amulet — トラブルシューティング

## unseal が失敗時に何も出力しない理由

`unseal` はあらゆる失敗（パスフレーズ違い・キー名違い・vault パス違い・マシン不一致）に対して、
出力なし・終了コード 1 のみを返します。これは意図的な設計です。エラーメッセージを出すと、
vault ファイルを入手した攻撃者に「なぜ復号に失敗したか」の手がかりを与えてしまうためです。
詳細は [docs/security-ja.md](security-ja.md) を参照してください。

副作用として、起動スクリプトの設定ミスと「出力を生成しない正常実行」が同じに見えます。
以下の手順で秘密の値を露出させずに原因を特定できます。

---

## アプリが起動しない / サービスが繰り返し失敗する

サービスが実行されるのと**同じユーザー**で以下を手動実行してください。

### ステップ 1 — vault パスが正しいか確認する

```sh
ls -l /path/to/secrets.vault
amulet list --file /path/to/secrets.vault
```

`list` が何も出力しない、またはエラーになる場合は、パスが間違っているか
ファイルが読み取れない状態です。ラッパースクリプト内の `--file` 指定と
ファイルのパーミッション（`chmod 600`）を確認してください。

### ステップ 2 — キー名が存在するか確認する（大文字小文字も区別）

```sh
amulet list --file /path/to/secrets.vault
```

キー名はバイト単位の完全一致で照合されます。`API_KEY` と `api_key` は別のキーです。
`list` の出力とラッパースクリプト内のキー名を見比べてください。

### ステップ 3 — `verify` でパスフレーズをテストする

`verify` は復号後すぐに平文を破棄します。秘密の値を出力せずに、
パスフレーズとキーが正しいかを確認できます:

```sh
# パスフレーズファイルを使う場合
cat ~/.config/amulet/passphrase | amulet verify YOUR_KEY --file /path/to/secrets.vault
echo $?   # 0 = パスフレーズとキーが正しい；1 = 何かが間違っている
```

`verify` が 1 を返す場合、パスフレーズが違います。
対話的に入力して確認します:

```sh
amulet verify --tty YOUR_KEY --file /path/to/secrets.vault
```

### ステップ 4 — Locked モードのマシン不一致を確認する

別マシンで封印した vault をコピーしてきた場合、Locked モードでは毎回の unseal が失敗します。
`probe` でこのホストが使うマシン識別子を確認できます:

```sh
amulet probe
```

Locked vault は封印時に使われたマシン識別子を持つホストでしか復号できません。
`probe` が終了コード 2 を返す場合、マシン識別子が取得できていません —
これ自体が Locked モードの unseal 失敗の原因になります。

新しいマシンへの移行が必要な場合は [docs/deployment-ja.md](deployment-ja.md#計画的なマシン移行) の手順を参照してください。

---

## サービスの起動がタイムアウトする（シークレットが多い場合）

Amulet は `unseal` の呼び出しごとに Argon2id（64 MiB・3 パス）を実行します。
典型的な VPS では 1 回あたり約 0.5〜1 秒かかります。
全キーをループで unseal するラッパーは、15 キー以上で 10〜30 秒かかることがあり、
systemd のデフォルト `TimeoutStartSec`（90 秒）に近づく場合があります。

サービスが `start operation timed out` で失敗する場合は、ユニットに明示的なタイムアウトを追加します:

```ini
[Service]
TimeoutStartSec=120
```

シークレット数と実測の起動時間に合わせて値を調整してください。

---

## パスフレーズのローテーション — 全キーのパスフレーズを変更する

`re-seal` は 1 キーずつパスフレーズを変更します。vault 全体のパスフレーズを
ローテーションするには、各キーを順に re-seal します:

```sh
# まずキー名の一覧を確認
amulet list --file ~/.config/amulet/secrets.vault

# 各キーを re-seal（現在のパスフレーズ・新パスフレーズ・確認を対話で入力）
amulet re-seal KEY_ONE   --file ~/.config/amulet/secrets.vault
amulet re-seal KEY_TWO   --file ~/.config/amulet/secrets.vault
amulet re-seal KEY_THREE --file ~/.config/amulet/secrets.vault
```

全キーを一括変更するコマンドはありません。キーが多い場合はループで処理できます:

```sh
amulet list --file ~/.config/amulet/secrets.vault | while read -r key; do
  echo "Re-sealing: $key"
  amulet re-seal "$key" --file ~/.config/amulet/secrets.vault
done
```

イテレーションごとにパスフレーズの入力が求められます。
毎回同じ新しいパスフレーズを入力してください。

---

## 封印後に machine_id が変わった場合（OS 再インストール vs アップグレード）

| 出来事 | machine_id | Locked vault |
|--------|-----------|--------------|
| `apt upgrade` / `do-release-upgrade` | 維持される | そのまま使える |
| OS 再インストール（フォーマット → クリーンインストール） | 新しい ID が生成される | **復元不可** |
| machine-id を再初期化せず VM をクローン | ソースと同じ | クローン上でも復号可能（[deployment-ja.md](deployment-ja.md) 参照） |

インプレースのアップグレード（`do-release-upgrade`）は `/etc/machine-id` を維持します。
クリーンインストールでは新しい `machine_id` が生成され、旧 ID で封印された
Locked vault は永久に復号できなくなります。

**対策:** 元のシークレットの値をパスワードマネージャー等の別の安全な場所にも保管しておき、
再インストール後に re-seal できるようにしてください。

---

## クイックリファレンス

| 症状 | 最初に確認すること |
|------|-----------------|
| サービスがすぐ終了し、ログに手がかりがない | 同じパスフレーズファイルで `amulet verify` を実行 |
| `verify` が 1 を返す | パスフレーズ違い・キー名違い・マシン不一致のいずれか |
| `verify` が 0 なのにアプリが失敗する | vault 内のキー名とラッパースクリプトのキー名が不一致 |
| サービスの起動がタイムアウトする | ユニットに `TimeoutStartSec=120` を追加；キー数を確認 |
| 以前は動いていたがサーバー移行後に失敗する | `amulet probe` を実行；旧マシンに Locked された vault の可能性 |
| 以前は動いていたが OS 再インストール後に失敗する | Locked vault は復元不可；元の値から re-seal が必要 |
