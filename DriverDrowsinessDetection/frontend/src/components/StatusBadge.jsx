const CLASS_MAP = {
  ACTIVE: "badge-active",
  COMPLETED: "badge-completed",
  CANCELLED: "badge-cancelled",
};

export default function StatusBadge({ status }) {
  const cls = CLASS_MAP[status] || "badge-completed";
  return (
    <span className={`badge ${cls}`}>
      <span className="badge-dot" />
      {status}
    </span>
  );
}
