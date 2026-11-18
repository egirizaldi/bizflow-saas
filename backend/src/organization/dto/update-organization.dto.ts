import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString({ message: 'Nama organisasi harus berupa string.' })
  @MinLength(2, { message: 'Nama organisasi minimal 2 karakter.' })
  @MaxLength(150, { message: 'Nama organisasi maksimal 150 karakter.' })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Format billing email tidak valid.' })
  billingEmail?: string;

  @IsOptional()
  @IsString({ message: 'URL Logo harus berupa string.' })
  logoUrl?: string;
}
