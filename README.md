# OTO: Front-end

Interface web do **Observatório de Turismo de Olímpia (OTO)**. Reúne, em um painel, os indicadores de turismo da Estância Turística de Olímpia (SP): taxa de ocupação, fluxo estimado de turistas, receita em hospedagem e o andamento das pesquisas com os meios de hospedagem.

A API fica no repositório [OTO-Project](https://github.com/pedrob21/OTO-Project) (Spring Boot e PostgreSQL).

> [!IMPORTANT]
> **Em desenvolvimento.** O login, a definição de senha, o fluxo das pesquisas (da criação à publicação), o resultado de cada campanha, os cadastros do ADMIN e o cartão "Pesquisas com os parceiros" já usam a API. Os demais blocos do painel ainda mostram dados fixos ([`fixtures.ts`](src/features/painel/fixtures.ts)), e a integração deles é a [próxima etapa](#próximas-tasks).

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
- Definição de senha por link (`/definir-senha?token=...`), usada no convite e na redefinição, e troca da própria senha pelo menu do usuário (`/minha-senha`)
- Página "Como calculamos a taxa de ocupação e o fluxo de turistas" (`/metodologia`), para todos os perfis
- Cabeçalho, menu, rodapé, e cabeçalho e filtros fixos durante a rolagem
- Criação de pesquisa com campanhas (modalidade, período, diárias e prazo), só para o ADMIN, em `/pesquisas/nova`
- Fluxo das pesquisas com os parceiros:
  - lista das rodadas com filtro por situação (rascunho, aberta, encerrada e publicada), em `/pesquisas`
  - acompanhamento da rodada, com a taxa de resposta por estabelecimentos e por leitos, o mínimo de 70% para publicar e as ações de abrir, prorrogar, encerrar (com confirmação) e reabrir, em `/pesquisas/:id`
  - lançamento da resposta pelo ADMIN: lança ou corrige a resposta de um estabelecimento a partir do acompanhamento, com a versão enviada e o histórico. Um erro da API não apaga o que foi digitado
  - prévia e publicação da campanha, com os impedimentos ligados ao botão "Publicar" e o cancelamento da publicação, em `/pesquisas/:id/campanhas/:campanhaId/previa`
- Resultado publicado de cada campanha, para todos os perfis, com a ocultação por sigilo e o botão "Baixar CSV", em `/resultados/:campanhaId`
- Cadastros, só para o ADMIN, no submenu "Cadastros" (os outros perfis não veem o item):
  - usuários, com o link de convite ou de nova senha para enviar ao usuário
  - estabelecimentos, com os dados da Secretaria, e o histórico de capacidade (UH e leitos) de cada um
  - parâmetros de cálculo e totais da hospedagem caseira (RHC), por vigência
  - referências: tipos de hospedagem, feriados e eventos, e faixas de ocupação
  - inventário: catálogo de grupos e itens por categoria (serviços e equipamentos, acessibilidade e sustentabilidade), com inativação e exclusão de itens nunca marcados e de grupos vazios, em `/cadastros/inventario`
  - inventário de cada estabelecimento, com um item por checkbox, complemento em texto quando o item permite e a data da última atualização, em `/cadastros/estabelecimentos/:id/inventario`
  - série histórica, com importação de CSV que mostra os erros de cada linha
- Painel de indicadores, com dados fixos, exceto as pesquisas:
  - filtros de campanha, comparação e tipo de hospedagem, guardados na URL
  - destaque da taxa de ocupação e indicadores de resumo
  - taxa de ocupação mensal em gráfico e tabela
  - faixas de ocupação e fluxo estimado de turistas
  - expectativa × realizado nos feriados
  - desempenho por tipo de hospedagem, com ocultação por sigilo
  - pesquisas com os parceiros, com dados da API

**O que cada perfil vê no cartão de pesquisas**

| Perfil | Conteúdo |
|---|---|
| `ADMIN` | Rodada aberta, progresso das respostas e rodadas recentes |
| `PARCEIRO` | Pesquisas abertas dos seus estabelecimentos (versão provisória). O menu "Pesquisas" leva à tela de resposta |
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
| `npm run test:e2e` | Roda os testes e2e (Playwright) com a API simulada |
| `npm run test:e2e:headed` | Roda os testes e2e com o navegador visível, um teste por vez |
| `npm run api:tipos` | Gera `src/api/schema.d.ts` de novo. Precisa da API no ar |

> [!NOTE]
> Use `npm run typecheck` para verificar os tipos. O `tsc --noEmit` na raiz não verifica nada, porque o `tsconfig.json` principal só aponta para os outros.

### Testes e2e

Por padrão o Playwright roda sem abrir o navegador (headless). Outras formas de rodar, passando opções depois do `--`:

```bash
npm run test:e2e:headed                          # navegador visível, um teste por vez
npm run test:e2e -- --ui                         # interface do Playwright, com timeline e passo a passo
npm run test:e2e -- --debug                      # inspector, pausando em cada ação
npm run test:e2e -- e2e/login.spec.ts --headed   # só um arquivo
```

Antes dos testes, o Playwright gera o build e sobe o `npm run preview` na porta 4173. Fora do CI, se já houver um servidor nessa porta, ele é reaproveitado e os testes rodam contra o build antigo; derrube esse servidor depois de mudar o código.

## Estrutura do projeto

```text
├── dev/                 # Páginas de comparação visual, fora do build de produção
├── docs/referencia/     # Tela exportada do Figma
├── public/
└── src/
    ├── api/             # Cliente HTTP, sessão, chamadas por recurso (como `inventario.ts`) e tipos gerados
    ├── app/             # Rotas, provedores e layout (cabeçalho, menu e rodapé)
    ├── assets/          # Logos
    ├── components/
    │   ├── charts/      # Gráficos reutilizáveis
    │   └── ui/          # Botão, cartão, select, selo, tabela, diálogo, estados de vazio e de erro
    ├── features/
    │   ├── auth/        # Contexto de sessão, login, definição e troca de senha e proteção de rotas
    │   ├── cadastros/   # Telas de cadastro do ADMIN, com formulário em diálogo (inclui o catálogo do inventário em `inventario/`)
    │   ├── inventario/  # Editor de inventário de um estabelecimento (`EditorDeInventario`), reaproveitável por outros perfis
    │   ├── metodologia/ # Página estática do cálculo dos indicadores
    │   ├── painel/      # Página, cartões, regras de cálculo e dados fixos
    │   ├── pesquisas/   # Criação, lista, acompanhamento, resposta, prévia e publicação
    │   └── resultados/  # Resultado publicado de uma campanha e download do CSV
    ├── lib/             # Formatadores pt-BR, leitura de decimais, download e regras de perfil
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
- **Erros da API:** seguem o formato Problem Details (RFC 9457). Nos formulários, os `campos` da resposta marcam cada campo, e as regras recusadas com 422 que dizem respeito a um campo, como o e-mail repetido, também vão para ele.
- **Cadastros:** lista em tabela e formulário em diálogo, que devolve o foco a quem o abriu. Números aceitam vírgula ou ponto decimal, e as regras de validação são as mesmas da API.
- **Acessibilidade:** os gráficos têm alternativa em texto ou tabela, e a informação não depende só da cor.

## Próximas tasks

| Task | Entrega | Pronto quando | Depende de |
|---|---|---|---|
| **T15. Integração com a API** | Trocar os dados fixos pelas chamadas reais, com carregamento, vazio e erro independentes em cada bloco | A tela funciona com o backend local nos três perfis, inclusive com o banco sem publicações | D2, D3, D7 e D8 |
| **T16. Exportação** | Baixar o `resultado.csv` com o token de acesso, mostrando progresso e erro | O arquivo abre no Excel com a acentuação correta | D5 |
| **T17. Responsividade e acessibilidade** | Adaptar para tablet e celular, inclusive as tabelas e os diálogos de Cadastros, corrigir os ajustes pendentes em 1280 px e fazer a auditoria WCAG AA | Sem rolagem horizontal da página em 360 px e sem falhas AA abertas | T15 |
| **T18. Otimização e revisão final** | Dividir o código por rota, otimizar fontes e imagens, analisar o tamanho do pacote, adicionar favicon e comparar a tela inteira com o design | Lighthouse medido e registrado, sem pendências visuais abertas | T17 |

Ainda sem task definida: as telas de Indicadores e Relatórios, que hoje aparecem desativadas no menu.

Pendências do fluxo das pesquisas:

- Quando a branch `feature/testes-cucumber` do backend entrar na `main` dele, rodar `npm run api:tipos` e usar `aceitaResposta` e `respostasAte` da pendência para desativar o formulário do parceiro e mostrar "Respostas até dd/mm/aaaa". O cálculo da tolerância fica na API
- Ligar os botões "Acompanhamento completo", "Ver pendências" e "Lançar resposta" do cartão do painel às novas telas
- Diárias médias digitadas pela equipe (`/api/campanhas/{id}/diarias`) na prévia
- Quando a branch `fix/prazos-e-resultado` do backend entrar, `GET /api/campanhas/{id}/resultado` e o `resultado.csv` passam a responder 422 para campanha não publicada e 404 só para campanha inexistente. A `ResultadoCampanhaPage` hoje trata 404 como "ainda não publicada": trocar para 422 e mostrar "campanha não encontrada" no 404
- Há dois leitores de número digitado: `lerNumero` (`features/pesquisas/respostas.ts`, aceita ponto de milhar e deixa a contagem de casas para a validação) e `lerDecimal` (`lib/numeros.ts`, limita as casas e aceita sinal). Juntar num só quando a tela do parceiro for revista

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
   npm run format:check && npm run lint && npm test && npm run build && npm run test:e2e
   ```

4. Abra o pull request para a `main`, descrevendo a mudança e como testá-la. Em mudanças visuais, compare com a tela de referência.

Arquivos `.env` e `.env.*` ficam fora do Git, exceto o `.env.example`. Não envie segredos ao repositório.

---

Protótipo acadêmico da Equipe 4.
