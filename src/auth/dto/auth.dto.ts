import { IsString, IsEmail, MinLength } from 'class-validator';

export class AuthDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6, {
    message: 'Password cannot be ess than 6 characters',
  })
  password: string;
}
