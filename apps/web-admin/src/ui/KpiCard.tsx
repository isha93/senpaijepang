export function KpiCard({
  label,
  value,
  trend
}: {
  label: string;
  value: string;
  trend?: string;
}) {
  return (
    <article className="kpi-card">
      <p>{label}</p>
      <strong>{value}</strong>
      {trend ? <span>{trend}</span> : null}
    </article>
  );
}
