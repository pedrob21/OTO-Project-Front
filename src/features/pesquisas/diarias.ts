import type { Esquemas } from '@/types/dominio'
import { validarResposta } from './resposta'
import { ausente } from './respostas'

type Informada = Esquemas['DiariaInformadaResponse']

/** Chave da diária geral: a API a guarda com `tipoHospedagemCodigo` nulo. */
export const GERAL = ''

export type LinhaDiaria = {
  /** código do tipo de hospedagem; `GERAL` para a diária geral */
  codigo: string
  nome: string
  /** "diária geral" ou "diária de Hotel", para botões e avisos */
  rotulo: string
  informada: number | null
  /** a diária que a prévia usou: a informada ou, sem ela, a média das respostas */
  naPrevia: number | null
}

function chaveDe(codigo: string | null | undefined): string {
  return codigo?.trim() ? codigo.trim() : GERAL
}

function valor(numero: number | null | undefined): number | null {
  return ausente(numero) ? null : numero
}

/** Uma linha para a diária geral e uma por tipo, mais os tipos informados que saíram das referências. */
export function linhasDeDiarias(
  tipos: Esquemas['TipoRef'][],
  informadas: Informada[],
  resultado: Esquemas['ResultadoResponse'] | undefined,
): LinhaDiaria[] {
  const porChave = new Map(informadas.map((d) => [chaveDe(d.tipoHospedagemCodigo), d.diariaMedia]))
  const codigos = tipos.map((tipo) => tipo.codigo ?? '').filter(Boolean)
  const extras = [...porChave.keys()].filter((chave) => chave !== GERAL && !codigos.includes(chave))
  const nomes = new Map(tipos.map((tipo) => [tipo.codigo ?? '', tipo.nome ?? tipo.codigo ?? '']))

  const geral: LinhaDiaria = {
    codigo: GERAL,
    nome: 'Geral',
    rotulo: 'diária geral',
    informada: valor(porChave.get(GERAL)),
    naPrevia: valor(resultado?.diariaMedia),
  }
  return [
    geral,
    ...[...codigos, ...extras].map((codigo) => {
      const nome = nomes.get(codigo) ?? codigo
      return {
        codigo,
        nome,
        rotulo: `diária de ${nome}`,
        informada: valor(porChave.get(codigo)),
        naPrevia: valor(
          resultado?.porTipo?.find((tipo) => tipo.tipoHospedagemCodigo === codigo)?.diariaMedia,
        ),
      }
    }),
  ]
}

/** As regras da diária da resposta (maior que zero, até duas casas), mas obrigatória. */
export function validarDiaria(texto: string): string | undefined {
  if (!texto.trim()) return 'Informe a diária média.'
  return validarResposta({ taxaOcupacao: '0', diariaMedia: texto }).erros.diariaMedia
}

/**
 * Corpo do PUT, que substitui a lista inteira: as demais diárias seguem iguais, a do recorte
 * muda e, com `diariaMedia` nulo, sai. A fonte vale para todas.
 */
export function pedidoDeDiarias(
  informadas: Informada[],
  codigo: string,
  diariaMedia: number | null,
  fonte: string,
): Esquemas['DiariasRequest'] {
  const outras = informadas
    .filter((d) => chaveDe(d.tipoHospedagemCodigo) !== codigo && !ausente(d.diariaMedia))
    .map((d) => ({ codigo: chaveDe(d.tipoHospedagemCodigo), diariaMedia: d.diariaMedia ?? 0 }))
  const todas = diariaMedia === null ? outras : [...outras, { codigo, diariaMedia }]
  return {
    diarias: todas.map((d) =>
      d.codigo === GERAL
        ? { diariaMedia: d.diariaMedia }
        : { tipoHospedagemCodigo: d.codigo, diariaMedia: d.diariaMedia },
    ),
    fonte: fonte.trim() || undefined,
  }
}

/** A fonte é uma só por envio; a primeira preenchida vale como a atual. */
export function fonteAtual(informadas: Informada[]): string {
  return informadas.find((d) => d.fonte?.trim())?.fonte?.trim() ?? ''
}

/** O registro mais recente, para dizer quando a lista mudou pela última vez. */
export function ultimaAlteracao(informadas: Informada[]): string | undefined {
  return informadas
    .map((d) => d.registradoEm)
    .filter((data): data is string => Boolean(data))
    .toSorted((a, b) => a.localeCompare(b))
    .at(-1)
}
