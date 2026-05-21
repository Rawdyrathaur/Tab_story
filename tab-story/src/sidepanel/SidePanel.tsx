export function SidePanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 10,
          }}
        />
      )}

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "100%",
          width: "220px",
          zIndex: 20,
          borderRight: "1px solid rgba(90,90,95,0.4)",
          background: "var(--bg-color)",
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s ease",
          display: "flex",
          flexDirection: "column",
          padding: "16px 12px",
          gap: "6px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <span style={{ fontWeight: 600, fontSize: "14px" }}>Menu</span>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--icon-color)", fontSize: "18px", lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Menu Items */}
        <MenuItem icon="🗂️" label="File Manager" />
        <MenuItem icon="⚙️" label="Settings" />
        <MenuItem icon="🏷️" label="Tags" />
        <MenuItem icon="📁" label="Folders" />
        <MenuItem icon="📌" label="Pinned Tabs" />
      </div>
    </>
  );
}

function MenuItem({ icon, label }: { icon: string; label: string }) {
  return (
    <button
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "9px 12px",
        borderRadius: "8px",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        fontSize: "13.5px",
        color: "var(--text-color)",
        width: "100%",
        textAlign: "left",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(120,120,130,0.15)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}