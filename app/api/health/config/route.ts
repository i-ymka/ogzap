import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL;
  let database = false;
  if (dbUrl) {
    try {
      const sql = neon(dbUrl);
      await sql`SELECT 1`;
      database = true;
    } catch {
      database = false;
    }
  }
  const allHealthy = database;
  return NextResponse.json(
    { database, healthy: allHealthy },
    { status: allHealthy ? 200 : 503 }
  );
}
