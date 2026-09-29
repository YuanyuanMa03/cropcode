import React from "react";
import { palette } from "./app-model.js";

export function EmptyTranscriptLogo(_props: { animated?: boolean } = {}): React.ReactElement {
  return React.createElement("box", {
    style: { alignItems: "center", flexDirection: "column", flexGrow: 1, justifyContent: "center", minHeight: 3, width: "100%" },
  }, React.createElement("text", { style: { fg: palette.accent } }, "CropCode"),
  React.createElement("text", { style: { fg: palette.muted } }, "作物模型科研工作台"));
}
