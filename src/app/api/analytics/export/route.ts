import { getAnalyticsCsv } from "@/server/repo";
import { dateKey } from "@/lib/gamification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(getAnalyticsCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="coachos-report-${dateKey()}.csv"`,
    },
  });
}
