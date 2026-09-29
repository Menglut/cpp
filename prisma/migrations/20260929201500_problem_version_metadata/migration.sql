ALTER TABLE "problem_versions" ADD COLUMN "title" VARCHAR(200);
ALTER TABLE "problem_versions" ADD COLUMN "difficulty" INTEGER;

UPDATE "problem_versions" AS version
SET "title" = problem."title",
    "difficulty" = problem."difficulty"
FROM "problems" AS problem
WHERE version."problem_id" = problem."id";

ALTER TABLE "problem_versions" ALTER COLUMN "title" SET NOT NULL;
ALTER TABLE "problem_versions" ALTER COLUMN "difficulty" SET NOT NULL;
