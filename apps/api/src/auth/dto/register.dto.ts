import { IsEmail, IsString, Length, MaxLength, MinLength } from "class-validator";

export class RegisterDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @Length(2, 40)
  nickname!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(128)
  password!: string;
}
