# OTO: Front-end

Interface web do **Observatório de Turismo de Olímpia (OTO)**. Reúne, em um painel, os indicadores de turismo da Estância Turística de Olímpia (SP): taxa de ocupação, fluxo estimado de turistas, receita em hospedagem e o andamento das pesquisas com os meios de hospedagem.

A API fica no repositório [OTO-Project](https://github.com/pedrob21/OTO-Project) (Spring Boot e PostgreSQL).

> [!IMPORTANT]
> **Em desenvolvimento.** O login e a sessão já usam a API. Os blocos do painel ainda mostram dados fixos ([`fixtures.ts`](src/features/painel/fixtures.ts)), e a integração é a [próxima etapa](#próximas-tasks).

## Sumário

- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Como rodar](#como-rodar)
- [Scripts](#scripts)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Arquitetura e convenções](#arquitetura-e-convenções)
- [Próximas tasks](#próximas-tasks)
- [Decisões em aberto](#decisões-em-aberto)
- [Como contribuir](#como-contribuir)

## Funcionalidades

**Prontas**

- Login com JWT, expiração de sessão e controle de acesso por perfil
- Cabeçalho, menu, rodapé, e cabeçalho e filtros fixos durante a rolagem
- Painel de indicadores, com dados fixos:
  - filtros de campanha, comparação e tipo de hospedagem, guardados na URL
  - destaque da taxa de ocupação e indicadores de resumo
  - taxa de ocupação mensal em gráfico e tabela
  - faixas de ocupação e fluxo estimado de turistas
  - expectativa × realizado nos feriados
  - desempenho por tipo de hospedagem, com ocultação por sigilo
  - pesquisas com os parceiros

**O que cada perfil vê no cartão de pesquisas**

| Perfil | Conteúdo |
|---|---|
| `ADMIN` | Rodada aberta, progresso das respostas e rodadas recentes |
| `PARCEIRO` | Pesquisas abertas dos seus estabelecimentos (versão provisória) |
| `VISUALIZADOR` | O cartão não aparece |

As permissões na tela só organizam a interface. Quem barra o acesso aos dados é a API.

A referência visual é a [tela exportada do Figma](docs/referencia/painel-oto-desktop.png), com largura de 1440 px.

## Tecnologias

| Área | Escolha |
|---|---|
| Interface | React 19 e TypeScript 7 (modo estrito) |
| Build e servidor local | Vite 8 |
| Rotas | React Router 8 |
| Dados do servidor | TanStack Query 5 |
| Gráficos | `d3-shape` com SVG próprio |
| Estilos | CSS Modules e tokens em variáveis CSS |
| Fontes | Bricolage Grotesque, Public Sans e Open Sans, via Fontsource |
| Testes | Vitest e Testing Library |
| Qualidade | oxlint e Prettier |
| Tipos da API | `openapi-typescript`, gerados a partir do OpenAPI do backend |

## Como rodar

### Pré-requisitos

- [Node.js](https://nodejs.org/) 24 e npm
- A API do [OTO-Project](https://github.com/pedrob21/OTO-Project) em execução, necessária para entrar no sistema. O passo a passo está no README dela

### Passo a passo

```bash
git clone https://github.com/pedrob21/OTO-Project-Front.git
cd OTO-Project-Front
npm ci
npm run dev
```

A aplicação abre em <http://localhost:5173>. Entre com o `ADMIN_EMAIL` e o `ADMIN_SENHA` definidos no `.env` do backend.

### Variáveis de ambiente

O padrão já aponta para a API local. Para mudar, copie `.env.example` para `.env.local`.

| Variável | Padrão | Descrição |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8080` | Endereço da API |

> [!WARNING]
> Toda variável `VITE_*` vai para o código entregue ao navegador. Nunca coloque segredos nelas.

Se o navegador acusar erro de CORS, confira `CORS_ORIGENS` no `.env` do backend. O padrão libera `localhost` e `127.0.0.1` em qualquer porta.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe o servidor de desenvolvimento |
| `npm run build` | Verifica os tipos e gera a versão de produção em `dist/` |
| `npm run preview` | Serve localmente a versão de produção |
| `npm run typecheck` | Verifica os tipos |
| `npm run lint` | Roda o oxlint |
| `npm run format` | Formata `src` e `dev` |
| `npm run format:check` | Confere a formatação sem alterar arquivos |
| `npm test` | Roda os testes uma vez |
| `npm run test:watch` | Roda os testes em modo de observação |
| `npm run api:tipos` | Gera `src/api/schema.d.ts` de novo. Precisa da API no ar |

> [!NOTE]
> Use `npm run typecheck` para verificar os tipos. O `tsc --noEmit` na raiz não verifica nada, porque o `tsconfig.json` principal só aponta para os outros.

## Estrutura do projeto

```text
├── dev/                 # Páginas de comparação visual, fora do build de produção
├── docs/referencia/     # Tela exportada do Figma
├── public/
└── src/
    ├── api/             # Cliente HTTP, sessão, chamadas por recurso e tipos gerados
    ├── app/             # Rotas, provedores e layout (cabeçalho, menu e rodapé)
    ├── assets/          # Logos
    ├── components/
    │   ├── charts/      # Gráficos reutilizáveis
    │   └── ui/          # Botão, cartão, select, selo, estados de vazio e de erro
    ├── features/
    │   ├── auth/        # Contexto de sessão, login e proteção de rotas
    │   └── painel/      # Página, cartões, regras de cálculo e dados fixos
    ├── lib/             # Formatadores pt-BR e regras de perfil
    ├── styles/          # Tokens do design e estilos globais
    ├── test/            # Configuração dos testes
    └── types/           # Tipos de domínio derivados da API
```

Com o servidor local no ar, os tokens e os componentes podem ser conferidos ao lado da referência em `/dev/tokens.html` e `/dev/componentes.html`.

## Arquitetura e convenções

- **Organização por funcionalidade:** o que é de uma tela fica em `features/`. Só o que é reaproveitado vai para `components/` e `lib/`.
- **Regras fora dos componentes:** cálculos e textos derivados ficam em funções puras, como `desempenho.ts` e `pesquisas.ts`, que são testadas sem renderizar a tela.
- **Design em tokens:** cores, tipografia e espaçamentos ficam em [`tokens.css`](src/styles/tokens.css).
- **Valor ausente:** o que a API não envia aparece como `—`, e nunca como zero.
- **Formatos:** números, moeda e datas seguem o padrão pt-BR e passam por [`formatos.ts`](src/lib/formatos.ts).
- **Tipos da API:** `src/api/schema.d.ts` é gerado e não deve ser editado à mão.
- **Sessão:** o token fica no `sessionStorage`. Uma resposta 401 a uma chamada autenticada encerra a sessão.
- **Erros da API:** seguem o formato Problem Details (RFC 9457).
- **Acessibilidade:** os gráficos têm alternativa em texto ou tabela, e a informação não depende só da cor.

## Próximas tasks

| Task | Entrega | Pronto quando | Depende de |
|---|---|---|---|
| **T15. Integração com a API** | Trocar os dados fixos pelas chamadas reais, com carregamento, vazio e erro independentes em cada bloco | A tela funciona com o backend local nos três perfis, inclusive com o banco sem publicações | D2, D3, D7 e D8 |
| **T16. Exportação** | Baixar o `resultado.csv` com o token de acesso, mostrando progresso e erro | O arquivo abre no Excel com a acentuação correta | D5 |
| **T17. Responsividade e acessibilidade** | Adaptar para tablet e celular, corrigir os ajustes pendentes em 1280 px e fazer a auditoria WCAG AA | Sem rolagem horizontal da página em 360 px e sem falhas AA abertas | T15 |
| **T18. Otimização e revisão final** | Dividir o código por rota, otimizar fontes e imagens, analisar o tamanho do pacote, adicionar favicon e comparar a tela inteira com o design | Lighthouse medido e registrado, sem pendências visuais abertas | T17 |

Ainda sem task definida: a página de definição de senha do convite (`/definir-senha`) e as telas de Pesquisas, Indicadores, Relatórios e Cadastros, que hoje aparecem desativadas no menu.

## Decisões em aberto

| # | Pergunta | Trava |
|---|---|---|
| D2 | O filtro "Tipo de hospedagem" afeta só o que a API separa por tipo, ou o backend passa a filtrar fluxo, faixas, série mensal e feriados? | T15 |
| D3 | A variação da receita e os períodos anteriores ao sistema não têm fonte na API. Esconder quando faltar dado, ou incluir no backend? | T15 |
| D5 | O botão "Exportar" tem seta de menu, mas a API só oferece CSV. Vira botão direto, ou haverá outros formatos? | T16 |
| D7 | A versão do cartão de pesquisas para o parceiro, e o que mostrar quando ele não tem acesso aos dados de hospedagem caseira | T15 |
| D8 | O design mostra o código da rodada nos filtros, mas `/api/campanhas/publicadas` não o envia. Incluir no backend, ou tirar do texto? | T15 |

## Como contribuir

1. Crie uma branch a partir da `main` atualizada, com o prefixo do tipo de mudança: `feat/painel-filtros`, `fix/tipos-painel`, `docs/readme`.
2. Faça os commits no padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/), em português: `feat: cartão de fluxo estimado de turistas`.
3. Antes de abrir o pull request, confira se tudo passa:

   ```bash
   npm run format:check && npm run lint && npm test && npm run build
   ```

4. Abra o pull request para a `main`, descrevendo a mudança e como testá-la. Em mudanças visuais, compare com a tela de referência.

Arquivos `.env` e `.env.*` ficam fora do Git, exceto o `.env.example`. Não envie segredos ao repositório.

---

Protótipo acadêmico da Equipe 4.
