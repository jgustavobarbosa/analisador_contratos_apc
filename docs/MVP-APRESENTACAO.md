# MVP para apresentação a parceiros

## Decisão (set/2026)

- **Agora:** desenvolver e demonstrar **localmente**.
- **Depois:** comprar **VPS nova dedicada** a este projeto e configurar **juntos** (não usar a VPS compartilhada atual como piloto).
- **Objetivo da demo:** convencer parceiros com o caso Unimed–Oncoradium, não entregar PaaS completo.

## Escopo IN (o que a demo precisa mostrar)

| # | Capacidade | Épico |
|---|---|---|
| 1 | Login + papéis (admin / jurídico / faturamento) | EPIC-0 |
| 2 | Contrato + documentos do caso-base no dossiê | EPIC-1/2 |
| 3 | Timeline navegável (4 eventos / vigências retroativas) | EPIC-6 |
| 4 | Consulta “código + data → coberto? valor?” | EPIC-2/3 slim |
| 5 | Mensagem clara: IA = segunda opinião; revisão humana | narrativa |

## Escopo OUT (não bloquear a apresentação)

- Multi-tenant PaaS / billing (EPIC-7)
- Motor ML de glosa / recomendador (EPIC-4/8) — pode aparecer como “roadmap no slide”
- OCR/LLM pesado em tempo real (usar golden/fixtures se necessário)
- Integração ERP real
- MFA/SSO

## Critério de sucesso da apresentação

1. Login em &lt; 10 s no ambiente local.
2. Timeline do caso-base reconstruída sem explicação improvisada.
3. Demo ao vivo: `10101012` após 08/07/2024 → não coberto; taxa de sala em 02/08/2024 → valor do aditivo.
4. Parceiro entende valor (glosa evitável / dossiê vivo) em ≤ 15 minutos.

## Ambiente local sugerido

```bash
# Com Docker no Mac (se houver):
docker compose up -d
pnpm install && pnpm --filter api prisma migrate deploy && pnpm --filter api prisma db seed
pnpm --filter api start:dev
pnpm --filter web dev

# Sem Docker: Postgres local via Postgres.app/Homebrew, mesmo .env
```

Testes: `pnpm --filter api test` (Postgres embutido — não exige Docker).

## VPS nova (depois da demo)

Checklist conjunto, quando comprar:

- [ ] 8 GB RAM / 100 GB+ disco (ou um pouco mais se for rodar LLM depois)
- [ ] Ubuntu LTS, acesso SSH
- [ ] Node 20 + pnpm + Postgres **dedicados** (Docker opcional)
- [ ] Nginx + TLS (Let's Encrypt)
- [ ] Firewall só 22/80/443
- [ ] Secrets e seed sem senha default
- [ ] Backup do volume de uploads + dump PG

Até lá, zero dependência da VPS antiga compartilhada.

## Status de execução

- Identity (EPIC-0): implementado + testes.
- Dossiê + golden Oncoradium + UI demo: **pronto** (seed + timeline + consulta de preço; **23 testes** OK).
- Próximo humano: ensaiar a demo localmente (Task 1.10) antes da reunião com parceiros.
- VPS nova: só depois da demo.
