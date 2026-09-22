import { getWeekInfo } from "../../i18n/core";
import { getFaviconForDomain } from '../utils/url';
import { restoreReminder } from "../../reminders/service";
import { useI18n } from "../../i18n/useI18n";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import {
  ClockIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
} from "@heroicons/react/24/outline";
import { isToday, isThisWeek } from "date-fns";

export function HistoryPanel({ onBack }: { onBack?: () => void }) {
  const { t: tr, formatDate, formatNumber, locale } = useI18n();
  const [filter, setFilter] = useState<"All" | "Today" | "This Week" | "Recycled">("All");

  const allTabs = useLiveQuery(() => db.tabs.toArray());

  if (!allTabs) return null;

  // Filter tabs according to current tab and date logic
  const filteredTabs = allTabs
    .filter(tab => {
      const isDeleted = Boolean(tab.deletedAt);
      if (filter === "Recycled") {
        return isDeleted;
      }
      if (filter === "Today") {
        return isToday(new Date(tab.createdAt));
      }
      if (filter === "This Week") {
        return isThisWeek(new Date(tab.createdAt), { weekStartsOn: (getWeekInfo(locale).firstDay % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6 });
      }
      return true; // All includes both active and recycled, matching history timeline
    })
    .sort((a, b) => {
      const timeA = a.deletedAt || a.createdAt;
      const timeB = b.deletedAt || b.createdAt;
      return timeB - timeA;
    });

  const recycledCount = allTabs.filter(t => t.deletedAt).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingBottom: "24px" }}>
      {/* Header with Back button matching media_1789174048772.png */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
              background: "transparent",
              border: "none",
              color: "var(--text-color)",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              transition: "background 0.15s ease",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--btn-hover-bg)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <ChevronLeftIcon style={{ width: "15px", height: "15px" }} />{tr("common.back")}</button>
        )}
        <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-color)", letterSpacing: "-0.01em" }}>{tr("history.title")}</div>
      </div>

      {/* Filter Pills matching media_1789174048772.png */}
      <div className="history-filter-scroll" style={{ display: "flex", alignItems: "center", gap: "6px", overflowX: "auto", paddingBottom: "3px" }}>
        {(["All", "Today", "This Week", "Recycled"] as const).map(f => {
          const isActive = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "5px 12px",
                borderRadius: "20px",
                fontSize: "11.5px",
                fontWeight: 600,
                border: "1px solid",
                borderColor: isActive ? "#3b82f6" : "rgba(120, 120, 130, 0.2)",
                background: isActive ? "#3b82f6" : "rgba(120, 120, 130, 0.08)",
                color: isActive ? "#ffffff" : "var(--placeholder-color)",
                cursor: "pointer",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
              }}
            >
              {tr("history." + f)} {f === "Recycled" && recycledCount > 0 ? `(${formatNumber(recycledCount)})` : ""}
            </button>
          );
        })}
      </div>

      {/* Timeline track container */}
      {filteredTabs.length === 0 ? (
        <div style={{
          padding: "50px 20px",
          textAlign: "center",
          color: "var(--placeholder-color)",
          fontSize: "13px",
        }}>
          <ClockIcon style={{ width: "32px", height: "32px", margin: "0 auto 12px", opacity: 0.4 }} />
          {filter === "Recycled" ? tr("history.emptyRecycle") : tr("history.empty")}
        </div>
      ) : (
        <div style={{ position: "relative", paddingInlineStart: "26px", display: "flex", flexDirection: "column", gap: "22px" }}>
          {/* Continuous vertical timeline track line (media_1789174048772.png) */}
          <div
            style={{
              position: "absolute",
              insetInlineStart: "6px",
              top: "10px",
              bottom: "10px",
              width: "2px",
              background: "rgba(120, 120, 130, 0.3)",
              borderRadius: "2px",
            }}
          />

          {filteredTabs.map(tab => {
            const isDeleted = Boolean(tab.deletedAt);
            const timeStr = formatDate(tab.deletedAt || tab.createdAt, { dateStyle: "medium", timeStyle: "short" });

            return (
              <div key={tab.id} style={{ position: "relative" }}>
                {/* Timeline node dot (media_1789174048772.png / media_1789174092188.png) */}
                <div
                  style={{
                    position: "absolute",
                    insetInlineStart: "-25px",
                    top: "4px",
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    background: isDeleted ? "#ef4444" : "#60a5fa",
                    border: "2px solid var(--bg-color)",
                    boxShadow: isDeleted
                      ? "0 0 8px rgba(239, 68, 68, 0.45)"
                      : "0 0 8px rgba(96, 165, 250, 0.45)",
                    zIndex: 2,
                  }}
                />

                {/* Entry content */}
                {isDeleted ? (
                  /* Deleted / Recycled tab card with Restore button (media_1789174092188.png) */
                  <div
                    style={{
                      background: "rgba(239, 68, 68, 0.07)",
                      border: "1px solid rgba(239, 68, 68, 0.22)",
                      borderInlineStart: "3px solid #ef4444",
                      borderRadius: "10px",
                      padding: "10px 12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "11px", color: "#f87171", fontWeight: 600 }}>
                        {timeStr}
                      </span>
                      <span style={{ fontSize: "10px", color: "#ef4444", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{tr("history.deleted")}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                      <img
                        src={getFaviconForDomain(tab.domain)}
                        width={16}
                        height={16}
                        style={{ borderRadius: "3px", opacity: 0.5, flexShrink: 0, marginTop: "2px" }}
                        onError={e => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <span
                        style={{
                          fontSize: "12.5px",
                          fontWeight: 600,
                          color: "var(--placeholder-color)",
                          textDecoration: "line-through",
                          lineHeight: "1.4",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {tab.title}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
                      <span style={{ fontSize: "11px", color: "var(--placeholder-color)" }}>
                        {tab.tags && tab.tags.length > 0 ? tab.tags[0] : tab.domain}
                      </span>

                      {/* Action buttons */}
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {/* Restore button matching media_1789174092188.png */}
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try { await restoreReminder(tab.id!); } catch (cause) { console.error(cause); window.alert(tr("app.operationFailed")); }
                          }}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            background: "rgba(120, 120, 130, 0.15)",
                            border: "1px solid rgba(120, 120, 130, 0.3)",
                            color: "var(--text-color)",
                            fontSize: "11.5px",
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = "rgba(52, 211, 153, 0.15)";
                            e.currentTarget.style.color = "#34d399";
                            e.currentTarget.style.borderColor = "rgba(52, 211, 153, 0.3)";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = "rgba(120, 120, 130, 0.15)";
                            e.currentTarget.style.color = "var(--text-color)";
                            e.currentTarget.style.borderColor = "rgba(120, 120, 130, 0.3)";
                          }}
                        >
                          <ArrowPathIcon style={{ width: "12px", height: "12px" }} />{tr("common.restore")}</button>


                      </div>
                    </div>
                  </div>
                ) : (
                  /* Active tab timeline entry (media_1789174048772.png) */
                  <div
                    onClick={() => chrome.tabs.create({ url: tab.url })}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "3px",
                      padding: "5px 8px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--row-hover)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ fontSize: "11px", color: "var(--placeholder-color)", fontWeight: 500 }}>
                      {timeStr}
                    </div>

                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                      <img
                        src={getFaviconForDomain(tab.domain)}
                        width={16}
                        height={16}
                        style={{ borderRadius: "3px", marginTop: "2px", flexShrink: 0 }}
                        onError={e => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 700,
                          color: "var(--text-color)",
                          lineHeight: "1.4",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {tab.title}
                      </span>
                    </div>

                    <div style={{ fontSize: "11px", color: "var(--placeholder-color)", paddingInlineStart: "24px" }}>
                      {tab.tags && tab.tags.length > 0 ? tab.tags[0] : tab.domain}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
