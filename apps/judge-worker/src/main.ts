import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { Queue, Worker } from "bullmq";
import { config as loadEnvironment } from "dotenv";
import Redis from "ioredis";
import { dispatchOutbox } from "./dispatcher";
import type { ExecutionProvider } from "./execution-provider";
import { FakeExecutionProvider } from "./fake-execution-provider";
import { PrismaClient } from "./generated/prisma/client";
import {
  Judge0ExecutionProvider,
  type Judge0ProviderOptions,
} from "./judge0-execution-provider";
import { createProcessors } from "./processors";

loadEnvironment({ path: resolve(process.cwd(), "../../.env") });

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  const redisUrl = process.env.REDIS_URL;
  const providerName = process.env.EXECUTION_PROVIDER ?? "fake";
  if (!databaseUrl || !redisUrl) {
    throw new Error("REDIS_URL and DATABASE_URL are required");
  }
  const provider = await createProvider(providerName);

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
  const runs = new Queue("cppstudy-runs", { connection });
  const submissions = new Queue("cppstudy-submissions", { connection });
  const processors = createProcessors(prisma, provider);
  const concurrency = Math.min(
    Math.max(Number(process.env.WORKER_CONCURRENCY) || 2, 1),
    4,
  );
  const runWorker = new Worker<{ runId: string }>(
    "cppstudy-runs",
    async (job) => processors.run(job.data.runId),
    { connection, concurrency },
  );
  const submissionWorker = new Worker<{ submissionId: string }>(
    "cppstudy-submissions",
    async (job) => processors.submission(job.data.submissionId),
    { connection, concurrency },
  );

  runWorker.on("failed", (job, error) =>
    process.stderr.write(
      `Run job ${job?.id ?? "unknown"} failed: ${error.message}\n`,
    ),
  );
  submissionWorker.on("failed", (job, error) =>
    process.stderr.write(
      `Submission job ${job?.id ?? "unknown"} failed: ${error.message}\n`,
    ),
  );

  let dispatching = false;
  const dispatch = async () => {
    if (dispatching) return;
    dispatching = true;
    try {
      await dispatchOutbox(prisma, { runs, submissions });
    } catch (error) {
      process.stderr.write(
        `Outbox dispatch failed: ${error instanceof Error ? error.message : String(error)}\n`,
      );
    } finally {
      dispatching = false;
    }
  };
  await dispatch();
  const timer = setInterval(() => void dispatch(), 500);

  process.stdout.write(
    `CppStudy Judge Worker started with ${providerName} provider (concurrency=${concurrency}).\n`,
  );

  const shutdown = async () => {
    clearInterval(timer);
    await Promise.all([
      runWorker.close(),
      submissionWorker.close(),
      runs.close(),
      submissions.close(),
    ]);
    connection.disconnect();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());
}

void main().catch((error) => {
  process.stderr.write(
    `Judge Worker failed to start: ${error instanceof Error ? error.stack : String(error)}\n`,
  );
  process.exitCode = 1;
});

async function createProvider(providerName: string): Promise<ExecutionProvider> {
  if (providerName === "fake") return new FakeExecutionProvider();
  if (providerName !== "judge0") {
    throw new Error(`Unsupported EXECUTION_PROVIDER '${providerName}'`);
  }

  const options: Judge0ProviderOptions = {
    baseUrl: requiredEnvironment("JUDGE0_URL"),
    authHeader: process.env.JUDGE0_AUTH_HEADER ?? "X-Judge0-Token",
    authToken: requiredEnvironment("JUDGE0_AUTH_TOKEN"),
    languageId: positiveNumberEnvironment("JUDGE0_CPP17_LANGUAGE_ID", 54),
    compilerVersion:
      process.env.JUDGE0_COMPILER_VERSION ?? "C++17 via Judge0 CE 1.13.1",
    requestTimeoutMs: positiveNumberEnvironment("JUDGE0_REQUEST_TIMEOUT_MS", 10000),
    executionTimeoutMs: positiveNumberEnvironment(
      "JUDGE0_EXECUTION_TIMEOUT_MS",
      30000,
    ),
    pollIntervalMs: positiveNumberEnvironment("JUDGE0_POLL_INTERVAL_MS", 500),
  };
  const provider = new Judge0ExecutionProvider(options);
  await provider.healthCheck();
  return provider;
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function positiveNumberEnvironment(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
  return value;
}
