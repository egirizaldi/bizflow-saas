import { IsNotEmpty, IsString } from 'class-validator';

export class AcceptInvitationDto {
  @IsString({ message: 'Token undangan harus berupa string.' })
  @IsNotEmpty({ message: 'Token undangan tidak boleh kosong.' })
  token: string;
}
