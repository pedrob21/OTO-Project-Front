// Serve o build do Lighthouse (dist-lighthouse) e simula a API em /api, no mesmo endereço.
// As telas autenticadas recebem a sessão no index.html, como o addInitScript dos e2e.

import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { gzipSync } from 'node:zlib'

const PORTA = 4179
const PASTA = join(import.meta.dirname, '..', 'dist-lighthouse')
const PUBLICAS = new Set(['/login', '/definir-senha'])

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

const SESSAO = `<script>sessionStorage.setItem('oto.sessao', JSON.stringify({ token: 'token-lighthouse', expiraEm: new Date(Date.now() + 3600000).toISOString() }))</script>`

const ADMIN = { id: 1, nome: 'Ana Souza', email: 'ana@oto.test', perfil: 'ADMIN', ativo: true }

const TIPOS_HOSPEDAGEM = [
  { codigo: 'HOTEL', nome: 'Hotel', calculaReceita: true },
  { codigo: 'RESORT', nome: 'Resort', calculaReceita: true },
  { codigo: 'POUSADA', nome: 'Pousada', calculaReceita: true },
]

const PUBLICADAS = [
  {
    campanhaId: 15,
    nome: 'Agosto de 2026',
    modalidade: 'CONSOLIDADA',
    tipoPeriodo: 'MENSAL',
    periodoInicio: '2026-08-01',
    periodoFim: '2026-08-31',
    publicadaEm: '2026-09-18T12:00:00Z',
  },
  {
    campanhaId: 13,
    nome: 'Julho de 2026',
    modalidade: 'CONSOLIDADA',
    tipoPeriodo: 'MENSAL',
    periodoInicio: '2026-07-01',
    periodoFim: '2026-07-31',
    publicadaEm: '2026-08-12T12:00:00Z',
  },
]

function resultado(campanha, taxaOcupacao) {
  return {
    campanha: { id: campanha.campanhaId, ...campanha, qtdDiarias: 31, publicada: true },
    publicado: true,
    taxaOcupacao,
    faixa: { codigo: 'OTIMA', nome: 'Ótima' },
    qtdMh: 72,
    qtdMhRespondentes: 58,
    percentualMhRespondentes: 80.6,
    percentualLeitosRespondentes: 91.4,
    fluxoMh: 365_620,
    fluxoRhc: 55_795,
    fluxoDayUse: 75_245,
    fluxoTotal: 496_660,
    fluxoMedioDiario: 16_021,
    diariaMedia: 765,
    receitaHospedagem: 89_000_000,
    porTipo: [
      {
        tipoHospedagemCodigo: 'RESORT',
        nome: 'Resort',
        qtdMh: 9,
        qtdUh: 4_643,
        taxaOcupacao: 66,
        diariaMedia: 836,
        revpar: 552,
        receitaEstimada: 79_400_000,
      },
      {
        tipoHospedagemCodigo: 'POUSADA',
        nome: 'Pousada',
        qtdMh: 41,
        qtdUh: 635,
        taxaOcupacao: 48,
        diariaMedia: 478,
        revpar: 229,
        receitaEstimada: 4_500_000,
      },
    ],
    distribuicaoFaixas: [{ codigo: 'OTIMA', nome: 'Ótima', percentualMinimo: 61, qtdMh: 21 }],
  }
}

const API = {
  '/api/me': ADMIN,
  '/api/referencias': { tiposHospedagem: TIPOS_HOSPEDAGEM, faixasOcupacao: [] },
  '/api/campanhas/publicadas': PUBLICADAS,
  '/api/campanhas/15/resultado': resultado(PUBLICADAS[0], 62.8),
  '/api/campanhas/13/resultado': resultado(PUBLICADAS[1], 51.3),
  '/api/dashboard/serie-mensal': {
    indicador: 'TAXA_OCUPACAO',
    anos: [{ ano: 2026, meses: [{ mes: 8, valor: 62.8 }] }],
  },
  '/api/dashboard/feriados': [],
  '/api/rodadas': [],
  '/api/rhc/vigente': { qtdRegistros: 478, qtdLeitos: 5116 },
  '/api/parametros-calculo/vigente': {
    id: 1,
    vigenteDesde: '2025-01-01',
    percentualDayUse: 15.15,
    diasEmParques: 2,
    gastoMedioIngresso: 105,
    diasPermanenciaMedia: 4,
    gastoMedioDiario: 250,
    percentualMinimoLeitosPublicacao: 70,
    fonte: 'Estudo OTO 2025',
  },
  '/api/usuarios': [
    ADMIN,
    { id: 2, nome: 'Vera Lima', email: 'vera@oto.test', perfil: 'VISUALIZADOR', ativo: true },
    {
      id: 3,
      nome: 'Paulo Reis',
      email: 'paulo@oto.test',
      perfil: 'PARCEIRO',
      ativo: true,
      estabelecimentos: [{ id: 12, nomeFantasia: 'Hotel Exemplo' }],
    },
  ],
  '/api/estabelecimentos': [
    {
      id: 12,
      nomeFantasia: 'Hotel Exemplo',
      tipoHospedagemCodigo: 'HOTEL',
      situacao: 'REGULAR',
      ativo: true,
      qtdUh: 40,
      qtdLeitos: 120,
    },
  ],
}

// Comprime como a Vercel, para o Lighthouse medir o que o usuário recebe.
function enviar(pedido, resposta, status, cabecalhos, corpo) {
  const comprimir = /\bgzip\b/.test(pedido.headers['accept-encoding'] ?? '')
  resposta.writeHead(status, comprimir ? { ...cabecalhos, 'content-encoding': 'gzip' } : cabecalhos)
  resposta.end(comprimir ? gzipSync(corpo) : corpo)
}

const semCache = (tipo) => ({ 'content-type': tipo, 'cache-control': 'no-cache' })

async function arquivo(caminho) {
  const relativo = normalize(caminho).replace(/^(\.\.[/\\])+/, '')
  try {
    return { corpo: await readFile(join(PASTA, relativo)), tipo: TIPOS[extname(relativo)] }
  } catch {
    return null
  }
}

createServer(async (pedido, resposta) => {
  const { pathname } = new URL(pedido.url, `http://localhost:${PORTA}`)

  if (pathname.startsWith('/api/')) {
    if (pathname in API) {
      return enviar(pedido, resposta, 200, semCache(TIPOS['.json']), JSON.stringify(API[pathname]))
    }
    console.error(`sem rota simulada: ${pedido.method} ${pathname}`)
    return enviar(
      pedido,
      resposta,
      404,
      semCache(TIPOS['.json']),
      JSON.stringify({ detail: 'sem rota' }),
    )
  }

  const estatico = extname(pathname) ? await arquivo(pathname) : null
  if (estatico) {
    return enviar(
      pedido,
      resposta,
      200,
      {
        'content-type': estatico.tipo ?? 'application/octet-stream',
        'cache-control': pathname.startsWith('/assets/')
          ? 'public, max-age=31536000, immutable'
          : 'no-cache',
      },
      estatico.corpo,
    )
  }
  if (extname(pathname))
    return enviar(pedido, resposta, 404, semCache(TIPOS['.txt']), 'não encontrado')

  const indice = await arquivo('index.html')
  const html = indice.corpo.toString('utf-8')
  enviar(
    pedido,
    resposta,
    200,
    semCache(TIPOS['.html']),
    PUBLICAS.has(pathname) ? html : html.replace('<head>', `<head>${SESSAO}`),
  )
}).listen(PORTA, () => console.log(`servidor do Lighthouse pronto em http://localhost:${PORTA}`))
