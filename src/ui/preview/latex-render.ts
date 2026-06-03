/**
 * LaTeX math → terminal Unicode rendering.
 *
 * Converts common LaTeX math expressions to Unicode equivalents
 * with chalk styling for terminal display. For complex equations,
 * generates standalone LaTeX → PDF → PNG via pdflatex + ImageMagick.
 */

import * as cp from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { tempPlotPath } from "./terminal-image";

// ── Unicode math symbol mapping ──────────────────────────────

const GREEK: Record<string, string> = {
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  epsilon: "ε",
  zeta: "ζ",
  eta: "η",
  theta: "θ",
  iota: "ι",
  kappa: "κ",
  lambda: "λ",
  mu: "μ",
  nu: "ν",
  xi: "ξ",
  pi: "π",
  rho: "ρ",
  sigma: "σ",
  tau: "τ",
  upsilon: "υ",
  phi: "φ",
  chi: "χ",
  psi: "ψ",
  omega: "ω",
  Alpha: "Α",
  Beta: "Β",
  Gamma: "Γ",
  Delta: "Δ",
  Epsilon: "Ε",
  Zeta: "Ζ",
  Eta: "Η",
  Theta: "Θ",
  Iota: "Ι",
  Kappa: "Κ",
  Lambda: "Λ",
  Mu: "Μ",
  Nu: "Ν",
  Xi: "Ξ",
  Pi: "Π",
  Rho: "Ρ",
  Sigma: "Σ",
  Tau: "Τ",
  Upsilon: "Υ",
  Phi: "Φ",
  Chi: "Χ",
  Psi: "Ψ",
  Omega: "Ω",
};

const MATH_SYMBOLS: Record<string, string> = {
  times: "×",
  div: "÷",
  pm: "±",
  mp: "∓",
  cdot: "·",
  bullet: "•",
  circ: "∘",
  le: "≤",
  ge: "≥",
  ne: "≠",
  approx: "≈",
  equiv: "≡",
  propto: "∝",
  sim: "∼",
  simeq: "≃",
  cong: "≅",
  infty: "∞",
  partial: "∂",
  nabla: "∇",
  int: "∫",
  oint: "∮",
  sum: "∑",
  prod: "∏",
  to: "→",
  rightarrow: "→",
  leftarrow: "←",
  Rightarrow: "⇒",
  Leftarrow: "⇐",
  leftrightarrow: "↔",
  mapsto: "↦",
  subset: "⊂",
  supset: "⊃",
  subseteq: "⊆",
  supseteq: "⊇",
  in: "∈",
  ni: "∋",
  notin: "∉",
  forall: "∀",
  exists: "∃",
  neg: "¬",
  wedge: "∧",
  vee: "∨",
  oplus: "⊕",
  otimes: "⊗",
  ldots: "…",
  cdots: "⋯",
  vdots: "⋮",
  ddots: "⋱",
  langle: "⟨",
  rangle: "⟩",
  Vert: "‖",
  parallel: "∥",
  emptyset: "∅",
  varnothing: "∅",
  aleph: "ℵ",
  hbar: "ℏ",
  ell: "ℓ",
  Re: "ℜ",
  Im: "ℑ",
  triangle: "△",
  square: "□",
  diamond: "◇",
  star: "★",
  bigstar: "★",
  clubsuit: "♣",
  spadesuit: "♠",
};

const SUPERSCRIPTS: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "+": "⁺",
  "-": "⁻",
  "=": "⁼",
  "(": "⁽",
  ")": "⁾",
  n: "ⁿ",
  i: "ⁱ",
  a: "ᵃ",
  b: "ᵇ",
  c: "ᶜ",
  T: "ᵀ",
};

const SUBSCRIPTS: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  "+": "₊",
  "-": "₋",
  "=": "₌",
  "(": "₍",
  ")": "₎",
  a: "ₐ",
  e: "ₑ",
  i: "ᵢ",
  o: "ₒ",
  u: "ᵤ",
  x: "ₓ",
  n: "ₙ",
  m: "ₘ",
  k: "ₖ",
};

const FRACTIONS: Record<string, string> = {
  "1/2": "½",
  "1/3": "⅓",
  "2/3": "⅔",
  "1/4": "¼",
  "3/4": "¾",
  "1/5": "⅕",
  "2/5": "⅖",
  "3/5": "⅗",
  "4/5": "⅘",
  "1/6": "⅙",
  "5/6": "⅚",
  "1/8": "⅛",
  "3/8": "⅜",
  "5/8": "⅝",
  "7/8": "⅞",
};

// ── LaTeX → Unicode conversion ───────────────────────────────

export function latexToUnicode(latex: string): string {
  let result = latex;

  // Remove display math delimiters
  result = result.replace(/^\$\$|\$\$$/g, "");
  result = result.replace(/^\$|\$$/g, "");

  // Fractions \frac{a}{b}
  result = result.replace(/\\frac\s*\{([^}]*)}\s*\{([^}]*)}/g, (_, num, den) => {
    const key = `${num}/${den}`;
    return FRACTIONS[key] ?? `(${num})/(${den})`;
  });

  // Greek letters — must run BEFORE superscript/subscript to avoid
  // breaking symbols like \infty (\in → \ⁱⁿ)
  result = result.replace(/\\epsilon\b/g, "ε");
  result = result.replace(/\\varphi\b/g, "φ");
  result = result.replace(/\\phi\b/g, "ϕ");
  for (const [tex, uni] of Object.entries(GREEK)) {
    result = result.replace(new RegExp(`\\\\${tex}\\b`, "g"), uni);
  }

  // Math symbols — must run BEFORE superscript/subscript
  for (const [tex, uni] of Object.entries(MATH_SYMBOLS)) {
    result = result.replace(new RegExp(`\\\\${tex}\\b`, "g"), uni);
  }

  // Superscripts ^{...} or ^x — after symbols so plain ^ is converted
  result = result.replace(/\^\{(.*?)\}/g, (_, inner) => [...inner].map((c: string) => SUPERSCRIPTS[c] ?? c).join(""));
  result = result.replace(/\^(\S)/g, (_, c: string) => SUPERSCRIPTS[c] ?? "^" + c);

  // Subscripts _{...} or _x — after symbols
  result = result.replace(/_\{(.*?)\}/g, (_, inner) => [...inner].map((c: string) => SUBSCRIPTS[c] ?? c).join(""));
  result = result.replace(/_(\S)/g, (_, c: string) => SUBSCRIPTS[c] ?? "_" + c);

  // sqrt
  result = result.replace(/\\sqrt\{(.*?)\}/g, "√($1)");

  // text{} → remove wrapper
  result = result.replace(/\\text\{(.*?)\}/g, "$1");
  // textrm{}, textbf{} → remove wrapper
  result = result.replace(/\\text(?:rm|bf|it|sf)\{(.*?)\}/g, "$1");

  // bar, hat, vec
  result = result.replace(/\\bar\{(.+?)\}/g, "$1̅");
  result = result.replace(/\\hat\{(.+?)\}/g, "$1̂");
  result = result.replace(/\\vec\{(.+?)\}/g, "$1⃗");
  result = result.replace(/\\tilde\{(.+?)\}/g, "$1̃");
  result = result.replace(/\\dot\{(.+?)\}/g, "$1̇");

  // left/right delimiters → plain braces
  result = result.replace(/\\left\s*([[{(|.])\s*/g, "$1");
  result = result.replace(/\\right\s*([\]})|.])\s*/g, "$1");

  // Clean up remaining backslash commands
  result = result.replace(/\\mathrm\{(.*?)\}/g, "$1");
  result = result.replace(/\\mathbf\{(.*?)\}/g, "$1");
  result = result.replace(/\\mathit\{(.*?)\}/g, "$1");
  result = result.replace(/\\\w+/g, ""); // Remove unknown commands

  // Clean whitespace
  result = result.replace(/\s+/g, " ").trim();

  return result;
}

// ── LaTeX → PDF → PNG rendering ──────────────────────────────

export function isLatexAvailable(): boolean {
  try {
    cp.execSync("which pdflatex", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function isImageMagickAvailable(): boolean {
  try {
    cp.execSync("which convert", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function renderLatexToPng(latexCode: string, outputPath?: string): string | null {
  if (!isLatexAvailable() || !isImageMagickAvailable()) return null;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cropcode-latex-"));
  const texPath = path.join(tmpDir, "render.tex");
  const pdfPath = path.join(tmpDir, "render.pdf");
  const pngPath = outputPath ?? tempPlotPath("latex");

  const document = String.raw`
\documentclass[border=2pt,varwidth]{standalone}
\usepackage{amsmath,amssymb,amsfonts}
\usepackage[UTF8]{ctex}
\begin{document}
${latexCode}
\end{document}
`.trim();

  try {
    fs.writeFileSync(texPath, document, "utf8");

    cp.execSync(`pdflatex -interaction=nonstopmode -output-directory="${tmpDir}" "${texPath}"`, {
      stdio: "ignore",
      timeout: 30_000,
    });

    if (fs.existsSync(pdfPath)) {
      cp.execSync(`convert -density 300 "${pdfPath}" -quality 90 -background white -flatten "${pngPath}"`, {
        stdio: "ignore",
        timeout: 15_000,
      });

      if (fs.existsSync(pngPath)) return pngPath;
    }
  } catch {
    // Rendering failed — fall through to Unicode
  } finally {
    // Cleanup temp dir
    try {
      fs.rmSync(tmpDir, { recursive: true });
    } catch {
      /* ignore */
    }
  }

  return null;
}

/** Try to render LaTeX: Unicode first, PNG if complex and tools available */
export function renderLatex(latex: string): { text: string; imagePath?: string } {
  // If there are many special commands, try PNG rendering first
  const complexCommands = latex.match(/\\begin\{|\\int|\\sum|\\prod|\\frac|\\sqrt|\\matrix|\\bmatrix|\\align/g);
  if (complexCommands && complexCommands.length > 2) {
    const png = renderLatexToPng(latex);
    if (png) return { text: latexToUnicode(latex), imagePath: png };
  }

  return { text: latexToUnicode(latex) };
}
