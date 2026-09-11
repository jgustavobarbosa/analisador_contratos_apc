import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { ComplianceItemStatus } from '@prisma/client';

export class PatchComplianceItemDto {
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString()
  dueAt?: string | null;

  @IsOptional()
  @IsEnum(ComplianceItemStatus)
  status?: ComplianceItemStatus;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  evidenceDocId?: string | null;
}
