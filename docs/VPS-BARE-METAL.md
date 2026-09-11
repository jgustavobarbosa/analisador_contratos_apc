# Deploy VPS bare-metal (sem Docker)

## Contexto confirmado (set/2026)

- VPS alvo: **~8 GB RAM / ~100 GB disco**.
- **Sem Docker** instalado (e não é pré-requisito da PoC).
- **Já existem outros sistemas rodando** na mesma máquina → RAM, CPU, portas e Postgres são recursos compartilhados.

Isso **influencia** o plano de implantação, não a arquitetura de produto (API + Postgres + painel).

## Decisão operacional

| Item | Decisão |
|---|---|
| Runtime | Node.js ≥ 20 + pnpm **no host** (systemd ou process manager já usado na VPS) |
| Banco | PostgreSQL **nativo** (apt/yum) **ou** instância Postgres já existente na VPS, com database/schema dedicados |
| Docker Compose | **Opcional**, só para desktop/CI de quem tiver Docker — **não** é caminho de produção nesta VPS |
| Redis | Não na PoC |
| OCR / LLM local | **Não** na mesma VPS até medirmos RAM livre; extração na PoC pode ser assistida/offline ou serviço remoto já autorizado |
| Web | Build estático (`pnpm --filter web build`) servido pelo nginx/Caddy **já existente**, se houver |

## Orçamento de RAM revisado (máquina compartilhada)

Antes de subir o Analisador, medir:

```bash
free -h
ps aux --sort=-%mem | head -20
ss -tulpn   # ou netstat: portas 3000, 5432, 80, 443
```

| Componente | Teto sugerido nesta VPS | Nota |
|---|---|---|
| Processos já existentes | **desconhecido — medir** | Tem prioridade; não “roubar” RAM sem autorização |
| PostgreSQL (compartilhado ou dedicado) | preferir **≤ 512 MB** shared_buffers se dedicado; se compartilhado, **não** retunar sem autorização |
| API NestJS | **≤ 512 MB** (NODE_OPTIONS / systemd MemoryMax) | |
| Painel estático | residual via nginx | |
| Reserva OS + picos | ≥ 1 GB | |
| OCR/LLM | **0 na PoC nesta VPS** | Requer autorização + prova de RAM livre |

Regra: se após medir restarem **&lt; ~1,5 GB livres**, não colocar API+DB novos sem plano de consolidação ou VPS separada.

## Caminho de instalação (sem Docker)

```bash
# 1) Dependências de sistema (exemplo Debian/Ubuntu)
# sudo apt update && sudo apt install -y postgresql postgresql-contrib
# Node 20 via NodeSource/nvm — alinhar ao padrão já usado na VPS

# 2) Criar role/db dedicados (não reutilizar DB de outro produto sem autorização)
# sudo -u postgres createuser -P rayia
# sudo -u postgres createdb -O rayia rayia_identity

# 3) App
cd /opt/analisador_contratos_planos   # ou path padrão da VPS
cp .env.example apps/api/.env
# editar DATABASE_URL, SESSION_SECRET, COOKIE_SECURE=true se HTTPS

pnpm install --frozen-lockfile
pnpm --filter api prisma migrate deploy
pnpm --filter api prisma db seed   # só se autorizado no ambiente
pnpm --filter api build
pnpm --filter web build

# 4) Rodar API sob o process manager da casa (systemd/pm2/hermes)
# Exemplo systemd MemoryMax=512M; EnvironmentFile=apps/api/.env
```

Testes **não** precisam de Docker: `pnpm --filter api test` usa Postgres embutido.

## Conflitos típicos com “já tem sistema rodando”

| Risco | Mitigação |
|---|---|
| Porta 3000/5432/80 ocupada | Usar porta livre; proxy reverso no nginx existente |
| Postgres já instalado | Database + role **novos**; não misturar schemas de outro app |
| Disco 100 GB quase cheio | Quota de uploads de contrato; limpeza de artifacts; medir `df -h` |
| OOM killer | Limitar memória da API; não subir LLM; monitorar `dmesg` |
| Mesmo domínio/TLS | Path ou subdomain dedicado (`/analisador` ou `contratos.`) com autorização de DNS/proxy |

## Itens que passam a exigir autorização (além do doc geral)

1. Instalar ou atualizar PostgreSQL no host compartilhado  
2. Alterar `postgresql.conf` / `shared_buffers` de instância já usada por outros apps  
3. Abrir portas no firewall / mudar nginx virtual host  
4. Consumir &gt; ~1 GB RAM adicional de forma contínua  
5. Rodar seed com senha default em ambiente que não seja dev isolado  
6. Introduzir Docker nesta VPS (mudança de política de ops)  
7. Colocar OCR/LLM local nesta máquina  

## Implicação no roadmap

- PoC e MVP **seguem** (identity já é bare-metal-friendly).  
- `docker-compose.yml` permanece como **atalho opcional de desenvolvimento**, não como deploy canônico.  
- Homologação na VPS = checklist bare-metal deste documento + medição de RAM livre.  
- LLM/OCR: planejar **serviço separado** ou janela off-peak, não default na VPS 8 GB compartilhada.
