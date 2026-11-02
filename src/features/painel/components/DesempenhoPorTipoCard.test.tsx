import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Esquemas } from '@/types/dominio'
import { linhasDeDesempenho, notaDosForaDaReceita, totalDoDesempenho } from '../desempenho'
import { referencias, resultado } from '../fixtures'
import { DesempenhoPorTipoCard } from './DesempenhoPorTipoCard'

const tipos = referencias.tiposHospedagem ?? []
const porTipo = resultado.porTipo ?? []

function comTipo(codigo: string, mudancas: Partial<Esquemas['ResultadoTipoResponse']>) {
  return {
    ...resultado,
    porTipo: porTipo.map((tipo) =>
      tipo.tipoHospedagemCodigo === codigo ? { ...tipo, ...mudancas } : tipo,
    ),
  }
}

const HOTEL_OCULTO = {
  taxaOcupacao: undefined,
  diariaMedia: undefined,
  revpar: undefined,
  receitaEstimada: undefined,
  omitido: true,
}

function abrir(dados: Esquemas['ResultadoResponse'] = resultado) {
  return render(<DesempenhoPorTipoCard resultado={dados} tipos={tipos} />)
}

function textoDaLinha(nome: RegExp): string {
  return (screen.getByRole('row', { name: nome }).textContent ?? '').replaceAll(' ', ' ')
}

describe('linhasDeDesempenho', () => {
  it('deixa só os tipos da receita, da maior para a menor', () => {
    const linhas = linhasDeDesempenho(porTipo, tipos)

    expect(linhas.map((linha) => linha.nome)).toEqual(['Resort', 'Hotel', 'Pousada'])
  })

  it('coloca o tipo oculto por último', () => {
    const { porTipo: comOculto = [] } = comTipo('RESORT', HOTEL_OCULTO)

    expect(linhasDeDesempenho(comOculto, tipos).at(-1)?.nome).toBe('Resort')
  })
})

describe('totalDoDesempenho', () => {
  it('chega aos números do design', () => {
    const total = totalDoDesempenho(linhasDeDesempenho(porTipo, tipos), resultado)

    expect(total.qtdMh).toBe(68)
    expect(total.qtdUh).toBe(5_864)
    expect(total.taxaOcupacao).toBeCloseTo(62.95, 2)
    expect(total.diariaMedia).toBe(765)
    expect(total.revpar).toBeCloseTo(489.6, 1)
    expect(total.receitaEstimada).toBe(89_000_000)
  })

  it('com tipo oculto, mantém a receita e as UH e não inventa a taxa', () => {
    const dados = comTipo('HOTEL', HOTEL_OCULTO)
    const total = totalDoDesempenho(linhasDeDesempenho(dados.porTipo, tipos), dados)

    expect(total.qtdUh).toBe(5_864)
    expect(total.receitaEstimada).toBe(89_000_000)
    expect(total.revpar).toBeCloseTo(489.6, 1)
    expect(total.taxaOcupacao).toBeNull()
  })

  it('tipo sem respostas fica fora da taxa e do RevPAR', () => {
    const dados = comTipo('POUSADA', {
      taxaOcupacao: undefined,
      diariaMedia: undefined,
      revpar: undefined,
      receitaEstimada: undefined,
    })
    const total = totalDoDesempenho(linhasDeDesempenho(dados.porTipo, tipos), {
      ...dados,
      receitaHospedagem: 84_500_000,
    })

    expect(total.taxaOcupacao).toBeCloseTo(64.77, 2)
    expect(total.revpar).toBeCloseTo(521.29, 1)
  })

  it('sem diárias na campanha, o RevPAR fica vazio', () => {
    const total = totalDoDesempenho(linhasDeDesempenho(porTipo, tipos), {
      ...resultado,
      campanha: undefined,
    })

    expect(total.revpar).toBeNull()
  })
})

describe('notaDosForaDaReceita', () => {
  it('monta o texto do design', () => {
    expect(notaDosForaDaReceita(porTipo, tipos)).toBe(
      'Flats (3) e hotel fazenda (1) entram na taxa de ocupação geral, mas não no cálculo da receita.',
    )
  })

  it('concorda com um tipo só e usa o plural quando há mais de um', () => {
    const fazenda = (qtdMh: number) => [
      { tipoHospedagemCodigo: 'HOTEL_FAZENDA', nome: 'Hotel fazenda', qtdMh },
    ]

    expect(notaDosForaDaReceita(fazenda(1), tipos)).toMatch(/^Hotel fazenda \(1\) entra na/)
    expect(notaDosForaDaReceita(fazenda(2), tipos)).toMatch(/^Hotéis fazenda \(2\) entram na/)
  })

  it('sem esses tipos, não há nota', () => {
    expect(notaDosForaDaReceita([], tipos)).toBeNull()
  })
})

describe('DesempenhoPorTipoCard', () => {
  it('mostra as linhas e o total como no design', () => {
    abrir()

    expect(textoDaLinha(/Resort/)).toBe('Resort9 estabelecimentos4.64366,0%R$ 836R$ 552R$ 79,4 mi')
    expect(textoDaLinha(/Total/)).toBe('Total68 estabelecimentos5.86463,0%R$ 765R$ 490R$ 89,0 mi')
    expect(screen.queryByRole('row', { name: /Flat/ })).not.toBeInTheDocument()
  })

  it('o subtítulo traz o período', () => {
    abrir()

    expect(screen.getByText(/^Agosto de 2026 · diária de 1 apartamento/)).toBeInTheDocument()
  })

  it('tipo oculto mostra as UH e explica o sigilo, e o total segue correto', () => {
    abrir(comTipo('HOTEL', HOTEL_OCULTO))

    const hotel = screen.getByRole('row', { name: /Hotel/ })
    expect(within(hotel).getByText(/preservar o sigilo/)).toBeInTheDocument()
    expect(within(hotel).getByText('586')).toBeInTheDocument()
    expect(within(hotel).queryByText(/R\$/)).not.toBeInTheDocument()
    expect(textoDaLinha(/Total/)).toBe('Total68 estabelecimentos5.864—R$ 765R$ 490R$ 89,0 mi')
    expect(screen.getByText(/taxa do total não aparece/)).toBeInTheDocument()
  })

  it('tipo sem respostas mostra travessões', () => {
    abrir(comTipo('POUSADA', { taxaOcupacao: undefined, receitaEstimada: undefined }))

    expect(textoDaLinha(/Pousada/)).toContain('635—')
  })

  it('usa o singular com um estabelecimento', () => {
    abrir(comTipo('RESORT', { qtdMh: 1 }))

    expect(screen.getByText('1 estabelecimento')).toBeInTheDocument()
  })

  it('sem tipos, mostra o estado vazio', () => {
    abrir({ ...resultado, porTipo: [] })

    expect(screen.getByText(/Ainda não há resultados por tipo/)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
