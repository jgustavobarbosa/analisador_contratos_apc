# src/simulation — TRACK SIMULATION ONLY

Motor de mock dinâmico por tipo de prestador para demonstrar épicos **sem** contratos reais de clientes.

## Estrutura

```
types.ts                 # ProviderType + contratos tipados
provider_generator.ts    # Perfil completo determinístico (20 guias, SHAP, alertas, EPIC-8)
providers/
  IContractDataProvider.ts
  MockContractDataProvider.ts
  PostgresContractDataProvider.ts
  createContractDataProvider.ts
fixtures/                # JSON TISS/TUSS estáticos
generators/              # helpers legados de guia única
```

## ProviderType

- `HOSPITAL` — internações, diárias/taxas, OPME, UTI  
- `CLINICA` — consultas TUSS, elegibilidade (hot code `40301000` ~88% glosa)  
- `HOME_CARE` — renovação, pacotes, medicamentos especiais  
- `LABORATORIO_IMAGEM` — exames, laudos, prazos de lote  

## API (Nest)

- `GET /demo/provider-types`
- `GET /demo/providers/:type/profile?mode=mock&guideCount=20`
- `GET /demo/contracts?mode=mock|postgres`
- `GET /demo/contracts/:id/bundle?mode=mock|postgres` (`sim:HOSPITAL` no mock)

Header de resposta: `X-Rayia-Track: simulation|real`

## UI

Aba **Simulação** em http://localhost:5180 — toggle **[Modo Simulação Ativo] / [Produção]**.

## Regra

Todo payload mock inclui `"track": "simulation"`. Nunca treinar modelos de produção só com estes dados.
