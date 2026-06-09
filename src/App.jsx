import { useState, useEffect, useRef } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import nlp from "compromise";

const AREAS = [
  { id: "inbox", label: "Inbox", emoji: "📥", color: "#64748b", glow: "rgba(100, 116, 139, 0.25)" },
  { id: "sat", label: "SAT & College", emoji: "📚", color: "#818cf8", glow: "rgba(129, 140, 248, 0.25)" },
  { id: "projects", label: "Projects", emoji: "🏗️", color: "#fbbf24", glow: "rgba(251, 191, 36, 0.25)" },
  { id: "travel", label: "Travel", emoji: "✈️", color: "#22d3ee", glow: "rgba(34, 211, 238, 0.25)" },
  { id: "sports", label: "Sports", emoji: "🏃", color: "#34d399", glow: "rgba(52, 211, 153, 0.25)" },
  { id: "school", label: "School", emoji: "🏫", color: "#f472b6", glow: "rgba(244, 114, 182, 0.25)" },
  { id: "health", label: "Health", emoji: "🩺", color: "#f87171", glow: "rgba(248, 113, 113, 0.25)" },
];
const PRIOS = ["High", "Medium", "Low"];
const STATUSES = ["Todo", "In Progress", "Done"];
const PRIO_COLOR = { High: "#f87171", Medium: "#fbbf24", Low: "#94a3b8" };

// ── 智能识别语料库 ───────────────────────────────────────────────────────────
const KEYWORDS = {
  sat: [
    "sat", "toefl", "college", "ap ", "application", "essay", "admission", "score", "gpa",
    "reading", "writing", "vocab", "vocabulary", "grammar", "psat", "act", "practice test",
    "college board", "common app", "recommendation", "transcript", "申请", "词汇", "语法",
    "阅读", "写作", "托福", "大学", "入学", "成绩", "考试报名", "文书", "推荐信",
  ],
  projects: [
    "schoolent", "robot", "café", "cafe", "ordering", "ocr", "react", "vite", "deploy",
    "backend", "frontend", "bug", "github", "commit", "api", "pr ", "code", "function",
    "vue", "javascript", "typescript", "python", "golang", "database", "d1", "cloudflare",
    "worker", "fix", "feature", "refactor", "component", "endpoint", "schema", "migration",
    "项目", "代码", "开发", "部署", "前端", "后端", "数据库", "接口", "爬虫", "构建", "编译",
  ],
  travel: [
    "svalbard", "arctic", "flight", "hotel", "passport", "visa", "trip", "booking", "packing",
    "norway", "longyearbyen", "itinerary", "hostel", "airbnb", "luggage", "insurance", "consul",
    "ds-160", "ds160", "interview", "appointment", "sevis", "i-20", "i20", "北极", "挪威", "旅行",
    "签证", "护照", "机票", "行程", "订酒店", "打包", "申根", "面签", "预约单", "面谈", "使馆",
  ],
  sports: [
    "climb", "climbing", "rifle", "shooting", "training", "workout", "gym", "practice",
    "top-rope", "bouldering", "stretch", "warmup", "cardio", "run", "攀岩", "气步枪", "射击",
    "训练", "体育", "比赛", "教练", "拉伸", "热身", "健身", "跑步", "有氧",
  ],
  school: [
    "homework", "class", "exam", "assignment", "union", "teacher", "student", "presentation",
    "project report", "quiz", "midterm", "final", "lecture", "textbook", "chapter", "syllabus",
    "学生会", "作业", "考试", "课", "老师", "期末", "月考", "报告", "实验", "教材", "大纲", "讲义",
  ],
  health: [
    "rhinitis", "doctor", "medicine", "sleep", "headache", "allergy", "medication", "rest",
    "hospital", "appointment", "clinic", "therapy", "symptom", "症状", "鼻炎", "医生", "药",
    "睡眠", "头痛", "过敏", "休息", "就医", "复查", "门诊", "配药",
  ],
};

const COMPOUND_OVERRIDES = [
  { phrases: ["us visa", "f1 visa", "f-1 visa", "student visa", "美签", "学生签证", "i-20", "i20"], area: "sat" },
];

function detectArea(text) {
  const lower = text.toLowerCase();
  for (const override of COMPOUND_OVERRIDES) {
    if (override.phrases.some(p => lower.includes(p))) {
      return override.area;
    }
  }
  for (const [area, kws] of Object.entries(KEYWORDS)) {
    if (kws.some(k => lower.includes(k))) return area;
  }
  try {
    if (typeof nlp !== "undefined") {
      const doc = nlp(text);
      const nouns = doc.nouns().out("array").map(n => n.toLowerCase());
      for (const noun of nouns) {
        for (const [area, kws] of Object.entries(KEYWORDS)) {
          if (kws.some(k => k.includes(noun) || noun.includes(k))) {
            return area;
          }
        }
      }
    }
  } catch (e) { }
  return null;
}

// ── 辅助函数 ─────────────────────────────────────────────────────────────────
function genId() { return Math.random().toString(36).slice(2, 9); }
function getTodayStr() { return new Date().toISOString().slice(0, 10); }
function daysFromNow(d) {
  if (!d) return null;
  return Math.ceil((new Date(d) - new Date(getTodayStr())) / 86400000);
}
function dueLabel(d) {
  const n = daysFromNow(d);
  if (n === null) return "";
  if (n < 0) return `${Math.abs(n)}d overdue`;
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  return `${n}d`;
}
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start(); osc.stop(ctx.currentTime + 0.8);
  } catch { }
}

function parseSubtasks(notesText) {
  if (!notesText) return [];
  const lines = notesText.split("\n");
  const subtasks = [];
  lines.forEach(line => {
    const match = line.trim().match(/^[-*]\s*(.*)/);
    if (match && match[1].trim()) {
      subtasks.push({ id: genId(), text: match[1].trim(), done: false });
    }
  });
  return subtasks;
}

// ── FIX: strip checklist lines from prose so notes don't duplicate SubtaskList ──
function getNonChecklistNotes(notesText) {
  if (!notesText) return "";
  return notesText
    .split("\n")
    .filter(line => !line.trim().match(/^[-*]\s+\S/))
    .join("\n")
    .trim();
}

// ── Hooks ─────────────────────────────────────────────────────────────────────
function useClock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
  return t;
}

function usePomodoro() {
  const WORK = 25 * 60, BREAK = 5 * 60;
  const [secs, setSecs] = useState(WORK);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState("work");
  const ref = useRef({ secs: WORK, mode: "work" });
  ref.current = { secs, mode };

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const { secs: s, mode: m } = ref.current;
      if (s <= 1) {
        beep();
        const next = m === "work" ? "break" : "work";
        setMode(next); setSecs(next === "work" ? WORK : BREAK); setRunning(false);
      } else {
        setSecs(s - 1);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  const pct = mode === "work" ? 1 - secs / WORK : 1 - secs / BREAK;

  return {
    display: `${mm}:${ss}`, running, mode, pct,
    toggle: () => setRunning(r => !r),
    reset: () => { setRunning(false); setSecs(mode === "work" ? WORK : BREAK); },
    switchMode: () => {
      const next = mode === "work" ? "break" : "work";
      setMode(next); setSecs(next === "work" ? WORK : BREAK); setRunning(false);
    },
  };
}

const sel = { background: "rgba(39, 39, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 8, padding: "6px 10px", color: "#e2e8f0", fontSize: 12, outline: "none" };

// ── UI primitives ─────────────────────────────────────────────────────────────
function SideItem({ active, onClick, label, emoji, count, color, glow }) {
  return (
    <div onClick={onClick} style={{
      padding: "10px 16px",
      margin: "4px 10px",
      borderRadius: 12,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: 12,
      background: active ? "rgba(255, 255, 255, 0.06)" : "transparent",
      boxShadow: active ? `inset 0 0 12px ${glow || "rgba(255, 255, 255, 0.05)"}` : "none",
      borderLeft: `3px solid ${active ? (color || "#818cf8") : "transparent"}`,
      transition: "all 0.2s"
    }}>
      <span style={{ fontSize: 16 }}>{emoji}</span>
      <span style={{ flex: 1, color: active ? "#ffffff" : "#94a3b8", fontSize: 13, fontWeight: active ? 600 : 400 }}>{label}</span>
      {count > 0 && <span style={{ background: "rgba(255,255,255,0.08)", borderRadius: 99, padding: "2px 8px", fontSize: 11, color: "#94a3b8" }}>{count}</span>}
    </div>
  );
}
function Panel({ title, children }) {
  return (
    <div className="liquid-glass" style={{ padding: 18, marginBottom: 16 }}>
      <div style={{ fontWeight: 600, fontSize: 11, color: "#64748b", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.1em" }}>{title}</div>
      {children}
    </div>
  );
}
function StatCard({ label, value, color = "#f8fafc" }) {
  return (
    <div className="liquid-glass" style={{ padding: "18px 20px" }}>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
function SectionLabel({ emoji, label, sub, accent, noMargin }) {
  return (
    <div style={{ marginBottom: noMargin ? 0 : 12 }}>
      <span style={{ fontWeight: 700, fontSize: 15, color: accent || "#f8fafc" }}>{emoji} {label}</span>
      {sub && <span style={{ fontSize: 12, color: "#64748b", marginLeft: 8 }}>{sub}</span>}
    </div>
  );
}

// ── Subtask List Component ─────────────────────────────────────────────────────
function SubtaskList({ subtasks, onToggle }) {
  if (!subtasks || subtasks.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 10, marginLeft: 25, paddingLeft: 10, borderLeft: "2px solid rgba(255,255,255,0.06)" }}>
      {subtasks.map(st => (
        <div key={st.id} onClick={(e) => { e.stopPropagation(); onToggle(st.id); }}
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
          <div style={{
            width: 14, height: 14, borderRadius: 4, border: "1px solid rgba(255,255,255,0.15)",
            background: st.done ? "#10b981" : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.1s"
          }}>
            {st.done && <span style={{ color: "#000", fontSize: 10, fontWeight: "bold" }}>✓</span>}
          </div>
          <span style={{ fontSize: 13, color: st.done ? "#475569" : "#94a3b8", textDecoration: st.done ? "line-through" : "none" }}>
            {st.text}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── TaskCard ──────────────────────────────────────────────────────────────────
function TaskCard({ task, updateTask, deleteTask, areaOf, isPinned, toggleToday, isEditing, editField, startEdit, setEditField, saveEdit, cancelEdit, compact }) {
  const a = areaOf(task.area);
  const d = daysFromNow(task.due);
  const isDone = task.status === "Done";
  const [hov, setHov] = useState(false);
  const [showNotes, setShowNotes] = useState(true);

  // Only the non-checklist lines of notes are shown as prose
  const proseNotes = getNonChecklistNotes(task.notes);
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  // Show the toggle button if there's either prose notes or subtasks
  const hasExpandable = hasSubtasks || !!proseNotes;

  const handleToggleSubtask = (subId) => {
    const updated = (task.subtasks || []).map(st => st.id === subId ? { ...st, done: !st.done } : st);
    updateTask(task.id, { subtasks: updated });
  };

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      className="liquid-glass"
      style={{
        padding: compact ? "10px 14px" : "14px 18px",
        opacity: isDone ? 0.45 : 1,
        borderColor: isEditing ? "rgba(99, 102, 241, 0.4)" : "rgba(255,255,255,0.06)",
        background: isDone ? "rgba(10, 10, 15, 0.2)" : "rgba(18, 18, 28, 0.45)"
      }}>
      {isEditing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input defaultValue={task.title} onChange={e => setEditField(f => ({ ...f, title: e.target.value }))}
            placeholder="Task title" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 14, outline: "none" }} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select defaultValue={task.area} onChange={e => setEditField(f => ({ ...f, area: e.target.value }))} style={sel}>
              {AREAS.map(a => <option key={a.id} value={a.id}>{a.emoji} {a.label}</option>)}
            </select>
            <select defaultValue={task.priority} onChange={e => setEditField(f => ({ ...f, priority: e.target.value }))} style={sel}>
              {PRIOS.map(p => <option key={p}>{p}</option>)}
            </select>
            <select defaultValue={task.status} onChange={e => setEditField(f => ({ ...f, status: e.target.value }))} style={sel}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <input type="date" defaultValue={task.due} onChange={e => setEditField(f => ({ ...f, due: e.target.value }))} style={sel} />
          </div>
          <input defaultValue={task.url || ""} onChange={e => setEditField(f => ({ ...f, url: e.target.value }))}
            placeholder="🔗 URL (GitHub, doc, site...)" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "8px 12px", color: "#e2e8f0", fontSize: 12, outline: "none" }} />
          <textarea defaultValue={task.notes || ""} onChange={e => {
            const val = e.target.value;
            setEditField(f => ({ ...f, notes: val, subtasks: parseSubtasks(val) }));
          }}
            placeholder="Notes / Use '- item' on new lines to auto-create checklist" rows={3}
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "8px 12px", color: "#94a3b8", fontSize: 13, resize: "vertical", fontFamily: "inherit", outline: "none" }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={saveEdit} style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "6px 16px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Save</button>
            <button onClick={cancelEdit} style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "none", borderRadius: 8, padding: "6px 16px", cursor: "pointer", fontSize: 12 }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input type="checkbox" checked={isDone} onChange={e => updateTask(task.id, { status: e.target.checked ? "Done" : "Todo" })}
              style={{ accentColor: "#818cf8", width: 18, height: 18, cursor: "pointer", flexShrink: 0 }} />
            <span style={{ fontSize: 16, flexShrink: 0 }}>{a.emoji}</span>
            <span style={{ flex: 1, textDecoration: isDone ? "line-through" : "none", color: isDone ? "#475569" : "#f8fafc", fontSize: compact ? 14 : 15, fontWeight: 500 }}>{task.title}</span>
            {task.due && d !== null && (
              <span style={{ fontSize: 11, background: d < 0 ? "#7f1d1d" : d === 0 ? "#ef4444" : d <= 2 ? "#854d0e" : "rgba(255,255,255,0.08)", color: "#fff", borderRadius: 6, padding: "2px 8px", flexShrink: 0 }}>{dueLabel(task.due)}</span>
            )}
            <span style={{ fontSize: 12, color: PRIO_COLOR[task.priority], flexShrink: 0, fontWeight: 600 }}>{task.priority}</span>
            {task.url && (
              <a href={task.url} target="_blank" rel="noreferrer" title={task.url}
                style={{ fontSize: 14, color: "#818cf8", textDecoration: "none", flexShrink: 0 }} onClick={e => e.stopPropagation()}>🔗</a>
            )}
            {/* Only show expand toggle if there's something to expand */}
            {hasExpandable && (
              <button onClick={() => setShowNotes(p => !p)} title="Toggle notes"
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: 0, color: showNotes ? "#94a3b8" : "#475569", flexShrink: 0 }}>
                {showNotes ? "▲" : "▼"}
              </button>
            )}
            {(hov || isPinned) && (
              <button onClick={() => toggleToday(task.id)} title={isPinned ? "Unpin" : "Pin to Focus"}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 0, color: isPinned ? "#fbbf24" : "rgba(255,255,255,0.15)", flexShrink: 0 }}>⭐</button>
            )}
            {hov && <>
              <button onClick={startEdit} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#818cf8", padding: 0 }}>✏️</button>
              <button onClick={() => deleteTask(task.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#f87171", padding: 0 }}>🗑</button>
            </>}
          </div>

          {/* Subtasks checklist — only shown when expanded */}
          {showNotes && <SubtaskList subtasks={task.subtasks} onToggle={handleToggleSubtask} />}

          {/* Prose notes (checklist lines already stripped) — only shown when expanded */}
          {proseNotes && showNotes && (
            <div style={{ marginTop: 8, marginLeft: 30, fontSize: 13, color: "#94a3b8", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{proseNotes}</div>
          )}

          {/* Collapsed preview: show prose snippet if available, otherwise subtask count */}
          {!showNotes && hasExpandable && (
            <div style={{ marginTop: 4, marginLeft: 30, fontSize: 11, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {proseNotes
                ? proseNotes
                : hasSubtasks
                  ? `${task.subtasks.filter(s => s.done).length}/${task.subtasks.length} subtasks done`
                  : ""}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskList({ tasks, updateTask, deleteTask, areaOf, todayPicks, toggleToday, editId, setEditId, editField, setEditField, compact }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 8 : 10 }}>
      {tasks.map(t => (
        <TaskCard key={t.id} task={t} updateTask={updateTask} deleteTask={deleteTask} areaOf={areaOf}
          isPinned={todayPicks.includes(t.id)} toggleToday={toggleToday}
          isEditing={editId === t.id} editField={editField}
          startEdit={() => { setEditId(t.id); setEditField({}); }}
          setEditField={setEditField}
          saveEdit={() => { updateTask(t.id, editField); setEditId(null); setEditField({}); }}
          cancelEdit={() => { setEditId(null); setEditField({}); }}
          compact={compact} />
      ))}
    </div>
  );
}

// ── Focus Mode ────────────────────────────────────────────────────────────────
function FocusMode({ tasks, updateTask, areaOf, onExit, qi, setQi, addTask, inputRef, allTasks }) {
  const clock = useClock();
  const pomo = usePomodoro();
  const [isInputFocused, setIsInputFocused] = useState(false);

  useEffect(() => {
    const handler = () => { if (!document.fullscreenElement) onExit(); };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, [onExit]);

  const nextDue = allTasks
    .filter(t => t.due && t.status !== "Done" && daysFromNow(t.due) !== null && daysFromNow(t.due) >= 0)
    .sort((a, b) => a.due.localeCompare(b.due))[0];
  const doneToday = allTasks.filter(t => t.status === "Done" && t.created === getTodayStr()).length;

  const timeStr = clock.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = clock.toLocaleDateString("en-GB", { weekday: "long", month: "short", day: "numeric" });

  const pomoColor = pomo.mode === "work" ? "#818cf8" : "#34d399";

  const handleToggleSubtask = (taskId, subId) => {
    const targetTask = allTasks.find(t => t.id === taskId);
    if (!targetTask) return;
    const updated = (targetTask.subtasks || []).map(st => st.id === subId ? { ...st, done: !st.done } : st);
    updateTask(taskId, { subtasks: updated });
  };

  const predictedAreaId = detectArea(qi);
  const predictedArea = predictedAreaId ? AREAS.find(a => a.id === predictedAreaId) : null;

  return (
    <div style={{
      minHeight: "100vh", background: "#06060c",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "system-ui, sans-serif", color: "#e2e8f0",
      overflowY: "auto", padding: "40px 24px",
    }}>
      <button onClick={onExit} style={{
        position: "fixed", top: 24, right: 24, zIndex: 50,
        background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.06)",
        borderRadius: 8, padding: "8px 16px",
        color: "#94a3b8", cursor: "pointer", fontSize: 13,
        backdropFilter: "blur(12px)",
      }}>Exit <span style={{ color: "#475569", fontSize: 10, marginLeft: 3 }}>ESC</span></button>

      <div className="liquid-glass" style={{ width: "100%", maxWidth: 640, padding: "32px 40px", animation: "fluid-pulse 8s infinite ease-in-out" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 30, paddingBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <div style={{
              fontSize: 48, fontWeight: 200, letterSpacing: "0.02em",
              color: "#ffffff", fontVariantNumeric: "tabular-nums", lineHeight: 1,
            }}>{timeStr}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>{dateStr}</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <svg width={80} height={80} style={{ flexShrink: 0 }}>
              <circle cx={40} cy={40} r={32} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={4} />
              <circle cx={40} cy={40} r={32} fill="none" stroke={pomoColor} strokeWidth={4}
                strokeDasharray={2 * Math.PI * 32} strokeDashoffset={2 * Math.PI * 32 * (1 - pomo.pct)} strokeLinecap="round"
                transform="rotate(-90 40 40)"
                style={{ transition: "stroke-dashoffset 0.9s linear" }} />
              <text x="40" y="38" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="500"
                style={{ fontVariantNumeric: "tabular-nums" }}>{pomo.display}</text>
              <text x="40" y="50" textAnchor="middle" fill="#64748b" fontSize="8" letterSpacing="0.1em">
                {pomo.mode === "work" ? "FOCUS" : "BREAK"}
              </text>
            </svg>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <button onClick={pomo.toggle} style={{
                background: pomo.running ? "rgba(255, 255, 255, 0.05)" : pomoColor,
                color: pomo.running ? "#94a3b8" : "#fff",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8, padding: "6px 16px",
                cursor: "pointer", fontSize: 12, fontWeight: 600, minWidth: 84,
                transition: "all 0.15s",
              }}>{pomo.running ? "⏸ Pause" : "▶ Start"}</button>
              <button onClick={pomo.reset} style={{
                background: "transparent", border: "none",
                borderRadius: 6, cursor: "pointer", color: "#64748b", fontSize: 11, textAlign: "left", paddingLeft: 4
              }}>Reset</button>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {tasks.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
              <div style={{ fontSize: 14, color: "#64748b" }}>No tasks pinned yet.</div>
              <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>Hover a task outside Focus mode and click ⭐</div>
            </div>
          ) : tasks.map(t => {
            const a = areaOf(t.area);
            const isDone = t.status === "Done";
            const d = daysFromNow(t.due);
            // Strip checklist lines from prose in focus mode too
            const prose = getNonChecklistNotes(t.notes);
            return (
              <div key={t.id} className="liquid-glass" style={{
                background: isDone ? "rgba(10, 10, 15, 0.2)" : "rgba(255, 255, 255, 0.01)",
                borderColor: isDone ? "rgba(255, 255, 255, 0.02)" : "rgba(255,255,255,0.06)",
                padding: "18px 22px",
                opacity: isDone ? 0.35 : 1,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                  <div onClick={() => updateTask(t.id, { status: isDone ? "Todo" : "Done" })}
                    style={{
                      width: 24, height: 24, borderRadius: "50%",
                      border: `2px solid ${isDone ? "#10b981" : "rgba(255,255,255,0.2)"}`,
                      background: isDone ? "#10b981" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, cursor: "pointer", marginTop: 2,
                      transition: "all 0.15s",
                    }}>
                    {isDone && <span style={{ color: "#000", fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 16, fontWeight: 500, lineHeight: 1.4, marginBottom: 8,
                      color: isDone ? "#475569" : "#ffffff",
                      textDecoration: isDone ? "line-through" : "none",
                    }}>{t.title}</div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, color: "#64748b" }}>{a.emoji} {a.label}</span>
                      {t.due && d !== null && (
                        <span style={{
                          fontSize: 11, borderRadius: 4, padding: "2px 8px",
                          fontWeight: "bold",
                          background: d < 0 ? "#7f1d1d" : d === 0 ? "#ef4444" : d <= 2 ? "#b45309" : "rgba(255,255,255,0.04)",
                          color: d <= 2 ? "#ffffff" : "#94a3b8",
                        }}>{dueLabel(t.due)}</span>
                      )}
                      <span style={{ fontSize: 11, color: PRIO_COLOR[t.priority] }}>{t.priority}</span>
                    </div>

                    <SubtaskList subtasks={t.subtasks} onToggle={(subId) => handleToggleSubtask(t.id, subId)} />

                    {/* Prose-only notes in focus mode */}
                    {prose && (
                      <div style={{ marginTop: 8, fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>{prose}</div>
                    )}
                  </div>

                  {t.url && (
                    <a href={t.url} target="_blank" rel="noreferrer"
                      style={{
                        fontSize: 11, color: "#818cf8", textDecoration: "none", flexShrink: 0,
                        background: "rgba(99, 102, 241, 0.1)", border: "1px solid rgba(99, 102, 241, 0.2)",
                        borderRadius: 6, padding: "4px 10px",
                      }}
                      onClick={e => e.stopPropagation()}>🔗 open</a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {(doneToday > 0 || nextDue) && (
          <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            {doneToday > 0 ? <span style={{ color: "#10b981", fontWeight: 500 }}>✓ {doneToday} done today</span> : <span />}
            {nextDue && (
              <span style={{ color: "#64748b" }}>
                Next: {areaOf(nextDue.area).emoji} {nextDue.title.length > 24 ? nextDue.title.slice(0, 24) + "…" : nextDue.title}
                <span style={{ marginLeft: 6, color: daysFromNow(nextDue.due) <= 1 ? "#f87171" : "#64748b" }}>
                  {dueLabel(nextDue.due)}
                </span>
              </span>
            )}
          </div>
        )}
      </div>

      <div style={{
        marginTop: 32,
        width: "100%",
        maxWidth: 640,
        background: isInputFocused
          ? "rgba(24, 24, 40, 0.75)"
          : "rgba(18, 18, 28, 0.45)",
        backdropFilter: "blur(24px) saturate(210%)",
        WebkitBackdropFilter: "blur(24px) saturate(210%)",
        borderRadius: 20,
        border: isInputFocused
          ? "1px solid rgba(129, 140, 248, 0.5)"
          : "1px solid rgba(255, 255, 255, 0.06)",
        boxShadow: isInputFocused
          ? "0 30px 60px rgba(0, 0, 0, 0.9), 0 0 30px rgba(129, 140, 248, 0.25)"
          : "0 16px 40px rgba(0, 0, 0, 0.65)",
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <input
            ref={inputRef}
            value={qi}
            onChange={e => setQi(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addTask()}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            placeholder="Dump anything into Inbox..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#ffffff",
              fontSize: 18,
              fontWeight: 400,
              padding: "4px 2px",
              letterSpacing: "0.02em",
              caretColor: "#818cf8",
            }}
          />
          <button
            onClick={addTask}
            style={{
              background: isInputFocused ? "rgba(129, 140, 248, 0.2)" : "rgba(255, 255, 255, 0.03)",
              color: isInputFocused ? "#a5b4fc" : "#475569",
              border: isInputFocused ? "1px solid rgba(129, 140, 248, 0.4)" : "1px solid rgba(255, 255, 255, 0.05)",
              borderRadius: 12,
              width: 44,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 20,
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            +
          </button>
        </div>

        {qi.trim() && (
          <div style={{
            fontSize: 12,
            color: predictedArea ? predictedArea.color : "#64748b",
            paddingLeft: 4,
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontWeight: 500
          }}>
            <span style={{ opacity: 0.6 }}>Will route to →</span>
            <span>
              {predictedArea ? `${predictedArea.emoji} ${predictedArea.label}` : "📥 Inbox"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Today View ────────────────────────────────────────────────────────────────
function TodayView({ allTasks, todayPicks, toggleToday, updateTask, deleteTask, areaOf, editId, setEditId, editField, setEditField, onFocus }) {
  const [showAll, setShowAll] = useState(false);
  const focusTasks = todayPicks.map(id => allTasks.find(t => t.id === id)).filter(Boolean);
  const urgentTasks = allTasks.filter(t =>
    t.status !== "Done" && !todayPicks.includes(t.id) &&
    t.due && daysFromNow(t.due) !== null && daysFromNow(t.due) <= 0
  ).sort((a, b) => a.due.localeCompare(b.due));
  const restTasks = allTasks.filter(t =>
    t.status !== "Done" && !todayPicks.includes(t.id) &&
    !(t.due && daysFromNow(t.due) !== null && daysFromNow(t.due) <= 0)
  );
  const taskProps = { updateTask, deleteTask, areaOf, todayPicks, toggleToday, editId, setEditId, editField, setEditField };
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontWeight: 700, fontSize: 20, color: "#ffffff" }}>🎯 Today's Focus</h2>
        <button onClick={onFocus} className="liquid-glass" style={{ marginLeft: "auto", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 18px", color: "#a5b4fc", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          Focus Mode →
        </button>
      </div>
      <div style={{ marginBottom: 28 }}>
        <SectionLabel emoji="⭐" label="Focus" sub={`${focusTasks.length}/3 pinned · decide when clear-headed`} />
        {focusTasks.length === 0
          ? <div className="liquid-glass" style={{ color: "#64748b", fontSize: 14, padding: "18px 20px" }}>Nothing pinned yet — go to any area, hover a task, click ⭐</div>
          : <TaskList tasks={focusTasks} {...taskProps} />}
      </div>
      {urgentTasks.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionLabel emoji="🔥" label="Needs Attention" sub="due today or overdue — not pinned" accent="#f87171" />
          <TaskList tasks={urgentTasks} {...taskProps} compact />
        </div>
      )}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, cursor: "pointer" }} onClick={() => setShowAll(p => !p)}>
          <SectionLabel emoji="📋" label="All Open Tasks" sub={`${restTasks.length} remaining`} noMargin />
          <span style={{ color: "#64748b", fontSize: 13, marginLeft: "auto" }}>{showAll ? "▲ hide" : "▼ show"}</span>
        </div>
        {showAll && (restTasks.length === 0
          ? <div style={{ color: "#64748b", fontSize: 13, padding: "8px 0" }}>All clear.</div>
          : AREAS.map(area => {
            const group = restTasks.filter(t => t.area === area.id);
            if (group.length === 0) return null;
            return (
              <div key={area.id} style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 13, color: area.color, fontWeight: 600, marginBottom: 8, paddingLeft: 4 }}>{area.emoji} {area.label}</div>
                <TaskList tasks={group} {...taskProps} compact />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Area View ─────────────────────────────────────────────────────────────────
function AreaView({ area, tasks, updateTask, deleteTask, areaOf, todayPicks, toggleToday, editId, setEditId, editField, setEditField }) {
  const [filter, setFilter] = useState("All");
  const filtered = filter === "All" ? tasks : tasks.filter(t => t.status === filter);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <span style={{ fontSize: 24 }}>{area.emoji}</span>
        <h2 style={{ margin: 0, fontWeight: 700, fontSize: 20, color: "#fff" }}>{area.label}</h2>
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          {["All", ...STATUSES].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              style={{ background: filter === s ? "rgba(255,255,255,0.08)" : "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 99, padding: "5px 14px", color: filter === s ? "#fff" : "#64748b", fontSize: 12, cursor: "pointer", transition: "all 0.15s" }}>
              {s}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0
        ? <div className="liquid-glass" style={{ color: "#64748b", fontSize: 14, padding: 24 }}>No tasks here yet.</div>
        : <TaskList tasks={filtered} updateTask={updateTask} deleteTask={deleteTask} areaOf={areaOf}
          todayPicks={todayPicks} toggleToday={toggleToday}
          editId={editId} setEditId={setEditId} editField={editField} setEditField={setEditField} />}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ donutData, barData, upcoming, total, done, areaOf, setView }) {
  return (
    <div>
      <h2 style={{ margin: "0 0 20px", fontWeight: 700, fontSize: 20, color: "#fff" }}>📊 Dashboard</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        <StatCard label="Total" value={total} color="#ffffff" />
        <StatCard label="Done" value={done} color="#34d399" />
        <StatCard label="Remaining" value={total - done} color="#fbbf24" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16, marginBottom: 24 }}>
        <Panel title="Completion">
          <PieChart width={180} height={150}>
            <Pie data={donutData} cx={90} cy={70} innerRadius={42} outerRadius={65} dataKey="value" strokeWidth={0}>
              {donutData.map((_, i) => <Cell key={i} fill={["#818cf8", "rgba(255,255,255,0.05)"][i]} />)}
            </Pie>
          </PieChart>
          <div style={{ textAlign: "center", fontSize: 13, color: "#94a3b8", marginTop: -8 }}>
            {total > 0 ? Math.round((done / total) * 100) : 0}% done
          </div>
        </Panel>
        <Panel title="Open by Area">
          {barData.length === 0
            ? <div style={{ color: "#64748b", fontSize: 13, padding: "20px 0" }}>No open tasks.</div>
            : <ResponsiveContainer width="100%" height={150}>
              <BarChart data={barData} barSize={26}>
                <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 16 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  contentStyle={{ background: "#181824", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#fff" }}
                  labelStyle={{ color: "#fff" }} itemStyle={{ color: "#94a3b8" }}
                  formatter={(v, n, p) => [v, p.payload.label]} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} onClick={data => setView(`area:${data.areaId}`)}>
                  {barData.map((d, i) => <Cell key={i} fill={d.color} style={{ cursor: "pointer" }} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>}
        </Panel>
      </div>
      <Panel title="Due in 7 days">
        {upcoming.length === 0
          ? <div style={{ color: "#64748b", fontSize: 13 }}>Nothing due soon.</div>
          : upcoming.map(t => {
            const d = daysFromNow(t.due), a = areaOf(t.area);
            return (
              <div key={t.id} onClick={() => setView(`area:${t.area}`)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                <span>{a.emoji}</span>
                <span style={{ flex: 1, color: "#f1f5f9", fontWeight: 500 }}>{t.title}</span>
                {t.url && <span style={{ fontSize: 12, color: "#818cf8" }}>🔗</span>}
                <span style={{ background: d === 0 ? "#ef4444" : d <= 2 ? "#854d0e" : "rgba(255,255,255,0.06)", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "#fff" }}>{dueLabel(t.due)}</span>
                <span style={{ fontSize: 12, color: PRIO_COLOR[t.priority], fontWeight: 600 }}>{t.priority}</span>
                <span style={{ fontSize: 12, color: "#475569" }}>→</span>
              </div>
            );
          })}
      </Panel>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [tasks, setTasks] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("today");
  const [todayPicks, setTodayPicks] = useState([]);
  const [focusMode, setFocusMode] = useState(false);
  const [expandCapture, setExpandCapture] = useState(false);
  const [qi, setQi] = useState("");
  const [qArea, setQArea] = useState("inbox");
  const [qPrio, setQPrio] = useState("Medium");
  const [qDue, setQDue] = useState("");
  const [qUrl, setQUrl] = useState("");
  const [qNotes, setQNotes] = useState("");
  const [autoDetected, setAutoDetected] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editField, setEditField] = useState({});
  const inputRef = useRef();

  useEffect(() => {
    try {
      const t = localStorage.getItem("bot-tasks");
      if (t) setTasks(JSON.parse(t));
      const td = localStorage.getItem("bot-today");
      if (td) setTodayPicks(JSON.parse(td));
    } catch { }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem("bot-tasks", JSON.stringify(tasks)); } catch { }
  }, [tasks, loaded]);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem("bot-today", JSON.stringify(todayPicks)); } catch { }
  }, [todayPicks, loaded]);

  useEffect(() => {
    if (focusMode) {
      document.documentElement.requestFullscreen?.().catch(() => { });
    } else {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => { });
    }
  }, [focusMode]);

  function handleCaptureInput(val) {
    setQi(val);
    const detected = detectArea(val);
    if (detected) { setQArea(detected); setAutoDetected(detected); }
    else setAutoDetected(null);
  }

  function addTask() {
    if (!qi.trim()) return;
    const subtasks = parseSubtasks(qNotes);
    setTasks(p => [{ id: genId(), title: qi.trim(), area: qArea, due: qDue, priority: qPrio, status: "Todo", created: getTodayStr(), url: qUrl.trim(), notes: qNotes.trim(), subtasks }, ...p]);
    setQi(""); setQDue(""); setQUrl(""); setQNotes(""); setAutoDetected(null);
    inputRef.current?.focus();
  }

  function updateTask(id, patch) { setTasks(p => p.map(t => t.id === id ? { ...t, ...patch } : t)); }
  function deleteTask(id) { setTasks(p => p.filter(t => t.id !== id)); setTodayPicks(p => p.filter(i => i !== id)); }
  function toggleToday(id) {
    setTodayPicks(p => p.includes(id) ? p.filter(i => i !== id) : p.length < 3 ? [...p, id] : p);
  }

  const areaOf = id => AREAS.find(a => a.id === id) || AREAS[0];
  const todayTasks = todayPicks.map(id => tasks.find(t => t.id === id)).filter(Boolean);

  if (focusMode) return (
    <FocusMode tasks={todayTasks} updateTask={updateTask} areaOf={areaOf}
      onExit={() => setFocusMode(false)}
      qi={qi} setQi={setQi} addTask={addTask} inputRef={inputRef}
      allTasks={tasks} />
  );

  let viewTasks = tasks, viewArea = null;
  if (view.startsWith("area:")) {
    const aId = view.slice(5);
    viewArea = AREAS.find(a => a.id === aId);
    viewTasks = tasks.filter(t => t.area === aId);
  }

  const done = tasks.filter(t => t.status === "Done").length;
  const total = tasks.length;
  const donutData = [{ name: "Done", value: done || 0 }, { name: "Remaining", value: Math.max(0, total - done) }];
  const barData = AREAS.filter(a => a.id !== "inbox").map(a => ({
    name: a.emoji, label: a.label, areaId: a.id,
    count: tasks.filter(t => t.area === a.id && t.status !== "Done").length, color: a.color,
  })).filter(d => d.count > 0);
  const upcoming = tasks
    .filter(t => t.due && t.status !== "Done" && daysFromNow(t.due) !== null && daysFromNow(t.due) <= 7 && daysFromNow(t.due) >= 0)
    .sort((a, b) => a.due.localeCompare(b.due));

  const sharedTaskProps = { updateTask, deleteTask, areaOf, todayPicks, toggleToday, editId, setEditId, editField, setEditField };
  const detectedArea = autoDetected ? AREAS.find(a => a.id === autoDetected) : null;

  return (
    <div style={{ display: "flex", height: "100vh", background: "#06060c", color: "#e2e8f0", fontSize: 14 }}>
      <div className="liquid-glass" style={{ width: 220, margin: "16px 0 16px 16px", display: "flex", flexDirection: "column", padding: "20px 0", flexShrink: 0, background: "rgba(10, 10, 15, 0.45)" }}>
        <div style={{ padding: "0 20px 16px", fontWeight: 700, fontSize: 16, letterSpacing: "-0.5px", color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          🧠 Brain Offload
          <button onClick={() => setFocusMode(true)}
            style={{ background: "rgba(129, 140, 248, 0.15)", border: "1px solid rgba(129, 140, 248, 0.3)", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 11, color: "#a5b4fc", fontWeight: 600 }}>
            FOCUS
          </button>
        </div>

        {[{ id: "today", label: "Today's Focus", emoji: "🎯" }, { id: "dashboard", label: "Dashboard", emoji: "📊" }].map(v => (
          <SideItem key={v.id} active={view === v.id} onClick={() => setView(v.id)} label={v.label} emoji={v.emoji} />
        ))}

        <div style={{ padding: "16px 20px 6px", fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>Areas</div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {AREAS.map(a => {
            const cnt = tasks.filter(t => t.area === a.id && t.status !== "Done").length;
            return <SideItem key={a.id} active={view === `area:${a.id}`} onClick={() => setView(`area:${a.id}`)}
              label={a.label} emoji={a.emoji} count={cnt} color={a.color} glow={a.glow} />;
          })}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: 16 }}>
        <div className="liquid-glass" style={{ padding: "12px 18px", marginBottom: 16, background: "rgba(15, 15, 25, 0.5)" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <input ref={inputRef} value={qi}
                onChange={e => handleCaptureInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTask()}
                placeholder="Dump anything here... Enter to save"
                style={{ width: "100%", background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.07)", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box" }} />
              {detectedArea && (
                <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#818cf8", pointerEvents: "none", background: "rgba(18, 18, 28, 0.9)", padding: "2px 8px", borderRadius: 6, border: "1px solid rgba(129, 140, 248, 0.3)" }}>
                  → {detectedArea.emoji} {detectedArea.label}
                </span>
              )}
            </div>
            <button onClick={() => setExpandCapture(p => !p)}
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 14px", cursor: "pointer", color: "#94a3b8", fontSize: 13, flexShrink: 0 }}>
              {expandCapture ? "▲" : "▼"} details
            </button>
            <button onClick={addTask}
              style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
              + Add
            </button>
          </div>
          {expandCapture && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
              <div style={{ display: "flex", gap: 10 }}>
                <select value={qArea} onChange={e => { setQArea(e.target.value); setAutoDetected(null); }}
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 12px", color: "#e2e8f0", fontSize: 13, flex: 1, outline: "none" }}>
                  {AREAS.map(a => <option key={a.id} value={a.id} style={{ background: "#181824" }}>{a.emoji} {a.label}</option>)}
                </select>
                <select value={qPrio} onChange={e => setQPrio(e.target.value)}
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 12px", color: "#e2e8f0", fontSize: 13, outline: "none" }}>
                  {PRIOS.map(p => <option key={p} style={{ background: "#181824" }}>{p}</option>)}
                </select>
                <input type="date" value={qDue} onChange={e => setQDue(e.target.value)}
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 12px", color: "#e2e8f0", fontSize: 13, outline: "none" }} />
              </div>
              <input value={qUrl} onChange={e => setQUrl(e.target.value)}
                placeholder="🔗 URL (GitHub, Google Doc, website...)"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 14px", color: "#e2e8f0", fontSize: 13, outline: "none" }} />
              <textarea value={qNotes} onChange={e => setQNotes(e.target.value)}
                placeholder="Notes / context (Use '- item' on new lines to auto-create checklist)" rows={3}
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 14px", color: "#94a3b8", fontSize: 13, resize: "vertical", fontFamily: "inherit", outline: "none" }} />
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
          {view === "dashboard" && <Dashboard donutData={donutData} barData={barData} upcoming={upcoming} total={total} done={done} areaOf={areaOf} setView={setView} />}
          {view === "today" && <TodayView allTasks={tasks} todayPicks={todayPicks} toggleToday={toggleToday} onFocus={() => setFocusMode(true)} {...sharedTaskProps} />}
          {view.startsWith("area:") && <AreaView area={viewArea} tasks={viewTasks} {...sharedTaskProps} />}
        </div>
      </div>
    </div>
  );
}