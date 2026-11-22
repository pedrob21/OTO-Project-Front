# OTO: Front-end

Interface web do **Observatório de Turismo de Olímpia (OTO)**. Reúne, em um painel, os indicadores de turismo da Estância Turística de Olímpia (SP): taxa de ocupação, fluxo estimado de turistas, receita em hospedagem e o andamento das pesquisas com os meios de hospedagem.

A API fica no repositório [OTO-Project](https://github.com/pedrob21/OTO-Project) (Spring Boot e PostgreSQL).

> [!IMPORTANT]
> **Em desenvolvimento.** O login, a definição de senha, o fluxo das pesquisas (da criação à publicação), o resultado de cada campanha, os relatórios, os indicadores, os cadastros do ADMIN e o painel já usam a API. As telas do parceiro funcionam em celular e tablet. Faltam a adaptação das telas do ADMIN ao celular, a auditoria WCAG AA completa e a revisão final, nas [próximas tasks](#próximas-tasks).

## Sumário

- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Como rodar](#como-rodar)
- [Scripts](#scripts)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Arquitetura e convenções](#arquitetura-e-convenções)
- [Próximas tasks](#próximas-tasks)
- [Decisões](#decisões)
- [Como contribuir](#como-contribuir)

## Funcionalidades

**Prontas**

- Login com JWT, expiração de sessão e controle de acesso por perfil
- Definição de senha por link (`/definir-senha?token=...`), usada no convite e na redefinição, e troca da própria senha pelo menu do usuário (`/minha-senha`)
- Página "Como calculamos a taxa de ocupação e o fluxo de turistas" (`/metodologia`), para todos os perfis
- Cabeçalho, menu, rodapé, e cabeçalho e filtros fixos durante a rolagem. Abaixo de 1180 px, o menu fica recolhido no botão "Menu" (fecha com Esc ou ao trocar de página), e no celular o usuário aparece só pelas iniciais
- Telas do parceiro em celular (360 px) e tablet: login, definição de senha, resposta às pesquisas e Meu estabelecimento, sem rolagem horizontal
- Criação de pesquisa com campanhas (modalidade, período, diárias e prazo), só para o ADMIN, em `/pesquisas/nova`
- Fluxo das pesquisas com os parceiros:
  - lista das rodadas com filtro por situação (rascunho, aberta, encerrada e publicada), em `/pesquisas`
  - acompanhamento da rodada, com a taxa de resposta por estabelecimentos e por leitos, o mínimo de 70% para publicar e as ações de abrir, prorrogar, encerrar (com confirmação) e reabrir, em `/pesquisas/:id`
  - lançamento da resposta pelo ADMIN: lança ou corrige a resposta de um estabelecimento a partir do acompanhamento, com a versão enviada e o histórico. Um erro da API não apaga o que foi digitado
  - prévia e publicação da campanha, com os impedimentos ligados ao botão "Publicar" e o cancelamento da publicação, em `/pesquisas/:id/campanhas/:campanhaId/previa`
- Resposta do parceiro com o limite da API: depois do prazo, o aviso mostra até quando ainda dá para responder (`respostasAte`); passado esse limite (`aceitaResposta: false`), o formulário fica bloqueado e o aviso manda falar com a equipe do OTO. O ADMIN continua lançando pelo acompanhamento
- Resultado publicado de cada campanha, para todos os perfis, com a ocultação por sigilo e os botões "Gerar relatório (PDF)" e "Baixar CSV", em `/resultados/:campanhaId`. Campanha ainda não publicada (422) e campanha inexistente (404) têm avisos diferentes
- Relatórios, para todos os perfis, em `/relatorios`: as campanhas publicadas com filtros de modalidade, período e ano (guardados na URL), a taxa com a faixa e o fluxo de cada uma, e os botões "Ver relatório" e "Baixar CSV". O PDF sai da impressão do navegador ("Gerar relatório (PDF)" no resultado): a versão impressa tem cabeçalho com os logos, os indicadores, o desempenho por tipo e a nota metodológica, sem menu nem botões
- Indicadores, para todos os perfis, em `/indicadores`: taxa de ocupação, fluxo de turistas ou diária média mês a mês (gráfico dos três anos mais recentes do intervalo, ou tabela com todos) e nos feriados ano a ano, por modalidade e intervalo de até 20 anos. Os valores da série histórica importada levam a marca "H"
- Meu estabelecimento, só para o PARCEIRO, no item "Meu estabelecimento" do menu, em `/meu-estabelecimento`. Um cartão por estabelecimento dele:
  - dados cadastrais e da Secretaria em leitura; "Editar dados" abre o formulário só com os dados cadastrais, porque o bloco da Secretaria é só do ADMIN
  - capacidade vigente e histórico em leitura, com "Informar nova capacidade" para uma nova vigência; corrigir e excluir continuam só do ADMIN
  - inventário no mesmo editor de Cadastros, sem os grupos exclusivos da Secretaria
- Cadastros, só para o ADMIN, no submenu "Cadastros" (os outros perfis não veem o item):
  - usuários, com o link de convite ou de nova senha para enviar ao usuário
  - estabelecimentos, com os dados da Secretaria, e o histórico de capacidade (UH e leitos) de cada um
  - parâmetros de cálculo e totais da hospedagem caseira (RHC), por vigência
  - referências: tipos de hospedagem, feriados e eventos, e faixas de ocupação
  - inventário: catálogo de grupos e itens por categoria (serviços e equipamentos, acessibilidade e sustentabilidade), com inativação e exclusão de itens nunca marcados e de grupos vazios, em `/cadastros/inventario`
  - inventário de cada estabelecimento, com um item por checkbox, complemento em texto quando o item permite e a data da última atualização, em `/cadastros/estabelecimentos/:id/inventario`
  - série histórica, com importação de CSV que mostra os erros de cada linha
- Painel de indicadores, com dados da API e carregamento, vazio e erro independentes em cada bloco:
  - filtros de campanha, comparação e tipo de hospedagem, guardados na URL. A campanha padrão é a publicada mais recente; sem nenhuma publicada, o painel mostra um estado vazio
  - destaque da taxa de ocupação e indicadores de resumo, com a variação em relação ao ano escolhido em "Comparar com"
  - taxa de ocupação mensal em gráfico e tabela
  - faixas de ocupação e fluxo estimado de turistas, com o RHC e os parâmetros vigentes no início do período da campanha
  - expectativa × realizado nos feriados
  - desempenho por tipo de hospedagem, com ocultação por sigilo e o filtro por tipo
  - botão "Baixar CSV" da campanha selecionada
  - pesquisas com os parceiros, com os botões "Acompanhamento completo", "Ver pendências" e "Lançar resposta" ligados às telas de pesquisas

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
| `npm run test:e2e` | Roda os testes e2e (Playwright) com a API simulada, no desktop e, os marcados com `@celular`, também em celular (360 px) e tablet (768 px) |
| `npm run test:e2e:headed` | Roda os testes e2e com o navegador visível, um teste por vez |
| `npm run api:tipos` | Gera `src/api/schema.d.ts` de novo. Precisa da API no ar |
| `npm run lighthouse` | Gera o build em `artefatos/lighthouse/build/` e roda o Lighthouse CI com a API simulada (ver [Lighthouse](#lighthouse)) |

> [!NOTE]
> Use `npm run typecheck` para verificar os tipos. O `tsc --noEmit` na raiz não verifica nada, porque o `tsconfig.json` principal só aponta para os outros.

### Testes e2e

Por padrão o Playwright roda sem abrir o navegador (headless). Outras formas de rodar, passando opções depois do `--`:

```bash
npm run test:e2e:headed                          # navegador visível, um teste por vez
npm run test:e2e -- --ui                         # interface do Playwright, com timeline e passo a passo
npm run test:e2e -- --debug                      # inspector, pausando em cada ação
npm run test:e2e -- e2e/login.spec.ts --headed   # só um arquivo
npm run test:e2e -- --project=celular            # só as telas do parceiro no celular
```

Os testes das telas do parceiro levam a marca `@celular` e rodam também nos projetos `celular` e `tablet`. Para clicar no menu, use `irPeloMenu` (`e2e/navegacao.ts`), que abre o menu recolhido quando ele existe; `semRolagemHorizontal` confere que a página cabe na tela.

Antes dos testes, o Playwright gera o build e sobe o `npm run preview` na porta 4173. Fora do CI, se já houver um servidor nessa porta, ele é reaproveitado e os testes rodam contra o build antigo; derrube esse servidor depois de mudar o código.

### Lighthouse

O Lighthouse CI (`@lhci/cli`, configurado em [`lighthouserc.cjs`](lighthouserc.cjs)) audita `/login`, `/definir-senha?token=x`, o painel (`/`), `/metodologia` e `/cadastros/usuarios`, duas execuções por página. O build é servido por [`lighthouse/servidor.mjs`](lighthouse/servidor.mjs) na porta 4179, que também responde a `/api` com dados simulados (os mesmos dos e2e) e, nas telas autenticadas, grava a sessão de um ADMIN no `sessionStorage` antes do app carregar. O texto é enviado com gzip, como na Vercel.

```bash
npm run lighthouse                        # celular (padrão do Lighthouse)
LHCI_PERFIL=desktop npm run lighthouse    # desktop
```

Sem Chrome instalado, aponte `CHROME_PATH` para o Chromium do Playwright (`~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome`). Os relatórios ficam em `artefatos/lighthouse/relatorios/celular/` e `artefatos/lighthouse/relatorios/desktop/`. No CI, o job `lighthouse` roda os dois perfis e publica os relatórios como artefato.

Limites: acessibilidade e boas práticas abaixo de 0,95 reprovam o job. Desempenho (0,75 no celular e 0,90 no desktop), SEO (0,90), LCP (3,5 s no celular e 1,5 s no desktop), TBT (600 ms no celular e 200 ms no desktop) e CLS (0,1) só geram aviso.

Medido em 22/11/2026 (melhor das duas execuções; desempenho, acessibilidade, boas práticas e SEO, de 0 a 100):

| Página | Celular | Desktop |
|---|---|---|
| `/login` | 100, 100, 100, 91 | 100, 100, 100, 91 |
| `/definir-senha` | 94, 100, 100, 91 | 100, 100, 100, 91 |
| `/` (painel) | 80, 100, 100, 91 | 96, 100, 100, 91 |
| `/metodologia` | 94, 100, 100, 91 | 100, 100, 100, 91 |
| `/cadastros/usuarios` | 87, 100, 100, 91 | 100, 100, 100, 91 |

O SEO perde pontos só pela falta de `<meta name="description">`. No painel, o CLS fica em 0,17 no celular e 0,11 no desktop, causado pela troca da fonte quando ela termina de carregar, e por isso o aviso de CLS aparece nessa página. O desempenho no celular varia bastante entre execuções (de 77 a 87 em `/cadastros/usuarios`).

## Estrutura do projeto

```text
├── dev/                     # Páginas de comparação visual, fora do build de produção
├── docs/referencia/         # Tela exportada do Figma
├── public/
└── src/
    ├── api/                 # Cliente HTTP, sessão, chamadas por recurso (como `inventario.ts`) e tipos gerados
    ├── app/                 # Rotas, provedores e layout (cabeçalho, menu e rodapé)
    ├── assets/              # Logos
    ├── components/
    │   ├── charts/          # Gráficos reutilizáveis
    │   └── ui/              # Botão, cartão, select, selo, tabela, diálogo, estados de vazio e de erro
    ├── features/
    │   ├── auth/            # Contexto de sessão, login, definição e troca de senha e proteção de rotas
    │   ├── cadastros/       # Telas de cadastro do ADMIN, com formulário em diálogo (inclui o catálogo do inventário em `inventario/`)
    │   ├── estabelecimento/ # Meu estabelecimento do PARCEIRO: dados, capacidade e inventário
    │   ├── inventario/      # Editor de inventário de um estabelecimento (`EditorDeInventario`), reaproveitável por outros perfis
    │   ├── metodologia/     # Página estática do cálculo dos indicadores
    │   ├── painel/          # Página, cartões, regras de cálculo e dados fixos
    │   ├── pesquisas/       # Criação, lista, acompanhamento, resposta, prévia e publicação
    │   └── resultados/      # Resultado publicado de uma campanha e download do CSV
    ├── lib/                 # Formatadores pt-BR, leitura de decimais, download e regras de perfil
    ├── styles/              # Tokens do design e estilos globais
    ├── test/                # Configuração dos testes
    └── types/               # Tipos de domínio derivados da API
    │   ├── auth/        # Contexto de sessão, login, definição e troca de senha e proteção de rotas
    │   ├── cadastros/   # Telas de cadastro do ADMIN, com formulário em diálogo
    │   ├── metodologia/ # Página estática do cálculo dos indicadores
    │   ├── painel/      # Página, cartões, consultas à API e regras de cálculo
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
- **Acessibilidade:** os gráficos têm alternativa em texto ou tabela, e a informação não depende só da cor. Os testes das telas do parceiro, de Relatórios, Indicadores, resultado, login e cabeçalho rodam o axe-core (`violacoesDeAcessibilidade`, em `src/test/acessibilidade.ts`); o contraste fica de fora no jsdom.

## Próximas tasks

| Task | Entrega | Pronto quando | Depende de |
|---|---|---|---|
| **T17. Responsividade e acessibilidade (restante)** | O cabeçalho, as telas do parceiro, Relatórios e Indicadores já se adaptam. Falta adaptar as telas do ADMIN (pesquisas, prévia e Cadastros, com tabelas e diálogos), corrigir os ajustes pendentes em 1280 px e fazer a auditoria WCAG AA com contraste no navegador | Sem rolagem horizontal da página em 360 px e sem falhas AA abertas | — |
| **T18. Otimização e revisão final** | Dividir o código por rota, otimizar fontes e imagens, analisar o tamanho do pacote, adicionar favicon e comparar a tela inteira com o design | Lighthouse medido e registrado, sem pendências visuais abertas | T17 |

Pendências do fluxo das pesquisas:

- Diárias médias digitadas pela equipe (`/api/campanhas/{id}/diarias`) na prévia
- Há dois leitores de número digitado: `lerNumero` (`features/pesquisas/respostas.ts`, aceita ponto de milhar e deixa a contagem de casas para a validação) e `lerDecimal` (`lib/numeros.ts`, limita as casas e aceita sinal). Juntar num só quando a tela do parceiro for revista

## Decisões

Não há decisões em aberto.

**Fechadas**

| # | Decisão |
|---|---|
| D2 | O filtro "Tipo de hospedagem" afeta só o que a API separa por tipo (`porTipo` do resultado, ou seja, o desempenho por tipo). Com um tipo escolhido, os outros cartões mostram a nota "todos os tipos". Tipo oculto por sigilo mostra o aviso, sem inventar valor |
| D3 | A comparação usa o resultado publicado do mesmo mês (ou do mesmo feriado) no ano escolhido em "Comparar com". Sem ele, usa a série histórica mensal (`/api/dashboard/serie-mensal`). Feriado sem publicada fica sem variação, pois a série é mensal. Sem nenhum dos dois, a variação fica escondida, sem inventar zero. A variação da receita, sem fonte na API, fica escondida |
| D5 | "Exportar" virou um botão direto "Baixar CSV" da campanha selecionada |
| D7 | O PARCEIRO continua vendo o cartão de pendências que já existe. Como não tem acesso ao RHC, vê o fluxo de turistas sem o detalhe da hospedagem caseira |
| D8 | O código da rodada saiu do texto do seletor de campanha |

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
