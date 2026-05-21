export function MenuButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: "5px",
        width: "36px",
        height: "36px",
        borderRadius: "10px",
        border: "1px solid rgba(90,90,95,0.5)",
        background: "transparent",
        cursor: "pointer",
        flexShrink: 0,
        padding: "8px",
      }}
    >
      <span style={{ width: "16px", height: "1.5px", background: "var(--icon-color)", borderRadius: "2px", display: "block" }} />
      <span style={{ width: "11px", height: "1.5px", background: "var(--icon-color)", borderRadius: "2px", display: "block", alignSelf: "flex-start" }} />
      <span style={{ width: "14px", height: "1.5px", background: "var(--icon-color)", borderRadius: "2px", display: "block" }} />
    </button>
  );
}