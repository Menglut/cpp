import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { SessionGuard } from "./session.guard";
import { AuthRateLimitService } from "./auth-rate-limit.service";

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRateLimitService, SessionGuard],
  exports: [SessionGuard],
})
export class AuthModule {}
