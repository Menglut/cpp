import { createHash } from "node:crypto";
import {
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { RedisService } from "../redis/redis.service";

const INCREMENT_WITH_EXPIRY = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return count
`;

@Injectable()
export class AuthRateLimitService {
  constructor(private readonly redis: RedisService) {}

  async consume(email: string, ip: string): Promise<void> {
    const accountKey = this.key("account", email.toLowerCase());
    const ipKey = this.key("ip", ip);
    try {
      await this.redis.connect();
      const [accountCount, ipCount] = await Promise.all([
        this.redis.client.eval(INCREMENT_WITH_EXPIRY, 1, accountKey, 600) as Promise<number>,
        this.redis.client.eval(INCREMENT_WITH_EXPIRY, 1, ipKey, 600) as Promise<number>,
      ]);
      if (accountCount > 5 || ipCount > 10) {
        throw new HttpException({
          code: "LOGIN_RATE_LIMITED",
          message: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.",
        }, HttpStatus.TOO_MANY_REQUESTS);
      }
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS) throw error;
      throw new ServiceUnavailableException({
        code: "AUTH_RATE_LIMIT_UNAVAILABLE",
        message: "로그인 보호 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.",
      });
    }
  }

  async reset(email: string): Promise<void> {
    try {
      await this.redis.connect();
      await this.redis.client.del(this.key("account", email.toLowerCase()));
    } catch {
      // A successful login must not fail only because counter cleanup failed.
    }
  }

  private key(scope: string, value: string): string {
    const digest = createHash("sha256").update(value).digest("hex");
    return `cppstudy:auth:${scope}:${digest}`;
  }
}
