ALTER TABLE "messages" ADD COLUMN "chunks" jsonb;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "full_prompt" text;