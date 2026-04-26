export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="h-8 w-32 animate-pulse rounded bg-bg-muted" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-bg-muted" />
      </div>
      <section className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={'token-stat-skel-' + i} className="panel p-6">
            <div className="h-4 w-24 animate-pulse rounded bg-bg-muted" />
            <div className="mt-4 h-9 w-32 animate-pulse rounded bg-bg-muted" />
          </div>
        ))}
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        <div className="panel h-96 p-5">
          <div className="h-full w-full animate-pulse rounded-lg bg-bg-muted" />
        </div>
        <div className="panel h-96 p-5">
          <div className="h-full w-full animate-pulse rounded-lg bg-bg-muted" />
        </div>
      </section>
    </div>
  );
}
