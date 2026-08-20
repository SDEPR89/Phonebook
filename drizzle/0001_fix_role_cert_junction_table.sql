CREATE TABLE "officer_cert_roles" (
	"officer_cert_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "officer_cert_roles_officer_cert_id_role_id_pk" PRIMARY KEY("officer_cert_id","role_id")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "officer_roles" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "audit_logs" CASCADE;--> statement-breakpoint
DROP TABLE "officer_roles" CASCADE;--> statement-breakpoint
ALTER TABLE "officer_certs" DROP CONSTRAINT "officer_certs_officer_id_cert_id_pk";--> statement-breakpoint
ALTER TABLE "data_correction_reports" ALTER COLUMN "reason" SET DATA TYPE varchar(64);--> statement-breakpoint
ALTER TABLE "data_correction_reports" ALTER COLUMN "status" SET DEFAULT 'reported';--> statement-breakpoint
ALTER TABLE "data_correction_reports" ADD COLUMN "details" text;--> statement-breakpoint
ALTER TABLE "officer_certs" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "officer_cert_roles" ADD CONSTRAINT "officer_cert_roles_officer_cert_id_officer_certs_id_fk" FOREIGN KEY ("officer_cert_id") REFERENCES "public"."officer_certs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "officer_cert_roles" ADD CONSTRAINT "officer_cert_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "officer_cert_roles_role_id_idx" ON "officer_cert_roles" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "reports_reason_idx" ON "data_correction_reports" USING btree ("reason");--> statement-breakpoint
CREATE INDEX "officer_certs_officer_id_cert_id_idx" ON "officer_certs" USING btree ("officer_id","cert_id");--> statement-breakpoint
ALTER TABLE "data_correction_reports" DROP COLUMN "field_name";--> statement-breakpoint
ALTER TABLE "data_correction_reports" DROP COLUMN "suggested_data";