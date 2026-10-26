# Prism POC

One format for AI-written UI, drawn natively everywhere.

| Doc | What it covers |
|---|---|
| `../ARCHITECTURE.md` | How it all fits together, which AI model, and the build plan |
| `../FORMAT.md` | The format at each step: what the AI writes, the envelope, the screen tree |
| `../DESIGN-SYSTEM.md` | The catalog: parts, values, tokens, and how props are checked |
| `core/CLIENTS.md` | The contract for drawers: bridge, tree, tokens, how to draw each block |
| `core/COMPILER-PLAN.md` | Compiler fixes (done and to do), and how `Chart` and `Image` were added |
| `core/eval/README.md` | The AI test: run requests through a model and score the replies |

There are only **two drawers**: React for web/desktop, and Valdi for mobile. Every mobile app framework uses the same Valdi drawer through a thin wrapper.

| Folder | What it is |
|---|---|
| `core/` | Catalog, example blocks, compiler, runtime, tests, AI test (`eval/`). `npm run build` writes `dist/`: runtime, examples, `tokens.json`, `tokens.css`, `prompt.md` |
| `web/` | React drawer: gallery + Playground (paste real LLM output) |
| `electron/` | Wraps the web app in a locked desktop window |
| `sdk/` | **The mobile SDK (Valdi)**: native drawing on iOS + Android, Swift/Kotlin/Flutter wrappers, host demo apps. See `sdk/README.md` |

Flutter: plugin in `sdk/flutter`, demo in `sdk/demos/flutter`. Not built yet: React Native wrapper.

## Start here

```sh
cd core && npm install && npm test && npm run build   # tests, then examples + tokens + AI instructions into core/dist
cd ../web && npm install && npm run dev               # gallery + playground
```

Each folder has its own README with run and test commands.

## Add a new example

Write `core/examples/09-something.prism` and run `npm run build` in `core`. Web picks it up directly; for the mobile demos, rebuild the SDK.

## Test the AI

See `core/eval/README.md`: give an agent `core/dist/prompt.md` and the requests, then run `node scripts/eval.mjs eval/runs/*.md` in `core`.
