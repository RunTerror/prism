# AI reply test

Checks how well a model writes prism blocks when it only has `dist/prompt.md`.

1. `npm run build` (makes `dist/prompt.md`).
2. Give a separate agent (any model) this task: read `dist/prompt.md`, answer the requests in `requests.md`, and write the answers to `runs/<model>-<run>.md`, separated by a line `=====ANSWER=====`.
3. `node scripts/eval.mjs eval/runs/*.md` prints each answer's result and the most common problems.

Results per answer: `clean`, `warnings` (fixed by the compiler), `runtime-errors`, `refused`, `no-block`.

Requests 21 to 30 are chat moments that should use the chat parts (Flow, Code inside Reveal, Options, Form, Plan, Confirm, Sources). Requests 15, 17 and 18 ask for things the catalog can't do yet (timers, charts, images). They show how the model copes: a good answer works around it instead of breaking.

When a run finds a real mistake pattern, fix the prompt or add an alias, then copy a clean run into `test/ai-replies/` so it stays covered.
