import { createHmac } from "crypto";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

function verifyPaddleSignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  const tsPart = signatureHeader.split(";").find((p) => p.startsWith("ts="));
  const h1Part = signatureHeader.split(";").find((p) => p.startsWith("h1="));
  if (!tsPart || !h1Part) return false;
  const ts = tsPart.slice(3);
  const h1 = h1Part.slice(3);
  const expected = createHmac("sha256", secret).update(`${ts}:${rawBody}`).digest("hex");
  return expected === h1;
}

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("paddle-signature");

  if (!sig) return new Response("Missing paddle-signature", { status: 400 });

  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook secret not configured", { status: 500 });

  if (!verifyPaddleSignature(body, sig, secret)) {
    return new Response("Invalid signature", { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return new Response("DB not configured", { status: 500 });
  const sql = neon(dbUrl);

  const data = event.data ?? {};

  // Refund / chargeback → revoke Pro. Adjustment events carry no custom_data,
  // so map back to the customer via the stored subscription id.
  if (event.event_type === "adjustment.created") {
    const action: string = data.action ?? "";
    const subId: string | null = data.subscription_id ?? null;
    if ((action === "refund" || action === "chargeback") && subId) {
      await sql`UPDATE "OgCustomer" SET plan = 'FREE', "updatedAt" = NOW() WHERE "paddleSubscriptionId" = ${subId}`;
    }
    return new Response(null, { status: 200 });
  }

  const customData: Record<string, string> = data.custom_data ?? {};
  const customerKey = customData.customer_key;

  if (!customerKey) return new Response(null, { status: 200 });

  if (event.event_type === "subscription.activated" || event.event_type === "subscription.updated") {
    const subscriptionId: string | undefined = data.id;
    await sql`
      UPDATE "OgCustomer"
      SET plan = 'PRO', "paddleSubscriptionId" = ${subscriptionId ?? null}, "updatedAt" = NOW()
      WHERE "customerKey" = ${customerKey}
    `;
  }

  // Paddle's event is "subscription.canceled" (one L). Accept both spellings so
  // a cancellation reliably downgrades to FREE instead of leaving the customer
  // on Pro forever.
  if (
    event.event_type === "subscription.canceled" ||
    event.event_type === "subscription.cancelled" ||
    event.event_type === "subscription.paused"
  ) {
    await sql`
      UPDATE "OgCustomer"
      SET plan = 'FREE', "updatedAt" = NOW()
      WHERE "customerKey" = ${customerKey}
    `;
  }

  return new Response(null, { status: 200 });
}
