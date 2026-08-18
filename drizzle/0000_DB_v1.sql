CREATE TABLE "certs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(128) NOT NULL,
	"logo_url" text,
	"admin_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "certs_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "data_correction_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_officer_id" uuid NOT NULL,
	"reporter_id" uuid,
	"reason" varchar(64) NOT NULL,
	"details" text,
	"status" varchar(32) DEFAULT 'reported' NOT NULL,
	"admin_notes" text,
	"resolved_by" uuid,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "officer_certs" (
	"officer_id" uuid NOT NULL,
	"cert_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "officer_certs_officer_id_cert_id_pk" PRIMARY KEY("officer_id","cert_id")
);
--> statement-breakpoint
CREATE TABLE "officer_roles" (
	"officer_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "officer_roles_officer_id_role_id_pk" PRIMARY KEY("officer_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "officers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"avatar_url" text,
	"system_role" varchar(32) DEFAULT 'officer' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "officers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "phones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"officer_id" uuid NOT NULL,
	"phone_number" varchar(32) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "phones_officer_id_unique" UNIQUE("officer_id"),
	CONSTRAINT "phones_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(128) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "certs" ADD CONSTRAINT "certs_admin_id_officers_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."officers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_correction_reports" ADD CONSTRAINT "data_correction_reports_target_officer_id_officers_id_fk" FOREIGN KEY ("target_officer_id") REFERENCES "public"."officers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_correction_reports" ADD CONSTRAINT "data_correction_reports_reporter_id_officers_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."officers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_correction_reports" ADD CONSTRAINT "data_correction_reports_resolved_by_officers_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."officers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "officer_certs" ADD CONSTRAINT "officer_certs_officer_id_officers_id_fk" FOREIGN KEY ("officer_id") REFERENCES "public"."officers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "officer_certs" ADD CONSTRAINT "officer_certs_cert_id_certs_id_fk" FOREIGN KEY ("cert_id") REFERENCES "public"."certs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "officer_roles" ADD CONSTRAINT "officer_roles_officer_id_officers_id_fk" FOREIGN KEY ("officer_id") REFERENCES "public"."officers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "officer_roles" ADD CONSTRAINT "officer_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phones" ADD CONSTRAINT "phones_officer_id_officers_id_fk" FOREIGN KEY ("officer_id") REFERENCES "public"."officers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "certs_name_idx" ON "certs" USING btree ("name");--> statement-breakpoint
CREATE INDEX "certs_admin_id_idx" ON "certs" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "reports_target_officer_id_idx" ON "data_correction_reports" USING btree ("target_officer_id");--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "data_correction_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reports_reason_idx" ON "data_correction_reports" USING btree ("reason");--> statement-breakpoint
CREATE INDEX "reports_created_at_idx" ON "data_correction_reports" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "officer_certs_cert_id_idx" ON "officer_certs" USING btree ("cert_id");--> statement-breakpoint
CREATE INDEX "officer_roles_role_id_idx" ON "officer_roles" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "officers_name_idx" ON "officers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "officers_email_idx" ON "officers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "phones_phone_number_idx" ON "phones" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "phones_officer_id_idx" ON "phones" USING btree ("officer_id");--> statement-breakpoint
CREATE INDEX "roles_name_idx" ON "roles" USING btree ("name");