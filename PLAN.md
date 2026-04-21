# Amulet — Master Plan
Hardware-Bound, Zero-Trace Secret Manager

> **Note (implementation truth, 2026):** This document is a design history. If anything disagrees with the source tree, **the code and [README](README.md) win**. Items marked *not implemented* were planned but deferred.

---

## Vision

Amulet is a CLI tool that encrypts secrets and binds them to a specific physical machine.
No plaintext secrets ever touch disk. No `.env` files. No leak surface for AI agents or
subprocesses. Decryption silently fails on wrong machine, wrong passphrase, or wrong binary.

---

## Milestones

### M1 — Environment Survey (Phase 2)
Verify hardware-ID retrieval on each target OS before touching crypto code.

| OS      | Source                              | Command / API                          |
|---------|-------------------------------------|----------------------------------------|
| Linux   | `/etc/machine-id`                   | `std.fs.File.readAll`                  |
| macOS   | IOPlatformUUID (IOKit registry)     | `IOServiceGetMatchingService` via syscall or shell-out to `ioreg -rd1 -c IOPlatformExpertDevice` |
| Windows | `HKLM\SOFTWARE\Microsoft\Cryptography\MachineGuid` | `reg query` shell-out |

Deliverable: standalone `probe_id.zig` that prints the trimmed UUID on both platforms and exits non-zero if unavailable.

---

### M2 — Crypto Core (Phase 3a)
File: `src/crypto.zig`

**Key Derivation**
- Algorithm: **Argon2id** (memory-hard, side-channel resistant)
- Locked Mode input: `passphrase ‖ 0x00 ‖ machine_id` + 16-byte random salt from vault header
- Portable Mode input: `passphrase` only + same 16-byte random salt from vault header (machine_id not mixed in)
- Salt: always 16-byte CSPRNG random, generated at `seal` time and stored in vault header — both modes use it
- Parameters (starting point, tunable):
  - `m_cost`: 65536 KiB (64 MiB)
  - `t_cost`: 3 iterations
  - `parallelism`: 1
- Output: 32-byte derived key

**Encryption**
- Algorithm: **ChaCha20-Poly1305** only (constant-time on all platforms, no hardware dependency). *AES-256-GCM was considered as an optional compile-time alternative but is **not implemented**.*
- Nonce: 12-byte random from `std.crypto.random`
- AAD: vault format version byte (for future-proofing)

**On-disk vault file** (`src/main.zig`): a **sequence of entries** — no global file header. An empty file is a valid empty vault.

```
[2 byte big-endian]  key name length
[key length]         key name (plaintext index)
[4 byte big-endian]  blob length
[blob length]        one encrypted blob (layout below)
```

**Per-entry encrypted blob** (`src/crypto.zig` — binary, fixed layout inside each blob)

```
[1 byte]  version = 0x01
[1 byte]  flags   (bit 0 = portable mode)
[16 byte] argon2id salt
[12 byte] ChaCha20-Poly1305 nonce
[4 byte]  ciphertext length (big-endian u32)
[N byte]  ciphertext + 16-byte Poly1305 tag
```

**Memory Safety**
- Derived key held in a stack `[32]u8`; zeroed via `secureZero` in `defer` immediately after last use
- Intermediate heap buffers (`kdf_input`, `ciphertext`) are zeroed with `secureZero` before `allocator.free`

---

### M3 — CLI (Phase 3b)
File: `src/main.zig`

```
amulet seal   [--portable] <key> [--file <vault>]
amulet unseal [--tty]      <key> [--file <vault>]
amulet init                     [--file <vault>]
```

**`seal`** — reads secret value from stdin (never argv), encrypts, appends/updates entry in vault. `--portable` sets `flags` bit 0 in vault header.

**`unseal`** — reads `flags` byte from vault header to auto-detect Locked vs Portable mode. No `--portable` flag needed (and not accepted) — the vault itself carries the mode. Decrypts and prints secret to stdout only. Exits with code 1 on any failure (no diagnostic message). `--tty` reads the passphrase from `/dev/tty` with echo off (same as `seal`); without it, passphrase is read from stdin first line.

**`init`** — creates an **empty** vault file (zero bytes, mode `0600` on Unix). There is **no** vault-wide header at the file level; “empty file = empty vault.”

**stdin protocol (`seal`)**: After the passphrase is read from `/dev/tty`, the **entire stdin stream until EOF** is read as the secret (`readToEndAlloc` in `main.zig`). Whatever bytes arrive (including a trailing newline from `echo`) become the plaintext — there is **no** `\0` delimiter in the current implementation.

**Comptime key-name schema (`schema.zig`)** — *not implemented.* The shipped `amulet` binary resolves key names at **runtime** only. A future optional Zig helper could add compile-time validation for embedded consumers; it is **not** a goal for the core CLI.

---

### M4 — Integration Wrapper (Phase 4)
File: `wrappers/node/amulet.ts`

TypeScript module that:
1. Spawns `amulet unseal <key>` as a child process
2. Reads stdout (the secret) into a `Buffer`, never a `string`
3. Passes it to the consumer callback / Promise
4. Zeroes the `Buffer` after use (`buf.fill(0)`)
5. Never logs or stringifies the value

No Node.js wrapper has access to the raw key material; it only passes opaque `Buffer` references.

---

## OS Strategy Summary

| Concern              | Linux                        | macOS                          | Windows                                   |
|----------------------|------------------------------|--------------------------------|-------------------------------------------|
| Machine ID source    | `/etc/machine-id` (128-bit hex + newline) | `IOPlatformUUID` via `ioreg`  | `MachineGuid` via `reg query`             |
| Availability         | Guaranteed on systemd hosts  | Guaranteed on all modern macOS | Guaranteed on all Windows versions        |
| Stability            | Survives reboots, not reinstalls | Survives reboots, not logic board swaps | Survives reboots, not OS reinstalls  |
| Fallback             | `/var/lib/dbus/machine-id`   | None needed                    | None needed                               |
| Portable mode bypass | `--portable` skips machine-id | Same                          | Same                                      |

---

## Non-Goals
- Network-bound key management (TPM/HSM integration is future work)
- Secret rotation automation
- Multi-user vault sharing
