import { useState } from "react";
import { saveCurrentTab } from "./hooks/useSaveTab";
import { TabList } from "./components/TabList";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import { EmptyState } from "./components/EmptyState";
import { TabMenu } from "./components/TabMenu";
import type { SavedTab } from "./db";
import { Navbar } from "./components/Navbar";
import {
  TagIcon, BookmarkSquareIcon, CalendarIcon, ClockIcon,
  Cog6ToothIcon, PlusIcon, ChevronLeftIcon,
  InformationCircleIcon, TrashIcon, FolderArrowDownIcon,
} from "@heroicons/react/24/outline";
import {
  TagIcon as TagSolid, BookmarkSquareIcon as BookmarkSquareSolid,
  CalendarIcon as CalendarSolid, ClockIcon as ClockSolid,
  Cog6ToothIcon as CogSolid, PlusIcon as PlusSolid,
  InformationCircleIcon as InfoSolid, TrashIcon as TrashSolid, FolderArrowDownIcon as FolderArrowDownSolid,
} from "@heroicons/react/24/solid";

export type ViewMode = "grid" | "list";

const mainItems = [
  { outline: BookmarkSquareIcon, solid: BookmarkSquareSolid, label: "Tab Manager" },
  { outline: TagIcon,        solid: TagSolid,       label: "Tags" },
  { outline: CalendarIcon,   solid: CalendarSolid,  label: "Calendar" },
  { outline: ClockIcon,      solid: ClockSolid,     label: "History" },
  { outline: Cog6ToothIcon,  solid: CogSolid,       label: "Settings" },
];

const ICO = "20px";

export function App() {
  const [activePanel, setActivePanel]   = useState<string | null>(null);
  const [hoveredBtn,  setHoveredBtn]    = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [menuTab, setMenuTab] = useState<SavedTab | null>(null);
  const isOpen = activePanel !== null;

  // Data for empty state check
  const folderCount = useLiveQuery(() => db.folders.count());
  const tabCount    = useLiveQuery(() => db.tabs.count());

  const handleBatchAdd = () => {
    // Placeholder – later you'll open a batch add form
    console.log("Batch add clicked");
  };
const handleDeleteAll = async () => {
  const confirmed = window.confirm("Delete all saved tabs and folders?");
  if (!confirmed) return;
  await db.tabs.clear();
  await db.folders.clear();
};

const handleSaveAllTabs = async () => {
  const allTabs = await chrome.tabs.query({ currentWindow: true });
  for (const tab of allTabs) {
    if (!tab.url || !tab.title) continue;
    if (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://") || tab.url.startsWith("about:")) continue;

    const domain = (() => { try { return new URL(tab.url).hostname.replace("www.", ""); } catch { return tab.url; } })();
    const favicon = tab.favIconUrl?.startsWith("http") ? tab.favIconUrl : `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

    let folder = await db.folders.where("domain").equals(domain).first();
    if (!folder) {
      const folderId = await db.folders.add({ name: domain, domain, createdAt: Date.now() });
      folder = { id: folderId as number, name: domain, domain, createdAt: Date.now() };
    }

    const existing = await db.tabs.where("url").equals(tab.url).first();
    if (existing) continue;

    await db.tabs.add({ url: tab.url, title: tab.title, favicon, domain, folderId: folder.id, tags: [], createdAt: Date.now(), notes: "", pinned: false });
  }
};
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", position: "relative" }}>

      {/* Sidebar */}
      <div style={{
        width: "48px", display: "flex", flexDirection: "column",
        alignItems: "center", paddingTop: "10px", paddingBottom: "12px",
        borderRight: "1px solid rgba(90,90,95,0.3)",
        flexShrink: 0, zIndex: 30, background: "var(--bg-color)",
      }}>
        <div className="sb-tooltip-wrap" style={{ visibility: isOpen ? "visible" : "hidden" }}>
          <button className="sb-btn" onClick={() => setActivePanel(null)}
            onMouseEnter={() => setHoveredBtn("toggle")}
            onMouseLeave={() => setHoveredBtn(null)}>
            <ChevronLeftIcon style={{ width: ICO, height: ICO }} />
          </button>
          <span className="sb-tooltip">Close</span>
        </div>

        <div style={{ height: "20px" }} />

        <div className="sb-tooltip-wrap">
          <button className="sb-btn" onClick={saveCurrentTab}
            onMouseEnter={() => setHoveredBtn("plus")}
            onMouseLeave={() => setHoveredBtn(null)}>
            {hoveredBtn === "plus"
              ? <PlusSolid style={{ width: ICO, height: ICO }} />
              : <PlusIcon  style={{ width: ICO, height: ICO }} />}
          </button>
          <span className="sb-tooltip">Save Tab</span>
        </div>

        <div style={{ height: "16px" }} />

        {mainItems.map(({ outline: Outline, solid: Solid, label }) => {
          const isActive  = activePanel === label;
          const isHovered = hoveredBtn  === label;
          const Icon = isActive || isHovered ? Solid : Outline;
          return (
            <div key={label} className="sb-tooltip-wrap" style={{ marginBottom: "4px" }}>
              <button
                className={`sb-btn${isActive ? " active" : ""}`}
                onClick={() => setActivePanel(prev => prev === label ? null : label)}
                onMouseEnter={() => setHoveredBtn(label)}
                onMouseLeave={() => setHoveredBtn(null)}
              >
                <Icon style={{ width: ICO, height: ICO }} />
              </button>
              <span className="sb-tooltip">{label}</span>
            </div>
          );
        })}

        <div className="sb-tooltip-wrap" style={{ marginTop: "auto" }}>
          <button
            className={`sb-btn${activePanel === "About" ? " active" : ""}`}
            onClick={() => setActivePanel(prev => prev === "About" ? null : "About")}
            onMouseEnter={() => setHoveredBtn("about")}
            onMouseLeave={() => setHoveredBtn(null)}
          >
            {activePanel === "About" || hoveredBtn === "about"
              ? <InfoSolid             style={{ width: ICO, height: ICO }} />
              : <InformationCircleIcon style={{ width: ICO, height: ICO }} />}
          </button>
          <span className="sb-tooltip">About</span>
        </div>
      </div>

      {/* Slide-out panel */}
      <div style={{
        position: "absolute", top: 0, left: "48px",
        height: "100%", width: "calc(100% - 48px)",
        background: "var(--bg-color)",
        borderRight: "1px solid rgba(90,90,95,0.3)",
        zIndex: 20,
        transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.2s ease",
        display: "flex", flexDirection: "column",
        padding: "16px 12px", overflowY: "auto",
      }}>
        <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--placeholder-color)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "12px" }}>
          {activePanel}
        </div>
      </div>

      {/* Main content */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
        transition: "filter 0.2s ease",
        filter: isOpen ? "blur(3px)" : "none",
        pointerEvents: isOpen ? "none" : "auto",
      }}>
        <Navbar
          onSearch={setSearchQuery}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
<div style={{ display: "flex", justifyContent: "center", gap: "4px", padding: "8px 0" }}>
  <div className="sb-tooltip-wrap sb-tooltip-below">
  <button className="sb-btn" onClick={handleSaveAllTabs}
    onMouseEnter={() => setHoveredBtn("saveAll")}
    onMouseLeave={() => setHoveredBtn(null)}
    style={{ color: hoveredBtn === "saveAll" ? "#60a5fa" : "var(--icon-color)", transition: "color 0.15s ease" }}>
    {hoveredBtn === "saveAll"
      ? <FolderArrowDownSolid style={{ width: ICO, height: ICO }} />
      : <FolderArrowDownIcon  style={{ width: ICO, height: ICO }} />}
  </button>
  <span className="sb-tooltip">Save All Tabs</span>
</div>

<div className="sb-tooltip-wrap sb-tooltip-below">
  <button className="sb-btn" onClick={handleDeleteAll}
    onMouseEnter={() => setHoveredBtn("deleteAll")}
    onMouseLeave={() => setHoveredBtn(null)}
    style={{ color: hoveredBtn === "deleteAll" ? "#f87171" : "var(--icon-color)", transition: "color 0.15s ease" }}>
    {hoveredBtn === "deleteAll"
      ? <TrashSolid style={{ width: ICO, height: ICO }} />
      : <TrashIcon  style={{ width: ICO, height: ICO }} />}
  </button>
  <span className="sb-tooltip">Delete All</span>
</div>
</div>
        <main style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
  {folderCount === undefined || tabCount === undefined ? (
    <div style={{ textAlign: "center", padding: "40px", color: "var(--placeholder-color)" }}>
      Loading...
    </div>
  ) : folderCount === 0 && tabCount === 0 ? (
    <EmptyState />
  ) : (
    <>
      {menuTab && <TabMenu tab={menuTab} onClose={() => setMenuTab(null)} />}
      <TabList searchQuery={searchQuery} viewMode={viewMode} onMenu={setMenuTab} />
    </>
  )}
</main>
      </div>
    </div>
  );
}