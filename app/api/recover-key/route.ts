import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";

export const runtime = "edge";

type CustomerRow = {
  customerKey: string;
  plan: string;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const emailRaw = typeof raw?.email === "string" ? raw.email.trim().toLowerCase() : null;

  if (!emailRaw || !isValidEmail(emailRaw)) {
    return Response.json({ error: "invalid_email" }, { status: 400 });
  }

  const email = emailRaw;
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return Response.json({ error: "server_error" }, { status: 500 });
  }

  const sql = neon(dbUrl);

  try {
    // Rate limit: max 3 recovery attempts per email per hour
    const rateRows = await sql`
      SELECT COUNT(*) AS count
      FROM "KeyRecoveryLog"
      WHERE email = ${email}
        AND "createdAt" > NOW() - INTERVAL '1 hour'
    `;
    const count = Number((rateRows[0] as { count: string }).count);
    if (count >= 3) {
      return Response.json({ error: "rate_limited" }, { status: 429 });
    }
  } catch {
    return Response.json({ error: "server_error" }, { status: 500 });
  }

  // Log the attempt (best-effort — never fail on counter write)
  sql`
    INSERT INTO "KeyRecoveryLog" (id, email, "createdAt")
    VALUES (gen_random_uuid()::text, ${email}, NOW())
  `.catch(() => {});

  // Look up the customer
  let rows: { customerKey: string; plan: string }[];
  try {
    rows = (await sql`
      SELECT "customerKey", plan
      FROM "OgCustomer"
      WHERE email = ${email}
      LIMIT 1
    `) as { customerKey: string; plan: string }[];
  } catch {
    return Response.json({ error: "server_error" }, { status: 500 });
  }

  if (rows.length === 0) {
    return Response.json({ found: false });
  }

  const row = rows[0] as CustomerRow;
  const isPro = row.plan === "PRO";

  // Send the key to any account holder — free or pro. A free user can lose
  // their key just like a paid one; gating recovery on Pro locked them out and
  // showed a misleading "no account" message.
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    await resend.emails.send({
      from: "hello@ogzap.com",
      to: email,
      subject: "Your OGzap API key",
      text: `Here is your OGzap API key: ${row.customerKey}\n\nUse it as the \`customer\` query param on any /og request:\n  https://ogzap.com/og?url=https://yoursite.com/this-page&customer=${row.customerKey}\n\nogzap.com`,
    });
  } catch {
    return Response.json({ error: "email_send_failed" }, { status: 500 });
  }

  return Response.json({ found: true, isPro, sent: true });
}
