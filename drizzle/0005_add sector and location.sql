CREATE TABLE "sectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(128) NOT NULL,
	CONSTRAINT "sectors_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "certs" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "certs" ADD COLUMN "sector_id" uuid NOT NULL;--> statement-breakpoint
CREATE INDEX "sectors_name_idx" ON "sectors" USING btree ("name");--> statement-breakpoint
ALTER TABLE "certs" ADD CONSTRAINT "certs_sector_id_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "public"."sectors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "certs_sector_id_idx" ON "certs" USING btree ("sector_id");