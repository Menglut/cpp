import { Controller, Get, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../common/public.decorator";
import { LessonsService } from "./lessons.service";

@Public()
@ApiTags("lessons")
@Controller("lessons")
export class LessonsController {
  constructor(private readonly lessons: LessonsService) {}

  @Get()
  list() {
    return this.lessons.list();
  }

  @Get(":slug")
  get(@Param("slug") slug: string) {
    return this.lessons.get(slug);
  }
}
