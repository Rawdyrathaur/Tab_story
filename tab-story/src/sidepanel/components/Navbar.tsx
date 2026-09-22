import { useI18n } from "../../i18n/useI18n";
import { useState, useRef, useEffect } from "react";
import { ArrowsUpDownIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { ArrowsUpDownIcon as SortSolid } from "@heroicons/react/24/solid";

export function Navbar({
  onSearch,
  sortOrder = "desc",
  onToggleSort,
}: {
  onSearch: (q: string) => void;
  sortOrder?: "desc" | "asc";
  onToggleSort?: () => void;
}) {

  const { t: tr } = useI18n();
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isMac = typeof navigator !== "undefined" && /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent);
  const shortcutLabel = isMac ? "⌘K" : "Ctrl K";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleClear = () => {
    setSearchValue("");
    onSearch("");
    inputRef.current?.focus();
  };

  const handleChange = (val: string) => {
    setSearchValue(val);
    onSearch(val);
  };

  const iconBtn = (key: string) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    flexShrink: 0 as const,
    background: hoveredBtn === key ? "rgba(180,180,180,0.15)" : "transparent",
    color: "var(--icon-color)",
    transition: "background 0.15s ease",
  });

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 14px",
        borderBottom: "1px solid var(--border-color)",
      }}
    >
      {/* Wider Search Bar */}
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          border: "1px solid var(--input-border)",
          borderRadius: "10px",
          padding: "7px 12px",
          flex: 1,
          minWidth: 0,
          background: "var(--input-bg)",
          cursor: "text",
        }}
      >
        <svg
          style={{ width: "16px", height: "16px", flexShrink: 0, color: "var(--icon-color)", opacity: 0.8 }}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={searchValue}
          placeholder={tr("search.placeholder")}
          onChange={(e) => handleChange(e.target.value)}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: "13px",
            color: "var(--input-color)",
          }}
        />

        {searchValue ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            title={tr("search.clear")}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--placeholder-color)",
              cursor: "pointer",
              padding: "2px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <XMarkIcon style={{ width: "14px", height: "14px" }} />
          </button>
        ) : (
          <kbd
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "10.5px",
              fontWeight: 600,
              padding: "2px 6px",
              borderRadius: "5px",
              border: "1px solid rgba(120,120,130,0.25)",
              background: "rgba(120,120,130,0.1)",
              color: "var(--placeholder-color)",
              userSelect: "none",
              fontFamily: "inherit",
              flexShrink: 0,
            }}
          >
            {shortcutLabel}
          </kbd>
        )}
      </div>

      {/* Up/Down Arrow Sort */}
      <button
        title={sortOrder === "desc" ? tr("search.newest") : tr("search.oldest")}
        style={{
          ...iconBtn("sort"),
          color: hoveredBtn === "sort" ? "var(--text-color)" : "var(--icon-color)",
        }}
        onClick={onToggleSort}
        onMouseEnter={() => setHoveredBtn("sort")}
        onMouseLeave={() => setHoveredBtn(null)}
      >
        {hoveredBtn === "sort" ? (
          <SortSolid style={{ width: "20px", height: "20px" }} />
        ) : (
          <ArrowsUpDownIcon style={{ width: "20px", height: "20px" }} />
        )}
      </button>
    </nav>
  );
}
