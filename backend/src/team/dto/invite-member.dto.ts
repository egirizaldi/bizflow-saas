import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from '@prisma/client';

export class InviteMemberDto {
  @IsEmail({}, { message: 'Format email tidak valid.' })
  @IsNotEmpty({ message: 'Email tidak boleh kosong.' })
  email: string;

  @IsEnum(Role, { message: 'Role harus berupa ADMIN, MANAGER, atau STAFF.' })
  @IsNotEmpty({ message: 'Role tidak boleh kosong.' })
  role: Role;
}
