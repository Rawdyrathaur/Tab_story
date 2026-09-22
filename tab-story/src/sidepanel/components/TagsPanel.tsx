import { useI18n } from "../../i18n/useI18n";
import { getFaviconForDomain } from '../utils/url';
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import type { SavedTab } from "../db";
import { updateTab } from '../../sync/client';
export function TagsPanel({ onMenu }: { onMenu: (tab: SavedTab) => void }) {
  const { t: tr, formatNumber } = useI18n();
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState("");

  const tabs = useLiveQuery(() => db.tabs.toArray());

  if (!tabs) return null;

  const activeTabs = tabs.filter(tab => !tab.deletedAt);

  // Calculate tag counts
  const tagCounts: Record<string, number> = {};
  for (const tab of activeTabs) {
    for (const tag of tab.tags || []) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  const allTags = Object.keys(tagCounts).sort();

  const filteredTabs = selectedTag
    ? activeTabs.filter(tab => tab.tags?.includes(selectedTag))
    : [];

  const handleCreateTag = async () => {
    const clean = newTagInput.trim().replace(/^#/, "");
    if (!clean) return;
    setSelectedTag(clean);
    setNewTagInput("");
  };

  const handleRemoveTagFromTab = async (e: React.MouseEvent, tab: SavedTab, tagToRemove: string) => {
    e.stopPropagation();
    const updatedTags = (tab.tags || []).filter(t => t !== tagToRemove);
    await updateTab(tab.id!, { tags: updatedTags });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-color)" }}>{tr("navigation.Tags")}</div>
        <div style={{ fontSize: "12px", color: "var(--placeholder-color)", marginTop: "4px" }}>{tr("tags.description")}</div>
      </div>

      {/* Quick Filter or Search */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <input
          type="text"
          value={newTagInput}
          onChange={e => setNewTagInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCreateTag();
            }
          }}
          placeholder={tr("tags.search")}
          style={{
            flex: 1,
            padding: "8px 12px",
            background: "var(--input-bg)",
            border: "1px solid var(--input-border)",
            borderRadius: "8px",
            color: "var(--text-color)",
            fontSize: "12px",
            outline: "none",
          }}
        />
        {newTagInput.trim() && (
          <button
            onClick={handleCreateTag}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              background: "#818cf8",
              color: "#ffffff",
              border: "none",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >{tr("tags.filter")}</button>
        )}
      </div>

      {/* Tag Pills with Count Badges */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {allTags.length === 0 ? (
          <div style={{
            padding: "14px",
            borderRadius: "14px",
            border: "1px dashed rgba(120,120,130,0.28)",
            color: "var(--placeholder-color)",
            fontSize: "12px",
            width: "100%"
          }}>{tr("tags.empty")}</div>
        ) : (
          allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              style={{
                padding: "5px 11px",
                borderRadius: "20px",
                border: "1px solid",
                borderColor: selectedTag === tag ? "#818cf8" : "rgba(120,120,130,0.2)",
                background: selectedTag === tag ? "rgba(129,140,248,0.18)" : "rgba(120,120,130,0.06)",
                color: selectedTag === tag ? "#818cf8" : "var(--text-color)",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.15s ease",
              }}
            >
              <span>#{tag}</span>
              <span style={{
                fontSize: "10px",
                padding: "1px 6px",
                borderRadius: "10px",
                background: selectedTag === tag ? "#818cf8" : "rgba(120,120,130,0.15)",
                color: selectedTag === tag ? "#ffffff" : "var(--placeholder-color)",
              }}>
                {formatNumber(tagCounts[tag])}
              </span>
            </button>
          ))
        )}
      </div>

      {selectedTag && (
        <>
          <div style={{ height: "1px", background: "rgba(120,120,130,0.16)", margin: "8px 0" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-color)", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>{tr("tags.tagged", { tag: selectedTag })}</span>
              <button
                onClick={() => setSelectedTag(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--placeholder-color)",
                  cursor: "pointer",
                  fontSize: "11px",
                  padding: "2px 4px",
                }}
              >
                {tr("common.clear")}
              </button>
            </div>
            <div style={{ fontSize: "11px", color: "var(--placeholder-color)" }}>
              {tr("common.count", { count: filteredTabs.length })}
            </div>
          </div>

          <TabListWithCustomTabs
            tabs={filteredTabs}
            currentTag={selectedTag}
            onRemoveTag={handleRemoveTagFromTab}
            onMenu={onMenu}
          />
        </>
      )}
    </div>
  );
}

function TabListWithCustomTabs({
  tabs,
  currentTag,
  onRemoveTag,
  onMenu,
}: {
  tabs: SavedTab[];
  currentTag?: string;
  onRemoveTag?: (e: React.MouseEvent, tab: SavedTab, tag: string) => void;
  onMenu?: (tab: SavedTab) => void;
}) {

  const { t: tr } = useI18n();
  if (tabs.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {tabs.map(tab => (
        <div
          key={tab.id}
          onClick={() => chrome.tabs.create({ url: tab.url })}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "9px 12px",
            borderRadius: "10px",
            background: "rgba(120,120,130,0.06)",
            border: "1px solid rgba(120,120,130,0.15)",
            cursor: "pointer",
            transition: "background 0.15s ease",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(120,120,130,0.12)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(120,120,130,0.06)")}
        >
          <img
            src={getFaviconForDomain(tab.domain)}
            width={16}
            height={16}
            style={{ borderRadius: "3px", flexShrink: 0 }}
            onError={e => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-color)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {tab.title}
            </div>
            <div style={{ fontSize: "10px", color: "var(--placeholder-color)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {tab.domain}
            </div>
          </div>

          {currentTag && onRemoveTag && (
            <button
              onClick={e => onRemoveTag(e, tab, currentTag)}
              title={tr("tags.remove", { tag: currentTag })}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--placeholder-color)",
                cursor: "pointer",
                padding: "4px",
                fontSize: "12px",
                borderRadius: "4px",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--placeholder-color)")}
            >
              ✕
            </button>
          )}

          {onMenu && (
            <button
              onClick={e => {
                e.stopPropagation();
                onMenu(tab);
              }}
              title={tr("common.moreOptions")}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--placeholder-color)",
                cursor: "pointer",
                padding: "4px",
                fontSize: "13px",
              }}
            >
              ⋮
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
