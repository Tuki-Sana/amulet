#!/bin/bash
DOCS_DIR="/Users/tuki/develop/projects/amulet/docs"
TARGET_DIR="/Users/tuki/develop/projects/amulet/website/src/content/docs"

mkdir -p "$TARGET_DIR"

# 対象ファイルのリスト
files=(
  "getting-started.md"
  "getting-started-ja.md"
  "usage.md"
  "usage-ja.md"
  "security.md"
  "security-ja.md"
  "deployment.md"
  "deployment-ja.md"
  "troubleshooting.md"
  "troubleshooting-ja.md"
  "migration-away.md"
  "migration-away-ja.md"
  "deploy-ubuntu.md"
  "deploy-ubuntu-ja.md"
  "deploy-rootless-systemd.md"
  "deploy-rootless-systemd-ja.md"
)

for filename in "${files[@]}"; do
  src_file="$DOCS_DIR/$filename"
  if [ -f "$src_file" ]; then
    echo "Processing $filename..."
    
    # 1行目からタイトルを抽出（# を除去してトリミング）
    title=$(head -n 1 "$src_file" | sed 's/^# //')
    
    # フロントマターを付けて保存（1行目は重複するので除去）
    (
      echo "---"
      echo "title: \"$title\""
      echo "---"
      echo ""
      tail -n +2 "$src_file"
    ) > "$TARGET_DIR/$filename"
  else
    echo "Warning: $src_file not found"
  fi
done

echo "Migration complete!"
