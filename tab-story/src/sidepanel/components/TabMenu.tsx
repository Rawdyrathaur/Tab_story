import { useState, useEffect, useRef } from "react";
import { useDialogFocus } from '../hooks/useDialogFocus';
import type { SavedTab } from "../db";
import { db } from "../db";
import { updateTab } from '../../sync/client';
import { ScheduleEditor } from './ScheduleEditor';
import { cancelTabReminder, completeTabReminder, archiveReminder } from '../../reminders/service';
import { useI18n } from '../../i18n/useI18n';
import {
  ArrowTopRightOnSquareIcon,
  BookmarkIcon,
  DocumentTextIcon,
  TagIcon,
  ClipboardDocumentIcon,
  TrashIcon,
  ChevronLeftIcon,
  CheckIcon,
  CalendarDaysIcon,
  SparklesIcon,
  XMarkIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { DocumentTextIcon as DocumentTextSolid } from "@heroicons/react/24/solid";

interface Props {
  tab: SavedTab;
  onClose: () => void;
  onDiscussAI?: (tab: SavedTab) => void;
  initialView?: "menu" | "schedule";
  onRemoveFromCollection?: () => Promise<void>;
}

export function TabMenu({ tab, onClose, onDiscussAI, onRemoveFromCollection, initialView = "menu" }: Props) {
  const { t: tr } = useI18n();
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef);
  const [error, setError] = useState("");
  async function run(action: () => Promise<unknown>) { try { setError(''); await action(); } catch (cause) { console.error("[Tab Story] Tab menu", cause); setError(cause instanceof Error ? cause.message : 'This action could not be completed.'); } }
  const [view, setView] = useState<"menu" | "note" | "schedule" | "tags">(initialView);
  const [note, setNote] = useState(tab.notes || "");
  const [tagsList, setTagsList] = useState<string[]>(tab.tags || []);
  const [newTagInput, setNewTagInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  useEffect(() => {
    db.tabs.toArray().then((allTabs) => {
      const allTags = new Set(allTabs.flatMap(t => t.tags || []));
      const unused = Array.from(allTags).filter(t => !tagsList.includes(t));
      setSuggestions(unused.slice(0, 8));
    }).catch(cause => { console.error('[Tab Story] Tags', cause); setError('app.operationFailed'); });
  }, [tagsList]);

  const addTag = async (rawTag: string) => {
    const clean = rawTag.trim().replace(/^#/, "");
    if (!clean || tagsList.includes(clean)) {
      setNewTagInput("");
      return;
    }
    const next = [...tagsList, clean];
    setTagsList(next);
    setNewTagInput("");
    await updateTab(tab.id!, { tags: next });
  };

  const removeTag = async (tagToRemove: string) => {
    const next = tagsList.filter(t => t !== tagToRemove);
    setTagsList(next);
    await updateTab(tab.id!, { tags: next });
  };

  const saveNote = async () => {
    await updateTab(tab.id!, { notes: note.trim() });
  };

  const actions = [
    {
      icon: ArrowTopRightOnSquareIcon,
      label: tr("notifications.open"),
      color: "var(--text-color)",
      onClick: async () => { const url=new URL(tab.url);if(!['http:','https:'].includes(url.protocol))throw new Error('This saved URL cannot be opened.');await chrome.tabs.create({ url:url.href,active:true });onClose(); },
    },
    {
      icon: BookmarkIcon,
      label: tab.pinned ? tr("tabs.unpin") : tr("tabs.pin"),
      color: "var(--text-color)",
      onClick: async () => { await updateTab(tab.id!, { pinned: !tab.pinned }); onClose(); },
    },
    {
      icon: SparklesIcon,
      label: "Tools",
      color: "#c084fc",
      onClick: () => {
        onClose();
        onDiscussAI?.(tab);
      },
    },
    {
      icon: tab.notes ? DocumentTextSolid : DocumentTextIcon,
      label: tab.notes ? tr("tabs.editNote") : tr("tabs.addNote"),
      color: tab.notes ? "#a78bfa" : "var(--text-color)",
      onClick: () => setView("note"),
    },
    {
      icon: CalendarDaysIcon,
      label: tr("calendar.schedule"),
      color: "#34d399",
      onClick: () => setView("schedule"),
    },
    {
      icon: TagIcon,
      label: tr("tabs.editTags"),
      color: "var(--text-color)",
      onClick: () => setView("tags"),
    },
    {
      icon: ClipboardDocumentIcon,
      label: tr("tabs.copy"),
      color: "var(--text-color)",
      onClick: async () => { if(!navigator.clipboard?.writeText)throw new Error('Clipboard access is unavailable.');await navigator.clipboard.writeText(tab.url);onClose(); },
    },
    ...(onRemoveFromCollection ? [{ icon: BookmarkIcon, label: "Remove from collection", color: "var(--text-color)", onClick: async () => { await onRemoveFromCollection(); onClose(); } }] : []),
    {
      icon: TrashIcon,
      label: "Let go",
      color: "#ef4444",
      onClick: async () => { await archiveReminder(tab.id!); onClose(); },
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
        ref={dialogRef} role="dialog" aria-modal="true" aria-label={tab.title} onKeyDown={e => { if (e.key === "Escape") onClose(); }} onClick={e => e.stopPropagation()}
        style={{
          background: "var(--modal-bg)",
          border: "1px solid var(--modal-border)",
          borderRadius: "14px",
          padding: "16px",
          width: "min(320px, calc(100vw - 32px))", maxHeight: "90vh", overflowY: "auto",
          boxShadow: "var(--modal-shadow)",
        }}
      >
        {error && <p role="alert">{error.startsWith('errors.') ? tr(error) : error}</p>}
        <button aria-label={tr("app.close")} onClick={onClose} style={{ float: "inline-end" }}>×</button>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          {view !== "menu" && (
            <button
              aria-label={tr('common.back')} onClick={() => setView("menu")}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--placeholder-color)", padding: 0, display: "flex" }}
            >
              <ChevronLeftIcon style={{ width: "16px", height: "16px" }} />
            </button>
          )}
          <div style={{
            fontSize: "13px", fontWeight: 600, color: "var(--text-color)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
          }}>
            {view === "note" ? tr("tabs.why") : view === "schedule" ? tr("calendar.schedule") : view === "tags" ? tr("tabs.editTags") : tab.title}
          </div>
        </div>

        <div style={{
          fontSize: "11px", color: "var(--placeholder-color)",
          marginBottom: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {tab.url}
        </div>

        <div style={{ height: "1px", background: "var(--divider-color)", marginBottom: "10px" }} />

        {/* Menu view */}
        {view === "menu" && actions.map(({ icon: Icon, label, color, onClick }) => (
          <button
            key={label}
            onClick={() => run(async () => { await onClick(); })}
            style={{
              display: "flex", alignItems: "center", gap: "12px",
              width: "100%", padding: "9px 10px",
              background: "transparent", border: "none",
              borderRadius: "8px", cursor: "pointer",
              color, fontSize: "13px", textAlign: "start",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--btn-hover-bg)")}
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
              placeholder={tr("tabs.notePlaceholder")}
              style={{
                width: "100%", minHeight: "100px",
                background: "var(--input-bg)",
                border: "1px solid var(--input-border)",
                borderRadius: "8px", padding: "10px",
                color: "var(--text-color)", fontSize: "13px",
                resize: "vertical", outline: "none",
                fontFamily: "inherit", lineHeight: "1.5",
                boxSizing: "border-box",
              }}
            />
            <button
              onClick={() => run(async () => { await saveNote(); setView("menu"); })}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                padding: "9px", borderRadius: "8px", border: "none",
                background: "rgba(167,139,250,0.2)", color: "#a78bfa",
                fontSize: "13px", fontWeight: 600, cursor: "pointer",
              }}
            >
              <CheckIcon style={{ width: "15px", height: "15px" }} />{tr("tabs.saveNote")}</button>
          </div>
        )}

        {view === "schedule" && <><ScheduleEditor tab={tab} onClose={onClose} />{tab.scheduledAt ? <div className="action-row"><button onClick={() => run(async () => { await cancelTabReminder(tab.id!); onClose(); })}>{tr("calendar.clear")}</button><button onClick={() => run(async () => { await completeTabReminder(tab.id!); onClose(); })}>{tr("calendar.complete")}</button></div> : null}</>}
        {/* Automatic Simplified Tags View */}
        {view === "tags" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ fontSize: "11px", color: "var(--placeholder-color)" }}>{tr("tabs.tagPlaceholder")}</div>

            {/* Current Tags Chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", minHeight: "26px", alignItems: "center" }}>
              {tagsList.length === 0 ? (
                <span style={{ fontSize: "11.5px", color: "var(--placeholder-color)", fontStyle: "italic" }}>{tr("tags.empty")}</span>
              ) : (
                tagsList.map(t => (
                  <span
                    key={t}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: "12px",
                      background: "rgba(129, 140, 248, 0.16)",
                      color: "#818cf8",
                      border: "1px solid rgba(129, 140, 248, 0.3)",
                    }}
                  >
                    #{t}
                    <button
                      onClick={() => run(() => removeTag(t))}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#818cf8",
                        cursor: "pointer",
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                        marginInlineStart: "2px",
                      }}
                      title={tr("tabs.removeTag")}
                    >
                      <XMarkIcon style={{ width: "12px", height: "12px" }} />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Input to automatically add tag */}
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <input
                autoFocus
                type="text"
                value={newTagInput}
                onChange={e => setNewTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === "," || e.key === " ") {
                    e.preventDefault();
                    void run(() => addTag(newTagInput));
                  }
                }}
                placeholder={tr("tabs.tagPlaceholder")}
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  background: "var(--input-bg)",
                  border: "1px solid var(--input-border)",
                  borderRadius: "8px",
                  color: "var(--text-color)",
                  fontSize: "12px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <button
                onClick={() => run(() => addTag(newTagInput))}
                disabled={!newTagInput.trim()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "none",
                  background: newTagInput.trim() ? "rgba(129,140,248,0.2)" : "var(--btn-hover-bg)",
                  color: newTagInput.trim() ? "#818cf8" : "var(--placeholder-color)",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: newTagInput.trim() ? "pointer" : "default",
                  flexShrink: 0,
                }}
              >
                <PlusIcon style={{ width: "13px", height: "13px" }} />{tr("common.save")}</button>
            </div>

            {/* Suggested Tags */}
            {suggestions.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginTop: "4px" }}>
                <span style={{ fontSize: "10px", color: "var(--placeholder-color)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 }}>{tr("tabs.suggestions")}</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                  {suggestions.map(s => (
                    <button
                      key={s}
                      onClick={() => run(() => addTag(s))}
                      style={{
                        fontSize: "10.5px",
                        padding: "3px 8px",
                        borderRadius: "10px",
                        background: "rgba(120,120,130,0.08)",
                        border: "1px solid var(--border-color)",
                        color: "var(--subtext-color, var(--text-color))",
                        cursor: "pointer",
                        fontWeight: 500,
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = "#818cf8";
                        e.currentTarget.style.color = "#818cf8";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = "var(--border-color)";
                        e.currentTarget.style.color = "var(--subtext-color, var(--text-color))";
                      }}
                    >
                      + #{s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
