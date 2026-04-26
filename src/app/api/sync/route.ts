import { NextResponse, type NextRequest } from "next/server";
import { getLastSyncStatus, runIncrementalSync, type SyncStatus } from "@/lib/sync/indexer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REQUIRED_HEADER = "x-requested-with";
const REQUIRED_HEADER_VALUE = "cc-dashboard";

let inFlightSync: Promise<SyncStatus> | null = null;

function rejectsCsrf(request: NextRequest): boolean {
  return request.headers.get(REQUIRED_HEADER) !== REQUIRED_HEADER_VALUE;
}

export function GET() {
  return NextResponse.json({ status: getLastSyncStatus() });
}

export async function POST(request: NextRequest) {
  if (rejectsCsrf(request)) {
    return NextResponse.json(
      { error: "forbidden", message: "Missing or invalid X-Requested-With header" },
      { status: 403 }
    );
  }

  if (!inFlightSync) {
    inFlightSync = runIncrementalSync().finally(() => {
      inFlightSync = null;
    });
  }

  const status = await inFlightSync;
  return NextResponse.json({ status });
}
