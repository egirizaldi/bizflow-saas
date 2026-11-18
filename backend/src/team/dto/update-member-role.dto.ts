import { IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateMemberRoleDto {
  @IsEnum(Role, { message: 'Role harus berupa ADMIN, MANAGER, atau STAFF.' })
  @IsNotEmpty({ message: 'Role tidak boleh kosong.' })
  role: Role;
}
