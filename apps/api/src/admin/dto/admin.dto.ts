import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import {
  ComparatorType,
  TestCaseVisibility,
} from "../../generated/prisma/enums";

export class CreateInvitationDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;
}

export class CreateLessonDto {
  @IsString() categoryId!: string;
  @IsString() @Length(1, 100) slug!: string;
  @IsString() @Length(1, 200) title!: string;
  @IsString() @MaxLength(500) summary!: string;
  @IsString() body!: string;
  @IsInt() @Min(0) order = 0;
}

export class UpdateLessonDto {
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() @Length(1, 200) title?: string;
  @IsOptional() @IsString() @MaxLength(500) summary?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsInt() @Min(0) order?: number;
}

export class CreateLessonCategoryDto {
  @IsString() @Length(1, 100) slug!: string;
  @IsString() @Length(1, 200) title!: string;
  @IsString() @MaxLength(500) summary = "";
  @IsInt() @Min(0) order = 0;
}

export class UpdateLessonCategoryDto {
  @IsOptional() @IsString() @Length(1, 200) title?: string;
  @IsOptional() @IsString() @MaxLength(500) summary?: string;
  @IsOptional() @IsInt() @Min(0) order?: number;
}

export class CreateProblemDto {
  @IsInt() @Min(1) number!: number;
  @IsString() @Length(1, 200) title!: string;
  @IsInt() @Min(1) @Max(5) difficulty!: number;
  @IsString() statement!: string;
  @IsString() inputDescription!: string;
  @IsString() outputDescription!: string;
  @IsString() constraints!: string;
  @IsOptional() @IsEnum(ComparatorType) comparator: ComparatorType =
    ComparatorType.TOKEN;
  @IsOptional() @IsBoolean() allowFinalNewline = true;
  @IsInt() @Min(100) @Max(10000) timeLimitMs = 1000;
  @IsInt() @Min(16384) @Max(524288) memoryLimitKiB = 131072;
  @IsString() starterCode!: string;
  @IsOptional() @IsString() referenceSource?: string;
}

export class UpdateProblemDto {
  @IsOptional() @IsString() @Length(1, 200) title?: string;
  @IsOptional() @IsInt() @Min(1) @Max(5) difficulty?: number;
  @IsOptional() @IsString() statement?: string;
  @IsOptional() @IsString() inputDescription?: string;
  @IsOptional() @IsString() outputDescription?: string;
  @IsOptional() @IsString() constraints?: string;
  @IsOptional() @IsEnum(ComparatorType) comparator?: ComparatorType;
  @IsOptional() @IsBoolean() allowFinalNewline?: boolean;
  @IsOptional() @IsInt() @Min(100) @Max(10000) timeLimitMs?: number;
  @IsOptional() @IsInt() @Min(16384) @Max(524288) memoryLimitKiB?: number;
  @IsOptional() @IsString() starterCode?: string;
  @IsOptional() @IsString() referenceSource?: string;
}

export class TestCaseDto {
  @IsInt() @Min(1) position!: number;
  @IsEnum(TestCaseVisibility) visibility!: TestCaseVisibility;
  @IsString() input!: string;
  @IsString() expectedOutput!: string;
  @IsOptional() @IsString() explanation?: string;
}

export class SaveTestCasesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestCaseDto)
  testCases!: TestCaseDto[];
}

export class LinkLessonProblemDto {
  @IsString() problemId!: string;
  @IsInt() @Min(0) order!: number;
}

export class LinkLessonProblemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LinkLessonProblemDto)
  problems!: LinkLessonProblemDto[];
}

export class SetProblemRelationsDto {
  @IsArray() @IsString({ each: true }) categoryIds!: string[];
  @IsArray() @IsString({ each: true }) lessonIds!: string[];
}
