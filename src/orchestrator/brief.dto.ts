import { IsString, MinLength, MaxLength } from 'class-validator';

export class BriefDto {
  @IsString()
  @MinLength(20, { message: 'El brief debe tener al menos 20 caracteres' })
  @MaxLength(10000, { message: 'El brief no puede exceder 10000 caracteres' })
  brief: string;
}
