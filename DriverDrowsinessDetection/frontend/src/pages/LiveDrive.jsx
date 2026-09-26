import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import io from "socket.io-client";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AI_URL, apiErrorMessage, attentionApi, carApi, sessionApi } from "../api/client";
import Spinner from "../components/Spinner";

const MAX_POINTS = 60;

// Statuses actually understood by the backend's statusToEventType map
// (controller/attentionController.js). Anything else (e.g. "FATIGUE TREND",
// "NO FACE") is still shown live but not persisted as an event.
const PERSISTABLE_STATUSES = ["ALERT", "EYES CLOSED", "DROWSY", "YAWNING", "HEAD NODDING"];

const STATUS_CONFIG = {
  ALERT: { label: "ALERT", color: "#22c55e", bg: "rgba(34, 197, 94, 0.12)", border: "rgba(34, 197, 94, 0.3)" },
  "EYES CLOSED": { label: "EYES CLOSED", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.3)" },
  DROWSY: { label: "DROWSY", color: "#ef4444", bg: "rgba(239, 68, 68, 0.12)", border: "rgba(239, 68, 68, 0.3)" },
  YAWNING: { label: "YAWNING", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.3)" },
  "HEAD NODDING": { label: "HEAD NODDING", color: "#fb923c", bg: "rgba(251, 146, 60, 0.12)", border: "rgba(251, 146, 60, 0.3)" },
  "FATIGUE TREND": { label: "FATIGUE TREND", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.3)" },
  "NO FACE": { label: "NO FACE DETECTED", color: "#94a3b8", bg: "rgba(148, 163, 184, 0.12)", border: "rgba(148, 163, 184, 0.3)" },
  CONNECTING: { label: "CONNECTING...", color: "#94a3b8", bg: "rgba(148, 163, 184, 0.12)", border: "rgba(148, 163, 184, 0.3)" },
};

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function MetricCard({ title, value, unit, subtitle, icon }) {
  return (
    <div className="card metric-card">
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

function ChartCard({ title, subtitle, data, dataKey, domain, stroke, formatter }) {
  return (
    <div className="card chart-card">
      <div className="chart-header">
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.10)" vertical={false} />
            <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={25} />
            <YAxis domain={domain} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={42} tickFormatter={formatter} />
            <Tooltip
              contentStyle={{ background: "#0f172a", border: "1px solid rgba(148, 163, 184, 0.18)", borderRadius: "10px", color: "#fff" }}
              labelStyle={{ color: "#94a3b8", marginBottom: "5px" }}
              formatter={(value) => [formatter ? formatter(value) : value, title]}
            />
            <Line type="monotone" dataKey={dataKey} stroke={stroke} strokeWidth={2.5} dot={false} isAnimationActive={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function playAlertTone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // Audio not available - ignore, visuals still show the alert.
  }
}

export default function LiveDrive() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const carIdFromQuery = searchParams.get("carId");

  const [phase, setPhase] = useState("loading"); // loading | pick-vehicle | active | ending
  const [cars, setCars] = useState([]);
  const [selectedCarId, setSelectedCarId] = useState(carIdFromQuery || "");
  const [session, setSession] = useState(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  const [aiConnected, setAiConnected] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("connecting"); // connecting | ok | error
  const [status, setStatus] = useState("CONNECTING");
  const [data, setData] = useState([]);
  const [eventLog, setEventLog] = useState([]);

  const socketRef = useRef(null);
  const lastAlertTime = useRef(0);
  const lastPersistedStatus = useRef(null);

  // ---- Bootstrap: resume an active session, or ask the user to pick a vehicle ----
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const activeRes = await sessionApi.active();
        if (cancelled) return;

        if (activeRes.data.session) {
          setSession(activeRes.data.session);
          setPhase("active");
          return;
        }

        const carsRes = await carApi.list();
        if (cancelled) return;
        setCars(carsRes.data.cars || []);
        setPhase("pick-vehicle");
      } catch (err) {
        if (!cancelled) {
          setError(apiErrorMessage(err, "Could not load driving session state"));
          setPhase("pick-vehicle");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Connect to the real Python Flask + Socket.IO AI engine while a session is active ----
  useEffect(() => {
    if (phase !== "active" || !session) return undefined;

    const socket = io(AI_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => setAiConnected(true));
    socket.on("disconnect", () => {
      setAiConnected(false);
      setStatus("CONNECTING");
    });
    socket.on("connect_error", () => setAiConnected(false));

    socket.on("metrics", (payload) => {
      const currentStatus = payload?.status || "ALERT";
      const ear = safeNumber(payload?.ear);
      const mar = safeNumber(payload?.mar);
      const pitch = safeNumber(payload?.pitch);
      const now = new Date();

      setStatus(currentStatus);
      setData((prev) => [
        ...prev.slice(-(MAX_POINTS - 1)),
        { ...payload, ear, mar, pitch, time: now.toLocaleTimeString([], { minute: "2-digit", second: "2-digit" }) },
      ]);

      if (["DROWSY", "HEAD NODDING", "EYES CLOSED"].includes(currentStatus)) {
        const t = Date.now();
        if (t - lastAlertTime.current > 2500) {
          playAlertTone();
          lastAlertTime.current = t;
        }
      }

      if (currentStatus !== lastPersistedStatus.current) {
        lastPersistedStatus.current = currentStatus;

        setEventLog((prev) => [{ status: currentStatus, time: now.toLocaleTimeString() }, ...prev].slice(0, 12));

        // Persist only statuses the backend's attentionController actually supports.
        if (PERSISTABLE_STATUSES.includes(currentStatus)) {
          attentionApi
            .reportEvent({
              sessionId: session._id,
              driverStatus: currentStatus,
              faceDetected: true,
              eyeStatus: payload?.eyeState === "CLOSED" ? "closed" : "open",
              metrics: { ear, mar, pitch },
            })
            .catch((err) => console.warn("Could not persist driver event:", apiErrorMessage(err)));
        }
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [phase, session]);

  const startSession = async () => {
    if (!selectedCarId) return;
    setStarting(true);
    setError("");
    try {
      const res = await sessionApi.start(selectedCarId);
      setSession(res.data.session);
      setData([]);
      setEventLog([]);
      lastPersistedStatus.current = null;
      setPhase("active");
    } catch (err) {
      setError(apiErrorMessage(err, "Could not start driving session"));
    } finally {
      setStarting(false);
    }
  };

  const stopSession = async () => {
    if (!session) return;
    setPhase("ending");
    try {
      await sessionApi.end(session._id);
      socketRef.current?.disconnect();
      navigate(`/history/${session._id}`);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not end driving session"));
      setPhase("active");
    }
  };

  const latest = data[data.length - 1];
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.CONNECTING;

  const safetyScore = useMemo(() => {
    if (!latest) return 100;
    let score = 100;
    if (status === "EYES CLOSED") score -= 20;
    if (status === "YAWNING") score -= 15;
    if (status === "HEAD NODDING") score -= 25;
    if (status === "DROWSY") score -= 45;
    if (status === "FATIGUE TREND") score -= 20;
    return Math.max(0, Math.min(100, score));
  }, [latest, status]);

  if (phase === "loading") {
    return <Spinner label="Checking for an active driving session..." />;
  }

  if (phase === "pick-vehicle") {
    return (
      <div>
        <div className="page-header">
          <div>
            <h2>Live Drive</h2>
            <p>Select a vehicle to start AI-powered driver monitoring</p>
          </div>
        </div>

        {error && <div className="banner banner-error">{error}</div>}

        {cars.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">🚘</div>
              You need a vehicle before you can start a drive.
              <div style={{ marginTop: "14px" }}>
                <button className="btn btn-primary" onClick={() => navigate("/vehicles")}>
                  Add a vehicle
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="card card-pad">
            <div className="section-title">Choose a vehicle</div>
            <div className="vehicle-pick-grid">
              {cars.map((car) => (
                <button
                  key={car._id}
                  className={"vehicle-pick-card" + (selectedCarId === car._id ? " selected" : "")}
                  onClick={() => setSelectedCarId(car._id)}
                >
                  <div style={{ fontWeight: 600, fontSize: "14px" }}>{car.carName}</div>
                  <div style={{ color: "var(--text-faint)", fontSize: "12px", marginTop: "4px" }}>
                    {car.brand} {car.model}
                  </div>
                  <span className="vehicle-plate">{car.numberPlate}</span>
                </button>
              ))}
            </div>

            <button className="btn btn-primary" style={{ marginTop: "20px" }} disabled={!selectedCarId || starting} onClick={startSession}>
              {starting ? "Starting session..." : "Start Driving Session"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // phase === 'active' or 'ending'
  const car = session?.carId;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Live Drive</h2>
          <p>
            {typeof car === "object" && car
              ? `${car.carName} · ${car.numberPlate}`
              : "Monitoring in progress"}
          </p>
        </div>
        <button className="btn btn-danger" onClick={stopSession} disabled={phase === "ending"}>
          {phase === "ending" ? "Ending session..." : "Stop Session"}
        </button>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      <section className="top-grid">
        <div className="card camera-card">
          <div className="camera-header">
            <span className="section-title">Live Driver Monitoring</span>
            <span className="live-badge">
              <span className="live-dot" />
              Live
            </span>
          </div>
          <div className="camera-wrapper">
            {cameraStatus === "error" ? (
              <span>Camera feed unavailable — is the Python AI engine running on {AI_URL}?</span>
            ) : (
              <img
                src={`${AI_URL}/video`}
                alt="Driver camera feed"
                onLoad={() => setCameraStatus("ok")}
                onError={() => setCameraStatus("error")}
              />
            )}
          </div>
        </div>

        <div className="status-column">
          <div className="connection-pill">
            <span
              className="connection-dot"
              style={{
                background: aiConnected ? "#22c55e" : "#ef4444",
                boxShadow: aiConnected ? "0 0 10px rgba(34,197,94,0.7)" : "0 0 10px rgba(239,68,68,0.7)",
              }}
            />
            {aiConnected ? "AI Engine Connected" : "AI Engine Offline"}
          </div>

          <div
            className="card"
            style={{ padding: "24px", background: `linear-gradient(145deg, ${config.bg}, rgba(15,23,42,0.95))`, border: `1px solid ${config.border}` }}
          >
            <div style={{ color: "var(--text-dim)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>
              Current Driver State
            </div>
            <div style={{ marginTop: "12px", fontSize: "28px", fontWeight: 800, color: config.color, letterSpacing: "-1px" }}>{config.label}</div>
            <div style={{ marginTop: "8px", color: "var(--text-faint)", fontSize: "13px" }}>Real-time state from the AI monitoring engine.</div>
          </div>

          <div className="card" style={{ padding: "22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--text-dim)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>
                Safety Score
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "5px", marginTop: "18px" }}>
              <span style={{ fontSize: "40px", fontWeight: 800 }}>{safetyScore}</span>
              <span style={{ color: "var(--text-faint)", fontSize: "14px" }}>/ 100</span>
            </div>
            <div style={{ marginTop: "18px", height: "7px", borderRadius: "99px", background: "#1e293b", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${safetyScore}%`, background: config.color, borderRadius: "inherit", transition: "width 0.4s ease" }} />
            </div>
          </div>
        </div>
      </section>

      {status !== "ALERT" && status !== "CONNECTING" && latest && (
        <div className="alert-banner" style={{ background: config.bg, border: `1px solid ${config.border}`, color: config.color }}>
          <div className="alert-icon">⚠️</div>
          <div className="alert-text">
            <strong>{config.label} detected</strong>
            <span>The driver monitoring system has flagged a potentially unsafe condition.</span>
          </div>
        </div>
      )}

      <section className="metrics-grid">
        <MetricCard title="Eye Aspect Ratio" value={latest ? safeNumber(latest.ear).toFixed(3) : "--"} subtitle="EAR — eye openness indicator" icon="👁" />
        <MetricCard title="Mouth Aspect Ratio" value={latest ? safeNumber(latest.mar).toFixed(3) : "--"} subtitle="MAR — yawning indicator" icon="◉" />
        <MetricCard title="Head Movement" value={latest ? safeNumber(latest.pitch).toFixed(4) : "--"} subtitle="Head pose (pitch) stability" icon="🧭" />
        <MetricCard title="PERCLOS (60s)" value={latest?.perclos != null ? `${(safeNumber(latest.perclos) * 100).toFixed(1)}%` : "--"} subtitle="Eye-closure trend" icon="📈" />
      </section>

      <section className="charts-grid">
        <ChartCard title="Eye Activity" subtitle="Real-time Eye Aspect Ratio" data={data} dataKey="ear" domain={[0, 0.45]} stroke="#38bdf8" formatter={(v) => Number(v).toFixed(3)} />
        <ChartCard title="Mouth Activity" subtitle="Real-time Mouth Aspect Ratio" data={data} dataKey="mar" domain={[0, 0.9]} stroke="#f59e0b" formatter={(v) => Number(v).toFixed(3)} />
        <ChartCard title="Head Movement" subtitle="Real-time pitch stability" data={data} dataKey="pitch" domain={[0, 0.03]} stroke="#ef4444" formatter={(v) => Number(v).toFixed(4)} />
      </section>

      <section className="card card-pad" style={{ marginTop: "18px" }}>
        <div className="page-header" style={{ marginBottom: "14px" }}>
          <h2 style={{ fontSize: "15px" }}>Recent Monitoring Events</h2>
          <span style={{ color: "var(--text-faint)", fontSize: "12px" }}>{data.length} data points collected</span>
        </div>
        <div className="events-list">
          {eventLog.length === 0 ? (
            <div className="event-chip">Waiting for monitoring data...</div>
          ) : (
            eventLog.map((item, i) => {
              const c = STATUS_CONFIG[item.status] || STATUS_CONFIG.ALERT;
              return (
                <div className="event-chip" key={`${item.time}-${i}`}>
                  <span className="event-dot" style={{ background: c.color }} />
                  <span>{item.status}</span>
                  <span className="event-time">{item.time}</span>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
