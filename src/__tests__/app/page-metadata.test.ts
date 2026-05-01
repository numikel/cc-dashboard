import { describe, it, expect } from "vitest";

describe("page metadata titles", () => {
  it("sessions page exports correct metadata title", async () => {
    const mod = await import("@/app/sessions/page");
    expect((mod as { metadata?: { title?: string } }).metadata?.title).toBe("Sessions · CC dashboard");
  }, 15_000);

  it("projects page exports correct metadata title", async () => {
    const mod = await import("@/app/projects/page");
    expect((mod as { metadata?: { title?: string } }).metadata?.title).toBe("Projects · CC dashboard");
  }, 15_000);

  it("tokens page exports correct metadata title", async () => {
    const mod = await import("@/app/tokens/page");
    expect((mod as { metadata?: { title?: string } }).metadata?.title).toBe("Tokens · CC dashboard");
  }, 15_000);
});
