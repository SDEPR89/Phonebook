CREATE TABLE "areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(128) NOT NULL,
	CONSTRAINT "areas_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(128) NOT NULL,
	CONSTRAINT "units_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "sectors" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "sectors" CASCADE;--> statement-breakpoint
ALTER TABLE "certs" DROP CONSTRAINT "certs_name_unique";--> statement-breakpoint
ALTER TABLE "certs" DROP CONSTRAINT "certs_sector_id_sectors_id_fk";
--> statement-breakpoint
DROP INDEX "certs_name_idx";--> statement-breakpoint
DROP INDEX "certs_sector_id_idx";--> statement-breakpoint
ALTER TABLE "certs" ADD COLUMN "short_name" varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE "certs" ADD COLUMN "full_name" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "certs" ADD COLUMN "saraban_email" varchar(255);--> statement-breakpoint
ALTER TABLE "certs" ADD COLUMN "saraban_phone" varchar(128);--> statement-breakpoint
ALTER TABLE "certs" ADD COLUMN "contact_247" text;--> statement-breakpoint
ALTER TABLE "certs" ADD COLUMN "unit_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "certs" ADD COLUMN "area_id" uuid NOT NULL;--> statement-breakpoint
CREATE INDEX "areas_name_idx" ON "areas" USING btree ("name");--> statement-breakpoint
CREATE INDEX "units_name_idx" ON "units" USING btree ("name");--> statement-breakpoint
ALTER TABLE "certs" ADD CONSTRAINT "certs_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certs" ADD CONSTRAINT "certs_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "certs_short_name_idx" ON "certs" USING btree ("short_name");--> statement-breakpoint
CREATE INDEX "certs_unit_id_idx" ON "certs" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "certs_area_id_idx" ON "certs" USING btree ("area_id");--> statement-breakpoint
ALTER TABLE "certs" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "certs" DROP COLUMN "sector_id";--> statement-breakpoint
ALTER TABLE "certs" ADD CONSTRAINT "certs_short_name_unique" UNIQUE("short_name");