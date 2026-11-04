CREATE TABLE "app_state" (
	"id" integer PRIMARY KEY,
	"revision" integer DEFAULT 0 NOT NULL,
	"data" jsonb DEFAULT '{}' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_state_single_row" CHECK ("id" = 1)
);
