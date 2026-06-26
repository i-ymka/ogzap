import { neon } from "@neondatabase/serverless";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.log("scripts/migrate: DATABASE_URL not set, skipping migration");
  process.exit(0);
}

const sql = neon(dbUrl);

try {
  // Create OgPlan enum if not exists
  await sql`
    DO $$ BEGIN
      CREATE TYPE "OgPlan" AS ENUM ('FREE', 'PRO');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$
  `;

  // Create OgCustomer table
  await sql`
    CREATE TABLE IF NOT EXISTS "OgCustomer" (
      id TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "customerKey" TEXT NOT NULL,
      email TEXT,
      plan "OgPlan" NOT NULL DEFAULT 'FREE',
      "logoUrl" TEXT,
      "primaryColor" TEXT NOT NULL DEFAULT '#7c3aed',
      "secondaryColor" TEXT NOT NULL DEFAULT '#1e293b',
      "fontFamily" TEXT NOT NULL DEFAULT 'Inter',
      "paddleSubscriptionId" TEXT,
      "imagesServed" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT "OgCustomer_pkey" PRIMARY KEY (id)
    )
  `;

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS "OgCustomer_userId_key" ON "OgCustomer"("userId")`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS "OgCustomer_customerKey_key" ON "OgCustomer"("customerKey")`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS "OgCustomer_email_key" ON "OgCustomer"(email)`;

  // Create KeyRecoveryLog table
  await sql`
    CREATE TABLE IF NOT EXISTS "KeyRecoveryLog" (
      id TEXT NOT NULL,
      email TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT "KeyRecoveryLog_pkey" PRIMARY KEY (id)
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS "KeyRecoveryLog_email_createdAt_idx" ON "KeyRecoveryLog" (email, "createdAt")`;

  console.log("scripts/migrate: migration complete");
} catch (err) {
  console.error("scripts/migrate: error", err);
  process.exit(1);
}
