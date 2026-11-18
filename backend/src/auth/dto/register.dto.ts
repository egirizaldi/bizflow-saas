import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Format email tidak valid.' })
  @IsNotEmpty({ message: 'Email tidak boleh kosong.' })
  email: string;

  @IsString({ message: 'Password harus berupa string.' })
  @MinLength(8, { message: 'Password minimal 8 karakter.' })
  password: string;

  @IsString({ message: 'Nama lengkap harus berupa string.' })
  @IsNotEmpty({ message: 'Nama lengkap tidak boleh kosong.' })
  fullName: string;
}
