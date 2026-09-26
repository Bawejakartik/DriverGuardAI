import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="auth-shell">
      <div className="card auth-card" style={{ textAlign: "center" }}>
        <div style={{ fontSize: "40px" }}>🚧</div>
        <h2 style={{ margin: "12px 0 6px" }}>Page not found</h2>
        <p style={{ color: "var(--text-faint)", fontSize: "13px", marginBottom: "20px" }}>
          The page you're looking for doesn't exist.
        </p>
        <Link to="/dashboard" className="btn btn-primary">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
