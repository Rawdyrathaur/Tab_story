type ToolbarProps = {
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onH1: () => void;
  onH2: () => void;
  onUL: () => void;
  onOL: () => void;
  onHighlight: () => void;
  onAddSticky: () => void;
  onLookup: () => void;
  onSave: () => void;
  saved: boolean;
};

export function Toolbar(p: ToolbarProps) {
  const btn = (onClick: () => void, label: string, title: string) => (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "7px", cursor: "pointer",
        color: "#e8e8ec", fontSize: "12px", fontWeight: 600,
        padding: "5px 10px", display: "flex", alignItems: "center",
        gap: "4px", transition: "background 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
      onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
    >
      {label}
    </button>
  );

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "4px",
      flexWrap: "wrap", padding: "8px 12px",
      borderBottom: "1px solid rgba(90,90,95,0.25)",
      background: "rgba(30,30,38,0.8)",
    }}>
      {btn(p.onBold,       "B",     "Bold")}
      {btn(p.onItalic,     "I",     "Italic")}
      {btn(p.onUnderline,  "U",     "Underline")}
      {btn(p.onH1,         "H1",    "Heading 1")}
      {btn(p.onH2,         "H2",    "Heading 2")}
      {btn(p.onUL,         "• List","Bullet List")}
      {btn(p.onOL,         "1. List","Numbered List")}
      {btn(p.onHighlight,  "🖊 Highlight", "Highlight selected text")}
      {btn(p.onAddSticky,  "✦ Sticky",    "Add sticky note")}
      {btn(p.onLookup,     "📖 Define",   "Look up selected word")}

      <div style={{ marginLeft: "auto" }}>
        {btn(p.onSave, p.saved ? "✓ Saved" : "💾 Save", "Save notes")}
      </div>
    </div>
  );
}