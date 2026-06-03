/**
 * Terminal inline image display using iTerm2 and Kitty graphics protocols.
 *
 * Supported: iTerm2 (OSC 1337 File), Kitty (graphics protocol)
 * Fallback: prints file:// path for external viewer
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

type TerminalKind = "iterm2" | "kitty" | "none";
let _detected: TerminalKind | null = null;

function detectTerminal(): TerminalKind {
  if (_detected !== null) return _detected;
  const term = (process.env.TERM ?? "").toLowerCase();
  const termProg = (process.env.TERM_PROGRAM ?? "").toLowerCase();
  if (process.env.KITTY_WINDOW_ID) _detected = "kitty";
  else if (
    termProg.includes("iterm") ||
    termProg.includes("wezterm") ||
    term.includes("iterm") ||
    term.includes("wezterm")
  )
    _detected = "iterm2";
  else _detected = "none";
  return _detected;
}

function b64(buf: Buffer): string {
  return buf.toString("base64");
}

/** iTerm2 OSC 1337 inline image */
function iTerm2Image(buf: Buffer, opts: { width?: string; name?: string } = {}): string {
  const p: string[] = ["inline=1"];
  if (opts.width) p.push(`width=${opts.width}`);
  if (opts.name) p.push(`name=${Buffer.from(opts.name).toString("base64")}`);
  return `\x1b]1337;File=${p.join(";")}:${b64(buf)}\x07`;
}

/** Kitty graphics protocol */
function kittyImage(buf: Buffer, opts: { w?: number; h?: number } = {}): string {
  const data = b64(buf);
  const chunks: string[] = [];
  let hdr = `\x1b_Ga=T,f=100`;
  if (opts.w) hdr += `,w=${opts.w}`;
  if (opts.h) hdr += `,h=${opts.h}`;
  for (let i = 0; i < data.length; i += 4096) {
    const c = data.slice(i, i + 4096);
    const m = i + 4096 < data.length ? "1" : "0";
    chunks.push(i === 0 ? `${hdr},m=${m};${c}\x1b\\` : `\x1b_Gm=${m};${c}\x1b\\`);
  }
  return chunks.join("");
}

export type RenderImageResult = {
  ansi: string | null;
  filePath: string;
  terminal: TerminalKind;
};

export function renderImage(filePath: string, opts: { width?: string } = {}): RenderImageResult {
  const abs = path.resolve(filePath);
  const kind = detectTerminal();
  if (!fs.existsSync(abs)) return { ansi: null, filePath: abs, terminal: kind };
  const buf = fs.readFileSync(abs);
  if (kind === "iterm2")
    return { ansi: iTerm2Image(buf, { width: opts.width ?? "80%" }), filePath: abs, terminal: kind };
  if (kind === "kitty") return { ansi: kittyImage(buf), filePath: abs, terminal: kind };
  return { ansi: null, filePath: abs, terminal: kind };
}

export function tempPlotPath(prefix = "cropcode-plot"): string {
  return path.join(os.tmpdir(), `${prefix}-${Date.now()}.png`);
}
