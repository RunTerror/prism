// Compiling happens on the "server": the Electron main process if present, else the Vite dev server.
import type { CompilePayload, Envelope, MessagePart } from "./types";

export async function compile(payload: CompilePayload): Promise<Envelope | MessagePart[]> {
  if (window.prismHost) return window.prismHost.compile(payload);
  let res: Response;
  try {
    res = await fetch("/api/compile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("The compiler needs the dev server (npm run dev) or the Electron app.");
  }
  if (res.status === 404 || !(res.headers.get("content-type") || "").includes("json"))
    throw new Error("The compiler needs the dev server (npm run dev) or the Electron app.");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Compile failed (${res.status})`);
  return data;
}
