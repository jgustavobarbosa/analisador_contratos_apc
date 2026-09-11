import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { DocumentType } from '@prisma/client';

const DATE_YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

export class UploadDocumentDto {
  @IsEnum(DocumentType)
  type!: DocumentType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @Matches(DATE_YYYY_MM_DD, { message: 'eventAt must be YYYY-MM-DD' })
  eventAt?: string;

  @IsOptional()
  @IsString()
  @Matches(DATE_YYYY_MM_DD, { message: 'notifiedAt must be YYYY-MM-DD' })
  notifiedAt?: string;

  @IsOptional()
  @IsString()
  @Matches(DATE_YYYY_MM_DD, { message: 'signedAt must be YYYY-MM-DD' })
  signedAt?: string;

  @IsOptional()
  @IsString()
  @Matches(DATE_YYYY_MM_DD, { message: 'effectiveAt must be YYYY-MM-DD' })
  effectiveAt?: string;
}
