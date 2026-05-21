import { useState, useEffect } from "react";
import { NoteEditor } from "./components/NoteEditor";
import { db } from "../sidepanel/db";

export function NotesApp() {
  const params  = new URLSearchParams(window.location.search);
  const tabId   = Number(params.get("tabId"));
  const [tab, setTab] = useState<any>(null);

  useEffect(() => {
    if (tabId) db.tabs.get(tabId).then(setTab);
  }, [tabId]);

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      background: "#1a1a1f", color: "#e8e8ec",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid rgba(90,90,95,0.3)",
        display: "flex", alignItems: "center", gap: "10px",
      }}>
        <img
          src={`https://www.google.com/s2/favicons?domain=${tab?.domain}&sz=32`}
          width={18} height={18}
          style={{ borderRadius: "4px" }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#e8e8ec",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {tab?.title ?? "Notes"}
          </div>
          <div style={{ fontSize: "10px", color: "rgba(200,200,210,0.5)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {tab?.url}
          </div>
        </div>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {tab
          ? <NoteEditor tab={tab} />
          : (
            <div style={{ display: "flex", alignItems: "center",
              justifyContent: "center", height: "100%",
              color: "rgba(200,200,210,0.4)", fontSize: "13px" }}>
              No tab selected
            </div>
          )
        }
      </div>
    </div>
  );
}