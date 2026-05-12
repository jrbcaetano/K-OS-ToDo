-- Moderated registration: every new user lands in `pending` and cannot log
-- in until a platform admin approves them. Existing rows are grandfathered
-- as `approved` so the deploy doesn't lock anyone out.
--
-- `platform_role` is workspace-independent; today only 'admin' (the
-- registration-approval queue lives behind it).
--
-- The unique constraint on email is replaced with a partial unique index
-- so a rejected user's email can be re-registered later — rejected rows
-- are kept (soft delete) for audit but don't block the address.

ALTER TABLE "users"
  ADD COLUMN "approval_status" text NOT NULL DEFAULT 'approved',
  ADD COLUMN "approved_at"     timestamp with time zone,
  ADD COLUMN "approved_by"     uuid REFERENCES "users"("id"),
  ADD COLUMN "rejected_at"     timestamp with time zone,
  ADD COLUMN "rejected_by"     uuid REFERENCES "users"("id"),
  ADD COLUMN "platform_role"   text;
--> statement-breakpoint

-- Backfill: stamp existing users as approved at creation time so audit fields
-- aren't blank.
UPDATE "users"
   SET "approved_at" = "created_at"
 WHERE "approved_at" IS NULL;
--> statement-breakpoint

-- Switch the default so new signups land in `pending`.
ALTER TABLE "users" ALTER COLUMN "approval_status" SET DEFAULT 'pending';
--> statement-breakpoint

ALTER TABLE "users"
  ADD CONSTRAINT "users_approval_status_check"
  CHECK ("approval_status" IN ('pending','approved','rejected'));
--> statement-breakpoint

ALTER TABLE "users"
  ADD CONSTRAINT "users_platform_role_check"
  CHECK ("platform_role" IS NULL OR "platform_role" IN ('admin'));
--> statement-breakpoint

-- Swap the full unique constraint for a partial unique index that ignores
-- rejected rows.
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_active"
  ON "users" ("email")
  WHERE "approval_status" <> 'rejected';
--> statement-breakpoint

-- Seed the platform admin if their row already exists. Signup will also
-- auto-promote this email on first registration (see signup helper).
UPDATE "users"
   SET "platform_role" = 'admin'
 WHERE "email" = 'joao@jrc.pt';
