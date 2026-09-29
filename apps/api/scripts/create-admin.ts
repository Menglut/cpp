import { resolve } from "node:path";
import { stdin, stdout } from "node:process";
import { PrismaPg } from "@prisma/adapter-pg";
import * as argon2 from "argon2";
import { config as loadEnvironment } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";

loadEnvironment({ path: resolve(process.cwd(), "../../.env") });

async function hiddenPrompt(label: string): Promise<string> {
  if (!stdin.isTTY) throw new Error("This command requires an interactive terminal.");
  stdout.write(label);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");
  return new Promise((resolve, reject) => {
    let value = "";
    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener("data", onData);
      stdout.write("\n");
    };
    const onData = (key: string) => {
      if (key === "\u0003") {
        cleanup();
        reject(new Error("Cancelled"));
      } else if (key === "\r" || key === "\n") {
        cleanup();
        resolve(value);
      } else if (key === "\u007f" || key === "\b") {
        value = value.slice(0, -1);
      } else {
        value += key;
      }
    };
    stdin.on("data", onData);
  });
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const nickname = process.env.ADMIN_NICKNAME?.trim() || "CppStudy 관리자";
  if (!databaseUrl || !email) {
    throw new Error("DATABASE_URL and ADMIN_EMAIL are required in .env");
  }
  const password = await hiddenPrompt("관리자 비밀번호(10자 이상): ");
  if (password.length < 10) throw new Error("Password must be at least 10 characters");
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  try {
    await prisma.user.upsert({
      where: { email },
      update: { nickname, passwordHash, role: "ADMIN", disabledAt: null },
      create: { email, nickname, passwordHash, role: "ADMIN" },
    });
    stdout.write(`관리자 계정 ${email}을(를) 준비했습니다.\n`);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
