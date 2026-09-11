import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSimulationDto {
  @IsUUID()
  contractId!: string;

  @IsString()
  @MaxLength(64)
  code!: string;

  /** Attendance / guide date YYYY-MM-DD or ISO datetime */
  @IsDateString()
  attendanceAt!: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  informedAmount?: number;
}

export class CreateSimulationBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => CreateSimulationDto)
  items!: CreateSimulationDto[];
}
