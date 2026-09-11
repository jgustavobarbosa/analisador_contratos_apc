/**
 * TRACK SIMULATION — deterministic guide generators by provider type.
 * Never import this into REAL tenant writes without track=simulation guard.
 */

export type ProviderType =
  | 'hospital'
  | 'clinica_sadt'
  | 'home_care'
  | 'laboratorio'
  | 'oncologia';

export type SimulationGuide = {
  track: 'simulation';
  providerType: ProviderType;
  codigoProcedimento: string;
  dataAtendimento: string;
  valorInformado: number;
  prestadorCnpjFake: string;
};

const DEFAULTS: Record<ProviderType, Omit<SimulationGuide, 'track' | 'providerType'>> = {
  hospital: {
    codigoProcedimento: '10101012',
    dataAtendimento: '2024-07-09',
    valorInformado: 120,
    prestadorCnpjFake: '11.111.111/0001-11',
  },
  clinica_sadt: {
    codigoProcedimento: '40101010',
    dataAtendimento: '2024-08-15',
    valorInformado: 80,
    prestadorCnpjFake: '22.222.222/0001-22',
  },
  home_care: {
    codigoProcedimento: '50000100',
    dataAtendimento: '2024-08-20',
    valorInformado: 450,
    prestadorCnpjFake: '33.333.333/0001-33',
  },
  laboratorio: {
    codigoProcedimento: '40304361',
    dataAtendimento: '2024-09-01',
    valorInformado: 35,
    prestadorCnpjFake: '44.444.444/0001-44',
  },
  oncologia: {
    codigoProcedimento: '89999959',
    dataAtendimento: '2024-08-02',
    valorInformado: 325,
    prestadorCnpjFake: '00.000.000/0001-00',
  },
};

export function generateGuide(
  providerType: ProviderType,
  overrides: Partial<Omit<SimulationGuide, 'track' | 'providerType'>> = {},
): SimulationGuide {
  return {
    track: 'simulation',
    providerType,
    ...DEFAULTS[providerType],
    ...overrides,
  };
}

export function generateBatch(
  providerType: ProviderType,
  count: number,
): SimulationGuide[] {
  return Array.from({ length: count }, (_, i) =>
    generateGuide(providerType, {
      dataAtendimento: `2024-08-${String((i % 28) + 1).padStart(2, '0')}`,
    }),
  );
}
