import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../common/public.decorator";
import { LessonsService } from "./lessons.service";
import { LessonQueryDto } from "./dto/lesson-query.dto";

@Public()
@ApiTags("lessons")
@Controller("lessons")
export class LessonsController {
  constructor(private readonly lessons: LessonsService) {}

  @Get()
  list(@Query() query: LessonQueryDto) {
    return this.lessons.list(query.language);
  }

  @Get(":slug")
  get(@Param("slug") slug: string, @Query() query: LessonQueryDto) {
    return this.lessons.get(slug, query.language);
  }
}
