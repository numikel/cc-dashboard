import { listProjects } from "@/lib/api/queries";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await Promise.resolve(listProjects());

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-semibold">Projects</h2>
        <p className="mt-1 muted">Grouped by Git root when available, otherwise by Claude Code working directory.</p>
      </div>
      <div className="grid gap-4">
        {projects.length === 0 ? (
          <div className="panel p-6 muted">No projects indexed yet.</div>
        ) : (
          projects.map((project) => (
            <article key={project.id} className="panel p-5">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <h3 className="text-lg font-semibold">{project.name}</h3>
                  <p className="mt-1 break-all text-sm muted">{project.path}</p>
                </div>
                <div className="text-left md:text-right">
                  <p className="font-semibold">{project.totalTokens.toLocaleString()} tokens</p>
                  <p className="text-sm muted">{project.sessions} sessions</p>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
