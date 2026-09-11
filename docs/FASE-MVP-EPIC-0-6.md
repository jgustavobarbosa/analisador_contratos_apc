# Fase MVP — Épicos 0 a 6

Autorização: seguir o plano de produto cobrindo **EPIC-0 … EPIC-6** em desenvolvimento local (set/2026).

## Fora desta fase (sem mudança)

- EPIC-7 PaaS multi-tenant / billing  
- EPIC-8 analisador de melhorias / benchmark federado  
- EPIC-9 completo (DPIA formal, roteamento multimodelo nuvem) — só o mínimo necessário de audit/evidência  

## Ordem de build (fatias)

| Ordem | Épico | Entrega verificável |
|---|---|---|
| 1 | **0** Identity | UI: usuários, papéis, desativar, reset forçado; login/logout/reset |
| 2 | **1** Ingestão | Upload PDF, checksum, armazenamento local, metadados de evidência |
| 3 | **1** Extração | Extração **assistida** (JSON/manual + confiança); fila de revisão humana (LLM/OCR real = opcional depois) |
| 4 | **2** Dossiê | Aplicar campos aceitos → nova versão; export JSON |
| 5 | **6** Rastreabilidade | Timeline + trilha de auditoria (auth + dossiê + simulações) |
| 6 | **3** Simulador | Guia on-demand e lote: valor esperado, alertas, evidência arquivada |
| 7 | **5** Compliance | Checklist RN510 + alertas 60/30/7 |
| 8 | **4** Risco de glosa | **v1 regras** (código fora de vigência, divergência de valor, doc vencido); scaffold de features para ML futuro |

## EPIC-4 — decisão honesta

Sem histórico real de guias/glosas (≥6–12 meses), **não** treinar LightGBM ainda.  
Nesta fase: motor de risco **determinístico + features exportáveis**. Treino ML = fase V1 quando o piloto trouxer dado.

## Critérios de aceite da fase

- [x] Admin gerencia usuários pela UI  
- [x] Upload de PDF gera evidência (checksum, quem, quando)  
- [x] Campos extraídos passam por revisão antes de alterar dossiê  
- [x] Simulação de guia &lt; 3 s com alertas e registro  
- [x] Checklist RN510 com alertas antecipados  
- [x] Timeline + audit trail consultáveis  
- [x] Score de risco por regras com explicação (sem caixa-preta)  
- [x] Testes automatizados cobrindo fluxos principais  

## Pontos 1 e 2 — corpus e catálogo (autorizado)

Além de Identity + Ingestão técnica, a base analítica usa:

1. **Corpus caso-base:** PDFs reais em `apps/api/fixtures/contracts/unimed-oncoradium/pdfs/` (pacote CONTRATO UNIMED.zip), inclusive termos aditivos.
2. **Catálogo normativo/modelos** (metadados + URL; sem copiar peças proprietárias): ANS, CFM, ASAMP, minutas públicas e referências Jusbrasil — ver `docs/CATALOGO-INSTRUMENTOS.md`.

Dimensões de controle derivadas desses instrumentos: basilar, cláusulas, tipos de prestação, elementos de controle/alerta, manutenção, previsibilidade, acordabilidade, plausabilidade, sinalização, monitoramento, adequação, pontos de verificação e de controle.

## Status

- PoC (login + golden + timeline): feito  
- **Wave A** (EPIC-0 UI + upload/evidência): feito — 25 testes  
- **Wave B** (extração assistida + revisão + dossiê): feito — 28 testes
- **Catálogo + PDFs Unimed (pontos 1–2):** feito — `docs/CATALOGO-INSTRUMENTOS.md`, modelos Prisma, seed metadados, `GET /catalog/*`, `POST /contracts/seed/unimed-pdfs`, aba Catálogo + botão Importar PDFs Unimed  
- **Wave C** (simulador + audit trail): feito — 37 testes API (`SimulationEvidence`, `/simulations`, `/audit-trail`, UI Simular guia + Auditoria)  
- **Wave D** (compliance RN510 + risco por regras): feito — 51 testes API (`ComplianceChecklistItem`, `/compliance/*`, `evaluateRisk`, `/risk/features`, badge de risco na simulação)