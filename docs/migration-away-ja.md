# Amulet の使用をやめる

このページでは、シークレットを安全にエクスポートし、プロジェクトやマシンから Amulet を取り除く手順を説明します。

> **Locked モードの注意:** Locked vault は seal したマシンでしか復号できません。シークレットをエクスポートする前にマシンを初期化したり OS を変更したりすると、シークレットは永久に復元不可能になります。必ずエクスポートを先に済ませてください。

---

## ステップ 1 — シークレットをエクスポートする

vault に保存されているキー名を一覧表示してから、1 つずつ unseal します。

```sh
amulet list --file secrets.vault
```

1 つのキーをインタラクティブに unseal する:

```sh
amulet unseal --tty MY_KEY --file secrets.vault
```

### ファイルへ一括エクスポート

以下のスクリプトは、すべてのキーを `KEY=value` 形式で平文ファイルに書き出します。生のシークレットを含むファイルなので、アクセス権を適切に制限し、移行が完了したら速やかに削除してください。

```sh
VAULT=secrets.vault
OUTPUT=exported-secrets.env

# シークレットを書き込む前にアクセス権を制限してファイルを作成
install -m 0600 /dev/null "$OUTPUT"

printf "vault のパスフレーズを入力: "
read -rs PASSPHRASE
echo

while IFS= read -r KEY; do
  VALUE=$(printf '%s\n' "$PASSPHRASE" | amulet unseal "$KEY" --file "$VAULT")
  printf '%s=%s\n' "$KEY" "$VALUE" >> "$OUTPUT"
done < <(amulet list --file "$VAULT")

echo "エクスポート完了: $OUTPUT"
```

**Windows（PowerShell）** の場合は、キーを 1 つずつ手動で unseal してください。上記のスクリプトは bash 専用です。（※ WSL 環境を使用している場合は、Linux と同じく上記の bash スクリプトが実行可能です）

---

## ステップ 2 — 移行先へ設定する

エクスポートしたシークレットをどこに移すかは、Amulet の代替手段によって異なります。

| 移行先 | 手順 |
|--------|------|
| **`.env` ファイル** | `exported-secrets.env` の `KEY=value` 行をそのままコピー。`.env` を `.gitignore` に追加する。 |
| **パスワードマネージャー**（1Password、Bitwarden 等） | シークレットごとに新しいアイテムを作成して値を貼り付ける。 |
| **CI シークレット**（GitHub Actions、GitLab CI 等） | プラットフォームのシークレット設定 UI または CLI でキーを追加する。 |
| **クラウドのシークレットマネージャー**（AWS Secrets Manager、GCP Secret Manager、HashiCorp Vault） | プロバイダーの CLI または SDK を使ってエクスポートした値からエントリを作成する。 |
| **別マシンの Amulet** | 新マシンで re-seal する（`echo -n "<値>" \| amulet seal KEY --file secrets.vault`）。[docs/deployment-ja.md](deployment-ja.md#計画的なマシン移行) を参照。 |

### コードを更新する

コードベースに `amulet unseal` の呼び出しが残っていないか確認し、新しい移行先の読み込み方法（`.env` の読み込み、SDK の呼び出し等）に置き換えます。

```sh
grep -r "amulet" .
```

---

## ステップ 3 — クリーンアップ

**vault ファイルを削除する:**

```sh
rm secrets.vault
```

vault ファイルが git にコミットされている場合は履歴からも削除します（暗号化済みとはいえ残す理由はありません）:

```sh
git rm secrets.vault
git commit -m "remove amulet vault"
```

**バイナリを削除する:**

```sh
# Linux / macOS（/usr/local/bin にインストールした場合）
sudo rm /usr/local/bin/amulet

# 場所が不明な場合:
which amulet
```

**Windows** の場合は `amulet.exe` を置いた場所から削除し、Amulet のためだけに追加したディレクトリを `PATH` からも削除してください。（※ WSL 環境にインストールした場合は、上記の Linux と同じ手順で削除してください）

**ステップ 1 で作成した平文エクスポートファイルを削除する:**

```sh
rm exported-secrets.env
```

---

## チェックリスト

- [ ] すべてのシークレットをエクスポートし、`amulet list` の出力と照合して確認した
- [ ] エクスポートした値を新しい移行先へ設定した
- [ ] コードを更新した（`amulet unseal` の呼び出しが残っていない）
- [ ] `secrets.vault` を削除した（git にコミットしている場合は履歴からも削除）
- [ ] `amulet` バイナリを削除した
- [ ] 平文エクスポートファイルを削除した
