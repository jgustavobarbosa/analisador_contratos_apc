import {
  assertAggregationInput,
  AggregationInputError,
  buildFixtureAggregation,
  mapTissToRootCause,
  NullFederatedLearningAdapter,
  ProcessOptimizerService,
  RootCauseKind,
} from '../src/ml/process_optimizer';

describe('EPIC-8 process_optimizer', () => {
  const svc = new ProcessOptimizerService({
    platformSalt: 'test-salt',
    maxRecommendations: 5,
  });

  it('maps TISS codes to root-cause taxonomy', () => {
    expect(mapTissToRootCause('1011')).toBe(RootCauseKind.CADASTRO_DIVERGENCE);
    expect(mapTissToRootCause('2014')).toBe(
      RootCauseKind.CLINICAL_JUSTIFICATION_MISSING,
    );
    expect(mapTissToRootCause('5010')).toBe(
      RootCauseKind.REGULATORY_DEADLINE_BREACH,
    );
  });

  it('rejects aggregation without tenantId', () => {
    expect(() =>
      assertAggregationInput(
        buildFixtureAggregation({ tenantId: '   ' }),
      ),
    ).toThrow(AggregationInputError);
  });

  it('detects root-cause clusters and batch anomalies', () => {
    const result = svc.run(buildFixtureAggregation());
    expect(result.detection.clusters[0].kind).toBe(
      RootCauseKind.CADASTRO_DIVERGENCE,
    );
    expect(result.detection.anomalies.length).toBeGreaterThanOrEqual(1);
    expect(result.detection.anomalies[0].batchId).toBe('batch-spike');
    expect(result.detection.periodSummary.guideVolume).toBe(3600);
  });

  it('emits prescriptive recommendations with impact and approval flag', () => {
    const { recommendations } = svc.run(buildFixtureAggregation());
    expect(recommendations.length).toBeGreaterThanOrEqual(2);
    const top = recommendations[0];
    expect(top.requiresHumanApproval).toBe(true);
    expect(top.estimatedImpactBrl).toBeGreaterThan(0);
    expect(top.actionPlan.steps.length).toBeGreaterThan(0);
    expect(top.statisticalEvidence.supportingCodes?.length).toBeGreaterThan(0);
    expect(top.tenantId).toBe('tenant-fixture-santa-clara');
  });

  it('exports anonymous federated contribution without raw tenantId', () => {
    const input = buildFixtureAggregation();
    const contrib = svc.exportAnonymousContribution(input, 'hospital');
    expect(contrib.tenant.tenantHash).toHaveLength(32);
    expect(JSON.stringify(contrib)).not.toContain(input.tenantId);
    expect(contrib.featureSchemaVersion).toBe('epic8-anon-v1');

    const peer = svc.exportAnonymousContribution(
      buildFixtureAggregation({ tenantId: 'tenant-other' }),
      'hospital',
    );
    const snap = svc.aggregatePeers([contrib, peer]);
    expect(snap.contributorCount).toBe(2);
    expect(snap.rootCauseBenchmarks.length).toBeGreaterThan(0);
  });

  it('federated adapter rejects updates that break schema isolation', () => {
    const adapter = new NullFederatedLearningAdapter();
    expect(() =>
      adapter.enqueueLocalUpdate({
        featureSchemaVersion: 'wrong',
        roundId: 'r1',
        opaqueWeights: [0.1],
        sampleSize: 10,
        tenantHash: 'abc',
      }),
    ).toThrow(/rejected/);
  });
});
