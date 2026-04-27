# n8n-nodes-ledgermem

[n8n](https://n8n.io) community nodes for [LedgerMem](https://proofly.dev) — long-term memory for AI agents.

## Install

In your n8n instance:

1. Open **Settings → Community Nodes**.
2. Click **Install** and enter `n8n-nodes-ledgermem`.
3. Agree to the risks of community nodes and confirm.
4. Restart workflows; the LedgerMem nodes appear in the node palette.

For self-hosted Docker:

```bash
N8N_COMMUNITY_PACKAGES=n8n-nodes-ledgermem docker compose up -d
```

## Credentials

Add a credential of type **LedgerMem API** with:

| Field         | Notes                                            |
| ------------- | ------------------------------------------------ |
| API Key       | Sent as `Authorization: Bearer <key>`            |
| Workspace ID  | Sent as `x-workspace-id`                         |
| Base URL      | Defaults to `https://api.proofly.dev`            |

n8n's credential test calls `POST /v1/search` with `{query: "test", limit: 1}`.

## Nodes

| Node                       | Purpose                                                      |
| -------------------------- | ------------------------------------------------------------ |
| **LedgerMem**              | Action node with operations: Add, Search, Update, Delete, List. |
| **LedgerMem Trigger**      | Polling trigger — fires on new memories, dedupes by `createdAt`. |
| **LedgerMem Augmented LLM**| Bonus node: searches memory then calls OpenAI with retrieved context. |

## Develop locally

```bash
npm install
npm run build
# link to your local n8n install
npm link
cd ~/.n8n/custom && npm link n8n-nodes-ledgermem
n8n start
```

## Tests

```bash
npm test
```

Tests use `vitest` with mocked `IExecuteFunctions` — no live API calls.

## Publish

```bash
npm version patch
npm publish --access public
```

## License

MIT — see `LICENSE`.
