import { Controller, Get, Param, ParseIntPipe, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../common/public.decorator";
import { ProblemQueryDto } from "./dto/problem-query.dto";
import { ProblemsService } from "./problems.service";

@Public()
@ApiTags("problems")
@Controller()
export class ProblemsController {
  constructor(private readonly problems: ProblemsService) {}

  @Get("categories")
  categories() {
    return this.problems.categories();
  }

  @Get("problems")
  list(@Query() query: ProblemQueryDto) {
    return this.problems.list(query);
  }

  @Get("problems/:number")
  get(@Param("number", ParseIntPipe) number: number) {
    return this.problems.get(number);
  }
}
