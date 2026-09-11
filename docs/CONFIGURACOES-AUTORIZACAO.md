# Configurações que exigem autorização humana

Antes de alterar qualquer item abaixo em staging/produção, obter aprovação explícita
(segurança / produto / engenharia responsável). Em desenvolvimento local, documentar
a mudança no PR.

| Configuração | Onde | Por que precisa autorização |
|---|---|---|
| Algoritmo / parâmetros de hash de senha (Argon2id memory/iterations/parallelism) | `apps/api` password hasher | Impacta força de hash e CPU/RAM; migração de hashes é irreversível sem re-hash |
| Trocar sessão PostgreSQL por Redis (ou vice-versa) | sessão / infra | Muda superfície de falha, persistência e sizing da VPS |
| MFA / SSO / OIDC | auth | Fora do MVP; altera fluxo de login e compliance |
| Papéis seed (`admin`, `juridico`, …) ou mapa de permissões em produção | seed / RBAC | Pode elevar privilégios ou quebrar fluxos já homologados |
| Política mínima de senha | `password-policy` | Afeta UX e postura de segurança; deve alinhar com política corporativa |
| TTL de sessão e de token de reset | env `SESSION_TTL_*`, `PASSWORD_RESET_TTL_*` | Janela de abuso vs. usabilidade |
| Flags de cookie (`Secure`, `SameSite`, nome) | env cookie | Pode quebrar login em HTTPS/proxy ou enfraquecer CSRF |
| Limites de rate limit / lockout (`LOGIN_MAX_FAILURES`, `RATE_LIMIT_*`) | env auth | Trade-off availability vs. força bruta |
| Credenciais DB, `SESSION_SECRET`, SMTP/SES | secrets / `.env` | Segredos — nunca commit; rotação coordenada |
| Abrir portas ou adicionar containers pesados (OCR/LLM) no compose padrão | `docker-compose.yml` | Orçamento de RAM da VPS 8 GB |
| Instalar/retunar PostgreSQL ou abrir portas no **host compartilhado** (sem Docker) | VPS bare-metal | Pode afetar sistemas já em produção na mesma máquina — ver `docs/VPS-BARE-METAL.md` |
| Consumir &gt; ~1 GB RAM contínua adicional nesta VPS | ops / sizing | Máquina já tem outros processos; medir `free -h` antes |
| Introduzir Docker nesta VPS ou mudar nginx/TLS/DNS existente | ops | Mudança de política e superfície de rede |
| Rodar `prisma db seed` com senha default fora de dev isolado | seed | Credencial fraca em ambiente compartilhado |

Itens **Always / Ask first / Never** da `SPEC-identity.md` e o guia `docs/VPS-BARE-METAL.md` prevalecem sobre este documento quando houver conflito de infra.
