// Shapes from poc/core/CLIENTS.md.

export type PNode = {
  t: string;
  id: string;
  k?: string | number;
  p?: Record<string, unknown>;
  c?: (PNode | string)[];
  on?: Record<string, string>;
};

export type Effect = { type: string; value?: unknown };

export type Output = {
  tree: PNode | null;
  state: Record<string, unknown>;
  effects: Effect[];
  errors: { node: string; message: string }[];
};

export type Diagnostic = { level: string; message: string; line: number | null };

export type Envelope = {
  v: number;
  id: string;
  ok: boolean;
  code: string | null;
  text: string[];
  state: Record<string, unknown>;
  uses: string[];
  appData?: { images: Record<string, string> };
  fallback: string;
  diagnostics: Diagnostic[];
};

export type Example = { id: string; title: string; source: string; envelope: Envelope };

export type MessagePart = { type: "markdown"; text: string } | { type: "prism"; envelope: Envelope };

export type CompilePayload = { source: string; id?: string } | { message: string; id?: string };

declare global {
  interface Window {
    // Set by the Electron preload. Absent in a normal browser.
    prismHost?: { compile(payload: CompilePayload): Promise<Envelope | MessagePart[]> };
  }
}
