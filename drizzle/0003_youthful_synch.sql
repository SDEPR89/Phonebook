CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"officer_id" text NOT NULL,
	"officer_name" text NOT NULL,
	"action" text NOT NULL,
	"changes" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"officer_id" uuid NOT NULL,
	"username" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"salt" varchar(255),
	"failed_login_attempts" integer DEFAULT 0,
	"locked_until" timestamp,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "login_credentials_officer_id_unique" UNIQUE("officer_id"),
	CONSTRAINT "login_credentials_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "login_credentials" ADD CONSTRAINT "login_credentials_officer_id_officers_id_fk" FOREIGN KEY ("officer_id") REFERENCES "public"."officers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "login_credentials_officer_id_idx" ON "login_credentials" USING btree ("officer_id");--> statement-breakpoint
CREATE INDEX "login_credentials_username_idx" ON "login_credentials" USING btree ("username");