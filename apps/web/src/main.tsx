import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Workbench } from "@cropcode/ui";
import "@cropcode/ui/styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Workbench />
  </StrictMode>
);
