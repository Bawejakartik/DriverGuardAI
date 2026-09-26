import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/vehicles", label: "Vehicles", icon: "🚘" },
  { to: "/drive", label: "Live Drive", icon: "🎥" },
  { to: "/history", label: "History", icon: "🕒" },
  { to: "/profile", label: "Profile", icon: "👤" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = (user?.fullname || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">🚗</div>
          <div>
            <h1>DriverGuard AI</h1>
            <p>Driver Safety Monitoring</p>
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{initials}</div>
            <div>
              <div className="sidebar-user-name">{user?.fullname}</div>
              <div className="sidebar-user-email">{user?.email}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            ⏻ Log out
          </button>
        </div>
      </aside>

      <main className="page">{children}</main>
    </div>
  );
}
