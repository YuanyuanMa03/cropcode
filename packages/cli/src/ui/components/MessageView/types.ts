import type { SessionMessage } from "@YuanyuanMa03/cropcode-core";

export type MessageViewProps = {
  message: SessionMessage;
  collapsed?: boolean;
  width?: number;
};
export type ToolSummary = {
  name: string;
  params: string;
  ok: boolean;
  metadata: Record<string, unknown> | null;
};

export type DiffPreviewLine = {
  marker: string;
  content: string;
  kind: "added" | "removed" | "context";
};
