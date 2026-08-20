CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"officer_id" text NOT NULL,
	"officer_name" text NOT NULL,
	"action" text NOT NULL,
	"changes" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
