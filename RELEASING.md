# Releasing Amulet

Checklist for tagging a version so [`.github/workflows/release.yml`](.github/workflows/release.yml) builds binaries and publishes a GitHub Release.

## Before you tag

1. Merge what you intend to ship to `main` (or your default branch).
2. Confirm CI is green, or locally:

   ```sh
   zig build test
   zig build -Doptimize=ReleaseSafe
   ```

3. Pick the next version (semver). List existing tags: `git tag -l 'v*' | sort -V`. Bump **patch** for doc-only or small fixes, **minor** for user-visible additions, **major** if you intentionally break compatibility.

## Tag rules (required)

- The tag name **must** match `v*` (e.g. `v0.1.4`). The release workflow only runs on `push` of tags matching that pattern.
- `amulet version` embeds **exactly the tag string** passed at build time; CI uses `github.ref_name` (the tag), so keep tags consistent with what you want users to see.

## Create and push the tag

Annotated tag (recommended):

```sh
git checkout main
git pull
git tag -a v0.1.4 -m "Release v0.1.4"
git push origin v0.1.4
```

Lightweight tag is also valid:

```sh
git tag v0.1.4
git push origin v0.1.4
```

After `git push origin <tag>`, wait for the **Release** workflow on GitHub Actions. It must finish successfully.

## What the workflow does

- Installs **Zig 0.13.0** (same as CI in [`.github/workflows/ci.yml`](.github/workflows/ci.yml)).
- Builds **ReleaseSafe**, **stripped**, per target, with  
  `-Dversion=<tag>` (e.g. `-Dversion=v0.1.4`).
- Uploads artifacts and creates a GitHub Release with **auto-generated release notes** (`softprops/action-gh-release`).

### Artifact filenames

| Artifact | Target |
|----------|--------|
| `amulet-linux-x86_64` | `x86_64-linux-musl` |
| `amulet-macos-aarch64` | `aarch64-macos` |
| `amulet-macos-x86_64` | `x86_64-macos` |
| `amulet-windows-x86_64.exe` | `x86_64-windows` |

## If the release workflow fails

- Re-run failed jobs after fixing the default branch; **delete the bad tag** only if no release should exist:  
  `git push origin :refs/tags/v0.1.4` then fix and re-tag (avoid reusing the same tag name after a published release unless you know the implications).
- For reproducibility questions, treat **CI’s Zig 0.13.0** as the reference for official binaries.

## Changelog

There is no checked-in `CHANGELOG.md`; GitHub’s generated release notes are the default. Add manual release notes on GitHub if you need a short user-facing summary.

---

Japanese maintainer notes: [RELEASING-ja.md](RELEASING-ja.md).
