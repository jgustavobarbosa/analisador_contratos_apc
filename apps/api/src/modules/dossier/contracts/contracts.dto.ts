import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateContractDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  partyA!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  partyB!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;
}
