# Minimal Business Integration

This is a standalone Vite app that consumes `webark-im-template` through the package entry instead of importing repo internals.

```bash
bun install
bun run typecheck
bun run build
```

It intentionally uses `createMemoryChatDataSource` so the example stays frontend-only. Real applications should replace that adapter with their own API-backed `ChatDataSource`.
