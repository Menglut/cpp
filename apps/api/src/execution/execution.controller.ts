import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../common/current-user.decorator";
import type { AuthenticatedUser } from "../common/request-context";
import { CreateRunDto, CreateSubmissionDto } from "./dto/execution.dto";
import { ExecutionService } from "./execution.service";

@ApiTags("execution")
@Controller()
export class ExecutionController {
  constructor(private readonly execution: ExecutionService) {}

  @Post("runs")
  @HttpCode(202)
  createRun(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRunDto) {
    return this.execution.createRun(user.id, dto);
  }

  @Get("runs/:id")
  getRun(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.execution.getRun(user.id, id);
  }

  @Post("submissions")
  @HttpCode(202)
  createSubmission(
    @CurrentUser() user: AuthenticatedUser,
    @Headers("idempotency-key") idempotencyKey: string,
    @Body() dto: CreateSubmissionDto,
  ) {
    return this.execution.createSubmission(user.id, idempotencyKey, dto);
  }

  @Get("submissions/:id")
  getSubmission(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.execution.getSubmission(user.id, id, user.role === "ADMIN");
  }

  @Get("users/me/submissions")
  listSubmissions(
    @CurrentUser() user: AuthenticatedUser,
    @Query("limit", new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    return this.execution.listSubmissions(user.id, limit);
  }
}
