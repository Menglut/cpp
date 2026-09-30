CREATE TYPE "LessonLanguage" AS ENUM ('C', 'CPP');

ALTER TABLE "lesson_categories"
ADD COLUMN "language" "LessonLanguage" NOT NULL DEFAULT 'CPP';

DROP INDEX "lesson_categories_slug_key";
DROP INDEX "lesson_categories_status_order_idx";

CREATE UNIQUE INDEX "lesson_categories_language_slug_key"
ON "lesson_categories"("language", "slug");

CREATE INDEX "lesson_categories_language_status_order_idx"
ON "lesson_categories"("language", "status", "order");
