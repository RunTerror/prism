# Prism dev server

The chat backend for trying the clients. It sends the AI's reply to the phone **as it is written**.

```
node server/server.mjs        # from the repo root → http://localhost:8787
```

```
phone ──POST /chat──▶ server ──▶ claude -p (Haiku, prompt.md as system prompt)
      ◀── events ───         ◀── text, token by token
```

Events the phone gets, in order:

| event | when | phone shows |
|---|---|---|
| `text` | normal words arrive | adds them to the message |
| `block_start` | a ```` ```prism ```` block begins | "Building screen…" box |
| `block` | the block ends; the server compiled it | the live widget (envelope) |
| `done` | reply finished | time and cost |

`GET /library` returns the part library (`{ "version", "code" }`, read fresh from
`core/library/prism-library.js`). Apps pass the code to `Prism.library`; when it's newer than the
copy inside the SDK, new parts and design fixes show without an app update.

Two modes (the switch at the top of the Chat tab):

- **Replay**: streams a saved reply from `core/test/ai-replies`. Free, offline, always the same.
- **Claude**: the real model through your Claude Code login. About 10 s per reply.

Try it without a phone:

```
curl -N -X POST localhost:8787/chat -d '{"mode":"replay"}'
curl -N -X POST localhost:8787/chat -d '{"message":"Make a counter"}'
```

iOS: the **Chat** tab in `sdk/demos/ios`. Test: `ChatUITests` (skipped when the server is off).
