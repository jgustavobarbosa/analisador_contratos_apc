import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/**
 * Path conventions for assisted extraction (no LLM/OCR):
 * ```json
 * [
 *   {"path":"prices.89999959.amount","value":325,"confidence":0.9},
 *   {"path":"coverage.10101012.action","value":"exclude","confidence":0.7},
 *   {"path":"prices.89999959.effectiveAt","value":"2024-08-01","confidence":0.9}
 * ]
 * ```
 * Also accepted: `{ "fields": [ ... ] }` or structured
 * `{ "prices": { "89999959": { "amount": 325, "effectiveAt": "2024-08-01", "confidence": 0.9 } },
 *    "coverage": { "10101012": { "action": "exclude", "confidence": 0.7 } } }`.
 */
export class AssistedFieldDto {
  @IsString()
  @MinLength(1)
  path!: string;

  /** Scalar or JSON-serializable value stored in valueJson */
  value!: unknown;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence!: number;
}

export class ExtractAssistedDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AssistedFieldDto)
  fields?: AssistedFieldDto[];

  /** Allow raw array body via controller parse; structured maps optional */
  @IsOptional()
  prices?: Record<
    string,
    { amount?: number; effectiveAt?: string; confidence?: number }
  >;

  @IsOptional()
  coverage?: Record<
    string,
    { action?: string; confidence?: number }
  >;
}

export class AcceptFieldDto {
  @IsOptional()
  value?: unknown;
}
