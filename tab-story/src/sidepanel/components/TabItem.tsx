import { useState } from "react";
import type { Tab } from "../types";
import { EllipsisVerticalIcon } from "@heroicons/react/24/outline";

interface Props {
  tab: Tab;
  onMenu: (tab: Tab) => void;
}

export function TabItem({ tab, onMenu }: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: "10px",
        padding: "8px 10px", borderRadius: "8px", cursor: "pointer",
        background: hovered ? "rgba(120,120,130,0.1)" : "transparent",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={tab.favicon || `https://www.google.com/s2/favicons?domain=${tab.domain}`}
        alt=""
        style={{ width: "16px", height: "16px", flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "13px", color: "var(--text-color)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {tab.title}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "3px" }}>
          <span style={{ fontSize: "11px", color: "var(--placeholder-color)" }}>{tab.domain}</span>
          {tab.tags.map((tag: string) => (
            <span key={tag} style={{ fontSize: "10px", color: "var(--placeholder-color)", background: "rgba(120,120,130,0.15)", borderRadius: "4px", padding: "1px 6px" }}>
              #{tag}
            </span>
          ))}
          <span style={{ fontSize: "11px", color: "var(--placeholder-color)", marginLeft: "auto" }}>
            {new Date(tab.savedAt).toLocaleDateString("en-GB")}
          </span>
        </div>
      </div>

      <button
        onClick={e => { e.stopPropagation(); onMenu(tab); }}
        style={{
          background: "transparent", border: "none", cursor: "pointer",
          color: "var(--icon-color)", padding: "4px", borderRadius: "6px",
          opacity: hovered ? 1 : 0, transition: "opacity 0.15s ease",
          display: "flex", alignItems: "center",
        }}
      >
        <EllipsisVerticalIcon style={{ width: "16px", height: "16px" }} />
      </button>
    </div>
  );
}