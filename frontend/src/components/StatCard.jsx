// components/StatCard.jsx — Reusable metric display card

export default function StatCard({ label, value, unit, sub, accent = false }) {
  return (
    <div className={`card flex flex-col gap-1 ${accent ? "border-accent/30 bg-accent-dim" : ""}`}>
      <p className="label">{label}</p>
      <div className="flex items-end gap-1.5">
        <span className={`font-display text-3xl font-medium leading-none
          ${accent ? "text-accent" : "text-text-primary"}`}>
          {value ?? "—"}
        </span>
        {unit && (
          <span className="text-text-muted text-sm mb-0.5">{unit}</span>
        )}
      </div>
      {sub && <p className="text-xs text-text-muted">{sub}</p>}
    </div>
  );
}
