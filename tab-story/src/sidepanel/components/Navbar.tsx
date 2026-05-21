import { useState } from "react";
import {
  ArrowsUpDownIcon, TableCellsIcon, ListBulletIcon,
} from "@heroicons/react/24/outline";
import {
  ArrowsUpDownIcon as SortSolid,
  TableCellsIcon   as GridSolid,
  ListBulletIcon   as ListSolid,
} from "@heroicons/react/24/solid";
import type { ViewMode } from "../App";

export function Navbar({
  onSearch,
  viewMode,
  onViewModeChange,
}: {
  onSearch: (q: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
}) {
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

  const iconBtn = (key: string) => ({
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "38px", height: "38px", borderRadius: "10px", border: "none",
    cursor: "pointer", flexShrink: 0 as const,
    background: hoveredBtn === key ? "rgba(180,180,180,0.15)" : "transparent",
    color: "var(--icon-color)",
    transition: "background 0.15s ease",
  });

  return (
    <nav style={{
      display: "flex", alignItems: "center", gap: "8px",
      padding: "10px 14px",
      borderBottom: "1px solid rgba(64,64,64,0.4)",
    }}>

      {/* Search */}
      <div style={{
        display: "flex", alignItems: "center", gap: "8px",
        border: "1px solid rgba(90,90,95,0.5)",
        borderRadius: "10px", padding: "8px 14px", flex: 1,
      }}>
        <svg
          style={{ width: "16px", height: "16px", flexShrink: 0, color: "var(--icon-color)" }}
          xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search..."
          onChange={e => onSearch(e.target.value)}
          style={{
            width: "100%", background: "transparent", border: "none",
            outline: "none", fontSize: "14px", color: "var(--input-color)",
          }}
        />
      </div>

      {/* Sort */}
      <button
        title="Sort"
        style={iconBtn("sort")}
        onMouseEnter={() => setHoveredBtn("sort")}
        onMouseLeave={() => setHoveredBtn(null)}
      >
        {hoveredBtn === "sort"
          ? <SortSolid        style={{ width: "21px", height: "21px" }} />
          : <ArrowsUpDownIcon style={{ width: "21px", height: "21px" }} />}
      </button>

      {/* Grid / List toggle */}
      <button
        title={viewMode === "grid" ? "List View" : "Grid View"}
        style={iconBtn("view")}
        onMouseEnter={() => setHoveredBtn("view")}
        onMouseLeave={() => setHoveredBtn(null)}
        onClick={() => onViewModeChange(viewMode === "grid" ? "list" : "grid")}
      >
        {viewMode === "grid"
          ? (hoveredBtn === "view"
              ? <GridSolid      style={{ width: "21px", height: "21px" }} />
              : <TableCellsIcon style={{ width: "21px", height: "21px" }} />)
          : (hoveredBtn === "view"
              ? <ListSolid      style={{ width: "21px", height: "21px" }} />
              : <ListBulletIcon style={{ width: "21px", height: "21px" }} />)
        }
      </button>

    </nav>
  );
}