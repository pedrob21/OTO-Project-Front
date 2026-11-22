import { describe, expect, it } from 'vitest'
import schema from './schema.d.ts?raw'

const modulos = import.meta.glob<string>(
  ['./*.ts', '!./*.test.ts', '!./schema.d.ts', '!./client.ts'],
  {
    query: '?raw',
    import: 'default',
    eager: true,
  },
)

const METODOS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']

type Chamada = { arquivo: string; caminho: string; metodo: string }

function lerPaths(texto: string) {
  const inicio = texto.indexOf('export interface paths {')
  const fim = texto.indexOf('export type webhooks')
  const bloco = texto.slice(inicio, fim)
  const paths = new Map<string, Set<string>>()
  let atual: Set<string> | null = null
  for (const linha of bloco.split('\n')) {
    const caminho = /^ {4}"(\/[^"]*)": \{$/.exec(linha)
    if (caminho) {
      atual = new Set()
      paths.set(caminho[1] ?? '', atual)
      continue
    }
    const metodo = /^ {8}(\w+)(\?)?: (.+);$/.exec(linha)
    const nome = metodo?.[1] ?? ''
    if (atual && metodo && METODOS.includes(nome) && !metodo[2] && metodo[3] !== 'never') {
      atual.add(nome.toUpperCase())
    }
  }
  return paths
}

function lerEsquemas(texto: string) {
  const inicio = texto.indexOf('export interface components {')
  const bloco = texto.slice(inicio)
  const fim = bloco.indexOf('\n    responses:')
  const nomes = new Set<string>()
  for (const linha of bloco.slice(0, fim).split('\n')) {
    const nome = /^ {8}(\w+): /.exec(linha)
    if (nome) nomes.add(nome[1] ?? '')
  }
  return nomes
}

function fechar(texto: string, abertura: number, abre: string, fecha: string) {
  let nivel = 0
  for (let i = abertura; i < texto.length; i++) {
    if (texto[i] === abre) nivel++
    else if (texto[i] === fecha && --nivel === 0) return i
  }
  throw new Error(`delimitador ${abre} sem fechamento`)
}

function extrairChamadas(arquivo: string, texto: string): Chamada[] {
  const chamadas: Chamada[] = []
  const inicio = /\brequisicao(?:Arquivo)?\b/g
  for (let achado = inicio.exec(texto); achado; achado = inicio.exec(texto)) {
    let pos = achado.index + achado[0].length
    if (texto[pos] === '<') pos = fechar(texto, pos, '<', '>') + 1
    if (texto[pos] !== '(') continue
    const argumentos = texto.slice(pos + 1, fechar(texto, pos, '(', ')'))
    const literal = /^\s*(['`])((?:\\.|(?!\1)[^\\])*)\1/.exec(argumentos)
    if (!literal) {
      throw new Error(
        `${arquivo}: chamada com caminho que não é literal: ${argumentos.slice(0, 60)}`,
      )
    }
    const caminho = (literal[2] ?? '').replace(/\$\{([^}]*)\}/g, (_, expressao: string) => {
      const nome = /^\w+/.exec(expressao.trim())?.[0] ?? ''
      return nome === 'recurso' ? '{*}' : '{}'
    })
    const resto = argumentos.slice(literal[0].length)
    const metodo = /metodo:\s*'(\w+)'/.exec(resto)?.[1] ?? 'GET'
    chamadas.push({ arquivo, caminho, metodo })
  }
  return chamadas
}

function forma(caminho: string) {
  return caminho.replace(/\{[^}]+\}/g, '{}')
}

const paths = lerPaths(schema)
const formasDoSchema = new Map<string, Set<string>>()
for (const [caminho, metodos] of paths) {
  const chave = forma(caminho)
  formasDoSchema.set(chave, new Set([...(formasDoSchema.get(chave) ?? []), ...metodos]))
}

function casar(caminho: string) {
  if (!caminho.includes('{*}')) {
    const metodos = formasDoSchema.get(caminho)
    return metodos ? [metodos] : []
  }
  const [prefixo = '', sufixo = ''] = caminho.split('{*}')
  return [...formasDoSchema]
    .filter(
      ([chave]) =>
        chave.startsWith(prefixo) &&
        chave.endsWith(sufixo) &&
        !chave.slice(prefixo.length, chave.length - sufixo.length).includes('/') &&
        chave.slice(prefixo.length, chave.length - sufixo.length) !== '{}',
    )
    .map(([, metodos]) => metodos)
}

const chamadas = Object.entries(modulos).flatMap(([arquivo, texto]) =>
  extrairChamadas(arquivo.replace('./', 'src/api/'), texto),
)

describe('contrato com a API (schema.d.ts)', () => {
  it('lê o schema e os módulos', () => {
    expect(paths.size).toBeGreaterThan(40)
    expect(chamadas.length).toBeGreaterThan(60)
  })

  it('todo caminho chamado existe em paths do schema', () => {
    const fora = chamadas
      .filter(({ caminho }) => casar(caminho).length === 0)
      .map(({ arquivo, metodo, caminho }) => `${arquivo}: ${metodo} ${caminho}`)
    expect(fora, `Caminhos fora do contrato:\n${fora.join('\n')}`).toEqual([])
  })

  it('todo método chamado existe no caminho do schema', () => {
    const fora = chamadas
      .filter(({ caminho }) => casar(caminho).length > 0)
      .filter(({ caminho, metodo }) => !casar(caminho).every((metodos) => metodos.has(metodo)))
      .map(({ arquivo, metodo, caminho }) => `${arquivo}: ${metodo} ${caminho}`)
    expect(fora, `Métodos fora do contrato:\n${fora.join('\n')}`).toEqual([])
  })

  it('todo Esquemas[...] referenciado existe em components.schemas', () => {
    const existentes = lerEsquemas(schema)
    const fora = Object.entries(modulos).flatMap(([arquivo, texto]) =>
      [...texto.matchAll(/Esquemas\['(\w+)'\]/g)]
        .map((achado) => achado[1] ?? '')
        .filter((nome) => !existentes.has(nome))
        .map((nome) => `${arquivo}: Esquemas['${nome}']`),
    )
    expect(fora, `Esquemas inexistentes:\n${fora.join('\n')}`).toEqual([])
  })
})
