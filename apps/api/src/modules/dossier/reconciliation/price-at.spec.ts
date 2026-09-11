import { priceAt } from './price-at';
import { coverageAt } from './coverage-at';

const d = (iso: string) => new Date(`${iso}T12:00:00.000Z`);

describe('priceAt', () => {
  it('returns amount in vigency window', () => {
    const items = [
      {
        code: '89999959',
        amount: 325,
        effectiveAt: d('2024-08-01'),
        effectiveUntil: null,
      },
    ];
    expect(priceAt(items, '89999959', d('2024-08-02'))?.amount).toBe(325);
  });

  it('honors exclusive effectiveUntil (exclusion closes price)', () => {
    const items = [
      {
        code: '10101012',
        amount: 100,
        effectiveAt: d('2020-10-01'),
        effectiveUntil: d('2024-07-08'),
      },
    ];
    expect(priceAt(items, '10101012', d('2024-07-07'))?.amount).toBe(100);
    expect(priceAt(items, '10101012', d('2024-07-08'))).toBeNull();
    expect(priceAt(items, '10101012', d('2024-07-09'))).toBeNull();
  });

  it('applies retroactive vigency before signature date', () => {
    // Aditivo assinado 06/08 com vigência 01/08 — consulta em 02/08 já vê o preço
    const items = [
      {
        code: '89999960',
        amount: 350,
        effectiveAt: d('2024-08-01'),
        effectiveUntil: null,
      },
    ];
    expect(priceAt(items, '89999960', d('2024-07-31'))).toBeNull();
    expect(priceAt(items, '89999960', d('2024-08-02'))?.amount).toBe(350);
  });

  it('newest effectiveAt wins on overlap', () => {
    const items = [
      {
        code: 'X',
        amount: 10,
        effectiveAt: d('2024-01-01'),
        effectiveUntil: null,
      },
      {
        code: 'X',
        amount: 20,
        effectiveAt: d('2024-06-01'),
        effectiveUntil: null,
      },
    ];
    expect(priceAt(items, 'X', d('2024-07-01'))?.amount).toBe(20);
  });
});

describe('coverageAt', () => {
  it('exclude after include removes coverage', () => {
    const items = [
      { code: '10101012', action: 'include' as const, effectiveAt: d('2020-10-01') },
      { code: '10101012', action: 'exclude' as const, effectiveAt: d('2024-07-08') },
    ];
    expect(coverageAt(items, '10101012', d('2024-07-07')).covered).toBe(true);
    expect(coverageAt(items, '10101012', d('2024-07-09')).covered).toBe(false);
  });
});
