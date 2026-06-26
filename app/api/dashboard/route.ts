import { neon } from "@neondatabase/serverless";

export const runtime = "edge";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const customerKey = typeof raw?.key === "string" ? raw.key.trim() : null;

  if (!customerKey) {
    return Response.json({ error: "missing_key" }, { status: 400 });
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return Response.json({ error: "server_error" }, { status: 500 });

  const sql = neon(dbUrl);
  const rows = await sql`
    SELECT plan, "imagesServed", email
    FROM "OgCustomer"
    WHERE "customerKey" = ${customerKey}
    LIMIT 1
  ` as { plan: string; imagesServed: number; email: string | null }[];

  if (rows.length === 0) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  return Response.json(rows[0]);
}
