CREATE TABLE "certs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(128) NOT NULL,
	CONSTRAINT "certs_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "officer_certs" (
	"officer_id" uuid NOT NULL,
	"cert_id" uuid NOT NULL,
	"issued_date" date,
	CONSTRAINT "officer_certs_officer_id_cert_id_pk" PRIMARY KEY("officer_id","cert_id")
);
--> statement-breakpoint
CREATE TABLE "officer_roles" (
	"officer_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	CONSTRAINT "officer_roles_officer_id_role_id_pk" PRIMARY KEY("officer_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "officers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "phones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"officer_id" uuid NOT NULL,
	"phone_number" varchar(32) NOT NULL,
	"label" varchar(64)
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(128) NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "officer_certs" ADD CONSTRAINT "officer_certs_officer_id_officers_id_fk" FOREIGN KEY ("officer_id") REFERENCES "public"."officers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "officer_certs" ADD CONSTRAINT "officer_certs_cert_id_certs_id_fk" FOREIGN KEY ("cert_id") REFERENCES "public"."certs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "officer_roles" ADD CONSTRAINT "officer_roles_officer_id_officers_id_fk" FOREIGN KEY ("officer_id") REFERENCES "public"."officers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "officer_roles" ADD CONSTRAINT "officer_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phones" ADD CONSTRAINT "phones_officer_id_officers_id_fk" FOREIGN KEY ("officer_id") REFERENCES "public"."officers"("id") ON DELETE cascade ON UPDATE no action;