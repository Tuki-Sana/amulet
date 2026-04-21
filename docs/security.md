# Amulet — Security Reference

## Modes

### Locked Mode (default)

The vault entry can only be decrypted on the machine that sealed it. The hardware ID is mixed into the KDF input:

```
KDF input = Argon2id(passphrase ‖ 0x00 ‖ machine_id, salt)
```

| OS | Machine ID source |
|----|------------------|
| Linux | `/etc/machine-id` (fallback: `/var/lib/dbus/machine-id`) |
| macOS | `IOPlatformUUID` via `ioreg` |
| Windows | `HKLM\SOFTWARE\Microsoft\Cryptography\MachineGuid` via `reg query` |

**Stability:** survives reboots, not OS reinstalls (Linux) or logic board swaps (macOS).

### Portable Mode (`--portable` on seal)

machine_id is not mixed into the KDF — the passphrase alone is sufficient to decrypt, on any machine.

```
KDF input = Argon2id(passphrase, salt)
```

- `flags` bit 0 in the vault entry header is set to 1.
- `unseal` auto-detects the mode from that flag — no `--portable` flag is accepted on unseal.
- A warning is printed to stderr at seal time because security is reduced.

Use Portable mode for CI runners, containers, and cross-machine migration. See [deployment.md](deployment.md) for a decision table.

---

## Vault file format

A vault file is a flat sequence of entries. There is no global file header; an empty file is a valid empty vault.

**Outer entry envelope** (repeated for each stored key):

```
[2 byte big-endian]  key name length
[key name length]    key name (plaintext)
[4 byte big-endian]  blob length
[blob length]        encrypted blob
```

**Per-entry encrypted blob:**

```
[1 byte]  version  = 0x01
[1 byte]  flags    (bit 0 = portable mode)
[16 byte] Argon2id salt  (CSPRNG random, per seal)
[12 byte] ChaCha20-Poly1305 nonce (CSPRNG random, per seal)
[4 byte]  ciphertext length (big-endian u32)
[N byte]  ciphertext + 16-byte Poly1305 authentication tag
```

Key names are stored in plaintext in the outer envelope. Only the secret **value** is encrypted.

---

## Crypto spec

| Item | Spec |
|------|------|
| KDF | Argon2id (m=64 MiB, t=3, p=1) |
| Encryption | ChaCha20-Poly1305 (AEAD) |
| Key length | 256 bit (32 bytes) |
| Salt | 16-byte CSPRNG, generated per `seal`, stored in vault entry |
| Nonce | 12-byte CSPRNG, generated per `seal`, stored in vault entry, never reused |
| AAD | version byte — format change detection |

---

## Security design principles

| Principle | Implementation |
|-----------|----------------|
| No `.env` policy | No plaintext writes to disk |
| Silent failure | Any decryption error → no stderr output, exit code 1 |
| No leakage | Logs and error messages never contain secrets, machine_id, or key material |
| Immediate erasure | `secureZero` applied to all secret buffers before free |
| Stdin only | Secret values are never accepted via argv or environment variables |
| Symlink protection | Vault opened with `O_NOFOLLOW` on POSIX |
| File permissions | Vault created with mode `0600` on Unix |

---

## Threat model

| Threat | Mitigation |
|--------|-----------|
| AI agent reads env vars or repo files | No `.env` — secrets only in vault file |
| Process list / argv sniffing | Secret read from stdin, not argv |
| Vault copied to another machine | Argon2id binds to machine_id in Locked Mode |
| Weak passphrase | Argon2id with 64 MiB memory cost |
| Cold-boot / memory dump | `secureZero` after use; minimal heap exposure |
| Log injection / exfiltration | No logging of secret material; silent failure |
| Symlink attack on vault file | `O_NOFOLLOW` on open |
| Nonce reuse | Fresh CSPRNG nonce per `seal` call |

**Scope:** Amulet reduces **accidental** exposure in everyday developer workflows. If the OS is already compromised or malware controls your terminal, no CLI tool provides full protection.
