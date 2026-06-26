import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";

export const runtime = "edge";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let key = "ogz_";
  for (let i = 0; i < 32; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
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

  // Check if already registered
  let existing: { customerKey: string }[];
  try {
    existing = (await sql`
      SELECT "customerKey" FROM "OgCustomer" WHERE email = ${email} LIMIT 1
    `) as { customerKey: string }[];
  } catch {
    return Response.json({ error: "server_error" }, { status: 500 });
  }

  if (existing.length > 0) {
    // Already exists — send key again
    const resend = new Resend(process.env.RESEND_API_KEY);
    try {
      await resend.emails.send({
        from: "hello@ogzap.com",
        to: email,
        subject: "Your OGzap API key",
        html: `
          <div style="font-family:monospace;max-width:560px;margin:0 auto;padding:40px 24px;color:#0f172a">
            <p style="font-size:20px;font-weight:700;margin:0 0 8px">ogzap</p>
            <p style="color:#64748b;margin:0 0 32px">You already have an account. Here's your API key:</p>
            <div style="background:#0f172a;border-radius:8px;padding:20px;margin-bottom:32px">
              <code style="color:#4ade80;font-size:14px;word-break:break-all">${existing[0].customerKey}</code>
            </div>
            <p style="color:#64748b;font-size:14px">Use it as the <code>customer</code> param:</p>
            <div style="background:#f1f5f9;border-radius:6px;padding:12px;margin-bottom:32px">
              <code style="font-size:13px;color:#0f172a">https://ogzap.com/og?url=https://yoursite.com&customer=${existing[0].customerKey}</code>
            </div>
            <p style="color:#94a3b8;font-size:13px">— ogzap team</p>
          </div>
        `,
      });
    } catch {
      // ignore email error, still return success
    }
    return Response.json({ success: true, existing: true });
  }

  // Create new customer
  const customerKey = generateKey();
  try {
    await sql`
      INSERT INTO "OgCustomer" (id, "userId", "customerKey", email, plan, "primaryColor", "secondaryColor", "fontFamily", "imagesServed", "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid()::text,
        ${email},
        ${customerKey},
        ${email},
        'FREE',
        '#7c3aed',
        '#1e293b',
        'Inter',
        0,
        NOW(),
        NOW()
      )
    `;
  } catch {
    return Response.json({ error: "server_error" }, { status: 500 });
  }

  // Send welcome email with key
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    await resend.emails.send({
      from: "hello@ogzap.com",
      to: email,
      subject: "Your OGzap API key — start in 30 seconds",
      html: `
        <div style="font-family:monospace;max-width:560px;margin:0 auto;padding:40px 24px;color:#0f172a">
          <p style="font-size:20px;font-weight:700;margin:0 0 8px">ogzap</p>
          <p style="color:#64748b;margin:0 0 32px">Your free API key is ready. 100 renders/month included.</p>
          <div style="background:#0f172a;border-radius:8px;padding:20px;margin-bottom:32px">
            <code style="color:#4ade80;font-size:14px;word-break:break-all">${customerKey}</code>
          </div>
          <p style="color:#64748b;font-size:14px;margin:0 0 8px">Try it now:</p>
          <div style="background:#f1f5f9;border-radius:6px;padding:12px;margin-bottom:32px">
            <code style="font-size:13px;color:#0f172a">https://ogzap.com/og?url=https://yoursite.com&customer=${customerKey}</code>
          </div>
          <p style="color:#64748b;font-size:14px;margin:0 0 32px">Need more than 100 renders/month? <a href="https://ogzap.com/upgrade?key=${customerKey}" style="color:#4ade80">Upgrade to Pro →</a></p>
          <p style="color:#94a3b8;font-size:13px">Save this email — it's the only place your key is stored.<br>— ogzap team</p>
        </div>
      `,
    });
  } catch {
    // Email failed but account was created — still return success
    return Response.json({ success: true, emailFailed: true });
  }

  return Response.json({ success: true });
}
