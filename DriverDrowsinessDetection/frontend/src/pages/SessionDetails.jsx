import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { sessionApi, attentionApi, apiErrorMessage } from "../api/client";
import Spinner from "../components/Spinner";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";

function formatMinutes(mins) {
  const m = Number(mins) || 0;
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return `${h}h ${rem}m`;
}

const EVENT_COLOR = {
  DROWSINESS: "var(--red)",
  YAWNING: "var(--amber)",
  HEAD_NODDING: "var(--orange)",
  EYES_CLOSED: "var(--amber)",
  ALERT: "var(--green)",
};

export default function SessionDetails() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [sessionRes, eventsRes] = await Promise.all([
          sessionApi.get(id),
          attentionApi.sessionEvents(id),
        ]);
        if (cancelled) return;
        setSession(sessionRes.data.session);
        setEvents(eventsRes.data.events || []);
      } catch (err) {
        if (!cancelled) setError(apiErrorMessage(err, "Could not load this session"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <Spinner label="Loading session report..." />;
  if (error) return <div className="banner banner-error">{error}</div>;
  if (!session) return null;

  const car = session.carId;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Session Report</h2>
          <p>
            {new Date(session.startTime).toLocaleString()}
            {session.endTime && ` — ${new Date(session.endTime).toLocaleString()}`}
          </p>
        </div>
        <Link to="/history" className="btn btn-secondary">
          ← Back to history
        </Link>
      </div>

      <div className="card card-pad" style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ fontSize: "15px", fontWeight: 600 }}>
            {car ? `${car.carName} — ${car.brand} ${car.model}` : "Unknown vehicle"}
          </div>
          <div style={{ color: "var(--text-faint)", fontSize: "12px", marginTop: "4px" }}>
            {car?.numberPlate} · {car?.fuelType}
          </div>
        </div>
        <StatusBadge status={session.status} />
      </div>

      <section className="stat-grid">
        <StatCard icon="⏱️" title="Duration" value={formatMinutes(session.duration)} />
        <StatCard icon="😴" title="Drowsiness" value={session.drowsinessCount ?? 0} />
        <StatCard icon="🥱" title="Yawning" value={session.yawningCount ?? 0} />
        <StatCard icon="🙇" title="Head Nodding" value={session.headNoddingCount ?? 0} />
      </section>

      <div className="card card-pad" style={{ marginTop: "20px" }}>
        <h2 style={{ fontSize: "16px", margin: "0 0 14px" }}>Event Timeline ({events.length})</h2>

        {events.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            No AI events were recorded during this session.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Event</th>
                <th>Driver Status</th>
                <th>Eye Status</th>
                <th>EAR</th>
                <th>MAR</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev._id}>
                  <td>{new Date(ev.time).toLocaleTimeString()}</td>
                  <td>
                    <span className="badge" style={{ background: "rgba(148,163,184,0.12)", color: EVENT_COLOR[ev.eventType] || "var(--text)" }}>
                      <span className="badge-dot" style={{ background: EVENT_COLOR[ev.eventType] || "var(--text-dim)" }} />
                      {ev.eventType}
                    </span>
                  </td>
                  <td>{ev.driverStatus}</td>
                  <td>{ev.eyeStatus || "—"}</td>
                  <td>{ev.metrics?.ear ?? "—"}</td>
                  <td>{ev.metrics?.mar ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
