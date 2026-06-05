import { useEffect, useRef } from "react";
import { useStdin } from "ink";

export type InputKey = {
  upArrow: boolean;
  downArrow: boolean;
  leftArrow: boolean;
  rightArrow: boolean;
  home: boolean;
  end: boolean;
  pageDown: boolean;
  pageUp: boolean;
  return: boolean;
  escape: boolean;
  ctrl: boolean;
  shift: boolean;
  tab: boolean;
  backspace: boolean;
  delete: boolean;
  meta: boolean;
  focusIn: boolean;
  focusOut: boolean;
  paste: boolean;
};

const BACKSPACE_BYTES = new Set(["", "\b"]);
const FORWARD_DELETE_SEQUENCES = new Set(["[3~", "[P"]);
const HOME_SEQUENCES = new Set(["[H", "[1~", "[7~", "OH"]);
const END_SEQUENCES = new Set(["[F", "[4~", "[8~", "OF"]);
const SHIFT_RETURN_SEQUENCES = new Set(["\r", "[13;2u", "[13;2~", "[27;2;13~"]);
const META_RETURN_SEQUENCES = new Set(["[13;3u", "[13;4u"]);
const CTRL_LEFT_SEQUENCES = new Set(["[1;5D", "[5D"]);
const CTRL_RIGHT_SEQUENCES = new Set(["[1;5C", "[5C"]);
const META_LEFT_SEQUENCES = new Set(["[1;3D", "[3D", "b"]);
const META_RIGHT_SEQUENCES = new Set(["[1;3C", "[3C", "f"]);
const TERMINAL_FOCUS_IN = "[I";
const TERMINAL_FOCUS_OUT = "[O";

const PASTE_START = "[200~";
const PASTE_END = "[201~";
const PASTE_END_LENGTH = 6;

const CTRL_MINUS_SEQUENCES = new Set(["[45;5u", "[27;5;45~"]);
const CTRL_SHIFT_MINUS_SEQUENCES = new Set(["[45;6u", "[27;6;45~"]);

const EMPTY_KEY: InputKey = {
  upArrow: false,
  downArrow: false,
  leftArrow: false,
  rightArrow: false,
  home: false,
  end: false,
  pageDown: false,
  pageUp: false,
  return: false,
  escape: false,
  ctrl: false,
  shift: false,
  tab: false,
  backspace: false,
  delete: false,
  meta: false,
  focusIn: false,
  focusOut: false,
  paste: false,
};

export function parseTerminalInput(data: Buffer | string): { input: string; key: InputKey } {
  const raw = String(data);
  let input = raw;

  if (CTRL_MINUS_SEQUENCES.has(raw)) {
    input = "-";
    return { input, key: { ...EMPTY_KEY, ctrl: true } };
  }

  if (CTRL_SHIFT_MINUS_SEQUENCES.has(raw) || raw === "") {
    input = "-";
    return { input, key: { ...EMPTY_KEY, ctrl: true, shift: true } };
  }

  const key: InputKey = {
    upArrow: raw === "[A",
    downArrow: raw === "[B",
    leftArrow: raw === "[D" || CTRL_LEFT_SEQUENCES.has(raw) || META_LEFT_SEQUENCES.has(raw),
    rightArrow: raw === "[C" || CTRL_RIGHT_SEQUENCES.has(raw) || META_RIGHT_SEQUENCES.has(raw),
    home: HOME_SEQUENCES.has(raw),
    end: END_SEQUENCES.has(raw),
    pageDown: raw === "[6~",
    pageUp: raw === "[5~",
    return: raw === "\r" || SHIFT_RETURN_SEQUENCES.has(raw) || META_RETURN_SEQUENCES.has(raw),
    escape: raw === "",
    ctrl: CTRL_LEFT_SEQUENCES.has(raw) || CTRL_RIGHT_SEQUENCES.has(raw),
    shift: SHIFT_RETURN_SEQUENCES.has(raw),
    tab: raw === "\t" || raw === "[Z",
    backspace: BACKSPACE_BYTES.has(raw),
    delete: FORWARD_DELETE_SEQUENCES.has(raw),
    meta: META_LEFT_SEQUENCES.has(raw) || META_RIGHT_SEQUENCES.has(raw) || META_RETURN_SEQUENCES.has(raw),
    focusIn: raw === TERMINAL_FOCUS_IN,
    focusOut: raw === TERMINAL_FOCUS_OUT,
    paste: false,
  };

  if (input <= "" && !key.return) {
    input = String.fromCharCode(input.charCodeAt(0) + "a".charCodeAt(0) - 1);
    key.ctrl = true;
  }

  const isKnownEscapeSequence =
    key.upArrow ||
    key.downArrow ||
    key.leftArrow ||
    key.rightArrow ||
    key.home ||
    key.end ||
    key.pageDown ||
    key.pageUp ||
    key.tab ||
    key.delete ||
    key.return ||
    key.ctrl ||
    key.meta ||
    key.focusIn ||
    key.focusOut;

  if (raw.startsWith("")) {
    input = raw.slice(1);
    key.meta = key.meta || !isKnownEscapeSequence;
  }

  const isLatinUppercase = input >= "A" && input <= "Z";
  const isCyrillicUppercase = input >= "А" && input <= "Я";
  if (input.length === 1 && (isLatinUppercase || isCyrillicUppercase)) {
    key.shift = true;
  }

  if (key.tab && input === "[Z") {
    key.shift = true;
  }

  if (key.tab || key.backspace || key.delete) {
    input = "";
  }

  return { input, key };
}

export function dispatchTerminalInput(
  data: Buffer | string,
  inputHandler: (input: string, key: InputKey) => void
): void {
  const raw = String(data);

  if (!raw.startsWith("") && raw.includes("\x7f") && raw.length > 1) {
    const parts = raw.split("\x7f");
    if (parts[0]) {
      const { input, key } = parseTerminalInput(parts[0]);
      inputHandler(input, key);
    }
    for (let i = 1; i < parts.length; i++) {
      const bs = parseTerminalInput("\x7f");
      inputHandler(bs.input, bs.key);
      if (parts[i]) {
        const { input, key } = parseTerminalInput(parts[i]);
        inputHandler(input, key);
      }
    }
    return;
  }

  const { input, key } = parseTerminalInput(data);
  inputHandler(input, key);
}

export function useTerminalInput(
  inputHandler: (input: string, key: InputKey) => void,
  options: { isActive?: boolean } = {}
): void {
  const { stdin, setRawMode } = useStdin();
  const isActive = options.isActive ?? true;
  const handlerRef = useRef(inputHandler);
  handlerRef.current = inputHandler;

  const pasteRef = useRef({ active: false, chunks: [] as string[] });

  useEffect(() => {
    if (!isActive) {
      pasteRef.current.active = false;
      pasteRef.current.chunks = [];
      return;
    }
    setRawMode(true);
    return () => {
      setRawMode(false);
    };
  }, [isActive, setRawMode]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const handleData = (data: Buffer | string) => {
      const raw = String(data);

      if (raw.includes(PASTE_START)) {
        pasteRef.current.active = true;
        pasteRef.current.chunks = [];

        const startIdx = raw.indexOf(PASTE_START);
        const afterStart = raw.slice(startIdx + PASTE_START.length);

        const endIdx = afterStart.indexOf(PASTE_END);
        if (endIdx !== -1) {
          const pasteContent = afterStart.slice(0, endIdx);
          pasteRef.current.active = false;
          const remaining = afterStart.slice(endIdx + PASTE_END_LENGTH);

          if (pasteContent.length > 0) {
            handlerRef.current(pasteContent, { ...EMPTY_KEY, paste: true });
          }
          if (remaining.length > 0) {
            dispatchTerminalInput(remaining, handlerRef.current);
          }
          return;
        }

        if (afterStart) {
          pasteRef.current.chunks.push(afterStart);
        }
        return;
      }

      if (pasteRef.current.active) {
        pasteRef.current.chunks.push(raw);
        if (raw.includes("201~")) {
          const combined = pasteRef.current.chunks.join("");
          const endIdx = combined.indexOf(PASTE_END);
          if (endIdx !== -1) {
            const pasteContent = combined.slice(0, endIdx);
            pasteRef.current.active = false;
            const remaining = combined.slice(endIdx + PASTE_END_LENGTH);
            pasteRef.current.chunks = [];

            if (pasteContent.length > 0) {
              handlerRef.current(pasteContent, { ...EMPTY_KEY, paste: true });
            }

            if (remaining.length > 0) {
              dispatchTerminalInput(remaining, handlerRef.current);
            }
            return;
          }
          return;
        }
        return;
      }

      dispatchTerminalInput(data, handlerRef.current);
    };

    stdin?.on("data", handleData);
    return () => {
      stdin?.off("data", handleData);
    };
  }, [isActive, stdin]);
}
