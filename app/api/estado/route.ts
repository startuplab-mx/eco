import { iaDisponible } from "@/lib/ia-servidor";
import { airtableDisponible } from "@/lib/servidor/airtable";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ia: iaDisponible(), guardado: airtableDisponible() });
}
