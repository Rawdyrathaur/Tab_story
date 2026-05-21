import { useState } from "react";
import type { SavedTab } from "../db";
import { db } from "../db";
import {
  ArrowTopRightOnSquareIcon,
  BookmarkIcon,
  PencilSquareIcon,
  TagIcon,
  ClipboardDocumentIcon,
  TrashIcon,
  ChevronLeftIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { PencilSquareIcon as PencilSolid } from "@heroicons/react/24/solid";

interface Props {
  tab: SavedTab;
  onClose: () => void;
}

export function TabMenu({ tab, onClose }: Props) {
  const [view, setView] = useState<"menu" | "note">("menu");
  const [note, setNote] = useState(tab.notes || "");

  const saveNote = async () => {
    await db.tabs.update(tab.id!, { notes: note.trim() });
  };

  const actions = [
    {
      icon: ArrowTopRightOnSquareIcon,
      label: "Open URL",
      color: "var(--text-color)",
      onClick: () => { chrome.tabs.create({ url: tab.url }); onClose(); },
    },
    {
      icon: BookmarkIcon,
      label: tab.pinned ? "Unpin Tab" : "Pin Tab",
      color: "var(--text-color)",
      onClick: () => { db.tabs.update(tab.id!, { pinned: !tab.pinned }); onClose(); },
    },
    {
      icon: tab.notes ? PencilSolid : PencilSquareIcon,
      label: tab.notes ? "Edit Note" : "Add Note",
      color: tab.notes ? "#a78bfa" : "var(--text-color)",
      onClick: () => setView("note"),
    },
    {
      icon: TagIcon,
      label: "Edit Tags",
      color: "var(--text-color)",
      onClick: () => {},
    },
    {
      icon: ClipboardDocumentIcon,
      label: "Copy URL",
      color: "var(--text-color)",
      onClick: () => { navigator.clipboard.writeText(tab.url); onClose(); },
    },
    {
      icon: TrashIcon,
      label: "Delete",
      color: "#ef4444",
      onClick: () => { db.tabs.delete(tab.id!); onClose(); },
    },
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#18181b",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "14px",
          padding: "16px",
          width: "260px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          {view === "note" && (
            <button
              onClick={() => setView("menu")}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--placeholder-color)", padding: 0, display: "flex" }}
            >
              <ChevronLeftIcon style={{ width: "16px", height: "16px" }} />
            </button>
          )}
          <div style={{
            fontSize: "13px", fontWeight: 600, color: "var(--text-color)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
          }}>
            {view === "note" ? "Why did you open this tab?" : tab.title}
          </div>
        </div>

        <div style={{
          fontSize: "11px", color: "var(--placeholder-color)",
          marginBottom: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {tab.url}
        </div>

        <div style={{ height: "1px", background: "rgba(255,255,255,0.07)", marginBottom: "10px" }} />

        {/* Menu view */}
        {view === "menu" && actions.map(({ icon: Icon, label, color, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            style={{
              display: "flex", alignItems: "center", gap: "12px",
              width: "100%", padding: "9px 10px",
              background: "transparent", border: "none",
              borderRadius: "8px", cursor: "pointer",
              color, fontSize: "13px", textAlign: "left",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <Icon style={{ width: "16px", height: "16px", flexShrink: 0 }} />
            {label}
          </button>
        ))}

        {/* Note view */}
        {view === "note" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <textarea
              autoFocus
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Research for project, read later..."
              style={{
                width: "100%", minHeight: "100px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px", padding: "10px",
                color: "var(--text-color)", fontSize: "13px",
                resize: "vertical", outline: "none",
                fontFamily: "inherit", lineHeight: "1.5",
                boxSizing: "border-box",
              }}
            />
            <button
              onClick={async () => { await saveNote(); setView("menu"); }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                padding: "9px", borderRadius: "8px", border: "none",
                background: "rgba(167,139,250,0.2)", color: "#a78bfa",
                fontSize: "13px", fontWeight: 600, cursor: "pointer",
              }}
            >
              <CheckIcon style={{ width: "15px", height: "15px" }} />
              Save Note
            </button>
          </div>
        )}
      </div>
    </div>
  );
}