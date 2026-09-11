import {
  ADVISOR_MODEL,
  buildAdditiveDraft,
  buildContractDiagnosis,
  generateAdequacyAuditReport,
  LlmAdvisorService,
  TemplateLlmAdapter,
} from '../src/ml/llm_advisor';
import { MatrixDimension } from '../src/core/analytics/compliance_matrix';

describe('EPIC-8 llm_advisor', () => {
  const baseReq = {
    track: 'simulation' as const,
    tenantLabel: 'Hospital Santa Clara',
    providerSegment: 'HOSPITAL',
    operadoraLabel: 'Unimed',
    dossier: {
      activeClauses: [
        {
          code: 'CL-MAT',
          title: 'Materiais e OPME',
          text: 'Cobrança aberta de materiais conforme consumo.',
          ansReajusteLimitPct: 7,
        },
        {
          code: 'CL-REAJ',
          title: 'Reajuste anual',
          text: 'Reajuste por índice livremente pactuado.',
          ansReajusteLimitPct: 8,
        },
      ],
      additives: [
        {
          version: 1,
          title: 'Aditivo inicial',
          effectiveAt: '2024-01-01',
          summary: 'Inclusão de tabela',
        },
        {
          version: 2,
          title: 'Aditivo 2',
          effectiveAt: '2025-01-01',
          summary: 'Ajuste de diárias',
        },
      ],
    },
    benchmark: {
      benchmarkLabel: 'Hospital Referência Alpha',
      benchmarkScore: 92,
      subjectScore: 61,
      subjectLabel: 'Hospital Santa Clara',
      priceGapPct: 31,
      renegotiationHints: [
        'Cláusula "Taxa de sala" 18% acima da média da rede na macrorregião Sudeste.',
      ],
    },
    recurrentGlosas: [
      {
        tussCode: '90250010',
        count: 14,
        amountAtRiskBrl: 120000,
        reason: 'Ausência de pré-autorização',
      },
    ],
    volumeMensalEstimadoBrl: 1_840_000,
    judicialDemandSignal: 'moderado' as const,
  };

  it('builds structured executive diagnosis with 3 financial actions', () => {
    const opinion = buildContractDiagnosis(baseReq);
    expect(opinion.model).toBe(ADVISOR_MODEL);
    expect(opinion.diagnosis.strengths.length).toBeGreaterThan(0);
    expect(opinion.diagnosis.weaknesses.length).toBeGreaterThan(0);
    expect(opinion.financialOptimizationPlan).toHaveLength(3);
    expect(opinion.financialOptimizationPlan[0].priority).toBe(1);
    expect(
      opinion.financialOptimizationPlan[0].estimatedMonthlyImpactBrl,
    ).toBeGreaterThan(0);
    expect(opinion.insights.length).toBeGreaterThanOrEqual(2);
    expect(opinion.insights[0].estimatedImpactBrl).toBeGreaterThan(0);
  });

  it('generates ANS-style additive minuta for open_to_package', () => {
    const draft = buildAdditiveDraft({
      track: 'simulation',
      tenantLabel: 'Hospital Santa Clara',
      providerSegment: 'HOSPITAL',
      operadoraLabel: 'Unimed',
      distortionType: 'open_to_package',
      contractualEvidence: 'Cláusula CL-MAT cobrança aberta',
      estimatedImpactBrl: 92000,
    });
    expect(draft.fullText).toMatch(/PACOTE FECHADO|pacote fechado/i);
    expect(draft.fullText).toMatch(/RN 507/);
    expect(draft.disclaimer).toMatch(/revisão jurídica humana/i);
    expect(draft.clauses.length).toBeGreaterThanOrEqual(2);
  });

  it('LlmAdvisorService diagnose + generateClause async facade', async () => {
    const svc = new LlmAdvisorService();
    const opinion = await svc.diagnose(baseReq);
    expect(opinion.executiveSummary).toContain('Hospital Santa Clara');
    const draft = await svc.generateClause({
      tenantLabel: baseReq.tenantLabel,
      providerSegment: baseReq.providerSegment,
      distortionType: 'preauth_gap',
      insightId: opinion.insights[1]?.insightId,
    });
    expect(draft.documentTitle.length).toBeGreaterThan(5);
  });

  it('generates adequacy audit report (template fallback)', async () => {
    const report = await generateAdequacyAuditReport(
      {
        track: 'simulation',
        contractId: 'ctr-demo-001',
        tenantLabel: 'Hospital Santa Clara',
        providerSegment: 'HOSPITAL',
        operadoraLabel: 'Unimed',
        scorecard: {
          overallScore: 74,
          scoreByDimension: {
            [MatrixDimension.FINANCEIRO]: {
              score: 68,
              maxScore: 100,
              status: 'Atenção',
            },
            [MatrixDimension.REGULATORIO_ANS]: {
              score: 80,
              maxScore: 100,
              status: 'Adequado',
            },
            [MatrixDimension.OPERACIONAL]: {
              score: 72,
              maxScore: 100,
              status: 'Atenção',
            },
            [MatrixDimension.JURIDICO]: {
              score: 85,
              maxScore: 100,
              status: 'Adequado',
            },
          },
          checklist: [
            {
              id: 'fin-opme-cap',
              dimension: MatrixDimension.FINANCEIRO,
              title: 'Teto OPME',
              weight: 0.2,
              status: 'NAO_CONFORME',
              evidence: 'Sem teto SIMPRO',
              financialImpactPotential: 48000,
              recommendedAction: 'Incluir teto no aditivo',
            },
          ],
          totalEstimatedSavings: 120000,
          improvementPoints: [
            {
              priority: 'HIGH',
              title: 'Fechar teto OPME',
              gap: 'Ausência de teto',
              action: 'Aditivo com teto SIMPRO',
              savingEstimate: 48000,
              dimension: MatrixDimension.FINANCEIRO,
            },
          ],
          formula:
            '0.35*FINANCEIRO + 0.25*REGULATORIO_ANS + 0.25*OPERACIONAL + 0.15*JURIDICO',
        },
      },
      new TemplateLlmAdapter(),
    );

    expect(report.contractId).toBe('ctr-demo-001');
    expect(report.executiveSummary).toMatch(/74%/);
    expect(report.criticalGaps.length).toBeGreaterThan(0);
    expect(report.renegotiationStrategy.length).toBeGreaterThan(0);
    expect(report.fullMarkdown).toMatch(/Resumo Executivo/i);
    expect(report.llmUsed).toBe(false);
  });
});
