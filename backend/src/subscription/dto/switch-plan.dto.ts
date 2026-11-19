import { IsNotEmpty, IsString } from 'class-validator';

export class SwitchPlanDto {
  @IsString()
  @IsNotEmpty()
  planName: string;
}
