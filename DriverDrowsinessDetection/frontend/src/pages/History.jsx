
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sessionApi, apiErrorMessage } from "../api/client";
import Spinner from "../components/Spinner";
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

  return `${car.carName ?? "Unknown vehicle"} (${car.numberPlate ?? "No plate"})`;
}

function exportSessionsToCsv(sessions) {
  const headers = [
    "Date",
    "Vehicle",
    "Duration",
    "Drowsiness",
    "Yawning",
    "Head Nodding",
    "Total Events",
    "Status",
  ];

  const escapeCsv = (value) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const rows = sessions.map((s) => [
    s.startTime ? new Date(s.startTime).toLocaleString() : "",
    carLabel(s.carId),
    formatMinutes(s.duration),
    s.drowsinessCount ?? 0,
    s.yawningCount ?? 0,
    s.headNoddingCount ?? 0,
    s.eventCount ?? 0,
    s.status ?? "Unknown",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\r\n");

  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `driverguard-history-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

export default function History() {
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSessions() {
      try {
        const res = await sessionApi.list();

        if (!cancelled) {
          setSessions(res.data.sessions || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            apiErrorMessage(err, "Could not load driving history")
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSessions();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h2>Driving History</h2>
          <p>All of your past and active driving sessions</p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => exportSessionsToCsv(sessions)}
          disabled={loading || sessions.length === 0}
        >
          ↓ Export CSV
        </button>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      {loading ? (
        <Spinner label="Loading sessions..." />
      ) : sessions.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🕒</div>
            No driving sessions recorded yet.
          </div>
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Vehicle</th>
                <th>Duration</th>
                <th>Drowsiness</th>
                <th>Yawning</th>
                <th>Head Nodding</th>
                <th>Total Events</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {sessions.map((s) => (
                <tr
                  key={s._id}
                  className="table-row-link"
                  onClick={() => navigate(`/history/${s._id}`)}
                >
                  <td>
                    {s.startTime
                      ? new Date(s.startTime).toLocaleString()
                      : "—"}
                  </td>
                  <td>{carLabel(s.carId)}</td>
                  <td>{formatMinutes(s.duration)}</td>
                  <td>{s.drowsinessCount ?? 0}</td>
                  <td>{s.yawningCount ?? 0}</td>
                  <td>{s.headNoddingCount ?? 0}</td>
                  <td>{s.eventCount ?? 0}</td>
                  <td>
                    <StatusBadge status={s.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
