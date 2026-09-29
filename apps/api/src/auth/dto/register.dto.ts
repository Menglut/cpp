import {
  IsEmail,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from "class-validator";

export class RegisterDto {
  @IsString()
  @MinLength(32)
  @MaxLength(256)
  inviteToken!: string;

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
