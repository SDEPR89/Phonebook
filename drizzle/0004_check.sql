CREATE INDEX "officers_deleted_at_idx" ON "officers" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "phones_deleted_at_idx" ON "phones" USING btree ("deleted_at");