import type { Queue } from "bullmq";
import type { PrismaClient } from "./generated/prisma/client";

type Queues = { runs: Queue; submissions: Queue; validations: Queue };

export async function dispatchOutbox(prisma: PrismaClient, queues: Queues) {
  const events = await prisma.outboxEvent.findMany({
    where: {
      topic: {
        in: [
          "run.requested",
          "submission.requested",
          "problem-version.validate",
        ],
      },
      status: { in: ["PENDING", "FAILED"] },
      availableAt: { lte: new Date() },
    },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  for (const event of events) {
    try {
      if (event.topic === "run.requested") {
        await queues.runs.add(
          "execute-run",
          { runId: event.aggregateId },
          { jobId: event.id, removeOnComplete: 100, removeOnFail: 100 },
        );
        await prisma.run.updateMany({
          where: { id: event.aggregateId, status: "PENDING" },
          data: { status: "QUEUED" },
        });
      } else if (event.topic === "submission.requested") {
        await queues.submissions.add(
          "judge-submission",
          { submissionId: event.aggregateId },
          { jobId: event.id, removeOnComplete: 100, removeOnFail: 100 },
        );
        await prisma.submission.updateMany({
          where: { id: event.aggregateId, status: "PENDING" },
          data: { status: "QUEUED" },
        });
      } else if (event.topic === "problem-version.validate") {
        await queues.validations.add(
          "validate-problem-version",
          { validationId: event.aggregateId },
          { jobId: event.id, removeOnComplete: 100, removeOnFail: 100 },
        );
      }
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: "PUBLISHED", publishedAt: new Date(), lastError: null },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const attemptCount = event.attemptCount + 1;
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: "FAILED",
          attemptCount,
          lastError: message.slice(0, 1000),
          availableAt: new Date(
            Date.now() + Math.min(30_000, 1000 * 2 ** attemptCount),
          ),
        },
      });
    }
  }
}
