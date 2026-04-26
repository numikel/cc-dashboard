import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

interface ChromeManifest {
  manifest_version: number;
  permissions: string[];
  host_permissions: string[];
  side_panel?: { default_path?: string };
  background?: { service_worker?: string };
  action?: { default_title?: string };
}

describe("Chrome extension manifest", () => {
  it("keeps the side panel scoped to the local dashboard", () => {
    const manifestPath = path.join(process.cwd(), "extension", "chrome", "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as ChromeManifest;

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toContain("sidePanel");
    expect(manifest.permissions).toContain("storage");
    expect(manifest.host_permissions).toEqual(["http://localhost/*", "http://127.0.0.1/*"]);
    expect(manifest.host_permissions).not.toContain("<all_urls>");
    expect(manifest.side_panel?.default_path).toBe("sidepanel.html");
    expect(manifest.background?.service_worker).toBe("background.js");
    expect(manifest.action?.default_title).toBe("Open CC dashboard");
  });
});
