import { IsEnum, IsOptional } from "class-validator";
import { LessonLanguage } from "../../generated/prisma/enums";

export class LessonQueryDto {
  @IsOptional()
  @IsEnum(LessonLanguage)
  language: LessonLanguage = LessonLanguage.CPP;
}
