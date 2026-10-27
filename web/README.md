# Prism web client

- `npm install && npm run dev` — opens the Components page (every part, live), the chat and the Playground. The Playground compiles right in the page (`src/compile.ts` loads `core/compiler`), so it also works on the hosted site. Each example screen also has its own page, `#/example/<id>`.
- `npm run build` — type-checks and builds to `dist/` (used by the Electron app). `npm run preview` serves it, compiler included.
- Smoke test: `npx playwright install chromium`, start `npm run dev -- --port 5199`, then `npm run test:e2e` (screenshots go to `screenshots/`).
- AI code runs in a Web Worker inside a hidden `allow-scripts` iframe (`src/runtime/sandbox.ts`, `worker-entry.js`). A widget that hangs for 3 s is set aside; the others load again (`src/runtime/host.ts`). Parts are drawn by `src/Drawer.tsx` from `core/dist/tokens.css`.
- **Chat tab**: start the chat server first (`node server/server.mjs` from the repo root). The dev server forwards `/chat`, `/replies` and `/health` to it (port 8787, or `PRISM_CHAT_SERVER`). **Replay** plays saved model replies (free, offline); **Claude** sends to the real model. A widget's `ask` effect becomes the next message in Claude mode. Code: `src/Chat.tsx`, `src/chatStream.ts`. The smoke test's chat checks are skipped when the server is off.
