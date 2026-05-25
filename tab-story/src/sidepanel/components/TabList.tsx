import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import Fuse from "fuse.js";
import { db } from "../db";
import type { Folder as FolderType, SavedTab } from "../db";
import type { ViewMode } from "../App";



// ─── Upgraded Tooltip (Using React Portals) ─────────────────
function Tooltip({ title, url, children }: {
  title: string; url: string; children: ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ left: 0, top: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        left: rect.left,
        top: rect.top - 8, // 8px gap above the element
      });
    }
  }, [visible]);

  return (
    <div
      ref={containerRef}
      style={{ display: "inline-flex", alignItems: "center" }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      
      {/* Render the tooltip at the body level to escape overflow limits */}
      {visible && createPortal(
        <div style={{
          position: "fixed",
          bottom: `calc(100vh - ${coords.top}px)`,
          left: "50%",
transform: "translateX(-50%)",
          background: "var(--bg-color)",
          border: "1px solid rgba(90,90,95,0.35)",
          borderRadius: "10px", 
          padding: "9px 12px",
          minWidth: "200px", 
          maxWidth: "280px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          zIndex: 9999, 
          pointerEvents: "none",
        }}>
          <div style={{
            fontSize: "12px", fontWeight: 600,
            color: "var(--text-color)", marginBottom: "4px",
            lineHeight: "1.4",
          }}>
            {title}
          </div>
          <div style={{
            fontSize: "10.5px", color: "var(--placeholder-color)",
            wordBreak: "break-all", lineHeight: "1.4",
          }}>
            {url}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function TabFavicon({ tab, size = 20 }: { tab: SavedTab; size?: number }) {
  const [err, setErr] = useState(false);
  const googleFavicon = `https://www.google.com/s2/favicons?domain=${tab.domain}&sz=32`;
  const src = (!tab.favicon || err) ? googleFavicon : tab.favicon;
  return (
    <img
      src={src}
      width={size} height={size}
      style={{ borderRadius: "5px", flexShrink: 0, display: "block" }}
      onError={() => setErr(true)}
    />
  );
}



// ─── Tag Pill ───────────────────────────────────────────────

function TagPill({ label }: { label: string }) {
  return (
    <span style={{
      fontSize: "10px", padding: "2px 7px", borderRadius: "20px",
      background: "rgba(120,120,200,0.15)",
      border: "1px solid rgba(120,120,200,0.22)",
      color: "var(--text-color)", fontWeight: 500, flexShrink: 0,
    }}>
      {label}
    </span>
  );
}

// ─── List Row ───────────────────────────────────────────────

function TabRowList({ tab, onMenu, mode }: { tab: SavedTab; onMenu?: (tab: SavedTab) => void; mode?: "default" | "notes" }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "flex-start", gap: "9px",
        padding: "9px 14px",
        borderTop: "1px solid rgba(90,90,95,0.15)",
        background: hovered ? "rgba(120,120,130,0.09)" : "transparent",
        transition: "background 0.15s ease",
      }}
    >
      {/* Perfect Alignment Branch Arrow 
        Width is exactly 22px (same as parent icon), line drops perfectly at x=11 (center).
        It curves and points directly at the vertical center of the favicon.
      */}
      <svg 
        width="22" height="22" viewBox="0 0 22 22" 
        fill="none" stroke="var(--placeholder-color)" strokeWidth="2" 
        strokeLinecap="round" strokeLinejoin="round"
        style={{ flexShrink: 0, opacity: 0.65, marginTop: "1px" }}
      >
        {/* Drop down, curve, and horizontal line */}
        <path d="M 11 -2 V 7 A 4 4 0 0 0 15 11 H 22" />
        {/* Thicker Pointy Arrowhead */}
        <polyline points="18 7 22 11 18 15" />
      </svg>

      {/* Favicon with tooltip */}
      <Tooltip title={tab.title} url={tab.url}>
        <div style={{ marginTop: "2px" }}>
          <TabFavicon tab={tab} size={20} />
        </div>
      </Tooltip>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        
        {/* Main Row */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          
          {/* Title (Clicking this opens the URL) */}
          <Tooltip title={tab.title} url={tab.url}>
            <span
              onClick={() => chrome.tabs.create({ url: tab.url })}
              style={{
fontSize: "11px", fontWeight: 600, color: "var(--text-color)",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                maxWidth: "110px", cursor: "pointer",
              }}
            >
              {tab.title}
            </span>
          </Tooltip>

          {/* Pin (Moved next to the title so it doesn't break tree alignment!) */}
          {tab.pinned && (
            <span style={{ fontSize: "11px", flexShrink: 0, marginTop: "1px" }}>📌</span>
          )}

          {/* User-added Tags */}
          {tab.tags?.slice(0, 2).map(tag => <TagPill key={tag} label={tag} />)}

          {/* Date (Pushed to the right using marginLeft: auto) */}
          <span style={{
            fontSize: "10.5px", color: "var(--placeholder-color)", flexShrink: 0,
marginLeft: "auto",
          }}>
            {new Date(tab.createdAt).toLocaleDateString("en-GB")}
          </span>

          {/* Actions (Always visible) */}
          <div style={{
            display: "flex", gap: "4px", flexShrink: 0,
          }}>
           

            {/* "More Options" Button */}
            <button
              onClick={e => { 
                e.stopPropagation(); 
               onMenu?.(tab); 
              }}
              title="More options"
              style={{
                width: "26px", height: "26px", borderRadius: "7px", border: "none",
                background: "transparent", color: "var(--icon-color)",
                cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1.5"></circle>
                <circle cx="12" cy="5" r="1.5"></circle>
                <circle cx="12" cy="19" r="1.5"></circle>
              </svg>
            </button>
          </div>
        </div>

       {tab.notes ? (
  <Tooltip title="Note" url={tab.notes}>
    <span style={{
      fontSize: "11px", marginTop: "3px",
      display: "inline-flex", alignItems: "center", gap: "3px",
      color: "#a78bfa", cursor: "default",
    }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
      note
    </span>
  </Tooltip>
) : null}
      </div>
    </div>
  );
}
// ─── Grid Card ──────────────────────────────────────────────

function TabCardGrid({ tab, onMenu }: { tab: SavedTab; onMenu?: (tab: SavedTab) => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => chrome.tabs.create({ url: tab.url })}
      style={{
        borderRadius: "12px",
        border: "1px solid rgba(90,90,95,0.25)",
        background: hovered ? "rgba(120,120,130,0.12)" : "rgba(80,80,90,0.1)",
        padding: "12px", cursor: "pointer",
        transition: "all 0.15s ease",
        transform: hovered ? "translateY(-1px)" : "none",
        boxShadow: hovered ? "0 4px 12px rgba(0,0,0,0.12)" : "none",
        position: "relative",
        display: "flex", flexDirection: "column", gap: "8px",
      }}
    >
      {/* Top Row: Favicon, Domain (suburl), and Options */}
      <div style={{ display: "flex", alignItems: "center", gap: "7px", width: "100%" }}>
        <Tooltip title={tab.title} url={tab.url}>
          <TabFavicon tab={tab} size={20} />
        </Tooltip>
        
        {/* Clean Suburl / Domain */}
        <span style={{
          fontSize: "11px", fontWeight: 600,
          color: "var(--placeholder-color)", letterSpacing: "0.01em",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          flex: 1
        }}>
          {tab.domain}
        </span>

        {tab.pinned && <span style={{ fontSize: "11px" }}>📌</span>}

        {/* 3-Dots More Options Menu */}
        <button
          onClick={e => { 
            e.stopPropagation(); 
            onMenu?.(tab);
          }}
          title="More options"
          style={{
            width: "24px", height: "24px", borderRadius: "6px", border: "none",
            background: "transparent", color: "var(--text-color)",
            cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", flexShrink: 0,
            opacity: 1,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1.5"></circle>
            <circle cx="12" cy="5" r="1.5"></circle>
            <circle cx="12" cy="19" r="1.5"></circle>
          </svg>
        </button>
      </div>

      {/* Title Row with Curved Branch Arrow */}
      <Tooltip title={tab.title} url={tab.url}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
          
          {/* Branch Curve Arrow UI */}
          <svg 
            width="14" height="14" viewBox="0 0 24 24" 
            fill="none" stroke="var(--placeholder-color)" strokeWidth="2" 
            strokeLinecap="round" strokeLinejoin="round"
            style={{ marginTop: "2px", flexShrink: 0, opacity: 0.7 }}
          >
            <path d="M6 3v5a2 2 0 0 0 2 2h11"></path>
            <polyline points="15 6 19 10 15 14"></polyline>
          </svg>

          <span style={{
fontSize: "11px", fontWeight: 600, color: "var(--text-color)",
overflow: "hidden", textOverflow: "ellipsis",
display: "-webkit-box", WebkitLineClamp: 1,
WebkitBoxOrient: "vertical",
maxWidth: "80px",
          }}>
            {tab.title}
          </span>
        </div>
      </Tooltip>

      {/* Tags */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "auto", flexWrap: "wrap" }}>
        {tab.tags?.slice(0, 3).map(tag => <TagPill key={tag} label={tag} />)}
        {tab.notes && (
          <Tooltip title="Note" url={tab.notes}>
            <span style={{
              fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "3px",
              color: "#a78bfa", cursor: "default",
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              note
            </span>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
// ─── Main ───────────────────────────────────────────────────

export function TabList({
  searchQuery = "",
  viewMode = "list",
  onMenu,
  mode = "default",
}: {
  searchQuery?: string;
  viewMode?: ViewMode;
  onMenu?: (tab: SavedTab) => void;
  mode?: "default" | "notes";
}) {
  const folders = useLiveQuery(() => db.folders.toArray());
  const tabs    = useLiveQuery(() => db.tabs.toArray());
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  if (!folders || !tabs) return null;

  if (folders.length === 0) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", height: "60vh", gap: "8px",
        color: "var(--placeholder-color)", fontSize: "13px",
      }}>
        <span style={{ fontSize: "32px" }}>📭</span>
        <span style={{ fontWeight: 500 }}>No saved tabs yet</span>
        <span style={{ fontSize: "11px", opacity: 0.6 }}>Click + to save current tab</span>
      </div>
    );
  }

  function toggleFolder(id: number) {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {folders.map((folder: FolderType) => {
        const allFolderTabs = tabs.filter(t => t.folderId === folder.id);
        const folderTabs = (() => {
          if (searchQuery.trim() === "") return allFolderTabs;
          const fuse = new Fuse(allFolderTabs, {
            keys: ["title", "url", "notes", "tags"],
            threshold: 0.35,
            minMatchCharLength: 2,
          });
          return fuse.search(searchQuery).map(r => r.item);
        })();
        if (folderTabs.length === 0) return null;

        const isCollapsed = collapsed.has(folder.id!);

        return (
          <div key={folder.id} style={{
            borderRadius: "12px",
            border: "1px solid rgba(90,90,95,0.25)",
            overflow: "hidden",
            background: "rgba(80,80,90,0.18)",
          }}>
            {/* Folder Header */}
            <button
              onClick={() => toggleFolder(folder.id!)}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                width: "100%", padding: "11px 14px",
                background: "transparent", border: "none",
                cursor: "pointer", color: "var(--text-color)",
              }}
            >
              <img
                src={`https://www.google.com/s2/favicons?domain=${folder.domain}&sz=32`}
                width={22} height={22}
                style={{ borderRadius: "5px", flexShrink: 0 }}
                onError={e => {
                  (e.target as HTMLImageElement).src =
                    `https://icons.duckduckgo.com/ip3/${folder.domain}.ico`;
                }}
              />

              <span style={{
                fontSize: "15px", fontWeight: 700, flex: 1, textAlign: "left",
                letterSpacing: "-0.01em",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
              }}>
                {folder.name}
              </span>

              <span style={{
                fontSize: "11px", padding: "2px 9px", borderRadius: "20px",
                background: "rgba(120,120,130,0.2)",
                color: "var(--placeholder-color)", marginRight: "6px",
              }}>
                {folderTabs.length} {folderTabs.length === 1 ? "tab" : "tabs"}
              </span>

              <span style={{
                fontSize: "11px", color: "var(--placeholder-color)",
                transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease", display: "inline-block",
              }}>▾</span>
            </button>

            {/* Tabs */}
            {!isCollapsed && (
              viewMode === "list"
                ? folderTabs.map(tab => (
                   <TabRowList key={tab.id} tab={tab} onMenu={onMenu} mode={mode} />
                  ))
                : (
                  <div className="tab-grid-scroll" style={{
  display: "flex",
  gap: "8px", padding: "8px 12px 12px",
  borderTop: "1px solid rgba(90,90,95,0.15)",
  overflowX: "auto", scrollSnapType: "x mandatory",
                  }}>
                    {folderTabs.map(tab => (
<div style={{ minWidth: "140px", maxWidth: "140px", flexShrink: 0, scrollSnapAlign: "center", }}>
  <TabCardGrid key={tab.id} tab={tab} onMenu={onMenu} />
</div>
                    ))}
                  </div>
                )
            )}
          </div>
        );
      })}
    </div>
  );
}