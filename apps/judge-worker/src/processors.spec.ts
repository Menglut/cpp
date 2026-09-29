import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "./generated/prisma/client";
import type { ExecutionProvider } from "./execution-provider";
import { createProcessors } from "./processors";

function validationRecord() {
  return {
    id: "validation-1",
    status: "PENDING",
    problemVersion: {
      id: "version-1",
      referenceSource: "int main() {}",
      timeLimitMs: 1000,
      memoryLimitKiB: 131072,
      comparator: "TOKEN",
      allowFinalNewline: true,
      testCases: [{ position: 1, input: "", expectedOutput: "2\n" }],
    },
  };
}

function prismaMock() {
  const validationUpdate = vi.fn(async (args) => args);
  const versionUpdate = vi.fn(async (args) => args);
  return {
    client: {
      problemValidation: {
        findUnique: vi.fn(async () => validationRecord()),
        update: validationUpdate,
      },
      problemVersion: { update: versionUpdate },
      $transaction: vi.fn(async (operations: Array<Promise<unknown>>) =>
        Promise.all(operations),
      ),
    } as unknown as PrismaClient,
    validationUpdate,
    versionUpdate,
  };
}

describe("problem version validation processor", () => {
  it("marks a matching reference solution as passed", async () => {
    const prisma = prismaMock();
    const provider: ExecutionProvider = {
      execute: async () => ({
        status: "SUCCESS",
        stdout: "2\n",
        diagnostic: "ok",
        compilerVersion: "test compiler",
      }),
    };

    await createProcessors(prisma.client, provider).validation("validation-1");

    expect(prisma.versionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ validatedAt: expect.any(Date) }),
      }),
    );
    expect(prisma.validationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PASSED" }),
      }),
    );
  });

  it("rejects a reference solution with mismatched output", async () => {
    const prisma = prismaMock();
    const provider: ExecutionProvider = {
      execute: async () => ({
        status: "SUCCESS",
        stdout: "3\n",
        diagnostic: "ok",
        compilerVersion: "test compiler",
      }),
    };

    await createProcessors(prisma.client, provider).validation("validation-1");

    expect(prisma.versionUpdate).not.toHaveBeenCalled();
    expect(prisma.validationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
          diagnostic: expect.stringContaining("테스트 1"),
        }),
      }),
    );
  });
});
