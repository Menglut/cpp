CREATE TYPE "ValidationStatus" AS ENUM ('PENDING', 'RUNNING', 'PASSED', 'FAILED', 'SYSTEM_ERROR');

CREATE TABLE "problem_validations" (
    "id" UUID NOT NULL,
    "problem_version_id" UUID NOT NULL,
    "requested_by_id" UUID NOT NULL,
    "status" "ValidationStatus" NOT NULL DEFAULT 'PENDING',
    "diagnostic" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ(3),
    "finished_at" TIMESTAMPTZ(3),

    CONSTRAINT "problem_validations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "problem_validations_problem_version_id_created_at_idx"
ON "problem_validations"("problem_version_id", "created_at" DESC);

CREATE INDEX "problem_validations_status_created_at_idx"
ON "problem_validations"("status", "created_at");

ALTER TABLE "problem_validations"
ADD CONSTRAINT "problem_validations_problem_version_id_fkey"
FOREIGN KEY ("problem_version_id") REFERENCES "problem_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "problem_validations"
ADD CONSTRAINT "problem_validations_requested_by_id_fkey"
FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
