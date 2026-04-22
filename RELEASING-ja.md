# Amulet のリリース手順

[`.github/workflows/release.yml`](.github/workflows/release.yml) がバイナリをビルドし、GitHub Release を公開するまでのチェックリストです。

## タグを打つ前に

1. 出したい変更を `main`（既定ブランチ）にマージしておく。
2. CI が緑か、少なくともローカルで次が通ることを確認する。

   ```sh
   zig build test
   zig build -Doptimize=ReleaseSafe
   ```

3. 次のバージョンを決める（セマンティックバージョニング）。既存タグの確認: `git tag -l 'v*' | sort -V`。ドキュメントや小修正のみなら **パッチ**、利用者向けの追加がまとまっているなら **マイナー**、互換を意図的に壊すなら **メジャー**。

## タグのルール（必須）

- タグ名は **`v` で始まる**こと（例: `v0.1.4`）。それ以外は release ワークフローが **動きません**。
- `amulet version` に埋め込まれる文字列はビルド時の `-Dversion=` で、CI では **タグ名そのもの**（`github.ref_name`）が使われます。ユーザーに見せたい表記とタグを揃えてください。

## タグの作成と push

注釈付きタグ（推奨）:

```sh
git checkout main
git pull
git tag -a v0.1.4 -m "Release v0.1.4"
git push origin v0.1.4
```

軽量タグでも可:

```sh
git tag v0.1.4
git push origin v0.1.4
```

`git push origin <タグ>` のあと、GitHub Actions の **Release** ワークフローが成功するまで待つ。

## ワークフローの内容

- **Zig 0.13.0** を使用（[`.github/workflows/ci.yml`](.github/workflows/ci.yml) と同じ）。
- 各ターゲットで **ReleaseSafe**・**strip** 付きビルドし、`-Dversion=<タグ>`（例: `-Dversion=v0.1.4`）を渡す。
- アーティファクトを添付し、`softprops/action-gh-release` で **リリースノート自動生成**付きの GitHub Release を作成する。

### 成果物のファイル名

| 成果物 | ターゲット |
|--------|------------|
| `amulet-linux-x86_64` | `x86_64-linux-musl` |
| `amulet-macos-aarch64` | `aarch64-macos` |
| `amulet-macos-x86_64` | `x86_64-macos` |
| `amulet-windows-x86_64.exe` | `x86_64-windows` |

## ワークフローが失敗したとき

- 既定ブランチ側を直したうえでジョブを再実行する。**誤ったタグだけ取り消す**場合:  
  `git push origin :refs/tags/v0.1.4`  
  修正後に **別名で再タグ**するのが安全です（公開済みリリースと同名タグの使い回しは注意）。
- 公式バイナリの再現性の参照は、**CI の Zig 0.13.0** を基準にするとよいです。

## CHANGELOG

リポジトリ内に `CHANGELOG.md` はありません。通常は GitHub の自動生成ノートで足ります。ユーザー向けの短い説明が必要なら、Release 画面で手動追記してください。

---

English: [RELEASING.md](RELEASING.md).
