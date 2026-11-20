import type { Esquemas, Indicador, Modalidade } from '@/types/dominio'
import { requisicao } from './client'

type Periodo = { modalidade?: Modalidade; anoInicio?: number; anoFim?: number }

export function buscarResumo(modalidade?: Modalidade, signal?: AbortSignal) {
  return requisicao<Esquemas['ResumoResponse']>('/api/dashboard/resumo', {
    parametros: { modalidade },
    signal,
  })
}

export function buscarSerieMensal(
  filtro: Periodo & { indicador?: Indicador },
  signal?: AbortSignal,
) {
  return requisicao<Esquemas['SerieMensalResponse']>('/api/dashboard/serie-mensal', {
    parametros: filtro,
    signal,
  })
}

export function buscarFeriados(filtro: Periodo & { feriado?: string }, signal?: AbortSignal) {
  return requisicao<Esquemas['FeriadoSerie'][]>('/api/dashboard/feriados', {
    parametros: filtro,
    signal,
  })
}
