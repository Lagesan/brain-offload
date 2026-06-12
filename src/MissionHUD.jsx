import React, { useEffect, useMemo, useState } from "react";

const AREAS = [
  { id: "sat", label: "SAT & College", color: "#818cf8" },
  { id: "projects", label: "Projects", color: "#fbbf24" },
  { id: "travel", label: "Travel", color: "#22d3ee" },
  { id: "sports", label: "Sports", color: "#34d399" },
  { id: "school", label: "School", color: "#f472b6" },
  { id: "health", label: "Health", color: "#f87171" },
];

const PHASE_THRESHOLDS = [21, 14, 7, 3];

// 优化为星舰边缘多折角（HUD style）的精细遥测面板
function HudPanel({ label, children, width = "auto" }) {
  return (
    <div style={{
      width: width,
      height: 86,
      border: "1px solid rgba(255, 255, 255, 0.08)",
      background: "rgba(8, 10, 16, 0.7)",
      borderRadius: 4,
      position: "relative",
      padding: "10px 12px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      boxSizing: "border-box",
    }}>
      {/* HUD 标志性的四个角落装饰微线 */}
      <div style={{ position: "absolute", top: -1, left: -1, width: 4, height: 4, borderLeft: "1px solid #38bdf8", borderTop: "1px solid #38bdf8" }} />
      <div style={{ position: "absolute", top: -1, right: -1, width: 4, height: 4, borderRight: "1px solid #38bdf8", borderTop: "1px solid #38bdf8" }} />
      <div style={{ position: "absolute", bottom: -1, left: -1, width: 4, height: 4, borderLeft: "1px solid #38bdf8", borderBottom: "1px solid #38bdf8" }} />
      <div style={{ position: "absolute", bottom: -1, right: -1, width: 4, height: 4, borderRight: "1px solid #38bdf8", borderBottom: "1px solid #38bdf8" }} />

      <div style={{
        fontSize: 9,
        color: "#64748b",
        letterSpacing: "0.18em",
        fontWeight: 700,
        textTransform: "uppercase",
        lineHeight: 1,
      }}>{label}</div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexGrow: 1, marginTop: 4 }}>
        {children}
      </div>
    </div>
  );
}

export default function MissionHUD({ tasks }) {
  const [targetDate, setTargetDate] = useState(() => {
    try { return localStorage.getItem("hud-target") || ""; } catch { return ""; }
  });
  const [targetLabel, setTargetLabel] = useState(() => {
    try { return localStorage.getItem("hud-label") || "EXAM"; } catch { return "EXAM"; }
  });
  const [editOpen, setEditOpen] = useState(false);
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("hud-target", targetDate);
    } catch {
      return;
    }
  }, [targetDate]);

  useEffect(() => {
    try {
      localStorage.setItem("hud-label", targetLabel);
    } catch {
      return;
    }
  }, [targetLabel]);

  const countdown = useMemo(() => {
    if (!targetDate) return null;
    const diff = new Date(targetDate + "T23:59:59") - clock;
    if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0, elapsed: true };
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      mins: Math.floor((diff % 3600000) / 60000),
      secs: Math.floor((diff % 60000) / 1000),
      elapsed: false,
    };
  }, [targetDate, clock]);

  const daysLeft = countdown?.days ?? null;
  const activePhaseIdx = useMemo(() => {
    if (daysLeft === null) return 0;
    const idx = PHASE_THRESHOLDS.findIndex(t => daysLeft > t);
    return idx === -1 ? PHASE_THRESHOLDS.length : idx;
  }, [daysLeft]);

  const phases = ["KICKOFF", "SPRINT", "MID", "CRUNCH", targetLabel || "TARGET"];
  const doneTasks = tasks.filter(t => t.status === "Done").length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((doneTasks / total) * 100) : 0;
  const CIRC = 2 * Math.PI * 18;

  // 微动效注入
  const animationStyles = `
    @keyframes pulseActive {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; filter: drop-shadow(0 0 4px #06b6d4); }
    }
    @keyframes lineFlow {
      0% { stroke-dashoffset: 20; }
      100% { stroke-dashoffset: 0; }
    }
    .hud-input-field:focus {
      border-color: #38bdf8 !important;
      background: rgba(255, 255, 255, 0.05) !important;
    }
  `;

  return (
    <div style={{
      height: 130,
      backgroundColor: "#030407",
      backgroundImage: `
        linear-gradient(rgba(255, 255, 255, 0.01) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.01) 1px, transparent 1px)
      `,
      backgroundSize: "24px 24px",
      borderTop: "1px solid rgba(255, 255, 255, 0.1)",
      display: "grid",
      gridTemplateColumns: "240px 1fr 240px",
      alignItems: "center",
      gap: 24,
      padding: "10px 24px 8px",
      flexShrink: 0,
      userSelect: "none",
      position: "relative",
      boxShadow: "0 -12px 36px rgba(0, 0, 0, 0.9)",
      boxSizing: "border-box",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <style dangerouslySetInnerHTML={{ __html: animationStyles }} />

      {/* 左侧区域：系统遥测与姿态仪 */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <HudPanel label="Areas" width="110px">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 14px)", gap: "8px" }}>
            {AREAS.map(a => {
              const open = tasks.filter(t => t.area === a.id && t.status !== "Done").length;
              const isActive = open > 0;
              return (
                <div key={a.id} title={`${a.label}: ${open} open`}
                  style={{
                    width: 14,
                    height: 14,
                    border: `1px solid ${isActive ? a.color : "rgba(255,255,255,0.06)"}`,
                    backgroundColor: isActive ? "transparent" : "rgba(255,255,255,0.02)",
                    borderRadius: "2px",
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.3s",
                  }}>
                  {isActive && (
                    <div style={{
                      width: 6,
                      height: 6,
                      backgroundColor: a.color,
                      borderRadius: "1px",
                      boxShadow: `0 0 6px ${a.color}`,
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </HudPanel>

        {/* 航天姿态指示仪 (Pitch Indicator / FPV) */}
        <div style={{
          width: 86,
          height: 86,
          border: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(8, 10, 16, 0.5)",
          borderRadius: 4,
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          {/* 姿态仪背景刻度 */}
          <svg width="100%" height="100%" viewBox="0 0 80 80" style={{ position: "absolute", pointerEvents: "none" }}>
            {/* 俯仰刻度线 */}
            <line x1="25" y1="25" x2="55" y2="25" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <line x1="30" y1="32" x2="50" y2="32" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <line x1="25" y1="55" x2="55" y2="55" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <line x1="30" y1="48" x2="50" y2="48" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

            {/* 圆形姿态指示界圈 */}
            <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" strokeDasharray="3 3" />

            {/* 经典飞行航迹矢量符号 (Flight Path Vector) */}
            <circle cx="40" cy="40" r="4" fill="none" stroke="#10b981" strokeWidth="1.5" />
            <line x1="32" y1="40" x2="36" y2="40" stroke="#10b981" strokeWidth="1.5" />
            <line x1="44" y1="40" x2="48" y2="40" stroke="#10b981" strokeWidth="1.5" />
            <line x1="40" y1="32" x2="40" y2="36" stroke="#10b981" strokeWidth="1.5" />
          </svg>
          <div style={{
            position: "absolute",
            bottom: 4,
            width: "100%",
            textAlign: "center",
            fontSize: 7,
            fontFamily: "monospace",
            color: "#475569",
            letterSpacing: "0.1em"
          }}>ATTITUDE</div>
        </div>
      </div>

      {/* 中间区域：分层布局，拒绝遮挡 */}
      <div style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "4px 0",
        boxSizing: "border-box",
      }}>
        {/* 1. 顶部：扁平化阶段遥测指示带 (Segmented Flight Tape) */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "0 10px",
          boxSizing: "border-box",
          position: "relative",
          height: 30,
        }}>
          {/* 背景贯穿细实线 */}
          <div style={{
            position: "absolute",
            left: 10,
            right: 10,
            top: "50%",
            height: 1,
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            zIndex: 1,
          }} />

          {phases.map((ph, i) => {
            const isCurrent = activePhaseIdx === i;
            const isPassed = activePhaseIdx > i;

            return (
              <div key={ph} style={{
                position: "relative",
                zIndex: 2,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "18%",
              }}>
                {/* 阶段名称 */}
                <div style={{
                  fontSize: isCurrent ? 10 : 8,
                  fontWeight: isCurrent ? 800 : 500,
                  color: isCurrent ? "#06b6d4" : isPassed ? "#64748b" : "#1e293b",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 3,
                  transition: "all 0.3s",
                }}>
                  {ph}
                </div>
                {/* 物理遥测点 */}
                <div style={{
                  width: isCurrent ? 8 : 6,
                  height: isCurrent ? 8 : 6,
                  borderRadius: "50%",
                  border: isCurrent ? "2px solid #06b6d4" : "1px solid rgba(255, 255, 255, 0.2)",
                  backgroundColor: isCurrent ? "#030407" : isPassed ? "rgba(255, 255, 255, 0.3)" : "#030407",
                  boxShadow: isCurrent ? "0 0 8px #06b6d4" : "none",
                  transition: "all 0.3s",
                }} />
              </div>
            );
          })}
        </div>

        {/* 2. 中间：T- 倒计时主屏 */}
        <div style={{
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: 48,
        }}>
          {countdown ? (
            <div style={{
              fontSize: 28,
              fontWeight: 700,
              color: countdown.elapsed ? "#f87171" : "#f8fafc",
              letterSpacing: "0.08em",
              fontVariantNumeric: "tabular-nums",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              lineHeight: 1,
              textShadow: countdown.elapsed ? "0 0 12px rgba(248, 113, 113, 0.4)" : "0 0 8px rgba(255, 255, 255, 0.1)",
            }}>
              T- {`${String(countdown.days).padStart(2, "0")}:${String(countdown.hours).padStart(2, "0")}:${String(countdown.mins).padStart(2, "0")}:${String(countdown.secs).padStart(2, "0")}`}
            </div>
          ) : (
            <button onClick={() => setEditOpen(true)}
              style={{
                background: "transparent",
                border: "1px dashed rgba(255,255,255,0.15)",
                color: "#94a3b8",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
                padding: "4px 16px",
                borderRadius: 4,
                letterSpacing: "0.15em",
                fontFamily: "monospace",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"}>
              INITIALIZE TARGET DATE
            </button>
          )}
        </div>

        {/* 3. 底部：目标标签与系统状态码 */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 12,
          height: 14,
        }}>
          <div style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: countdown ? "#10b981" : "#f59e0b" }} />
          <div style={{
            fontSize: 9,
            color: "#475569",
            letterSpacing: "0.2em",
            fontWeight: 700,
            textTransform: "uppercase",
          }}>
            SYSTEM: {targetLabel || "PENDING"} // ACTIVE_RUN
          </div>
        </div>
      </div>

      {/* 右侧区域：任务统计与遥测环 */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "flex-end" }}>
        <HudPanel label="Payload" width="100px">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#f8fafc",
              fontVariantNumeric: "tabular-nums",
              fontFamily: "monospace",
              lineHeight: 1,
            }}>{String(doneTasks).padStart(2, "0")}</span>
            <div style={{ fontSize: 8, color: "#475569", fontWeight: 700, marginTop: 4, letterSpacing: "0.08em" }}>
              COMPLETED / {total}
            </div>
          </div>
        </HudPanel>

        {/* 精细遥测进度环与设置 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative", width: 56, height: 56 }}>
            <svg width={56} height={56} viewBox="0 0 72 72">
              {/* 暗色轨道网格 */}
              <circle cx={36} cy={36} r={24} fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth={4} />
              <circle cx={36} cy={36} r={24} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
              {/* 高对比度数据环 */}
              <circle cx={36} cy={36} r={24}
                fill="none"
                stroke={pct === 100 ? "#10b981" : "#38bdf8"}
                strokeWidth={3}
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - pct / 100)}
                strokeLinecap="square"
                transform="rotate(-90 36 36)"
                style={{ transition: "stroke-dashoffset 0.6s ease" }} />
              <text x="36" y="40" textAnchor="middle"
                fill="#f8fafc" fontSize="12" fontWeight="700" fontFamily="monospace">{pct}%</text>
            </svg>
          </div>

          <button onClick={() => setEditOpen(p => !p)} title="Configure System Target"
            style={{
              width: 30,
              height: 30,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "4px",
              color: "#94a3b8",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              e.currentTarget.style.color = "#94a3b8";
            }}>
            ⚙
          </button>
        </div>
      </div>

      {/* 精细暗色磨砂配置面板 */}
      {editOpen && (
        <div style={{
          position: "absolute",
          bottom: 140,
          right: 24,
          zIndex: 200,
          background: "#08090f",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: 6,
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          minWidth: 240,
          boxShadow: "0 20px 40px rgba(0,0,0,0.8)",
        }}>
          <div style={{
            fontSize: 9,
            color: "#64748b",
            letterSpacing: "0.15em",
            fontWeight: 800,
            textTransform: "uppercase",
          }}>SYSTEM TARGET CONFIG</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 8, color: "#475569", fontWeight: 700 }}>LABEL / DESTINATION</span>
            <input
              type="text"
              value={targetLabel}
              onChange={e => setTargetLabel(e.target.value.toUpperCase())}
              placeholder="E.G. ORBIT_INSERTION"
              className="hud-input-field"
              style={{
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 4,
                padding: "6px 8px",
                color: "#f1f5f9",
                fontSize: 11,
                outline: "none",
                fontFamily: "monospace",
                transition: "all 0.2s"
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 8, color: "#475569", fontWeight: 700 }}>TARGET DATE</span>
            <input
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              className="hud-input-field"
              style={{
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 4,
                padding: "6px 8px",
                color: "#f1f5f9",
                fontSize: 11,
                outline: "none",
                fontFamily: "monospace",
                transition: "all 0.2s"
              }}
            />
          </div>

          <button onClick={() => setEditOpen(false)}
            style={{
              background: "#38bdf8",
              color: "#030407",
              border: "none",
              borderRadius: 4,
              padding: "8px",
              cursor: "pointer",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginTop: 4,
            }}>
            LOCK TARGET
          </button>
        </div>
      )}
    </div>
  );
}