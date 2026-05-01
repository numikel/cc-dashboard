import type { Metadata } from "next";
import { listProjects, getTopProjectsByCost } from "@/lib/api/queries";
import { getPricingMap } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Projects · CC dashboard",
};

export const dynamic = "force-dynamic";

function formatProjectCost(usd: number | null | undefined): string {
  if (usd == null) return "";
  if (usd === 0) return "~$0.00";
  if (usd < 0.001) return `~$${usd.toFixed(6)}`;
  if (usd < 0.01) return `~$${usd.toFixed(4)}`;
  return `~$${usd.toFixed(2)}`;
}

export default async function ProjectsPage() {
  const pricingMap = await getPricingMap();
  const projects = listProjects(500);
  const costData = getTopProjectsByCost(pricingMap, null, 500);

  const costByPath = new Map<string, number | null>(
    costData.map((p) => [p.path, p.costUsd])
  );

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
                  <p className="text-sm" style={{ color: "var(--color-accent-strong)" }}>
                    {formatProjectCost(costByPath.get(project.path))}
                  </p>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
