# `src/ml/llm_advisor` — Copiloto prescritivo (EPIC-8 + ANS)

- `buildContractDiagnosis` — parecer executivo (diagnóstico, plano R$, riscos, insights)
- `buildAdditiveDraft` — minuta de termo aditivo / notificação
- `generateAdequacyAuditReport` — Roteiro de Adequação a partir do scorecard
- `OmniRouteLlmAdapter` — DeepSeek v4 flash via gateway local
- `LlmAdvisorService` — fachada com `LlmCompletionPort`

API:
- `POST /api/advisor/contract-diagnosis`
- `POST /api/advisor/generate-clause-renegotiation`
- `POST /api/advisor/audit-report`

## OmniRoute / DeepSeek

```
OMNIROUTE_BASE_URL=http://localhost:20128/v1
OMNIROUTE_API_KEY=sk-...
OMNIROUTE_MODEL=kc/deepseek/deepseek-v4-flash
```

Sem chave (ou falha de crédito/rede), o audit-report devolve template determinístico.

Toda minuta/relatório exige revisão humana (disclaimer no payload).
