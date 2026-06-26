import { neon } from "@neondatabase/serverless";

export const runtime = "edge";

// One-time migration endpoint — delete after confirming tables exist
export async function POST(request: Request) {
  const secret = request.headers.get("x-migrate-secret");
  if (secret !== process.env.MIGRATE_SECRET) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return Response.json({ error: "no_db" }, { status: 500 });

  const sql = neon(dbUrl);

  const results: Record<string, string> = {};

  // Add email column to OgCustomer if not exists
  try {
    await sql.unsafe(`ALTER TABLE "OgCustomer" ADD COLUMN IF NOT EXISTS email TEXT`);
    results.add_email_column = "ok";
  } catch (e) {
    results.add_email_column = String(e);
  }

  // Add unique index on email
  try {
    await sql.unsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "OgCustomer_email_key" ON "OgCustomer"(email)`);
    results.add_email_index = "ok";
  } catch (e) {
    results.add_email_index = String(e);
  }

  // Create KeyRecoveryLog table
  try {
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS "KeyRecoveryLog" (
        id TEXT NOT NULL,
        email TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "KeyRecoveryLog_pkey" PRIMARY KEY (id)
      )
    `);
    results.create_recovery_log = "ok";
  } catch (e) {
    results.create_recovery_log = String(e);
  }

  // Create index on KeyRecoveryLog
  try {
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS "KeyRecoveryLog_email_createdAt_idx" ON "KeyRecoveryLog" (email, "createdAt")`);
    results.create_recovery_log_index = "ok";
  } catch (e) {
    results.create_recovery_log_index = String(e);
  }

  // Verify resulting tables
  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;
  const tableNames = tables.map((r) => (r as { table_name: string }).table_name);

  return Response.json({ results, tables: tableNames });
}
