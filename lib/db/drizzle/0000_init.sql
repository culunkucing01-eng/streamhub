CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255),
	"name" varchar(255) NOT NULL,
	"role" varchar(20) DEFAULT 'user' NOT NULL,
	"google_id" varchar(255),
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "channels" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"stream_key" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "channels_stream_key_unique" UNIQUE("stream_key")
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"interval" varchar(20) DEFAULT 'monthly' NOT NULL,
	"max_channels" integer DEFAULT 1 NOT NULL,
	"max_bitrate" integer,
	"features" json DEFAULT '[]'::json,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plan_id" integer NOT NULL,
	"channel_id" integer,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"subscription_id" integer,
	"amount" numeric(10, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"due_date" timestamp NOT NULL,
	"paid_at" timestamp,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "viewer_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel_id" integer,
	"viewer_count" integer DEFAULT 0 NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viewer_analytics" ADD CONSTRAINT "viewer_analytics_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;