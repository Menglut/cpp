import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { csrfMiddleware } from "./auth/csrf.middleware";
import { SessionGuard } from "./auth/session.guard";
import { requestIdMiddleware } from "./common/request-id.middleware";
import { DatabaseModule } from "./database/database.module";
import { ExecutionModule } from "./execution/execution.module";
import { HealthModule } from "./health/health.module";
import { LessonsModule } from "./lessons/lessons.module";
import { ProblemsModule } from "./problems/problems.module";
import { ProgressModule } from "./progress/progress.module";
import { RedisModule } from "./redis/redis.module";

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    AuthModule,
    HealthModule,
    LessonsModule,
    ProblemsModule,
    ProgressModule,
    ExecutionModule,
    AdminModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: SessionGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(requestIdMiddleware, csrfMiddleware).forRoutes("{*path}");
  }
}
