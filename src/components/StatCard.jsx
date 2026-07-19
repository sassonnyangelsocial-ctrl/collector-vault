export default function StatCard({ value, label, active, onClick }) {
  return <button className={`stat-card ${active ? 'active' : ''}`} onClick={onClick} type="button"><strong>{value}</strong><span>{label}</span></button>
}
