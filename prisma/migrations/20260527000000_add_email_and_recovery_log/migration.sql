-- Add email field to OgCustomer
ALTER TABLE "OgCustomer" ADD COLUMN IF NOT EXISTS email TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "OgCustomer_email_key" ON "OgCustomer"(email);

-- Create KeyRecoveryLog table
CREATE TABLE IF NOT EXISTS "KeyRecoveryLog" (
    id TEXT NOT NULL,
    email TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "KeyRecoveryLog_pkey" PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS "KeyRecoveryLog_email_createdAt_idx" ON "KeyRecoveryLog" (email, "createdAt");
