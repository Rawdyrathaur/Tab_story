import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["S","M","T","W","T","F","S"];

export function CalendarPanel() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selected, setSelected] = useState<Date>(today);

  const scheduledTabs = useLiveQuery(() =>
    db.tabs.toArray().then(tabs => tabs.filter(t => t.scheduledAt && t.scheduledAt > 0))
  );

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();

  const scheduledDays = new Set(
    (scheduledTabs || [])
      .filter(t => {
        const d = new Date(t.scheduledAt!);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .map(t => new Date(t.scheduledAt!).getDate())
  );

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const isToday = (d: number) =>
    d === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

  const isSelected = (d: number) =>
    d === selected.getDate() && currentMonth === selected.getMonth() && currentYear === selected.getFullYear();

  const tabsForSelected = (scheduledTabs || []).filter(t => {
    const d = new Date(t.scheduledAt!);
    return d.toDateString() === selected.toDateString();
  });

  const selectedIsToday = selected.toDateString() === today.toDateString();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Month navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-color)", letterSpacing: "-0.01em" }}>
          {MONTHS[currentMonth]} {currentYear}
        </span>
        <div style={{ display: "flex", gap: "4px" }}>
          <button onClick={prevMonth} style={{ width: "28px", height: "28px", borderRadius: "8px", border: "1px solid rgba(90,90,95,0.2)", background: "transparent", cursor: "pointer", color: "var(--placeholder-color)", display: "flex", alignItems: "center", justifyContent: "center" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(120,120,130,0.12)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <ChevronLeftIcon style={{ width: "14px", height: "14px" }} />
          </button>
          <button onClick={nextMonth} style={{ width: "28px", height: "28px", borderRadius: "8px", border: "1px solid rgba(90,90,95,0.2)", background: "transparent", cursor: "pointer", color: "var(--placeholder-color)", display: "flex", alignItems: "center", justifyContent: "center" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(120,120,130,0.12)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <ChevronRightIcon style={{ width: "14px", height: "14px" }} />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "2px", width: "100%" }}>
        {DAYS.map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: "10px", fontWeight: 700, color: "var(--placeholder-color)", padding: "4px 0", letterSpacing: "0.05em" }}>
            {d}
          </div>
        ))}
        {cells.map((day, i) => (
          <div
            key={i}
            onClick={() => day && setSelected(new Date(currentYear, currentMonth, day))}
            style={{
              textAlign: "center",
              height: "34px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "10px",
              cursor: day ? "pointer" : "default",
              fontSize: "12px",
              fontWeight: isToday(day!) ? 800 : isSelected(day!) ? 700 : 500,
              color: isToday(day!) ? "#818cf8" : isSelected(day!) ? "#c7d2fe" : day ? "var(--placeholder-color)" : "transparent",
              background: isSelected(day!) && isToday(day!)
                ? "rgba(129,140,248,0.2)"
                : isSelected(day!)
                ? "rgba(129,140,248,0.15)"
                : isToday(day!)
                ? "rgba(129,140,248,0.08)"
                : "transparent",
              border: isToday(day!) ? "1px solid rgba(129,140,248,0.35)" : "1px solid transparent",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { if (day && !isSelected(day)) e.currentTarget.style.background = "rgba(120,120,130,0.1)"; }}
            onMouseLeave={e => {
              if (!day) return;
              if (isSelected(day)) e.currentTarget.style.background = isToday(day) ? "rgba(129,140,248,0.2)" : "rgba(129,140,248,0.15)";
              else e.currentTarget.style.background = isToday(day) ? "rgba(129,140,248,0.08)" : "transparent";
            }}
          >
            {day}
            {day && scheduledDays.has(day) && (
              <div style={{ width: "3px", height: "3px", borderRadius: "50%", background: "#34d399", marginTop: "1px" }} />
            )}
          </div>
        ))}
      </div>

      <div style={{ height: "1px", background: "rgba(90,90,95,0.15)" }} />

      {/* Selected day */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-color)" }}>
          {selectedIsToday ? "Today" : selected.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}
        </span>
        {tabsForSelected.length > 0 && (
          <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "20px", background: "rgba(52,211,153,0.12)", color: "#34d399", fontWeight: 600, border: "1px solid rgba(52,211,153,0.2)" }}>
            {tabsForSelected.length} tab{tabsForSelected.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {tabsForSelected.length === 0 ? (
        <div style={{ textAlign: "center", padding: "16px 0", color: "var(--placeholder-color)", fontSize: "12px" }}>
          No tabs scheduled
        </div>
      ) : tabsForSelected.map(tab => (
        <div key={tab.id} onClick={() => chrome.tabs.create({ url: tab.url })}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(120,120,130,0.08)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px", borderRadius: "10px", cursor: "pointer", border: "1px solid rgba(90,90,95,0.18)", marginBottom: "6px" }}>
          <img src={tab.favicon} width={18} height={18} style={{ borderRadius: "4px", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-color)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tab.title}</div>
            <div style={{ fontSize: "10px", color: "#34d399", marginTop: "2px" }}>{new Date(tab.scheduledAt!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
          </div>
        </div>
      ))}

      {(scheduledTabs || []).length > 0 && (
        <>
          <div style={{ height: "1px", background: "rgba(90,90,95,0.15)" }} />
          <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--placeholder-color)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>All Upcoming</div>
          {(scheduledTabs || []).sort((a, b) => a.scheduledAt! - b.scheduledAt!).map(tab => (
            <div key={tab.id} onClick={() => chrome.tabs.create({ url: tab.url })}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(120,120,130,0.08)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px", borderRadius: "10px", cursor: "pointer", border: "1px solid rgba(90,90,95,0.18)", marginBottom: "6px" }}>
              <img src={tab.favicon} width={18} height={18} style={{ borderRadius: "4px", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-color)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tab.title}</div>
                <div style={{ fontSize: "10px", color: "var(--placeholder-color)", marginTop: "2px" }}>
                  {new Date(tab.scheduledAt!).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {new Date(tab.scheduledAt!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "6px", background: new Date(tab.scheduledAt!) > today ? "rgba(129,140,248,0.1)" : "rgba(120,120,130,0.1)", color: new Date(tab.scheduledAt!) > today ? "#818cf8" : "var(--placeholder-color)", fontWeight: 600, flexShrink: 0, border: "1px solid " + (new Date(tab.scheduledAt!) > today ? "rgba(129,140,248,0.2)" : "rgba(120,120,130,0.15)") }}>
                {new Date(tab.scheduledAt!) > today ? "upcoming" : "past"}
              </span>
            </div>
          ))}
        </>
      )}

      {(scheduledTabs || []).length === 0 && (
        <div style={{ textAlign: "center", padding: "8px 0", fontSize: "12px", color: "var(--placeholder-color)" }}>
          Click ⋯ on any tab to schedule it
        </div>
      )}
    </div>
  );
}