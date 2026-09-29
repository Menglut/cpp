import { IsBoolean } from "class-validator";

export class LessonCompletionDto {
  @IsBoolean()
  completed!: boolean;
}
