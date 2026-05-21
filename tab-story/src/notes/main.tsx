import React from "react";
import { createRoot } from "react-dom/client";
import { NotesApp } from "./App";
import "../sidepanel/styles/global.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <NotesApp />
  </React.StrictMode>
);