export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="h-8 w-36 animate-pulse rounded bg-bg-muted" />
        <div className="mt-2 h-4 w-80 animate-pulse rounded bg-bg-muted" />
      </div>
      <div className="grid gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={'project-row-skel-' + i} className="panel p-5">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <div className="h-5 w-48 animate-pulse rounded bg-bg-muted" />
                <div className="mt-2 h-4 w-64 animate-pulse rounded bg-bg-muted" />
              </div>
              <div className="text-left md:text-right">
                <div className="h-5 w-28 animate-pulse rounded bg-bg-muted" />
                <div className="mt-1 h-4 w-20 animate-pulse rounded bg-bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
