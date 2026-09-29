import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly client: PrismaClient;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required");
    }
    this.client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }

  transaction<T>(operation: (client: PrismaClient) => Promise<T>): Promise<T> {
    return this.client.$transaction((client) =>
      operation(client as unknown as PrismaClient),
    );
  }
}
