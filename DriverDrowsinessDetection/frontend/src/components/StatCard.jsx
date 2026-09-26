export default function StatCard({ icon, title, value, sub }) {
  return (
    <div className="card stat-card">
      <div className="stat-card-top">
        <div className="stat-icon">{icon}</div>
        <span className="stat-title">{title}</span>
      </div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}
