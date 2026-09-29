import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Workbench, SessionWorkbench } from "@cropcode/ui";
import "@cropcode/ui/styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>{new URLSearchParams(location.search).has("preview") ? <Workbench /> : <SessionWorkbench />}</StrictMode>
);
