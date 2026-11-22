// Monta o resumo de qualidade do PR (cobertura do vitest e Lighthouse) em Markdown, com badges.
// Uso: node scripts/resumo-pr.mjs > resumo.md
// Lê coverage/coverage-summary.json e .lighthouseci/relatorio-<perfil>/*.report.json.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const MARCADOR = '<!-- resumo-qualidade -->'
const PASTA_LIGHTHOUSE = '.lighthouseci'
const ARQUIVO_COBERTURA = 'coverage/coverage-summary.json'

const PERFIS = { celular: 'Celular', desktop: 'Desktop' }
const CATEGORIAS = [
  ['performance', 'Desempenho'],
  ['accessibility', 'Acessibilidade'],
  ['best-practices', 'Boas práticas'],
  ['seo', 'SEO'],
]

function corDaCobertura(pct) {
  if (pct >= 95) return 'brightgreen'
  if (pct >= 90) return 'green'
  if (pct >= 80) return 'yellow'
  if (pct >= 60) return 'orange'
  return 'red'
}

function corDaNota(nota) {
  if (nota >= 90) return 'brightgreen'
  if (nota >= 50) return 'orange'
  return 'red'
}

function escapar(texto) {
  return encodeURIComponent(String(texto).replaceAll('-', '--').replaceAll('_', '__')).replaceAll(
    '%20',
    '_',
  )
}

function badge(rotulo, valor, cor) {
  const url = `https://img.shields.io/badge/${escapar(rotulo)}-${escapar(valor)}-${cor}`
  return `![${rotulo}: ${valor}](${url})`
}

function decimal(valor, casas) {
  return valor.toFixed(casas).replace('.', ',')
}

function lerJson(caminho) {
  return JSON.parse(readFileSync(caminho, 'utf8'))
}

function coberturaEmMarkdown() {
  if (!existsSync(ARQUIVO_COBERTURA)) {
    return { badges: [], texto: '_Cobertura não disponível nesta execução._' }
  }
  const total = lerJson(ARQUIVO_COBERTURA).total
  const itens = [
    ['Linhas', total.lines],
    ['Branches', total.branches],
    ['Funções', total.functions],
    ['Statements', total.statements],
  ]
  const badges = itens.map(([nome, medida]) =>
    badge(
      `cobertura ${nome.toLowerCase()}`,
      `${decimal(medida.pct, 2)}%`,
      corDaCobertura(medida.pct),
    ),
  )
  const linhas = itens.map(
    ([nome, medida]) =>
      `| ${nome} | ${decimal(medida.pct, 2)}% | ${medida.covered} de ${medida.total} |`,
  )
  const texto = ['| Medida | Cobertura | Cobertos |', '| --- | ---: | ---: |', ...linhas].join('\n')
  return { badges, texto }
}

function relatoriosDoPerfil(perfil) {
  const pasta = join(PASTA_LIGHTHOUSE, `relatorio-${perfil}`)
  if (!existsSync(pasta)) return []
  return readdirSync(pasta)
    .filter((arquivo) => arquivo.endsWith('.report.json'))
    .map((arquivo) => lerJson(join(pasta, arquivo)))
}

function nomeDaPagina(url) {
  const { pathname, search } = new URL(url)
  return `${pathname}${search}`
}

/** A melhor das execuções de cada página: o desempenho varia, e o job usa o mesmo critério. */
function melhoresPorPagina(relatorios) {
  const paginas = new Map()
  for (const lhr of relatorios) {
    const pagina = nomeDaPagina(lhr.finalUrl)
    const atual = paginas.get(pagina)
    if (!atual || lhr.categories.performance.score > atual.categories.performance.score) {
      paginas.set(pagina, lhr)
    }
  }
  return [...paginas.entries()]
}

function nota(lhr, categoria) {
  return Math.round((lhr.categories[categoria]?.score ?? 0) * 100)
}

function lighthouseEmMarkdown() {
  const badges = []
  const blocos = []

  for (const [perfil, titulo] of Object.entries(PERFIS)) {
    const paginas = melhoresPorPagina(relatoriosDoPerfil(perfil))
    if (paginas.length === 0) continue

    for (const [categoria, nomeCategoria] of CATEGORIAS) {
      const minima = Math.min(...paginas.map(([, lhr]) => nota(lhr, categoria)))
      badges.push(badge(`${titulo} ${nomeCategoria}`, String(minima), corDaNota(minima)))
    }

    const linhas = paginas.map(([pagina, lhr]) => {
      const notas = CATEGORIAS.map(([categoria]) => nota(lhr, categoria))
      const lcp = decimal(lhr.audits['largest-contentful-paint'].numericValue / 1000, 1)
      const cls = decimal(lhr.audits['cumulative-layout-shift'].numericValue, 2)
      const tbt = Math.round(lhr.audits['total-blocking-time'].numericValue)
      return `| \`${pagina}\` | ${notas.join(' | ')} | ${lcp} s | ${cls} | ${tbt} ms |`
    })
    blocos.push(
      [
        `#### ${titulo}`,
        '',
        `| Página | ${CATEGORIAS.map(([, nomeCategoria]) => nomeCategoria).join(' | ')} | LCP | CLS | TBT |`,
        `| --- | ${CATEGORIAS.map(() => '---:').join(' | ')} | ---: | ---: | ---: |`,
        ...linhas,
      ].join('\n'),
    )
  }

  if (blocos.length === 0) {
    return { badges, texto: '_Lighthouse não disponível nesta execução._' }
  }
  return { badges, texto: blocos.join('\n\n') }
}

function rodape() {
  const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID, GITHUB_SHA } = process.env
  if (!GITHUB_RUN_ID) return ''
  const execucao = `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`
  return `\n_Commit \`${GITHUB_SHA?.slice(0, 7)}\`. [Relatórios completos nos artefatos da execução](${execucao})._`
}

const cobertura = coberturaEmMarkdown()
const lighthouse = lighthouseEmMarkdown()

const resumo = [
  MARCADOR,
  '## Resumo de qualidade',
  '',
  [...cobertura.badges, ...lighthouse.badges].join(' '),
  '',
  '### Cobertura de testes unitários',
  '',
  cobertura.texto,
  '',
  '### Lighthouse',
  '',
  'Melhor de 2 execuções por página. As notas dos badges são a pior página de cada perfil.',
  '',
  lighthouse.texto,
  rodape(),
]

console.log(resumo.join('\n'))
