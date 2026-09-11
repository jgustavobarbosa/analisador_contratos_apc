import {
  createContractDataProvider,
  generateProviderProfile,
  MockContractDataProvider,
  ProviderType,
} from '../src/simulation';

describe('simulation provider_generator', () => {
  it('generates 20 guides with SHAP-like features for HOSPITAL', () => {
    const profile = generateProviderProfile(ProviderType.HOSPITAL, {
      seed: 42,
      guideCount: 20,
    });
    expect(profile.track).toBe('simulation');
    expect(profile.guides).toHaveLength(20);
    expect(profile.dossier.additives).toHaveLength(3);
    expect(profile.regulatoryAlerts.length).toBeGreaterThanOrEqual(3);
    expect(profile.processDiagnosis.estimatedMonthlyLossPct).toBeGreaterThan(0);
    const hot = profile.guides.filter((g) => g.glosaProbability >= 0.8);
    expect(hot.length).toBeGreaterThan(0);
    expect(hot[0].explanatoryFeatures[0].feature).toContain('tuss_operadora');
  });

  it.each(Object.values(ProviderType))(
    'is deterministic for %s',
    (providerType) => {
      const a = generateProviderProfile(providerType, { seed: 7, guideCount: 5 });
      const b = generateProviderProfile(providerType, { seed: 7, guideCount: 5 });
      expect(a.guides.map((g) => g.glosaProbability)).toEqual(
        b.guides.map((g) => g.glosaProbability),
      );
    },
  );
});

describe('IContractDataProvider mock', () => {
  it('switches via factory to mock and lists sim contracts', async () => {
    const provider = createContractDataProvider({ mode: 'mock' });
    expect(provider.mode).toBe('mock');
    expect(provider).toBeInstanceOf(MockContractDataProvider);
    const list = await provider.listDemoContracts();
    expect(list).toHaveLength(4);
    expect(list[0].contractId.startsWith('sim:')).toBe(true);
    const bundle = await provider.getContractBundle('sim:CLINICA');
    expect(bundle?.guides.length).toBe(20);
  });

  it('marks CLINICA hot code 40301000 with high glosa probability', async () => {
    const profile = await createContractDataProvider({
      mode: 'mock',
    }).getProviderProfile(ProviderType.CLINICA, { seed: 42 });
    const hot = profile.guides.filter((g) => g.tussCode === '40301000');
    expect(hot.length).toBeGreaterThan(0);
    expect(hot[0].glosaProbability).toBeGreaterThanOrEqual(0.8);
  });
});
