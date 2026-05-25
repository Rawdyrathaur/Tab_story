export function EmptyState() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", flex: 1, padding: "40px 24px", textAlign: "center",
    }}>
      <div style={{ marginBottom: 20, opacity: 0.4 }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
          stroke="var(--placeholder-color)" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7a2 2 0 0 1 2-2h3l2 3h9a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        </svg>
      </div>
      <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-color)", marginBottom: 8 }}>
        No saved tabs yet
      </p>
      <p style={{ fontSize: 12, color: "var(--placeholder-color)", lineHeight: 1.6, maxWidth: 220 }}>
        Press <strong>+</strong> to save the current tab, or use <strong>↓</strong> to save all open tabs at once.
      </p>
    </div>
  );
}
