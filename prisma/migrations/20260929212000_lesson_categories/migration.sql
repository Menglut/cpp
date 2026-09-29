CREATE TABLE "lesson_categories" (
  "id" UUID NOT NULL,
  "slug" VARCHAR(100) NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "summary" VARCHAR(500) NOT NULL DEFAULT '',
  "order" INTEGER NOT NULL DEFAULT 0,
  "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "lesson_categories_pkey" PRIMARY KEY ("id")
);

INSERT INTO "lesson_categories" ("id", "slug", "title", "summary", "order", "status", "updated_at")
VALUES ('00000000-0000-4000-8000-000000000100', 'uncategorized', '기초 과정', '기존 강의를 임시로 분류한 과정입니다.', 1, 'PUBLISHED', CURRENT_TIMESTAMP);

ALTER TABLE "lessons" ADD COLUMN "category_id" UUID;
UPDATE "lessons" SET "category_id" = '00000000-0000-4000-8000-000000000100';
ALTER TABLE "lessons" ALTER COLUMN "category_id" SET NOT NULL;

CREATE UNIQUE INDEX "lesson_categories_slug_key" ON "lesson_categories"("slug");
CREATE INDEX "lesson_categories_status_order_idx" ON "lesson_categories"("status", "order");
CREATE INDEX "lessons_category_id_status_order_idx" ON "lessons"("category_id", "status", "order");
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "lesson_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
