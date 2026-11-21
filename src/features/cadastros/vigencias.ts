type ComVigencia = { vigenteDesde?: string }

/** Da vigência mais recente para a mais antiga. */
export function ordenarPorVigencia<T extends ComVigencia>(lista: T[]): T[] {
  return lista.toSorted((a, b) => (b.vigenteDesde ?? '').localeCompare(a.vigenteDesde ?? ''))
}

/** A que vale na data: a mais recente que já começou. */
export function vigenteEm<T extends ComVigencia>(lista: T[], data: string): T | undefined {
  return ordenarPorVigencia(lista).find((item) => (item.vigenteDesde ?? '') <= data)
}

export type SituacaoDaVigencia = 'vigente' | 'futura' | 'anterior'

export function situacaoDaVigencia<T extends ComVigencia>(
  item: T,
  lista: T[],
  hoje: string,
): SituacaoDaVigencia {
  if (item === vigenteEm(lista, hoje)) return 'vigente'
  return (item.vigenteDesde ?? '') > hoje ? 'futura' : 'anterior'
}
