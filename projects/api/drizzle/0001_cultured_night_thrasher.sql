CREATE TABLE "vectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"text" text NOT NULL,
	"source" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"chunk_length" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
