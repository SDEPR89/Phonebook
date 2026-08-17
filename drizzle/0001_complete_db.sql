ALTER TABLE "certs" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "certs" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "certs" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "officer_certs" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "officer_certs" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "officer_certs" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "officer_roles" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "officer_roles" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "officer_roles" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "officers" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "officers" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "phones" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "phones" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "phones" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "officer_certs" DROP COLUMN "issued_date";--> statement-breakpoint
ALTER TABLE "phones" ADD CONSTRAINT "phones_phone_number_unique" UNIQUE("phone_number");