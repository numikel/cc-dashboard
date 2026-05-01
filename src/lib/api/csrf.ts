import type { NextRequest } from "next/server";

const REQUIRED_HEADER = "x-requested-with";
const REQUIRED_HEADER_VALUE = "cc-dashboard";

export function rejectsCsrf(request: NextRequest): boolean {
  return request.headers.get(REQUIRED_HEADER) !== REQUIRED_HEADER_VALUE;
}
