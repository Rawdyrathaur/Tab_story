import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import type { StickyNote } from "../db";
import {
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const COLORS = [
  { label: "Yellow", value: "#fef08a", text: "#1a1a1a" },
  { label: "Purple", value: "#e9d5ff", text: "#1a1a1a" },
  { label: "Blue",   value: "#bfdbfe", text: "#1a1a1a" },
  { label: "Green",  value: "#bbf7d0", text: "#1a1a1a" },
  { label: "Pink",   value: "#fecdd3", text: "#1a1a1a" },
  { label: "Dark",   value: "#27272a", text: "#f4f4f5" },
];

function NoteCard({ note, onEdit }: { note: StickyNote; onEdit: (n: StickyNote) => void }) {
  const color = COLORS.find(c => c.value === note.color) || COLORS[0];
  return (
    <div
      onClick={() => onEdit(note)}
      style={{
        background: note.color,
        borderRadius: "12px",
        padding: "12px",
        cursor: "pointer",
        minHeight: "100px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        position: "relative",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 16px rgba(0,0,0,0.2)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = "none";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
      }}
    >
      {note.title && (
        <div style={{ fontSize: "12px", fontWeight: 700, color: color.text, lineHeight: 1.3 }}>
          {note.title}
        </div>
      )}
      <div style={{
        fontSize: "11.5px", color: color.text, opacity: 0.8,
        lineHeight: 1.5, flex: 1,
        overflow: "hidden", display: "-webkit-box",
        WebkitLineClamp: 5, WebkitBoxOrient: "vertical",
      }}>
        {note.body || <span style={{ opacity: 0.4 }}>Empty note</span>}
      </div>
      <div style={{ fontSize: "10px", color: color.text, opacity: 0.45, marginTop: "4px" }}>
        {new Date(note.updatedAt).toLocaleDateString("en-GB")}
      </div>

      {/* Delete button */}
      <button
        onClick={async e => { e.stopPropagation(); await db.stickyNotes.delete(note.id!); }}
        style={{
          position: "absolute", top: "8px", right: "8px",
          background: "rgba(0,0,0,0.12)", border: "none",
          borderRadius: "6px", width: "22px", height: "22px",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: color.text, opacity: 0,
          transition: "opacity 0.15s ease",
        }}
        className="note-delete-btn"
      >
        <TrashIcon style={{ width: "12px", height: "12px" }} />
      </button>
    </div>
  );
}

function NoteEditor({ note, onClose }: { note: StickyNote | null; onClose: () => void }) {
  const isNew = !note?.id;
  const [title, setTitle] = useState(note?.title || "");
  const [body, setBody] = useState(note?.body || "");
  const [color, setColor] = useState(note?.color || COLORS[0].value);

  const save = async () => {
    if (!title.trim() && !body.trim()) { onClose(); return; }
    const now = Date.now();
    if (isNew) {
      await db.stickyNotes.add({ title, body, color, createdAt: now, updatedAt: now });
    } else {
      await db.stickyNotes.update(note!.id!, { title, body, color, updatedAt: now });
    }
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.5)",
      backdropFilter: "blur(4px)",
      zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: color,
        borderRadius: "16px",
        padding: "16px",
        width: "270px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        display: "flex", flexDirection: "column", gap: "10px",
      }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: "6px" }}>
            {COLORS.map(c => (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                style={{
                  width: "16px", height: "16px", borderRadius: "50%",
                  background: c.value, border: color === c.value ? "2px solid #000" : "2px solid transparent",
                  cursor: "pointer", padding: 0,
                }}
              />
            ))}
          </div>
          <button onClick={save} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#1a1a1a" }}>
            <XMarkIcon style={{ width: "18px", height: "18px" }} />
          </button>
        </div>

        {/* Title */}
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Title..."
          style={{
            background: "transparent", border: "none", outline: "none",
            fontSize: "14px", fontWeight: 700, color: "#1a1a1a",
            width: "100%",
          }}
        />

        {/* Body */}
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Write your note..."
          style={{
            background: "transparent", border: "none", outline: "none",
            fontSize: "13px", color: "#1a1a1a", resize: "none",
            minHeight: "120px", lineHeight: "1.6", fontFamily: "inherit",
            width: "100%",
          }}
        />

        {/* Save */}
        <button
          onClick={save}
          style={{
            background: "rgba(0,0,0,0.15)", border: "none", borderRadius: "8px",
            padding: "8px", fontSize: "12px", fontWeight: 600,
            color: "#1a1a1a", cursor: "pointer",
          }}
        >
          Save Note
        </button>
      </div>
    </div>
  );
}

export function StickyNotes() {
  const notes = useLiveQuery(() => db.stickyNotes.orderBy("updatedAt").reverse().toArray());
  const [editing, setEditing] = useState<StickyNote | null | "new">(null);

  return (
    <div style={{ padding: "16px", height: "100%", overflowY: "auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-color)" }}>Sticky Notes</span>
        <button
          onClick={() => setEditing("new")}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "rgba(120,120,200,0.15)", border: "none",
            borderRadius: "8px", padding: "6px 10px",
            color: "var(--text-color)", fontSize: "12px", cursor: "pointer",
          }}
        >
          <PlusIcon style={{ width: "14px", height: "14px" }} />
          New Note
        </button>
      </div>

      {/* Empty state */}
      {notes?.length === 0 && (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", height: "50vh", gap: "8px",
          color: "var(--placeholder-color)", fontSize: "13px",
        }}>
          <span style={{ fontSize: "32px" }}>🗒️</span>
          <span style={{ fontWeight: 500 }}>No sticky notes yet</span>
          <span style={{ fontSize: "11px", opacity: 0.6 }}>Click New Note to start</span>
        </div>
      )}

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
        {notes?.map(note => (
          <NoteCard key={note.id} note={note} onEdit={n => setEditing(n)} />
        ))}
      </div>

      {/* Editor modal */}
      {editing !== null && (
        <NoteEditor
          note={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}