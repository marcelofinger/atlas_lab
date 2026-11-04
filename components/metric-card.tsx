export function MetricCard({ label, value, note, icon }: { label: string; value: string; note: string; icon: string }) {
  return <article className="card metric"><div className="metric-top"><span>{label}</span><span className="metric-icon" aria-hidden="true">{icon}</span></div><p className="metric-value">{value}</p><p className="metric-note">{note}</p></article>;
}
