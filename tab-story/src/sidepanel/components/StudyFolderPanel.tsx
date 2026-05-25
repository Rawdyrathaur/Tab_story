/**
 * StudyFolderPanel.tsx
 * 
 * The File Manager panel showing:
 *   Main Study Folder
 *     └── Topic (sub-folder)
 *           └── Tab card (favicon + title + note heading + page detail)
 * 
 * Auto-note is generated from saved tab titles.
 */

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, generateAutoNote } from "../db";
import type { StudyFolder, StudyTopic, SavedTab } from "../db";
import {
  FolderPlusIcon, PlusIcon, ChevronDownIcon,
  ChevronRightIcon, TrashIcon, PencilSquareIcon,
  CheckIcon, XMarkIcon,
} from "@heroicons/react/24/outline";

// ── Emoji picker options ─────────────────────────────────
const EMOJI_OPTIONS = ["📚","⚛️","💻","🧬","🏛️","🌍","🎨","🔬","📐","🧮","💡","🎯","🧠","📝","🔭"];

// ── Helpers ──────────────────────────────────────────────

function rootDomain(domain: string) {
  const parts = domain.split(".");
  return parts.length >= 2 ? parts[parts.length - 2] : domain;
}

// ── Tab Card inside a topic ──────────────────────────────

function StudyTabCard({ tab }: { tab: SavedTab }) {
  const [err, setErr] = useState(false);
  const favicon = (!tab.favicon || err)
    ? `https://www.google.com/s2/favicons?domain=${rootDomain(tab.domain)}&sz=32`
    : tab.favicon;

  return (
    <div
      onClick={() => chrome.tabs.create({ url: tab.url })}
      style={{
        display: "flex", alignItems: "flex-start", gap: "10px",
        padding: "10px 12px", borderRadius: "10px", cursor: "pointer",
        border: "1px solid rgba(90,90,95,0.18)",
        background: "rgba(80,80,90,0.10)",
        transition: "background 0.15s, transform 0.12s",
        marginBottom: "6px",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = "rgba(120,120,200,0.13)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = "rgba(80,80,90,0.10)";
        (e.currentTarget as HTMLElement).style.transform = "none";
      }}
    >
      <img
        src={favicon} width={18} height={18}
        style={{ borderRadius: "4px", flexShrink: 0, marginTop: "2px" }}
        onError={() => setErr(true)}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Page heading (title) */}
        <div style={{
fontSize: "11px", fontWeight: 600, color: "var(--text-color)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          marginBottom: "2px",
        }}>
          {tab.title}
        </div>
        {/* Page detail (URL) */}
        <div style={{
          fontSize: "10.5px", color: "var(--placeholder-color)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {tab.url}
        </div>
        {/* Note if exists */}
        {tab.notes && (
          <div style={{
            fontSize: "11px", color: "#a78bfa", marginTop: "4px",
            display: "-webkit-box", WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            📝 {tab.notes}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Topic sub-card ───────────────────────────────────────

function StudyTopicCard({
  topic, onDelete,
}: {
  topic: StudyTopic;
  onDelete: (id: number) => void;
}) {
  const [open, setOpen] = useState(true);
  const tabs = useLiveQuery(
    () => db.tabs.where("folderId").equals(topic.id!).toArray(),
    [topic.id]
  ) ?? [];

  return (
    <div style={{
      borderRadius: "10px",
      border: "1px solid rgba(90,90,95,0.22)",
      background: "rgba(30,30,36,0.55)",
      marginBottom: "8px", overflow: "hidden",
    }}>
      {/* Topic header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "9px 12px", cursor: "pointer", userSelect: "none",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(120,120,130,0.1)")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        {open
          ? <ChevronDownIcon style={{ width: 14, height: 14, color: "var(--placeholder-color)", flexShrink: 0 }} />
          : <ChevronRightIcon style={{ width: 14, height: 14, color: "var(--placeholder-color)", flexShrink: 0 }} />
        }
        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-color)", flex: 1 }}>
          {topic.name}
        </span>
        <span style={{
          fontSize: "10.5px", padding: "2px 8px", borderRadius: "20px",
          background: "rgba(120,120,130,0.2)", color: "var(--placeholder-color)",
          marginRight: "6px",
        }}>
          {tabs.length} tab{tabs.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={e => { e.stopPropagation(); onDelete(topic.id!); }}
          title="Delete topic"
          style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: "var(--placeholder-color)", padding: "2px",
            borderRadius: "5px", display: "flex",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--placeholder-color)")}
        >
          <TrashIcon style={{ width: 13, height: 13 }} />
        </button>
      </div>

      {/* Auto note */}
      {open && topic.autoNote && (
        <div style={{
          fontSize: "11px", color: "#a78bfa",
          padding: "0 12px 6px 34px", lineHeight: 1.4,
        }}>
          {topic.autoNote}
        </div>
      )}

      {/* Tab cards */}
      {open && (
        <div style={{ padding: "0 10px 10px 10px" }}>
          {tabs.length === 0 ? (
            <div style={{
              fontSize: "11px", color: "var(--placeholder-color)",
              padding: "6px 4px", fontStyle: "italic",
            }}>
              No tabs yet — drag or move tabs here
            </div>
          ) : (
            tabs.map(tab => <StudyTabCard key={tab.id} tab={tab} />)
          )}
        </div>
      )}
    </div>
  );
}

// ── Inline name editor ───────────────────────────────────

function InlineEditor({
  placeholder, onSave, onCancel,
}: {
  placeholder: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState("");
  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "8px" }}>
      <input
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter" && val.trim()) onSave(val.trim());
          if (e.key === "Escape") onCancel();
        }}
        placeholder={placeholder}
        style={{
          flex: 1, padding: "7px 10px", borderRadius: "8px",
          border: "1px solid rgba(120,120,200,0.35)",
          background: "rgba(80,80,90,0.2)", color: "var(--text-color)",
          fontSize: "13px", outline: "none",
        }}
      />
      <button
        onClick={() => val.trim() && onSave(val.trim())}
        style={{
          background: "rgba(120,120,200,0.2)", border: "none",
          borderRadius: "7px", color: "#a78bfa", cursor: "pointer",
          padding: "7px 8px", display: "flex",
        }}
      >
        <CheckIcon style={{ width: 14, height: 14 }} />
      </button>
      <button
        onClick={onCancel}
        style={{
          background: "transparent", border: "none",
          borderRadius: "7px", color: "var(--placeholder-color)",
          cursor: "pointer", padding: "7px 8px", display: "flex",
        }}
      >
        <XMarkIcon style={{ width: 14, height: 14 }} />
      </button>
    </div>
  );
}

// ── Main Study Folder card ───────────────────────────────

function StudyFolderCard({ folder }: { folder: StudyFolder }) {
  const [open, setOpen] = useState(true);
  const [addingTopic, setAddingTopic] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const topics = useLiveQuery(
    () => db.studyTopics.where("studyFolderId").equals(folder.id!).toArray(),
    [folder.id]
  ) ?? [];

  // All tabs in this study folder (across all topics)
  const allTopicIds = topics.map(t => t.id!);
  const totalTabs = useLiveQuery(
    () => allTopicIds.length > 0
      ? db.tabs.where("folderId").anyOf(allTopicIds).count()
      : Promise.resolve(0),
    [JSON.stringify(allTopicIds)]
  ) ?? 0;

  async function createTopic(name: string) {
    await db.studyTopics.add({
      studyFolderId: folder.id!,
      name,
      autoNote: generateAutoNote([name]),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    setAddingTopic(false);
  }

  async function deleteTopic(topicId: number) {
    // Unlink tabs from this topic
await db.tabs.where("folderId").equals(topicId).modify((tab) => { tab.folderId = undefined; });
    await db.studyTopics.delete(topicId);
  }

  async function deleteFolder() {
    // Delete all topics and unlink their tabs
    for (const t of topics) {
      await deleteTopic(t.id!);
    }
    await db.studyFolders.delete(folder.id!);
  }

  async function setEmoji(emoji: string) {
    await db.studyFolders.update(folder.id!, { emoji });
    setEmojiPickerOpen(false);
  }

  return (
    <div style={{
      borderRadius: "14px",
      border: "1px solid rgba(90,90,95,0.28)",
      background: "rgba(80,80,90,0.16)",
      overflow: "hidden",
      marginBottom: "14px",
    }}>
      {/* Folder header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "10px",
        padding: "12px 14px",
        borderBottom: open ? "1px solid rgba(90,90,95,0.18)" : "none",
      }}>
        {/* Emoji (clickable) */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setEmojiPickerOpen(o => !o)}
            style={{
              background: "rgba(120,120,200,0.15)", border: "none",
              borderRadius: "8px", cursor: "pointer",
              width: 34, height: 34, fontSize: "18px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
            title="Change emoji"
          >
            {folder.emoji}
          </button>
          {emojiPickerOpen && (
            <div style={{
              position: "absolute", top: "38px", left: 0, zIndex: 50,
              background: "#18181b", border: "1px solid rgba(90,90,95,0.3)",
              borderRadius: "10px", padding: "8px",
              display: "flex", flexWrap: "wrap", gap: "4px", width: "160px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            }}>
              {EMOJI_OPTIONS.map(e => (
                <button key={e} onClick={() => setEmoji(e)}
                  style={{
                    background: "transparent", border: "none", cursor: "pointer",
                    fontSize: "18px", borderRadius: "6px", padding: "4px",
                    width: "32px", height: "32px",
                  }}
                  onMouseEnter={ev => (ev.currentTarget.style.background = "rgba(120,120,130,0.2)")}
                  onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Name + note */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: "15px", fontWeight: 700, color: "var(--text-color)",
            letterSpacing: "-0.01em",
          }}>
            {folder.name}
          </div>
          {folder.autoNote && (
            <div style={{
              fontSize: "11px", color: "var(--placeholder-color)",
              marginTop: "1px", whiteSpace: "nowrap",
              overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {folder.autoNote}
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
          <span style={{
            fontSize: "10.5px", padding: "2px 9px", borderRadius: "20px",
            background: "rgba(120,120,200,0.15)", color: "#a78bfa", fontWeight: 500,
          }}>
            {topics.length} topic{topics.length !== 1 ? "s" : ""}
          </span>
          <span style={{
            fontSize: "10.5px", padding: "2px 9px", borderRadius: "20px",
            background: "rgba(120,120,130,0.2)", color: "var(--placeholder-color)",
          }}>
            {totalTabs} tab{totalTabs !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Actions */}
        <button
          onClick={() => setAddingTopic(t => !t)}
          title="Add topic"
          style={{
            background: "rgba(120,120,200,0.15)", border: "none",
            borderRadius: "7px", cursor: "pointer", color: "#a78bfa",
            padding: "6px", display: "flex",
          }}
        >
          <PlusIcon style={{ width: 14, height: 14 }} />
        </button>
        <button
          onClick={deleteFolder}
          title="Delete folder"
          style={{
            background: "transparent", border: "none",
            borderRadius: "7px", cursor: "pointer",
            color: "var(--placeholder-color)", padding: "6px", display: "flex",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--placeholder-color)")}
        >
          <TrashIcon style={{ width: 14, height: 14 }} />
        </button>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: "var(--placeholder-color)", padding: "6px", display: "flex",
          }}
        >
          {open
            ? <ChevronDownIcon style={{ width: 14, height: 14 }} />
            : <ChevronRightIcon style={{ width: 14, height: 14 }} />
          }
        </button>
      </div>

      {/* Body */}
      {open && (
        <div style={{ padding: "12px 12px 8px" }}>
          {addingTopic && (
            <InlineEditor
              placeholder="Topic name (e.g. Quantum Mechanics)"
              onSave={createTopic}
              onCancel={() => setAddingTopic(false)}
            />
          )}
          {topics.length === 0 && !addingTopic ? (
            <div style={{
              textAlign: "center", padding: "20px 0",
              color: "var(--placeholder-color)", fontSize: "12px",
            }}>
              <div style={{ fontSize: "24px", marginBottom: "6px" }}>📭</div>
              <div>No topics yet.</div>
              <div style={{ fontSize: "11px", marginTop: "3px", opacity: 0.7 }}>
                Click <strong>+</strong> to add a topic like "Quantum Mechanics"
              </div>
            </div>
          ) : (
            topics.map(topic => (
              <StudyTopicCard key={topic.id} topic={topic} onDelete={deleteTopic} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Root panel ───────────────────────────────────────────

export function StudyFolderPanel() {
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState("📚");

  const studyFolders = useLiveQuery(() => db.studyFolders.orderBy("createdAt").toArray()) ?? [];

  async function createFolder(name: string) {
    await db.studyFolders.add({
      name,
      emoji: selectedEmoji,
      autoNote: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    setCreatingFolder(false);
    setSelectedEmoji("📚");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: "14px",
      }}>
        <div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-color)" }}>
            Study Folders
          </div>
          <div style={{ fontSize: "11px", color: "var(--placeholder-color)", marginTop: "1px" }}>
            Organize tabs by subject → topic
          </div>
        </div>
        <button
          onClick={() => setCreatingFolder(t => !t)}
          title="New study folder"
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            background: "rgba(120,120,200,0.15)", border: "1px solid rgba(120,120,200,0.25)",
            borderRadius: "8px", cursor: "pointer", color: "#a78bfa",
            padding: "6px 10px", fontSize: "12px", fontWeight: 600,
          }}
        >
          <FolderPlusIcon style={{ width: 15, height: 15 }} />
          New
        </button>
      </div>

      {/* New folder form */}
      {creatingFolder && (
        <div style={{
          background: "rgba(120,120,200,0.08)",
          border: "1px solid rgba(120,120,200,0.2)",
          borderRadius: "10px", padding: "12px", marginBottom: "12px",
        }}>
          <div style={{ fontSize: "11px", color: "#a78bfa", marginBottom: "8px", fontWeight: 600 }}>
            Choose emoji & name your study folder
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
            {EMOJI_OPTIONS.map(e => (
              <button key={e} onClick={() => setSelectedEmoji(e)}
                style={{
                  background: selectedEmoji === e ? "rgba(120,120,200,0.3)" : "transparent",
                  border: selectedEmoji === e ? "1px solid rgba(120,120,200,0.4)" : "1px solid transparent",
                  borderRadius: "6px", cursor: "pointer",
                  fontSize: "16px", padding: "4px 5px",
                }}
              >
                {e}
              </button>
            ))}
          </div>
          <InlineEditor
            placeholder={`${selectedEmoji} Folder name (e.g. Physics, Web Dev)`}
            onSave={createFolder}
            onCancel={() => setCreatingFolder(false)}
          />
        </div>
      )}

      {/* Empty state */}
      {studyFolders.length === 0 && !creatingFolder && (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", flex: 1, gap: "8px",
          color: "var(--placeholder-color)",
        }}>
          <span style={{ fontSize: "36px" }}>📚</span>
          <span style={{ fontSize: "13px", fontWeight: 500 }}>No study folders yet</span>
          <span style={{ fontSize: "11px", opacity: 0.6, textAlign: "center" }}>
            Create a folder like "Physics" then add topics like "Quantum Mechanics"
          </span>
          <button
            onClick={() => setCreatingFolder(true)}
            style={{
              marginTop: "8px", padding: "8px 16px",
              background: "rgba(120,120,200,0.15)",
              border: "1px solid rgba(120,120,200,0.25)",
              borderRadius: "8px", color: "#a78bfa",
              fontSize: "12px", fontWeight: 600, cursor: "pointer",
            }}
          >
            + Create first folder
          </button>
        </div>
      )}

      {/* Folder list */}
      <div style={{ overflowY: "auto", flex: 1 }}>
        {studyFolders.map(folder => (
          <StudyFolderCard key={folder.id} folder={folder} />
        ))}
      </div>
    </div>
  );
}
