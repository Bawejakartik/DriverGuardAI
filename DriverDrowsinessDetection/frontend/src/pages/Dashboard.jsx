import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { dashboardApi, apiErrorMessage } from "../api/client";
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

function carLabel(car) {
  if (!car) return "Unknown vehicle";
  return `${car.brand} ${car.model} · ${car.numberPlate}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [overviewRes, sessionsRes, eventsRes] = await Promise.all([
          dashboardApi.overview(),
          dashboardApi.sessions(),
          dashboardApi.events(),
        ]);
        if (cancelled) return;
        setOverview(overviewRes.data.overview);
        setSessions(sessionsRes.data.sessions || []);
        setEvents(eventsRes.data.events || []);
      } catch (err) {
        if (!cancelled) setError(apiErrorMessage(err, "Could not load dashboard data"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <Spinner label="Loading dashboard..." />;
  if (error) return <div className="banner banner-error">{error}</div>;

  const active = overview?.activeSession;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Overview of your driving safety history</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/drive")}>
          + Start a drive
        </button>
      </div>

      {active && (
        <div className="banner banner-info" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>
            🟢 You have an active session in <strong>{carLabel(active.carId)}</strong>, started{" "}
            {new Date(active.startTime).toLocaleTimeString()}.
          </span>
          <button className="btn btn-secondary" onClick={() => navigate("/drive")}>
            Resume
          </button>
        </div>
      )}

      <section className="stat-grid">
        <StatCard icon="🛣️" title="Total Drives" value={overview?.totalSessions ?? 0} sub="All-time sessions" />
        <StatCard icon="⏱️" title="Driving Time" value={formatMinutes(overview?.totalDuration)} sub="Total time behind the wheel" />
        <StatCard icon="😴" title="Drowsiness Events" value={overview?.drowsinessCount ?? 0} sub="Detected across all sessions" />
        <StatCard icon="🥱" title="Yawning Events" value={overview?.yawningCount ?? 0} sub="Detected across all sessions" />
      </section>

      <section className="stat-grid" style={{ marginTop: "16px" }}>
        <StatCard icon="🙇" title="Head-Nodding Events" value={overview?.headNoddingCount ?? 0} sub="Detected across all sessions" />
        <StatCard icon="🔔" title="Total Alert Events" value={overview?.totalEvents ?? 0} sub="All AI-detected events" />
        <StatCard icon="🚘" title="Vehicles Used" value={new Set(sessions.map((s) => s.carId?._id)).size} sub="Distinct vehicles driven" />
        <StatCard icon="✅" title="Session Status" value={active ? "Active" : "Idle"} sub={active ? "Monitoring in progress" : "No session running"} />
      </section>

      <div className="grid-2" style={{ marginTop: "24px" }}>
        <div className="card card-pad">
          <div className="page-header" style={{ marginBottom: "14px" }}>
            <h2 style={{ fontSize: "16px" }}>Recent Sessions</h2>
            <Link to="/history" className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "12px" }}>
              View all
            </Link>
          </div>

          {sessions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🚗</div>
              No driving sessions yet. Start your first drive to see it here.
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Duration</th>
                  <th>Events</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 8).map((s) => (
                  <tr key={s._id} className="table-row-link" onClick={() => navigate(`/history/${s._id}`)}>
                    <td>{new Date(s.startTime).toLocaleDateString()}</td>
                    <td>{carLabel(s.carId)}</td>
                    <td>{formatMinutes(s.duration)}</td>
                    <td>{s.eventCount ?? 0}</td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card card-pad">
          <h2 style={{ fontSize: "16px", margin: "0 0 14px" }}>Recent Events</h2>
          {events.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔔</div>
              No AI events recorded yet.
            </div>
          ) : (
            <div className="events-list">
              {events.slice(0, 12).map((e) => (
                <div className="event-chip" key={e._id}>
                  <span
                    className="event-dot"
                    style={{
                      background:
                        e.driverStatus === "DROWSY"
                          ? "var(--red)"
                          : e.driverStatus === "YAWNING" || e.driverStatus === "EYES CLOSED"
                          ? "var(--amber)"
                          : e.driverStatus === "HEAD NODDING"
                          ? "var(--orange)"
                          : "var(--green)",
                    }}
                  />
                  <span>{e.driverStatus}</span>
                  <span className="event-time">{new Date(e.time).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
