import { IsNotEmpty, IsString } from 'class-validator';

export class CheckoutDto {
  @IsString()
  @IsNotEmpty()
  planName: string;
}
