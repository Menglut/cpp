import { Body, Controller, Get, Param, Put } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../common/current-user.decorator";
import type { AuthenticatedUser } from "../common/request-context";
import { LessonCompletionDto } from "./dto/lesson-completion.dto";
import { ProgressService } from "./progress.service";

@ApiTags("progress")
@Controller("users/me")
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get("progress")
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.progress.get(user.id);
  }

  @Put("lessons/:slug/completion")
  setLessonCompletion(
    @CurrentUser() user: AuthenticatedUser,
    @Param("slug") slug: string,
    @Body() dto: LessonCompletionDto,
  ) {
    return this.progress.setLessonCompletion(user.id, slug, dto.completed);
  }
}
