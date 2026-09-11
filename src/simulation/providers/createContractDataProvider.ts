import type { PrismaClient } from '@prisma/client';
import type { DataProviderMode } from '../types';
import type { IContractDataProvider } from './IContractDataProvider';
import { MockContractDataProvider } from './MockContractDataProvider';
import { PostgresContractDataProvider } from './PostgresContractDataProvider';

export type CreateProviderOptions = {
  mode: DataProviderMode;
  prisma?: PrismaClient;
  tenantId?: string;
};

/**
 * Factory: transparently switch mock ↔ postgres.
 */
export function createContractDataProvider(
  options: CreateProviderOptions,
): IContractDataProvider {
  if (options.mode === 'mock') {
    return new MockContractDataProvider();
  }
  if (!options.prisma || !options.tenantId) {
    throw new Error(
      'PostgresContractDataProvider requires prisma + tenantId when mode=postgres',
    );
  }
  return new PostgresContractDataProvider(options.prisma, options.tenantId);
}
