import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi, apiErrorMessage } from "../api/client";
import { useAuth } from "../context/useAuth";
import Spinner from "../components/Spinner";

export default function Profile() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await authApi.profile();
        setProfile(res.data.user);
      } catch (err) {
        setError(apiErrorMessage(err, "Could not load your profile"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  if (loading) return <Spinner label="Loading profile..." />;
  if (error) return <div className="banner banner-error">{error}</div>;
  if (!profile) return null;

  const initials = (profile.fullname || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Profile</h2>
          <p>Your account details</p>
        </div>
      </div>

      <div className="card card-pad" style={{ display: "flex", alignItems: "center", gap: "18px", marginBottom: "20px" }}>
        <div className="sidebar-user-avatar" style={{ width: "56px", height: "56px", fontSize: "20px" }}>
          {initials}
        </div>
        <div>
          <div style={{ fontSize: "18px", fontWeight: 700 }}>{profile.fullname}</div>
          <div style={{ color: "var(--text-faint)", fontSize: "13px" }}>{profile.email}</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card card-pad">
          <h2 style={{ fontSize: "15px", margin: "0 0 14px" }}>Account Details</h2>
          <table className="table">
            <tbody>
              <tr>
                <td style={{ color: "var(--text-faint)" }}>Full name</td>
                <td>{profile.fullname}</td>
              </tr>
              <tr>
                <td style={{ color: "var(--text-faint)" }}>Email</td>
                <td>{profile.email}</td>
              </tr>
              <tr>
                <td style={{ color: "var(--text-faint)" }}>Driving license</td>
                <td>{profile.drivingLicense}</td>
              </tr>
              <tr>
                <td style={{ color: "var(--text-faint)" }}>Member since</td>
                <td>{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="card card-pad">
          <h2 style={{ fontSize: "15px", margin: "0 0 14px" }}>Registered Vehicles</h2>
          {(profile.cars || []).length === 0 ? (
            <div className="empty-state" style={{ padding: "24px 10px" }}>
              No vehicles registered yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {profile.cars.map((car) => (
                <div key={car._id} style={{ padding: "10px 12px", borderRadius: "10px", background: "rgba(148,163,184,0.06)" }}>
                  <div style={{ fontWeight: 600, fontSize: "13px" }}>{car.carName}</div>
                  <div style={{ color: "var(--text-faint)", fontSize: "11px" }}>
                    {car.brand} {car.model} · {car.numberPlate}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <button className="btn btn-danger" style={{ marginTop: "20px" }} onClick={handleLogout}>
        Log out
      </button>
    </div>
  );
}
