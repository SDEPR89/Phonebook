CREATE TABLE "cert_units" (
	"cert_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	CONSTRAINT "cert_units_cert_id_unit_id_pk" PRIMARY KEY("cert_id","unit_id")
);
--> statement-breakpoint
ALTER TABLE "certs" DROP CONSTRAINT "certs_unit_id_units_id_fk";
--> statement-breakpoint
DROP INDEX "certs_unit_id_idx";--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "id" SET DATA TYPE uuid USING id::uuid;--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "officer_id" SET DATA TYPE uuid USING officer_id::uuid;--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "officer_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "certs" ADD COLUMN "saraban_contacts" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "certs" ADD COLUMN "coordinators" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "certs" ADD COLUMN "contact247_email" varchar(255);--> statement-breakpoint
ALTER TABLE "certs" ADD COLUMN "contact247_phone" varchar(128);--> statement-breakpoint
ALTER TABLE "certs" ADD COLUMN "establishment_status" varchar(64) DEFAULT 'not_started' NOT NULL;--> statement-breakpoint
ALTER TABLE "cert_units" ADD CONSTRAINT "cert_units_cert_id_certs_id_fk" FOREIGN KEY ("cert_id") REFERENCES "public"."certs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cert_units" ADD CONSTRAINT "cert_units_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cert_units_unit_id_idx" ON "cert_units" USING btree ("unit_id");--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_officer_id_officers_id_fk" FOREIGN KEY ("officer_id") REFERENCES "public"."officers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certs" DROP COLUMN "saraban_phone";--> statement-breakpoint
ALTER TABLE "certs" DROP COLUMN "contact_247";--> statement-breakpoint
ALTER TABLE "certs" DROP COLUMN "unit_id";