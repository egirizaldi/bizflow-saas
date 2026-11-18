import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateProjectDto {
  @IsString({ message: 'Nama project harus berupa string.' })
  @IsNotEmpty({ message: 'Nama project tidak boleh kosong.' })
  @MinLength(2, { message: 'Nama project minimal 2 karakter.' })
  @MaxLength(150, { message: 'Nama project maksimal 150 karakter.' })
  name: string;

  @IsOptional()
  @IsString({ message: 'Deskripsi project harus berupa string.' })
  description?: string;
}
