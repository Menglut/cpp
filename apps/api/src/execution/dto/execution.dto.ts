import { IsIn, IsString, IsUUID, MaxLength } from "class-validator";

export class CreateRunDto {
  @IsUUID() problemVersionId!: string;
  @IsIn(["CPP17"]) language!: "CPP17";
  @IsString() @MaxLength(65536) sourceCode!: string;
  @IsString() @MaxLength(65536) stdin!: string;
}

export class CreateSubmissionDto {
  @IsUUID() problemVersionId!: string;
  @IsIn(["CPP17"]) language!: "CPP17";
  @IsString() @MaxLength(65536) sourceCode!: string;
}
