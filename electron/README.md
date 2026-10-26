# Prism Electron client

- `npm install && npm start` — builds `../web` if `../web/dist` is missing, then opens the app.
- After changing the web app, run `npm run build` in `../web` (or delete `../web/dist`) before `npm start`.
- The window is sandboxed (no Node); the main process compiles via IPC (`window.prismHost.compile`).
- Smoke test: `npm run smoke` (saves screenshots to `screenshots/`).
