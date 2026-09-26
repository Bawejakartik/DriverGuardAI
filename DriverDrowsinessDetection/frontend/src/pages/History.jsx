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
  return `${car.carName} (${car.numberPlate})`;
}

export default function History() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await sessionApi.list();
        setSessions(res.data.sessions || []);
      } catch (err) {
        setError(apiErrorMessage(err, "Could not load driving history"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Driving History</h2>
          <p>All of your past and active driving sessions</p>
        </div>
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
                <tr key={s._id} className="table-row-link" onClick={() => navigate(`/history/${s._id}`)}>
                  <td>{new Date(s.startTime).toLocaleString()}</td>
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
