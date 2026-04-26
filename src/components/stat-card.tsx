interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
}

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <article className="panel p-6">
      <p className="text-sm muted">{label}</p>
      <p className="mt-4 text-4xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="mt-2 text-sm muted">{hint}</p> : null}
    </article>
  );
}
