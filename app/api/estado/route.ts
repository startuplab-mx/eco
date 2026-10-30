import { iaDisponible } from "@/lib/ia-servidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ia: iaDisponible() });
}
