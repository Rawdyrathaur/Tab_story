import { ReviewPanel, UndoCenter } from './components/ReviewPanel';
import { NotificationWarning } from './components/ReminderHealth';
import { useEffect, useState } from "react";
import { TabList } from "./components/TabList";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import { CalendarPanel } from "./components/CalendarPanel";
import { TagsPanel } from "./components/TagsPanel";
import { HistoryPanel } from "./components/HistoryPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { AboutPanel } from "./components/AboutPanel";
import { EmptyState } from "./components/EmptyState";
import { TabMenu } from "./components/TabMenu";
import { AIDiscussModal } from "./components/AIDiscussModal";
import { OfflineReader } from './components/OfflineReader';
import type { SavedTab } from "./db";
import { CollectionsPanel } from "./components/CollectionsPanel";
import { Navbar } from "./components/Navbar";
import { useTheme } from "./hooks/useTheme";
import { useI18n } from "../i18n/useI18n";
import { deleteAllData, saveAllTabs, saveCurrentTab } from "./utils/tabOperations";
import { requestReminderReconciliation } from "../reminders/service";
import { syncNow } from '../sync/client';
import {
  TagIcon, BookmarkSquareIcon, CalendarIcon, ClockIcon,
  Cog6ToothIcon, PlusIcon, ChevronLeftIcon,
  InformationCircleIcon, TrashIcon, FolderArrowDownIcon,
  SunIcon, MoonIcon, RectangleStackIcon,
} from "@heroicons/react/24/outline";
import {
  TagIcon as TagSolid, BookmarkSquareIcon as BookmarkSquareSolid,
  CalendarIcon as CalendarSolid, ClockIcon as ClockSolid,
  Cog6ToothIcon as CogSolid, PlusIcon as PlusSolid,
  InformationCircleIcon as InfoSolid, TrashIcon as TrashSolid, FolderArrowDownIcon as FolderArrowDownSolid,
  SunIcon as SunSolid, MoonIcon as MoonSolid, RectangleStackIcon as RectangleStackSolid,
} from "@heroicons/react/24/solid";

export type ViewMode = "grid" | "list";

const mainItems = [
  { outline: BookmarkSquareIcon, solid: BookmarkSquareSolid, label: "Tab Manager" },
  { outline: RectangleStackIcon, solid: RectangleStackSolid, label: "Collections" },
  { outline: TagIcon,        solid: TagSolid,       label: "Tags" },
  { outline: CalendarIcon,   solid: CalendarSolid,  label: "Calendar" },
  { outline: ClockIcon,      solid: ClockSolid,     label: "History" },
  { outline: Cog6ToothIcon,  solid: CogSolid,       label: "Settings" },
];

const ICO = "20px";

function formatActionError(cause: unknown): string {
  const message = cause instanceof Error
    ? cause.message
    : typeof cause === "string"
      ? cause
      : cause && typeof cause === "object" && "message" in cause
        ? String((cause as { message?: unknown }).message ?? "")
        : "";
  const normalized = message.trim();

  if (/FREE_TAB_LIMIT_REACHED/i.test(normalized)) {
    return "Chrome could not open another tab right now. Close an unused tab and try again.";
  }
  if (/QUOTA_BYTES|quota exceeded/i.test(normalized)) {
    return "Tab Story storage is full. Delete some saved tabs and try again.";
  }
  return normalized && normalized !== "[object Object]"
    ? normalized
    : "The action could not be completed. Please try again.";
}

export function App() {
  useEffect(() => {
    const run=()=>void syncNow().catch(()=>{});
    run(); window.addEventListener('online',run); const timer=window.setInterval(run,60_000);
    return()=>{window.removeEventListener('online',run);window.clearInterval(timer);};
  },[]);
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const [activePanel, setActivePanel] = useState<string | null>(() =>
    ["#calendar", "#review", "#capture"].includes(window.location.hash) ? "Calendar" : null);
  const [reminderHighlight, setReminderHighlight] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [hoveredBtn,  setHoveredBtn]  = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode] = useState<ViewMode>("list");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [menuTab, setMenuTab] = useState<SavedTab | null>(null);
  const [aiModal, setAiModal] = useState<{ title: string; tabs: SavedTab[] } | null>(null);
  const [readerArticleId, setReaderArticleId] = useState<string | null>(null);
  useEffect(() => {
    const openSetup = () => { setMenuTab(null); setActivePanel("Settings"); setReminderHighlight(value => value + 1); };
    window.addEventListener("tab-story:reminder-setup", openSetup);
    return () => window.removeEventListener("tab-story:reminder-setup", openSetup);
  }, []);
  const isOpen = activePanel !== null;

  // Data for empty state check
  const folderCount = useLiveQuery(() => db.folders.count());
  const tabCount    = useLiveQuery(() => db.tabs.count());
  const [reminderNow, setReminderNow] = useState(Date.now);
  const dueTabs = useLiveQuery(() => db.tabs.where('scheduledAt').between(1, reminderNow, true, true)
    .filter(tab => !tab.deletedAt && !tab.completedAt).toArray(), [reminderNow]);
  useEffect(() => {
    const timer = window.setInterval(() => setReminderNow(Date.now()), 10000);
    const refresh = () => setReminderNow(Date.now());
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);

  useEffect(() => {
    const showCalendar = () => {
      if (["#calendar", "#review", "#capture"].includes(window.location.hash)) setActivePanel("Calendar");
    };
    window.addEventListener("hashchange", showCalendar);
    void requestReminderReconciliation().catch((cause) => {
      // Recovery also runs in the service worker. Opening the side panel can
      // briefly race with that worker waking, which is not a user action or a
      // data-loss condition, so keep this diagnostic out of the global alert.
      console.debug("[Tab Story] Background reminder recovery deferred", cause);
    });
    return () => window.removeEventListener("hashchange", showCalendar);
  }, []);

  const runAction = async (action: () => Promise<void>) => {
    setActionError(null);
    try { await action(); }
    catch (cause) {
      console.error("[Tab Story] Action failed", cause);
      setActionError(formatActionError(cause));
    }
  };
const handleDeleteAll = async () => {
  const confirmed = window.confirm(t("app.confirmDeleteAll"));
  if (!confirmed) return;
  await runAction(deleteAllData);
};

const handleSaveAllTabs = async () => {
  await runAction(saveAllTabs);
};
  return (
    <div
      onClickCapture={event => {
        const wrap = (event.target as HTMLElement).closest<HTMLElement>('.sb-tooltip-wrap');
        if (wrap) wrap.dataset.dismissed = 'true';
      }}
      onPointerOverCapture={event => {
        const wrap = (event.target as HTMLElement).closest<HTMLElement>('.sb-tooltip-wrap');
        if (wrap && !(event.relatedTarget instanceof Node && wrap.contains(event.relatedTarget))) delete wrap.dataset.dismissed;
      }}
      onFocusCapture={event => {
        const wrap = (event.target as HTMLElement).closest<HTMLElement>('.sb-tooltip-wrap');
        if (wrap) delete wrap.dataset.dismissed;
      }}
      onKeyDownCapture={event => {
        if (event.key === 'Escape') event.currentTarget.querySelectorAll<HTMLElement>('.sb-tooltip-wrap').forEach(wrap => { wrap.dataset.dismissed = 'true'; });
      }}
      style={{ display: "flex", height: "100vh", overflow: "hidden", position: "relative", background: "var(--bg-color)", color: "var(--text-color)" }}>

      <UndoCenter />
      {/* Sidebar */}
      <div style={{
        width: "48px", display: "flex", flexDirection: "column",
        alignItems: "center", paddingTop: "10px", paddingBottom: "12px",
        borderInlineEnd: "1px solid var(--border-color)",
        flexShrink: 0, zIndex: 30, background: "var(--sidebar-bg, var(--bg-color))",
      }}>
        <div className="sb-tooltip-wrap" style={{ visibility: isOpen ? "visible" : "hidden" }}>
          <button className="sb-btn" aria-label={t("app.close")} onClick={() => setActivePanel(null)}
            onMouseEnter={() => setHoveredBtn("toggle")}
            onMouseLeave={() => setHoveredBtn(null)}>
            <ChevronLeftIcon className="directional-icon" style={{ width: ICO, height: ICO }} />
          </button>
          <span className="sb-tooltip">{t("app.close")}</span>
        </div>

        <div style={{ height: "20px" }} />

        <div className="sb-tooltip-wrap">
          <button className="sb-btn" aria-label={t("app.saveTab")} onClick={() => runAction(saveCurrentTab)}
            onMouseEnter={() => setHoveredBtn("plus")}
            onMouseLeave={() => setHoveredBtn(null)}>
            {hoveredBtn === "plus"
              ? <PlusSolid style={{ width: ICO, height: ICO }} />
              : <PlusIcon  style={{ width: ICO, height: ICO }} />}
          </button>
          <span className="sb-tooltip">{t("app.saveTab")}</span>
        </div>

        <div style={{ height: "16px" }} />

        {mainItems.map(({ outline: Outline, solid: Solid, label }) => {
          const isActive  = label === "Tab Manager" ? activePanel === null : activePanel === label;
          const isHovered = hoveredBtn  === label;
          const Icon = isActive || isHovered ? Solid : Outline;
          return (
            <div key={label} className="sb-tooltip-wrap" style={{ marginBottom: "4px" }}>
              <button
                className={`sb-btn${isActive ? " active" : ""}`}
                aria-label={t(`navigation.${label}`)}
                aria-pressed={isActive}
                onClick={() => {
                  if (label === "Tab Manager") {
                    setActivePanel(null);
                  } else {
                    setActivePanel(prev => prev === label ? null : label);
                  }
                }}
                onMouseEnter={() => setHoveredBtn(label)}
                onMouseLeave={() => setHoveredBtn(null)}
              >
                <Icon style={{ width: ICO, height: ICO }} />
              </button>
              <span className="sb-tooltip">{t(`navigation.${label}`)}</span>
            </div>
          );
        })}

        <div style={{ marginTop: "auto", paddingTop: "8px" }} />
        {/* Quick Theme Toggle in Sidebar */}
        <div className="sb-tooltip-wrap" style={{ marginBottom: "4px" }}>
          <button
            className="sb-btn"
            onClick={toggleTheme}
            aria-label={t(theme === "dark" ? "app.lightMode" : "app.darkMode")}
            onMouseEnter={() => setHoveredBtn("theme")}
            onMouseLeave={() => setHoveredBtn(null)}
          >
            {theme === "dark"
              ? (hoveredBtn === "theme" ? <SunSolid style={{ width: ICO, height: ICO, color: "#f59e0b" }} /> : <SunIcon style={{ width: ICO, height: ICO, color: "#f59e0b" }} />)
              : (hoveredBtn === "theme" ? <MoonSolid style={{ width: ICO, height: ICO, color: "#6366f1" }} /> : <MoonIcon style={{ width: ICO, height: ICO, color: "#6366f1" }} />)}
          </button>
          <span className="sb-tooltip">{t(theme === "dark" ? "app.lightMode" : "app.darkMode")}</span>
        </div>

        <div className="sb-tooltip-wrap">
          <button
            className={`sb-btn${activePanel === "About" ? " active" : ""}`}
            aria-label={t("navigation.About")}
            onClick={() => setActivePanel(prev => prev === "About" ? null : "About")}
            onMouseEnter={() => setHoveredBtn("about")}
            onMouseLeave={() => setHoveredBtn(null)}
          >
            {activePanel === "About" || hoveredBtn === "about"
              ? <InfoSolid             style={{ width: ICO, height: ICO }} />
              : <InformationCircleIcon style={{ width: ICO, height: ICO }} />}
          </button>
          <span className="sb-tooltip">{t("navigation.About")}</span>
        </div>
      </div>

      {/* Slide-out panel */}
      <div inert={!isOpen} aria-hidden={!isOpen} style={{
        position: "absolute", top: 0, insetInlineStart: "48px",
        height: "100%", width: "calc(100% - 48px)",
        background: "var(--sidebar-bg, var(--bg-color))",
        borderInlineEnd: "1px solid var(--border-color)",
        zIndex: 20,
        transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        visibility: isOpen ? "visible" : "hidden",
        transition: "transform 0.2s ease",
        display: "flex", flexDirection: "column",
        padding: "16px 14px",
        overflowY: "auto",
        overflowX: "hidden",
        boxSizing: "border-box",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "14px",
          paddingBottom: "8px",
          borderBottom: "1px solid rgba(120, 120, 130, 0.15)",
        }}>
          {activePanel === "Calendar" && <CalendarSolid style={{ width: "16px", height: "16px", color: "#818cf8" }} />}
          {activePanel === "Tags" && <TagSolid style={{ width: "16px", height: "16px", color: "#818cf8" }} />}
          {activePanel === "History" && <ClockSolid style={{ width: "16px", height: "16px", color: "#818cf8" }} />}
          {activePanel === "Settings" && <CogSolid style={{ width: "16px", height: "16px", color: "#818cf8" }} />}
          {activePanel === "About" && <InfoSolid style={{ width: "16px", height: "16px", color: "#818cf8" }} />}
          <span style={{
            fontSize: "13px",
            fontWeight: 800,
            color: "var(--text-color)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
          }}>
            {activePanel && t(`navigation.${activePanel}`)}
          </span>
        </div>
        {activePanel === "Collections" && <CollectionsPanel onDiscussAI={tab => setAiModal({ title: tab.title, tabs: [tab] })} />}
        {activePanel === "Calendar" && <><NotificationWarning /><ReviewPanel /><CalendarPanel /></>}
        {activePanel === "Tags" && <TagsPanel onMenu={setMenuTab} />}
        {activePanel === "History" && <HistoryPanel onBack={() => setActivePanel(null)} />}
        {activePanel === "Settings" && <SettingsPanel highlightReminders={reminderHighlight} />}
        {activePanel === "About" && <AboutPanel />}
      </div>

      {/* Main content */}
      <div inert={isOpen} style={{
        flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
        minWidth: 0,
        transition: "filter 0.2s ease",
        filter: isOpen ? "blur(3px)" : "none",
        pointerEvents: isOpen ? "none" : "auto",
      }}>
        <Navbar
          onSearch={setSearchQuery}
          sortOrder={sortOrder}
          onToggleSort={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
        />
<div style={{ display: "flex", justifyContent: "center", gap: "4px", padding: "8px 0" }}>
  <div className="sb-tooltip-wrap sb-tooltip-below">
  <button className="sb-btn" aria-label={t("app.saveAllTabs")} onClick={handleSaveAllTabs}
    onMouseEnter={() => setHoveredBtn("saveAll")}
    onMouseLeave={() => setHoveredBtn(null)}
    style={{ color: hoveredBtn === "saveAll" ? "#60a5fa" : "var(--icon-color)", transition: "color 0.15s ease" }}>
    {hoveredBtn === "saveAll"
      ? <FolderArrowDownSolid style={{ width: ICO, height: ICO }} />
      : <FolderArrowDownIcon  style={{ width: ICO, height: ICO }} />}
  </button>
  <span className="sb-tooltip">{t("app.saveAllTabs")}</span>
</div>

<div className="sb-tooltip-wrap sb-tooltip-below">
  <button className="sb-btn" aria-label={t("app.deleteAll")} onClick={handleDeleteAll}
    onMouseEnter={() => setHoveredBtn("deleteAll")}
    onMouseLeave={() => setHoveredBtn(null)}
    style={{ color: hoveredBtn === "deleteAll" ? "#f87171" : "var(--icon-color)", transition: "color 0.15s ease" }}>
    {hoveredBtn === "deleteAll"
      ? <TrashSolid style={{ width: ICO, height: ICO }} />
      : <TrashIcon  style={{ width: ICO, height: ICO }} />}
  </button>
  <span className="sb-tooltip">{t("app.deleteAll")}</span>
</div>


</div>
        <main style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
  {folderCount === undefined || tabCount === undefined ? (
    <div style={{ textAlign: "center", padding: "40px", color: "var(--placeholder-color)" }}>
      {t("app.loading")}
    </div>
  ) : folderCount === 0 && tabCount === 0 ? (
    <EmptyState />
  ) : (
    <>
      <TabList
        searchQuery={searchQuery}
        viewMode={viewMode}
        onMenu={setMenuTab}
        sortOrder={sortOrder}
        onDiscussAI={(tab, groupTabs) => {
          if (groupTabs && groupTabs.length > 0) {
            setAiModal({ title: tab.domain || t("app.group"), tabs: groupTabs });
          } else {
            setAiModal({ title: tab.title, tabs: [tab] });
          }
        }}
        onRead={setReaderArticleId}
      />
    </>
  )}
</main>
      </div>
      {actionError && <div className="app-alert app-action-error" role="alert" aria-live="assertive">
        <span style={{ overflowWrap: 'anywhere' }}>{actionError}</span>
        <button type="button" onClick={() => setActionError(null)} aria-label="Dismiss error">Dismiss</button>
      </div>}
      {!!dueTabs?.length && !actionError && activePanel !== 'Calendar' && <div className="app-alert" role="status" style={{ overflowWrap: 'anywhere' }}>
        {dueTabs.length === 1 ? `Reminder: ${dueTabs[0].title}` : `${dueTabs.length} tabs are due`}
        <button onClick={() => setActivePanel('Calendar')}>View reminders</button>
      </div>}
      <NotificationWarning />
      {menuTab && <TabMenu tab={menuTab} onClose={() => setMenuTab(null)} onDiscussAI={(tab) => setAiModal({ title: tab.title, tabs: [tab] })} />}
      {aiModal && <AIDiscussModal title={aiModal.title} tabs={aiModal.tabs} onClose={() => setAiModal(null)} />}
      {readerArticleId && <OfflineReader articleId={readerArticleId} onClose={() => setReaderArticleId(null)} />}
    </div>
  );
}
