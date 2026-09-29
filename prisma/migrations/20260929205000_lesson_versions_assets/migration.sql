ALTER TABLE "lessons" ADD COLUMN "current_version_id" UUID;

CREATE TABLE "lesson_versions" (
  "id" UUID NOT NULL,
  "lesson_id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "summary" VARCHAR(500) NOT NULL,
  "body" TEXT NOT NULL,
  "published_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lesson_versions_pkey" PRIMARY KEY ("id")
);
INSERT INTO "lesson_versions" ("id", "lesson_id", "version", "title", "summary", "body", "published_at")
SELECT gen_random_uuid(), "id", 1, "title", "summary", "body", "published_at" FROM "lessons";
UPDATE "lessons" l SET "current_version_id" = v."id" FROM "lesson_versions" v WHERE v."lesson_id" = l."id" AND v."version" = 1;
CREATE UNIQUE INDEX "lesson_versions_lesson_id_version_key" ON "lesson_versions"("lesson_id", "version");
CREATE INDEX "lesson_versions_lesson_id_published_at_idx" ON "lesson_versions"("lesson_id", "published_at");
CREATE UNIQUE INDEX "lessons_current_version_id_key" ON "lessons"("current_version_id");
ALTER TABLE "lesson_versions" ADD CONSTRAINT "lesson_versions_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_current_version_id_fkey" FOREIGN KEY ("current_version_id") REFERENCES "lesson_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "content_assets" (
  "id" UUID NOT NULL,
  "storage_key" VARCHAR(255) NOT NULL,
  "original_name" VARCHAR(255) NOT NULL,
  "mime_type" VARCHAR(100) NOT NULL,
  "file_size" INTEGER NOT NULL,
  "alt_text" VARCHAR(300) NOT NULL DEFAULT '',
  "uploaded_by_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "content_assets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "content_assets_storage_key_key" ON "content_assets"("storage_key");
CREATE INDEX "content_assets_created_at_idx" ON "content_assets"("created_at" DESC);
ALTER TABLE "content_assets" ADD CONSTRAINT "content_assets_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
