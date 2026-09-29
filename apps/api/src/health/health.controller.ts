import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../common/public.decorator";
import { PrismaService } from "../database/prisma.service";
import { RedisService } from "../redis/redis.service";

@Public()
@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get("live")
  live(): { status: "ok" } {
    return { status: "ok" };
  }

  @Get("ready")
  async ready(): Promise<{ status: "ok"; services: { database: "ok"; redis: "ok" } }> {
    try {
      await this.prisma.client.$queryRaw`SELECT 1`;
      await this.redis.ping();
      return { status: "ok", services: { database: "ok", redis: "ok" } };
    } catch {
      throw new ServiceUnavailableException({
        code: "DEPENDENCY_UNAVAILABLE",
        message: "필수 서비스가 준비되지 않았습니다.",
      });
    }
  }
}
