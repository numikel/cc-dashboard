import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { closeDbForTests } from "@/lib/db/client";

afterEach(() => {
  cleanup();
  closeDbForTests();
  vi.restoreAllMocks();
});
