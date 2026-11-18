import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateOrganizationDto {
  @IsString({ message: 'Nama organisasi harus berupa string.' })
  @IsNotEmpty({ message: 'Nama organisasi tidak boleh kosong.' })
  @MinLength(2, { message: 'Nama organisasi minimal 2 karakter.' })
  @MaxLength(150, { message: 'Nama organisasi maksimal 150 karakter.' })
  name: string;

  @IsOptional()
  @IsString({ message: 'Slug harus berupa string.' })
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug hanya boleh memuat huruf kecil, angka, dan tanda hubung (-).',
  })
  @MaxLength(100, { message: 'Slug maksimal 100 karakter.' })
  slug?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Format billing email tidak valid.' })
  billingEmail?: string;

  @IsOptional()
  @IsString({ message: 'URL Logo harus berupa string.' })
  logoUrl?: string;
}
