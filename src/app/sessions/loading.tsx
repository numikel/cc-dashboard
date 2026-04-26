export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="h-8 w-48 animate-pulse rounded bg-bg-muted" />
        <div className="mt-2 h-4 w-96 animate-pulse rounded bg-bg-muted" />
      </div>
      <div className="panel p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={'session-row-skel-' + i} className="mb-2 h-12 animate-pulse rounded bg-bg-muted/40" />
        ))}
      </div>
    </div>
  );
}
