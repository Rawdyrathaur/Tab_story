import { useState, type CSSProperties } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { db } from "../db";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_COLORS = ["#facc15", "#22c55e", "#22c55e", "#22c55e", "#22c55e", "#22c55e", "#facc15"];
const DAY_BG = ["rgba(250,204,21,0.12)", "rgba(34,197,94,0.12)", "rgba(34,197,94,0.12)", "rgba(34,197,94,0.12)", "rgba(34,197,94,0.12)", "rgba(34,197,94,0.12)", "rgba(250,204,21,0.12)"];

export function CalendarPanel() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selected, setSelected] = useState<Date>(today);

  const scheduledTabs = useLiveQuery(() =>
    db.tabs.toArray().then((tabs) => tabs.filter((tab) => tab.scheduledAt && tab.scheduledAt > 0))
  );

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();

  const scheduledDays = new Set(
    (scheduledTabs || [])
      .filter((tab) => {
        const scheduledDate = new Date(tab.scheduledAt!);
        return scheduledDate.getMonth() === currentMonth && scheduledDate.getFullYear() === currentYear;
      })
      .map((tab) => new Date(tab.scheduledAt!).getDate())
  );

  const cells: (number | null)[] = [];
  for (let index = 0; index < firstDay; index += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((year) => year - 1);
    } else {
      setCurrentMonth((month) => month - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((year) => year + 1);
    } else {
      setCurrentMonth((month) => month + 1);
    }
  };

  const isToday = (day: number) =>
    day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

  const isSelected = (day: number) =>
    day === selected.getDate() && currentMonth === selected.getMonth() && currentYear === selected.getFullYear();

  const tabsForSelected = (scheduledTabs || []).filter((tab) => {
    const scheduledDate = new Date(tab.scheduledAt!);
    return scheduledDate.toDateString() === selected.toDateString();
  });

  const selectedIsToday = selected.toDateString() === today.toDateString();

  const navBtn: CSSProperties = {
    width: "22px",
    height: "22px",
    borderRadius: "5px",
    border: "1px solid rgba(150,150,160,0.3)",
    background: "rgba(120,120,130,0.08)",
    cursor: "pointer",
    color: "var(--text-color)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    padding: 0,
    boxSizing: "border-box",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", boxSizing: "border-box", paddingRight: "6px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", paddingRight: "10px" }}>
        <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-color)", letterSpacing: "-0.01em", flex: 1, minWidth: 0 }}>
          {MONTHS[currentMonth]} {currentYear}
        </span>
        <div style={{ display: "flex", gap: "3px", flexShrink: 0 }}>
          <button
            onClick={prevMonth}
            style={navBtn}
            onMouseEnter={(event) => (event.currentTarget.style.background = "rgba(120,120,130,0.2)")}
            onMouseLeave={(event) => (event.currentTarget.style.background = "rgba(120,120,130,0.08)")}
          >
            <ChevronLeftIcon style={{ width: "12px", height: "12px" }} />
          </button>
          <button
            onClick={nextMonth}
            style={navBtn}
            onMouseEnter={(event) => (event.currentTarget.style.background = "rgba(120,120,130,0.2)")}
            onMouseLeave={(event) => (event.currentTarget.style.background = "rgba(120,120,130,0.08)")}
          >
            <ChevronRightIcon style={{ width: "12px", height: "12px" }} />
          </button>
        </div>
      </div>

      <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", borderSpacing: 0 }}>
        <thead>
          <tr>
            {DAYS.map((dayLabel, index) => (
              <th key={dayLabel + index} style={{ textAlign: "center", paddingBottom: "8px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", borderRadius: "5px", fontSize: "9px", fontWeight: 700, color: DAY_COLORS[index], background: DAY_BG[index] }}>
                  {dayLabel}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: cells.length / 7 }, (_, row) => (
            <tr key={row}>
              {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
                const selectedCell = !!day && isSelected(day);
                const todayCell = !!day && isToday(day);
                const hasDot = !!day && scheduledDays.has(day);

                return (
                  <td key={col} style={{ padding: "2px 5px", textAlign: "center" }} onClick={() => day && setSelected(new Date(currentYear, currentMonth, day))}>
                    {day ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          height: "34px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "11px",
                          fontWeight: todayCell ? 800 : selectedCell ? 700 : 500,
                          color: todayCell ? "#a5b4fc" : selectedCell ? "#ffffff" : "rgba(220,220,235,0.85)",
                          background: selectedCell && todayCell ? "rgba(129,140,248,0.25)" : selectedCell ? "rgba(129,140,248,0.18)" : todayCell ? "rgba(129,140,248,0.1)" : "transparent",
                          border: todayCell ? "1px solid rgba(165,180,252,0.6)" : selectedCell ? "1px solid rgba(99,102,241,0.0)" : "1px solid transparent",
                          transition: "background 0.12s",
                          boxSizing: "border-box",
                          width: "100%",
                        }}
                        onMouseEnter={(event) => {
                          if (!selectedCell) (event.currentTarget as HTMLDivElement).style.background = "rgba(120,120,130,0.15)";
                        }}
                        onMouseLeave={(event) => {
                          const element = event.currentTarget as HTMLDivElement;
                          if (selectedCell && todayCell) element.style.background = "rgba(129,140,248,0.25)";
                          else if (selectedCell) element.style.background = "rgba(129,140,248,0.18)";
                          else if (todayCell) element.style.background = "rgba(129,140,248,0.1)";
                          else element.style.background = "transparent";
                        }}
                      >
                        {day}
                        {hasDot && <div style={{ width: "3px", height: "3px", borderRadius: "50%", background: "#34d399", marginTop: "1px" }} />}
                      </div>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ height: "1px", background: "rgba(90,90,95,0.18)", margin: "10px 0 8px" }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-color)", lineHeight: 1.2 }}>
            {selectedIsToday ? "Today" : selected.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}
          </div>
          <div style={{ fontSize: "10px", color: "var(--placeholder-color)", marginTop: "2px" }}>
            {tabsForSelected.length === 0 ? "No tasks scheduled" : `${tabsForSelected.length} task${tabsForSelected.length > 1 ? "s" : ""} scheduled`}
          </div>
        </div>
        {tabsForSelected.length > 0 && (
          <span style={{ fontSize: "10px", padding: "3px 9px", borderRadius: "20px", background: "rgba(52,211,153,0.12)", color: "#34d399", fontWeight: 700, border: "1px solid rgba(52,211,153,0.25)", flexShrink: 0 }}>
            {tabsForSelected.length} task{tabsForSelected.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {tabsForSelected.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0 8px", gap: "6px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "rgba(129,140,248,0.08)", border: "1px solid rgba(129,140,248,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>📅</div>
          <div style={{ fontSize: "11.5px", color: "var(--placeholder-color)", fontWeight: 500, textAlign: "center", lineHeight: 1.5 }}>No tabs scheduled for this day</div>
          <div style={{ fontSize: "10px", color: "rgba(150,150,160,0.6)", textAlign: "center" }}>Click ⋯ on any tab to schedule it</div>
        </div>
      ) : (
        tabsForSelected.map((tab) => (
          <div
            key={tab.id}
            onClick={() => chrome.tabs.create({ url: tab.url })}
            onMouseEnter={(event) => (event.currentTarget.style.background = "rgba(129,140,248,0.06)")}
            onMouseLeave={(event) => (event.currentTarget.style.background = "transparent")}
            style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 10px", borderRadius: "10px", cursor: "pointer", border: "1px solid rgba(129,140,248,0.15)", borderLeft: "3px solid #818cf8", marginBottom: "5px", boxSizing: "border-box", minWidth: 0 }}
          >
            <div style={{ width: "16px", height: "16px", borderRadius: "50%", flexShrink: 0, border: "2px solid rgba(129,140,248,0.5)" }} />
            <img src={tab.favicon} width={14} height={14} style={{ borderRadius: "3px", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-color)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tab.title}</div>
              <div style={{ fontSize: "10px", color: "#818cf8", marginTop: "2px", fontWeight: 500 }}>⏰ {new Date(tab.scheduledAt!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
          </div>
        ))
      )}

      {(scheduledTabs || []).length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "10px 0 8px" }}>
            <div style={{ flex: 1, height: "1px", background: "rgba(90,90,95,0.18)" }} />
            <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--placeholder-color)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Upcoming</span>
            <div style={{ flex: 1, height: "1px", background: "rgba(90,90,95,0.18)" }} />
          </div>
          {(scheduledTabs || []).sort((a, b) => a.scheduledAt! - b.scheduledAt!).map((tab) => {
            const isPast = new Date(tab.scheduledAt!) <= today;

            return (
              <div
                key={tab.id}
                onClick={() => chrome.tabs.create({ url: tab.url })}
                onMouseEnter={(event) => (event.currentTarget.style.background = "rgba(120,120,130,0.07)")}
                onMouseLeave={(event) => (event.currentTarget.style.background = "transparent")}
                style={{ display: "flex", alignItems: "center", gap: "9px", padding: "8px 10px", borderRadius: "10px", cursor: "pointer", border: "1px solid rgba(90,90,95,0.15)", borderLeft: isPast ? "3px solid rgba(120,120,130,0.3)" : "3px solid #34d399", marginBottom: "5px", boxSizing: "border-box", minWidth: 0, opacity: isPast ? 0.6 : 1 }}
              >
                <div style={{ width: "15px", height: "15px", borderRadius: "50%", flexShrink: 0, border: isPast ? "2px solid rgba(120,120,130,0.3)" : "2px solid rgba(52,211,153,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", color: isPast ? "rgba(120,120,130,0.5)" : "#34d399" }}>{isPast ? "✓" : ""}</div>
                <img src={tab.favicon} width={14} height={14} style={{ borderRadius: "3px", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-color)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tab.title}</div>
                  <div style={{ fontSize: "10px", color: "var(--placeholder-color)", marginTop: "2px" }}>{new Date(tab.scheduledAt!).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {new Date(tab.scheduledAt!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
                <span style={{ fontSize: "9px", padding: "2px 7px", borderRadius: "6px", flexShrink: 0, background: isPast ? "rgba(120,120,130,0.1)" : "rgba(52,211,153,0.1)", color: isPast ? "var(--placeholder-color)" : "#34d399", fontWeight: 700, border: isPast ? "1px solid rgba(120,120,130,0.15)" : "1px solid rgba(52,211,153,0.2)" }}>{isPast ? "done" : "soon"}</span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
