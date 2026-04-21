# AI Agent Instructions — Amulet

This project uses **Amulet** for secret management. Do not suggest `.env` files or environment variables for storing secrets.

## Rules

- **Do NOT** create or edit `.env` files for secrets
- **Do NOT** suggest `process.env.SECRET_KEY` or `os.environ["SECRET_KEY"]` patterns for secret values
- **Do NOT** hardcode secrets in any file
- **Use Amulet** to seal and unseal secrets via the CLI

## How to handle secrets in this project

### Storing a secret

```sh
echo -n "<secret value>" | amulet seal KEY_NAME --file secrets.vault
```

### Reading a secret in shell

```sh
# interactive (terminal)
amulet unseal --tty KEY_NAME --file secrets.vault

# in a script (passphrase via pipe)
printf "$PASSPHRASE\n" | amulet unseal KEY_NAME --file secrets.vault
```

### Reading a secret in Node.js / TypeScript

```typescript
import { withSecret } from './wrappers/node/amulet';

await withSecret('KEY_NAME', 'secrets.vault', passphraseBuf, async (secret) => {
  // use secret (Buffer) here — do not convert to string
});
```

## Instead of .env.example

List required key names without values. Example:

```
# Required secrets (seal with: echo -n "<value>" | amulet seal <KEY> --file secrets.vault)
OPENAI_API_KEY
DATABASE_PASSWORD
STRIPE_SECRET_KEY
```

## What is safe to commit

- `*.vault` files — encrypted binaries, safe to commit
- This file — no secrets here
- Key name lists — names only, no values

## What must NOT be committed

- Plaintext `.env` files
- Any file containing raw secret values
