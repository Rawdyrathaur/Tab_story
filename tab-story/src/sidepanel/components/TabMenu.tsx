import { useState } from "react";
import type { SavedTab } from "../db";
import { db } from "../db";
import { getAuthToken, createCalendarEvent, backupToGoogleDrive } from '../hooks/useGoogleAuth';
import {
  ArrowTopRightOnSquareIcon,
  BookmarkIcon,
  PencilSquareIcon,
  TagIcon,
  ClipboardDocumentIcon,
  TrashIcon,
  ChevronLeftIcon,
  CheckIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import { PencilSquareIcon as PencilSolid } from "@heroicons/react/24/solid";

interface Props {
  tab: SavedTab;
  onClose: () => void;
}

export function TabMenu({ tab, onClose }: Props) {
  const [view, setView] = useState<"menu" | "note" | "schedule">("menu");
  const [note, setNote] = useState(tab.notes || "");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  const saveNote = async () => {
    await db.tabs.update(tab.id!, { notes: note.trim() });
  };

  const openInGoogleCalendar = async () => {
  if (!scheduleDate) return;
  try {
    const token = await getAuthToken();
    const startDateTime = scheduleDate + 'T' + (scheduleTime || '09:00') + ':00';
    const endDateTime = scheduleDate + 'T' + (scheduleTime
      ? String(parseInt(scheduleTime.split(':')[0]) + 1).padStart(2, '0') + ':' + scheduleTime.split(':')[1]
      : '10:00') + ':00';

    await createCalendarEvent(token, {
      title: '📖 ' + tab.title,
      description: 'Tab saved in Tab Story\n\n' + tab.url,
      startDateTime,
      endDateTime,
    });

    const scheduledAt = new Date(startDateTime).getTime();
    await db.tabs.update(tab.id!, { scheduledAt });

    // Backup to Drive
    const allTabs = await db.tabs.toArray();
    await backupToGoogleDrive(token, allTabs);

    onClose();
  } catch (err) {
    console.error('Calendar error:', err);
    alert('Failed to create event. Please try again.');
  }
};

  const actions = [
    {
      icon: ArrowTopRightOnSquareIcon,
      label: "Open URL",
      color: "var(--text-color)",
      onClick: () => { chrome.tabs.create({ url: tab.url }); onClose(); },
    },
    {
      icon: BookmarkIcon,
      label: tab.pinned ? "Unpin Tab" : "Pin Tab",
      color: "var(--text-color)",
      onClick: () => { db.tabs.update(tab.id!, { pinned: !tab.pinned }); onClose(); },
    },
    {
      icon: tab.notes ? PencilSolid : PencilSquareIcon,
      label: tab.notes ? "Edit Note" : "Add Note",
      color: tab.notes ? "#a78bfa" : "var(--text-color)",
      onClick: () => setView("note"),
    },
    {
      icon: CalendarDaysIcon,
      label: "Schedule in Calendar",
      color: "#34d399",
      onClick: () => setView("schedule"),
    },
    {
      icon: TagIcon,
      label: "Edit Tags",
      color: "var(--text-color)",
      onClick: () => {},
    },
    {
      icon: ClipboardDocumentIcon,
      label: "Copy URL",
      color: "var(--text-color)",
      onClick: () => { navigator.clipboard.writeText(tab.url); onClose(); },
    },
    {
      icon: TrashIcon,
      label: "Delete",
      color: "#ef4444",
      onClick: () => { db.tabs.delete(tab.id!); onClose(); },
    },
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#18181b",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "14px",
          padding: "16px",
          width: "260px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          {(view === "note" || view === "schedule") && (
            <button
              onClick={() => setView("menu")}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--placeholder-color)", padding: 0, display: "flex" }}
            >
              <ChevronLeftIcon style={{ width: "16px", height: "16px" }} />
            </button>
          )}
          <div style={{
            fontSize: "13px", fontWeight: 600, color: "var(--text-color)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
          }}>
            {view === "note" ? "Why did you open this tab?" : view === "schedule" ? "Schedule in Google Calendar" : tab.title}
          </div>
        </div>

        <div style={{
          fontSize: "11px", color: "var(--placeholder-color)",
          marginBottom: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {tab.url}
        </div>

        <div style={{ height: "1px", background: "rgba(255,255,255,0.07)", marginBottom: "10px" }} />

        {/* Menu view */}
        {view === "menu" && actions.map(({ icon: Icon, label, color, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            style={{
              display: "flex", alignItems: "center", gap: "12px",
              width: "100%", padding: "9px 10px",
              background: "transparent", border: "none",
              borderRadius: "8px", cursor: "pointer",
              color, fontSize: "13px", textAlign: "left",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <Icon style={{ width: "16px", height: "16px", flexShrink: 0 }} />
            {label}
          </button>
        ))}

        {/* Note view */}
        {view === "note" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <textarea
              autoFocus
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Research for project, read later..."
              style={{
                width: "100%", minHeight: "100px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px", padding: "10px",
                color: "var(--text-color)", fontSize: "13px",
                resize: "vertical", outline: "none",
                fontFamily: "inherit", lineHeight: "1.5",
                boxSizing: "border-box",
              }}
            />
            <button
              onClick={async () => { await saveNote(); setView("menu"); }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                padding: "9px", borderRadius: "8px", border: "none",
                background: "rgba(167,139,250,0.2)", color: "#a78bfa",
                fontSize: "13px", fontWeight: 600, cursor: "pointer",
              }}
            >
              <CheckIcon style={{ width: "15px", height: "15px" }} />
              Save Note
            </button>
          </div>
        )}

        {/* Schedule view */}
        {view === "schedule" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ fontSize: "11px", color: "var(--placeholder-color)" }}>Date</div>
            <input
              type="date"
              value={scheduleDate}
              onChange={e => setScheduleDate(e.target.value)}
              style={{
                width: "100%", padding: "9px 10px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px", color: "var(--text-color)",
                fontSize: "13px", outline: "none",
                boxSizing: "border-box",
              }}
            />
            <div style={{ fontSize: "11px", color: "var(--placeholder-color)" }}>Time (optional)</div>
            <input
              type="time"
              value={scheduleTime}
              onChange={e => setScheduleTime(e.target.value)}
              style={{
                width: "100%", padding: "9px 10px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px", color: "var(--text-color)",
                fontSize: "13px", outline: "none",
                boxSizing: "border-box",
              }}
            />
            <button
              onClick={openInGoogleCalendar}
              disabled={!scheduleDate}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                padding: "9px", borderRadius: "8px", border: "none",
                background: scheduleDate ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.05)",
                color: scheduleDate ? "#34d399" : "var(--placeholder-color)",
                fontSize: "13px", fontWeight: 600,
                cursor: scheduleDate ? "pointer" : "not-allowed",
              }}
            >
              <CalendarDaysIcon style={{ width: "15px", height: "15px" }} />
              Open in Google Calendar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}