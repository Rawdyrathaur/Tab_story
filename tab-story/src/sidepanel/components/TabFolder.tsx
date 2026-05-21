import { useState } from "react";
import type { Folder, Tab } from "../types";
import { TabItem } from "./TabItem";

interface Props {
  folder: Folder;
  onMenu: (tab: Tab) => void;
}

export function TabFolder({ folder, onMenu }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <div style={{ marginBottom: "8px" }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "8px 10px", borderRadius: "8px",
          cursor: "pointer", userSelect: "none",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(120,120,130,0.12)")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        <span style={{ fontSize: "13px" }}>{open ? "▾" : "▸"}</span>
        <span style={{ fontSize: "14px" }}>📁</span>
        <span style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-color)", flex: 1 }}>
          {folder.name}
        </span>
        <span style={{ fontSize: "11px", color: "var(--placeholder-color)" }}>
          {folder.tabs.length} tab{folder.tabs.length !== 1 ? "s" : ""}
        </span>
      </div>
      {open && (
        <div style={{ paddingLeft: "16px" }}>
          {folder.tabs.map(tab => (
            <TabItem key={tab.id} tab={tab} onMenu={onMenu} />
          ))}
        </div>
      )}
    </div>
  );
}