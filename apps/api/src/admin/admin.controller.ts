import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../common/current-user.decorator";
import type { AuthenticatedUser } from "../common/request-context";
import { Roles } from "../common/roles.decorator";
import { Role } from "../generated/prisma/enums";
import { AdminService } from "./admin.service";
import {
  CreateLessonDto,
  CreateProblemDto,
  LinkLessonProblemsDto,
  SaveTestCasesDto,
  SetProblemRelationsDto,
  UpdateLessonDto,
  UpdateProblemDto,
} from "./dto/admin.dto";

@ApiTags("admin")
@Roles(Role.ADMIN)
@Controller("admin")
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("content")
  listContent() {
    return this.admin.listContent();
  }

  @Get("lessons/:id")
  getLesson(@Param("id") id: string) {
    return this.admin.getLesson(id);
  }

  @Get("problems/:id")
  getProblem(@Param("id") id: string) {
    return this.admin.getProblem(id);
  }

  @Get("problem-validations/:id")
  getValidation(@Param("id") id: string) {
    return this.admin.getValidation(id);
  }

  @Post("lessons")
  createLesson(
    @Body() dto: CreateLessonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.admin.createLesson(dto, user);
  }

  @Patch("lessons/:id")
  updateLesson(
    @Param("id") id: string,
    @Body() dto: UpdateLessonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.admin.updateLesson(id, dto, user);
  }

  @Put("lessons/:id/problems")
  linkLessonProblems(
    @Param("id") id: string,
    @Body() dto: LinkLessonProblemsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.admin.linkLessonProblems(id, dto, user);
  }

  @Delete("lessons/:id")
  archiveLesson(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.admin.archiveLesson(id, user);
  }

  @Post("lessons/:id/publish")
  publishLesson(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.admin.publishLesson(id, user);
  }

  @Post("lessons/:id/restore")
  restoreLesson(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.admin.restoreLesson(id, user);
  }

  @Post("problems")
  createProblem(
    @Body() dto: CreateProblemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.admin.createProblem(dto, user);
  }

  @Patch("problems/:id")
  updateProblem(
    @Param("id") id: string,
    @Body() dto: UpdateProblemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.admin.updateProblem(id, dto, user);
  }

  @Post("problems/:id/versions")
  createProblemVersion(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.admin.createProblemVersion(id, user);
  }

  @Patch("problem-versions/:id")
  updateProblemVersion(
    @Param("id") id: string,
    @Body() dto: UpdateProblemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.admin.updateProblemVersion(id, dto, user);
  }

  @Put("problems/:id/relations")
  setProblemRelations(
    @Param("id") id: string,
    @Body() dto: SetProblemRelationsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.admin.setProblemRelations(id, dto, user);
  }

  @Put("problem-versions/:id/test-cases")
  saveTestCases(
    @Param("id") id: string,
    @Body() dto: SaveTestCasesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.admin.saveTestCases(id, dto, user);
  }

  @Post("problem-versions/:id/validate")
  validate(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.requestValidation(id, user);
  }

  @Post("problem-versions/:id/publish")
  publish(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.publish(id, user);
  }

  @Delete("problems/:id")
  archiveProblem(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.admin.archiveProblem(id, user);
  }

  @Post("problems/:id/restore")
  restoreProblem(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.admin.restoreProblem(id, user);
  }
}
