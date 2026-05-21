import { useState, useEffect, useRef } from "react";
import { db } from "../../sidepanel/db";
import type { SavedTab } from "../../sidepanel/db";
import { Toolbar } from "./Toolbar";

const STICKY_COLORS = [
  "#fef08a", "#86efac", "#93c5fd", "#f9a8d4",
  "#fdba74", "#c4b5fd", "#6ee7b7", "#fca5a5",
];

interface StickyNote {
  id: string;
  content: string;
  color: string;
  x: number;
  y: number;
}

export function NoteEditor({ tab }: { tab: SavedTab }) {
  const [notes, setNotes]     = useState<string>(tab.notes ?? "");
  const [stickies, setStickies] = useState<StickyNote[]>([]);
  const [saved, setSaved]     = useState(false);
  const editorRef             = useRef<HTMLDivElement>(null);
  const playgroundRef         = useRef<HTMLDivElement>(null);

  // Load stickies from localStorage keyed by tabId
  useEffect(() => {
    const raw = localStorage.getItem(`stickies_${tab.id}`);
    if (raw) setStickies(JSON.parse(raw));
  }, [tab.id]);

  function saveStickies(next: StickyNote[]) {
    setStickies(next);
    localStorage.setItem(`stickies_${tab.id}`, JSON.stringify(next));
  }

  async function saveNotes() {
    await db.tabs.update(tab.id!, { notes });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function addSticky() {
    const color = STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)];
    const newSticky: StickyNote = {
      id: crypto.randomUUID(),
      content: "",
      color,
      x: 40 + Math.random() * 200,
      y: 40 + Math.random() * 200,
    };
    saveStickies([...stickies, newSticky]);
  }

  function updateSticky(id: string, content: string) {
    saveStickies(stickies.map(s => s.id === id ? { ...s, content } : s));
  }

  function deleteSticky(id: string) {
    saveStickies(stickies.filter(s => s.id !== id));
  }

  function execCmd(cmd: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
  }

  async function lookupWord() {
    const sel = window.getSelection()?.toString().trim();
    if (!sel) return;
    const res  = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${sel}`);
    const data = await res.json();
    const def  = data[0]?.meanings[0]?.definitions[0]?.definition;
    if (def) alert(`📖 ${sel}\n\n${def}`);
    else alert(`No definition found for "${sel}"`);
  }

  function dragSticky(e: React.MouseEvent, id: string) {
    const startX = e.clientX;
    const startY = e.clientY;
    const sticky = stickies.find(s => s.id === id)!;
    const origX  = sticky.x;
    const origY  = sticky.y;

    function onMove(ev: MouseEvent) {
      saveStickies(stickies.map(s => s.id === id
        ? { ...s, x: origX + ev.clientX - startX, y: origY + ev.clientY - startY }
        : s
      ));
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* Toolbar */}
      <Toolbar
        onBold={() => execCmd("bold")}
        onItalic={() => execCmd("italic")}
        onUnderline={() => execCmd("underline")}
        onH1={() => execCmd("formatBlock", "h1")}
        onH2={() => execCmd("formatBlock", "h2")}
        onUL={() => execCmd("insertUnorderedList")}
        onOL={() => execCmd("insertOrderedList")}
        onHighlight={() => execCmd("hiliteColor", "#fef08a")}
        onAddSticky={addSticky}
        onLookup={lookupWord}
        onSave={saveNotes}
        saved={saved}
      />

      {/* Playground */}
      <div ref={playgroundRef} style={{
        flex: 1, position: "relative", overflow: "auto",
        padding: "20px",
      }}>

        {/* Rich text editor */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={e => setNotes((e.target as HTMLDivElement).innerHTML)}
          dangerouslySetInnerHTML={{ __html: notes }}
          style={{
            minHeight: "200px", outline: "none",
            fontSize: "14px", lineHeight: "1.7",
            color: "#e8e8ec",
          }}
        />

        {/* Sticky notes */}
        {stickies.map(sticky => (
          <div
            key={sticky.id}
            style={{
              position: "absolute",
              left: sticky.x, top: sticky.y,
              width: "180px", minHeight: "120px",
              background: sticky.color,
              borderRadius: "8px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
              padding: "8px",
              display: "flex", flexDirection: "column",
              zIndex: 10,
            }}
          >
            {/* Sticky header — drag handle */}
            <div
              onMouseDown={e => dragSticky(e, sticky.id)}
              style={{
                cursor: "grab", marginBottom: "6px",
                display: "flex", justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "11px", opacity: 0.5, fontWeight: 600 }}>
                ✦ note
              </span>
              <button
                onClick={() => deleteSticky(sticky.id)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: "13px", opacity: 0.5, padding: 0, lineHeight: 1,
                }}
              >✕</button>
            </div>

            {/* Sticky content */}
            <textarea
              value={sticky.content}
              onChange={e => updateSticky(sticky.id, e.target.value)}
              placeholder="Write a note..."
              style={{
                flex: 1, background: "transparent", border: "none",
                outline: "none", resize: "none",
                fontSize: "12px", color: "#1a1a1f",
                fontFamily: "inherit", lineHeight: "1.5",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}