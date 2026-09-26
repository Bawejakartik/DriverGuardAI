// import { useEffect, useState, useRef } from "react";
// import io from "socket.io-client";
// import {
//   LineChart,
//   Line,
//   YAxis,
//   Tooltip,
//   ResponsiveContainer,
// } from "recharts";

// export default function Dashboard() {
//   const [data, setData] = useState([]);
//   const [status, setStatus] = useState("CONNECTING...");
//   const lastAlertTime = useRef(0);

//   useEffect(() => {
//     const socket = io("http://localhost:5000", {
//       transports: ["websocket"],
//     });

//     socket.on("metrics", (payload) => {
//       setStatus(payload.status);
//       setData((prev) => [...prev.slice(-49), payload]);

//       // 🔔 Smart alert
//       if (["DROWSY", "HEAD NODDING"].includes(payload.status)) {
//         const now = Date.now();
//         if (now - lastAlertTime.current > 2000) {
//           const audio = new Audio("https://www.soundjay.com/button/beep-07.wav");
//           audio.play();
//           lastAlertTime.current = now;
//         }
//       }
//     });

//     return () => socket.disconnect();
//   }, []);

//   const getColor = () => {
//     switch (status) {
//       case "DROWSY":
//         return "#ef4444";
//       case "YAWNING":
//         return "#facc15";
//       case "HEAD NODDING":
//         return "#f97316";
//       default:
//         return "#22c55e";
//     }
//   };

//   const latest = data[data.length - 1];

//   return (
//     <div style={{
//       background: "#0f172a",
//       color: "white",
//       minHeight: "100vh",
//       padding: "20px",
//       fontFamily: "sans-serif"
//     }}>

//       {/* HEADER */}
//       <h1 style={{
//         textAlign: "center",
//         marginBottom: "25px",
//         fontSize: "28px",
//         fontWeight: "600"
//       }}>
//         Driver Fatigue Monitoring System
//       </h1>

//       {/* CAMERA + STATUS */}
//       <div style={{
//         display: "flex",
//         gap: "20px",
//         flexWrap: "wrap",
//         justifyContent: "center"
//       }}>

//         {/* CAMERA CARD */}
//         <div style={{
//           background: "#1e293b",
//           padding: "10px",
//           borderRadius: "12px",
//           boxShadow: "0 0 10px rgba(0,0,0,0.5)"
//         }}>
//           <img
//             src="http://localhost:5000/video"
//             alt="Driver Camera"
//             style={{
//               width: "400px",
//               borderRadius: "10px"
//             }}
//           />
//         </div>

//         {/* STATUS CARD */}
//         <div style={{
//           width: "250px",
//           padding: "20px",
//           borderRadius: "12px",
//           backgroundColor: getColor(),
//           display: "flex",
//           flexDirection: "column",
//           justifyContent: "center",
//           alignItems: "center",
//           fontSize: "1.4rem",
//           fontWeight: "600",
//           boxShadow: "0 0 10px rgba(0,0,0,0.5)"
//         }}>
//           Current Status
//           <div style={{ marginTop: "10px" }}>{status}</div>
//         </div>
//       </div>

//       {/* LIVE METRICS */}
//       {latest && (
//         <div style={{
//           marginTop: "25px",
//           textAlign: "center",
//           background: "#1e293b",
//           padding: "15px",
//           borderRadius: "10px"
//         }}>
//           <h3>Live Metrics</h3>
//           <p>Eye Aspect Ratio (EAR): {latest.ear}</p>
//           <p>Mouth Aspect Ratio (MAR): {latest.mar}</p>
//           <p>Head Movement: {latest.pitch}</p>
//         </div>
//       )}

//       {/* GRAPHS */}
//       <div style={{ marginTop: "30px" }}>

//         {/* EAR GRAPH */}
//         <div style={{
//           height: "250px",
//           background: "#1e293b",
//           marginBottom: "20px",
//           padding: "10px",
//           borderRadius: "10px"
//         }}>
//           <h3>Eye Closure Detection (EAR)</h3>
//           <ResponsiveContainer>
//             <LineChart data={data}>
//               <YAxis domain={[0, 0.4]} />
//               <Tooltip />
//               <Line type="monotone" dataKey="ear" stroke="#38bdf8" dot={false} />
//             </LineChart>
//           </ResponsiveContainer>
//         </div>

//         {/* MAR GRAPH FIXED */}
//         <div style={{
//           height: "250px",
//           background: "#1e293b",
//           marginBottom: "20px",
//           padding: "10px",
//           borderRadius: "10px"
//         }}>
//           <h3>Yawning Detection (MAR)</h3>
//           <ResponsiveContainer>
//             <LineChart data={data}>
//               {/* 🔥 FIXED RANGE */}
//               <YAxis domain={[0, 0.8]} />
//               <Tooltip />
//               <Line type="monotone" dataKey="mar" stroke="#f59e0b" dot={false} />
//             </LineChart>
//           </ResponsiveContainer>
//         </div>

//         {/* HEAD GRAPH */}
//         <div style={{
//           height: "250px",
//           background: "#1e293b",
//           padding: "10px",
//           borderRadius: "10px"
//         }}>
//           <h3>Head Movement (Pitch Stability)</h3>
//           <ResponsiveContainer>
//             <LineChart data={data}>
//               <YAxis domain={[0, 0.02]} />
//               <Tooltip />
//               <Line type="monotone" dataKey="pitch" stroke="#ef4444" dot={false} />
//             </LineChart>
//           </ResponsiveContainer>
//         </div>

//       </div>
//     </div>
//   );
// }


import { useEffect, useMemo, useRef, useState } from "react";
import io from "socket.io-client";

import {
  LineChart,
  Line,
  YAxis,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const SOCKET_URL = "http://localhost:5000";

const MAX_POINTS = 60;

const STATUS_CONFIG = {
  ALERT: {
    label: "ALERT",
    color: "#22c55e",
    bg: "rgba(34, 197, 94, 0.12)",
    border: "rgba(34, 197, 94, 0.3)",
  },
  "EYES CLOSED": {
    label: "EYES CLOSED",
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.3)",
  },
  DROWSY: {
    label: "DROWSY",
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.12)",
    border: "rgba(239, 68, 68, 0.3)",
  },
  YAWNING: {
    label: "YAWNING",
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.3)",
  },
  "HEAD NODDING": {
    label: "HEAD NODDING",
    color: "#fb923c",
    bg: "rgba(251, 146, 60, 0.12)",
    border: "rgba(251, 146, 60, 0.3)",
  },
  CONNECTING: {
    label: "CONNECTING...",
    color: "#94a3b8",
    bg: "rgba(148, 163, 184, 0.12)",
    border: "rgba(148, 163, 184, 0.3)",
  },
};

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function MetricCard({ title, value, unit, subtitle, icon }) {
  return (
    <div className="metric-card">
      <div className="metric-card-top">
        <div className="metric-icon">{icon}</div>
        <span className="metric-title">{title}</span>
      </div>

      <div className="metric-value">
        {value}
        {unit && <span>{unit}</span>}
      </div>

      <div className="metric-subtitle">{subtitle}</div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  data,
  dataKey,
  domain,
  stroke,
  formatter,
}) {
  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{
              top: 10,
              right: 20,
              left: 0,
              bottom: 5,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148, 163, 184, 0.10)"
              vertical={false}
            />

            <XAxis
              dataKey="time"
              tick={{
                fill: "#64748b",
                fontSize: 11,
              }}
              axisLine={false}
              tickLine={false}
              minTickGap={25}
            />

            <YAxis
              domain={domain}
              tick={{
                fill: "#64748b",
                fontSize: 11,
              }}
              axisLine={false}
              tickLine={false}
              width={42}
              tickFormatter={formatter}
            />

            <Tooltip
              contentStyle={{
                background: "#0f172a",
                border: "1px solid rgba(148, 163, 184, 0.18)",
                borderRadius: "10px",
                color: "#fff",
                boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
              }}
              labelStyle={{
                color: "#94a3b8",
                marginBottom: "5px",
              }}
              formatter={(value) => [
                formatter ? formatter(value) : value,
                title,
              ]}
            />

            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={stroke}
              strokeWidth={2.5}
              dot={false}
              activeDot={{
                r: 5,
                strokeWidth: 2,
                fill: "#0f172a",
              }}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [status, setStatus] = useState("CONNECTING...");
  const [connected, setConnected] = useState(false);

  const lastAlertTime = useRef(0);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      setConnected(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
      setStatus("CONNECTING...");
    });

    socket.on("metrics", (payload) => {
      const currentStatus = payload?.status || "ALERT";

      const ear = safeNumber(payload?.ear);
      const mar = safeNumber(payload?.mar);
      const pitch = safeNumber(payload?.pitch);

      const now = new Date();

      const point = {
        ...payload,
        ear,
        mar,
        pitch,
        time: now.toLocaleTimeString([], {
          minute: "2-digit",
          second: "2-digit",
        }),
      };

      setStatus(currentStatus);

      setData((previous) => [
        ...previous.slice(-(MAX_POINTS - 1)),
        point,
      ]);

      // Smart alert
      if (
        ["DROWSY", "HEAD NODDING", "EYES CLOSED"].includes(currentStatus)
      ) {
        const currentTime = Date.now();

        if (currentTime - lastAlertTime.current > 2500) {
          try {
            const audioContext = new (
              window.AudioContext || window.webkitAudioContext
            )();

            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();

            oscillator.frequency.value = 880;
            oscillator.type = "sine";

            gain.gain.setValueAtTime(0.15, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(
              0.001,
              audioContext.currentTime + 0.5
            );

            oscillator.connect(gain);
            gain.connect(audioContext.destination);

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.5);
          } catch (error) {
            console.warn("Audio alert unavailable:", error);
          }

          lastAlertTime.current = currentTime;
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const latest = data[data.length - 1];

  const config =
    STATUS_CONFIG[status] || STATUS_CONFIG.CONNECTING;

  /*
   * Evolution 1:
   * This is currently a placeholder score.
   *
   * Later we will replace this with the real
   * multi-signal safety score from Python.
   */
  const safetyScore = useMemo(() => {
    if (!latest) return 100;

    let score = 100;

    if (status === "EYES CLOSED") score -= 20;
    if (status === "YAWNING") score -= 15;
    if (status === "HEAD NODDING") score -= 25;
    if (status === "DROWSY") score -= 45;

    return Math.max(0, Math.min(100, score));
  }, [latest, status]);

  const riskLevel = useMemo(() => {
    if (safetyScore >= 80) return "LOW";
    if (safetyScore >= 60) return "MODERATE";
    if (safetyScore >= 40) return "HIGH";
    return "CRITICAL";
  }, [safetyScore]);

  const riskColor = {
    LOW: "#22c55e",
    MODERATE: "#f59e0b",
    HIGH: "#f97316",
    CRITICAL: "#ef4444",
  }[riskLevel];

  return (
    <div className="dashboard">
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #020617;
        }

        .dashboard {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top left,
              rgba(30, 41, 59, 0.45),
              transparent 35%
            ),
            #020617;
          color: #f8fafc;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          padding: 24px;
        }

        .dashboard-container {
          max-width: 1500px;
          margin: 0 auto;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          gap: 20px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .brand-logo {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(
            135deg,
            #2563eb,
            #7c3aed
          );
          font-size: 24px;
          box-shadow: 0 10px 30px rgba(37, 99, 235, 0.25);
        }

        .brand h1 {
          margin: 0;
          font-size: 21px;
          letter-spacing: -0.4px;
        }

        .brand p {
          margin: 3px 0 0;
          color: #64748b;
          font-size: 13px;
        }

        .connection {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 13px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(148, 163, 184, 0.12);
          font-size: 13px;
          color: #94a3b8;
        }

        .connection-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${connected ? "#22c55e" : "#ef4444"};
          box-shadow: 0 0 10px
            ${connected
              ? "rgba(34,197,94,0.7)"
              : "rgba(239,68,68,0.7)"};
        }

        .top-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.65fr) minmax(280px, 0.75fr);
          gap: 18px;
        }

        .card {
          background: rgba(15, 23, 42, 0.88);
          border: 1px solid rgba(148, 163, 184, 0.10);
          border-radius: 18px;
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.18);
        }

        .camera-card {
          padding: 14px;
        }

        .camera-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .section-title {
          font-size: 14px;
          font-weight: 600;
        }

        .live-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #f87171;
          text-transform: uppercase;
          font-weight: 700;
        }

        .live-dot {
          width: 7px;
          height: 7px;
          background: #ef4444;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(239,68,68,0.7);
        }

        .camera-wrapper {
          width: 100%;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          border-radius: 13px;
          background: #000;
          border: 1px solid rgba(148, 163, 184, 0.08);
        }

        .camera-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .status-column {
          display: grid;
          gap: 18px;
        }

        .status-card {
          padding: 24px;
          background:
            linear-gradient(
              145deg,
              ${config.bg},
              rgba(15, 23, 42, 0.95)
            );
          border: 1px solid ${config.border};
        }

        .status-label {
          color: #94a3b8;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 700;
        }

        .status-value {
          margin-top: 12px;
          font-size: 30px;
          font-weight: 800;
          color: ${config.color};
          letter-spacing: -1px;
        }

        .status-description {
          margin-top: 8px;
          color: #64748b;
          font-size: 13px;
        }

        .score-card {
          padding: 22px;
        }

        .score-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .score-title {
          color: #94a3b8;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 700;
        }

        .risk-badge {
          font-size: 10px;
          padding: 5px 8px;
          border-radius: 999px;
          color: ${riskColor};
          background: ${riskColor}18;
          border: 1px solid ${riskColor}35;
          font-weight: 800;
        }

        .score {
          display: flex;
          align-items: baseline;
          gap: 5px;
          margin-top: 18px;
        }

        .score-number {
          font-size: 42px;
          line-height: 1;
          font-weight: 800;
        }

        .score-max {
          color: #64748b;
          font-size: 14px;
        }

        .score-bar {
          margin-top: 18px;
          height: 7px;
          border-radius: 99px;
          background: #1e293b;
          overflow: hidden;
        }

        .score-progress {
          height: 100%;
          width: ${safetyScore}%;
          background: ${riskColor};
          border-radius: inherit;
          transition: width 0.4s ease;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-top: 18px;
        }

        .metric-card {
          padding: 18px;
          background: rgba(15, 23, 42, 0.88);
          border: 1px solid rgba(148, 163, 184, 0.10);
          border-radius: 16px;
        }

        .metric-card-top {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .metric-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: #1e293b;
          font-size: 15px;
        }

        .metric-title {
          color: #94a3b8;
          font-size: 12px;
        }

        .metric-value {
          margin-top: 16px;
          font-size: 26px;
          font-weight: 750;
          letter-spacing: -0.5px;
        }

        .metric-value span {
          margin-left: 4px;
          color: #64748b;
          font-size: 12px;
          font-weight: 500;
        }

        .metric-subtitle {
          margin-top: 5px;
          color: #475569;
          font-size: 11px;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 18px;
          margin-top: 18px;
        }

        .chart-card {
          height: 330px;
          padding: 20px;
          background: rgba(15, 23, 42, 0.88);
          border: 1px solid rgba(148, 163, 184, 0.10);
          border-radius: 18px;
          overflow: hidden;
        }

        .chart-card:last-child {
          grid-column: span 2;
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .chart-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 650;
        }

        .chart-header p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 11px;
        }

        .chart-wrapper {
          height: 245px;
          width: 100%;
          overflow: hidden;
        }

        .events-card {
          margin-top: 18px;
          padding: 20px;
        }

        .events-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .events-header h3 {
          margin: 0;
          font-size: 14px;
        }

        .events-header span {
          color: #64748b;
          font-size: 11px;
        }

        .events-list {
          display: flex;
          flex-wrap: wrap;
          gap: 9px;
        }

        .event {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 9px;
          background: #0f172a;
          border: 1px solid rgba(148, 163, 184, 0.08);
          color: #94a3b8;
          font-size: 11px;
        }

        .event-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #64748b;
        }

        .event-time {
          color: #475569;
        }

        .alert-banner {
          margin-top: 18px;
          padding: 14px 16px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          gap: 12px;
          background: ${config.bg};
          border: 1px solid ${config.border};
          color: ${config.color};
        }

        .alert-icon {
          font-size: 20px;
        }

        .alert-text strong {
          display: block;
          font-size: 13px;
        }

        .alert-text span {
          display: block;
          margin-top: 3px;
          color: #94a3b8;
          font-size: 11px;
        }

        @media (max-width: 1100px) {
          .metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .top-grid {
            grid-template-columns: 1fr;
          }

          .status-column {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 750px) {
          .dashboard {
            padding: 14px;
          }

          .header {
            align-items: flex-start;
          }

          .top-grid,
          .charts-grid,
          .status-column {
            grid-template-columns: 1fr;
          }

          .chart-card:last-child {
            grid-column: span 1;
          }

          .metrics-grid {
            grid-template-columns: 1fr 1fr;
          }

          .brand p {
            display: none;
          }
        }

        @media (max-width: 500px) {
          .metrics-grid {
            grid-template-columns: 1fr;
          }

          .status-value {
            font-size: 24px;
          }
        }
      `}</style>

      <div className="dashboard-container">
        {/* HEADER */}
        <header className="header">
          <div className="brand">
            <div className="brand-logo">🚗</div>

            <div>
              <h1>DriverGuard AI</h1>
              <p>Real-Time Driver Safety Monitoring</p>
            </div>
          </div>

          <div className="connection">
            <span className="connection-dot" />
            {connected ? "AI Engine Connected" : "AI Engine Offline"}
          </div>
        </header>

        {/* CAMERA + STATUS */}
        <section className="top-grid">
          <div className="card camera-card">
            <div className="camera-header">
              <span className="section-title">
                Live Driver Monitoring
              </span>

              <span className="live-badge">
                <span className="live-dot" />
                Live
              </span>
            </div>

            <div className="camera-wrapper">
              <img
                src="http://localhost:5000/video"
                alt="Driver Camera"
              />
            </div>
          </div>

          <div className="status-column">
            {/* STATUS */}
            <div className="card status-card">
              <div className="status-label">
                Current Driver State
              </div>

              <div className="status-value">
                {config.label}
              </div>

              <div className="status-description">
                Real-time state detected by the AI monitoring engine.
              </div>
            </div>

            {/* SAFETY SCORE */}
            <div className="card score-card">
              <div className="score-header">
                <span className="score-title">
                  Safety Score
                </span>

                <span className="risk-badge">
                  {riskLevel} RISK
                </span>
              </div>

              <div className="score">
                <span className="score-number">
                  {safetyScore}
                </span>

                <span className="score-max">
                  / 100
                </span>
              </div>

              <div className="score-bar">
                <div className="score-progress" />
              </div>
            </div>
          </div>
        </section>

        {/* ALERT */}
        {status !== "ALERT" &&
          status !== "CONNECTING..." &&
          latest && (
            <div className="alert-banner">
              <div className="alert-icon">⚠️</div>

              <div className="alert-text">
                <strong>{status} detected</strong>
                <span>
                  Driver monitoring system has detected a
                  potentially unsafe condition.
                </span>
              </div>
            </div>
          )}

        {/* METRICS */}
        <section className="metrics-grid">
          <MetricCard
            title="Eye Aspect Ratio"
            value={latest ? safeNumber(latest.ear).toFixed(3) : "--"}
            subtitle="Eye openness indicator"
            icon="👁"
          />

          <MetricCard
            title="Mouth Aspect Ratio"
            value={latest ? safeNumber(latest.mar).toFixed(3) : "--"}
            subtitle="Yawning indicator"
            icon="◉"
          />

          <MetricCard
            title="Head Movement"
            value={
              latest
                ? safeNumber(latest.pitch).toFixed(4)
                : "--"
            }
            subtitle="Head pose stability"
            icon="🧭"
          />

          <MetricCard
            title="Driver Status"
            value={status}
            subtitle="Current AI classification"
            icon="●"
          />
        </section>

        {/* CHARTS */}
        <section className="charts-grid">
          <ChartCard
            title="Eye Activity"
            subtitle="Real-time Eye Aspect Ratio"
            data={data}
            dataKey="ear"
            domain={[0, 0.45]}
            stroke="#38bdf8"
            formatter={(value) =>
              Number(value).toFixed(3)
            }
          />

          <ChartCard
            title="Mouth Activity"
            subtitle="Real-time Mouth Aspect Ratio"
            data={data}
            dataKey="mar"
            domain={[0, 0.9]}
            stroke="#f59e0b"
            formatter={(value) =>
              Number(value).toFixed(3)
            }
          />

          <ChartCard
            title="Head Movement"
            subtitle="Real-time pitch stability"
            data={data}
            dataKey="pitch"
            domain={[0, 0.03]}
            stroke="#ef4444"
            formatter={(value) =>
              Number(value).toFixed(4)
            }
          />
        </section>

        {/* EVENTS */}
        <section className="card events-card">
          <div className="events-header">
            <h3>Recent Monitoring Events</h3>

            <span>
              {data.length} data points collected
            </span>
          </div>

          <div className="events-list">
            {data
              .slice(-8)
              .reverse()
              .map((item, index) => {
                const eventConfig =
                  STATUS_CONFIG[item.status] ||
                  STATUS_CONFIG.ALERT;

                return (
                  <div
                    className="event"
                    key={`${item.time}-${index}`}
                  >
                    <span
                      className="event-dot"
                      style={{
                        background: eventConfig.color,
                      }}
                    />

                    <span>{item.status}</span>

                    <span className="event-time">
                      {item.time}
                    </span>
                  </div>
                );
              })}

            {data.length === 0 && (
              <div className="event">
                Waiting for monitoring data...
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
