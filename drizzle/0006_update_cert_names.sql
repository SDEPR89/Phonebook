ALTER TABLE "certs" RENAME COLUMN "name" TO "short_name";--> statement-breakpoint
ALTER TABLE "certs" ADD COLUMN "full_name" varchar(255) NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "certs" ALTER COLUMN "full_name" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "certs" RENAME CONSTRAINT "certs_name_unique" TO "certs_short_name_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "certs_name_idx";--> statement-breakpoint
CREATE INDEX "certs_short_name_idx" ON "certs" USING btree ("short_name");
