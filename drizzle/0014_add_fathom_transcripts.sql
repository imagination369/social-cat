-- Fathom Transcripts Table
-- Stores meeting transcripts from Fathom AI with both JSON (original) and Markdown (human/AI readable) formats

CREATE TABLE "fathom_transcripts" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"organization_id" varchar(255),
	"recording_id" varchar(255) NOT NULL,
	"title" varchar(500) NOT NULL,
	"meeting_date" timestamp NOT NULL,
	"duration_minutes" integer,
	"participants" jsonb,
	"short_summary" text,
	"full_summary" text,
	"transcript_markdown" text NOT NULL,
	"transcript_json" jsonb NOT NULL,
	"file_path_markdown" varchar(500),
	"file_path_json" varchar(500),
	"transcript_saved" integer DEFAULT 1 NOT NULL,
	"processed" integer DEFAULT 0 NOT NULL,
	"eepa_report_url" varchar(1000),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fathom_transcripts_recording_id_unique" UNIQUE("recording_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "fathom_transcripts_recording_id_idx" ON "fathom_transcripts" ("recording_id");
--> statement-breakpoint
CREATE INDEX "fathom_transcripts_user_id_idx" ON "fathom_transcripts" ("user_id");
--> statement-breakpoint
CREATE INDEX "fathom_transcripts_organization_id_idx" ON "fathom_transcripts" ("organization_id");
--> statement-breakpoint
CREATE INDEX "fathom_transcripts_transcript_saved_idx" ON "fathom_transcripts" ("transcript_saved");
--> statement-breakpoint
CREATE INDEX "fathom_transcripts_processed_idx" ON "fathom_transcripts" ("processed");
--> statement-breakpoint
CREATE INDEX "fathom_transcripts_meeting_date_idx" ON "fathom_transcripts" ("meeting_date");
--> statement-breakpoint
CREATE INDEX "fathom_transcripts_user_transcript_saved_idx" ON "fathom_transcripts" ("user_id", "transcript_saved");
--> statement-breakpoint
CREATE INDEX "fathom_transcripts_user_processed_idx" ON "fathom_transcripts" ("user_id", "processed");
