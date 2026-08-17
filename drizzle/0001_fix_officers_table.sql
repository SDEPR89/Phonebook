ALTER TABLE "officers" ADD COLUMN "email" varchar(255);--> statement-breakpoint
ALTER TABLE "officers" ADD CONSTRAINT "officers_email_unique" UNIQUE("email");