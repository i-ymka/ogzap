import { neon } from "@neondatabase/serverless";
import { createPaddleTransaction } from "@/lib/paddle";

export const runtime = "edge";

// Live $19/mo price for "OGzap Pro". Pinned here on purpose: the Vercel env
// PADDLE_PRICE_ID still points at the old $7 "OGify" price (now archived), and
// that env isn't reachable to update right now. Env overrides if it's ever set
// to a non-stale value.
const OGZAP_PRO_PRICE_ID = "pri_01kvw6sj6cyg0pstxs7ewmdbhx";
const STALE_PRICE_ID = "pri_01ksc9vz06qhj7rgmgrpxv3wxm";
const PRICE_ID =
  process.env.PADDLE_PRICE_ID && process.env.PADDLE_PRICE_ID !== STALE_PRICE_ID
    ? process.env.PADDLE_PRICE_ID
    : OGZAP_PRO_PRICE_ID;

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
  if (!dbUrl) {
    return Response.json({ error: "server_error" }, { status: 500 });
  }

  const sql = neon(dbUrl);

  // Verify customer exists
  const rows = await sql`
    SELECT id, email FROM "OgCustomer" WHERE "customerKey" = ${customerKey} LIMIT 1
  ` as { id: string; email: string | null }[];

  if (rows.length === 0) {
    return Response.json({ error: "invalid_key" }, { status: 404 });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://ogzap.com";

  let transaction;
  try {
    transaction = await createPaddleTransaction({
      items: [{ price_id: PRICE_ID, quantity: 1 }],
      checkout: { url: `${origin}/dashboard?upgraded=1&key=${customerKey}` },
      custom_data: { customer_key: customerKey },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 502 });
  }

  // Return transactionId only — client opens Paddle.Checkout.open via Paddle.js.
  // The previous response constructed `https://checkout.paddle.com/checkout/{id}`,
  // which is not a real Paddle Billing URL (404), so clicking Upgrade went nowhere.
  return Response.json({ transactionId: transaction.id });
}
