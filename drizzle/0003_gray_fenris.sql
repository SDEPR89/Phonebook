CREATE TYPE "public"."report_status" AS ENUM('pending', 'in_review', 'resolved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."system_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"officer_id" uuid,
	"action" varchar(64) NOT NULL,
	"target_entity" varchar(64),
	"target_id" uuid,
	"metadata" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_correction_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_officer_id" uuid NOT NULL,
	"reporter_id" uuid,
	"field_name" varchar(64),
	"reason" text NOT NULL,
	"suggested_data" text,
	"status" "report_status" DEFAULT 'pending' NOT NULL,
	"admin_notes" text,
	"resolved_by" uuid,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "officers" ADD COLUMN "system_role" "system_role" DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_officer_id_officers_id_fk" FOREIGN KEY ("officer_id") REFERENCES "public"."officers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_correction_reports" ADD CONSTRAINT "data_correction_reports_target_officer_id_officers_id_fk" FOREIGN KEY ("target_officer_id") REFERENCES "public"."officers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_correction_reports" ADD CONSTRAINT "data_correction_reports_reporter_id_officers_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."officers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_correction_reports" ADD CONSTRAINT "data_correction_reports_resolved_by_officers_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."officers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_officer_id_idx" ON "audit_logs" USING btree ("officer_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "reports_target_officer_id_idx" ON "data_correction_reports" USING btree ("target_officer_id");--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "data_correction_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reports_created_at_idx" ON "data_correction_reports" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "certs_name_idx" ON "certs" USING btree ("name");--> statement-breakpoint
CREATE INDEX "officer_certs_cert_id_idx" ON "officer_certs" USING btree ("cert_id");--> statement-breakpoint
CREATE INDEX "officer_roles_role_id_idx" ON "officer_roles" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "officers_name_idx" ON "officers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "officers_email_idx" ON "officers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "phones_phone_number_idx" ON "phones" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "phones_officer_id_idx" ON "phones" USING btree ("officer_id");--> statement-breakpoint
CREATE INDEX "roles_name_idx" ON "roles" USING btree ("name");