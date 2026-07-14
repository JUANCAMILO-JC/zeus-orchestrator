import { IsString, MinLength, MaxLength } from 'class-validator';

export class MessageDto {
  @IsString()
  @MinLength(1, { message: 'El mensaje no puede estar vacío' })
  @MaxLength(10000, { message: 'El mensaje no puede exceder 10000 caracteres' })
  message: string;
}
