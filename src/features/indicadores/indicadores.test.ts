import { describe, expect, it } from 'vitest'
import {
  erroDoIntervalo,
  escalaDoIndicador,
  filtroParaBusca,
  INDICADORES,
  lerFiltro,
  opcoesDeAno,
  tabelaDeFeriados,
  tabelaMensal,
  temAlgumValor,
  textoDoIntervalo,
} from './indicadores'

describe('lerFiltro', () => {
  it('sem nada na URL: taxa consolidada dos três últimos anos', () => {
    expect(lerFiltro(new URLSearchParams(), 2026)).toEqual({
      indicador: 'TAXA_OCUPACAO',
      modalidade: 'CONSOLIDADA',
      anoInicio: 2024,
      anoFim: 2026,
    })
  })

  it('lê o que veio da URL e ignora o que não vale', () => {
    expect(
      lerFiltro(
        new URLSearchParams('indicador=DIARIA_MEDIA&modalidade=EXPECTATIVA&de=2019&ate=2022'),
        2026,
      ),
    ).toEqual({
      indicador: 'DIARIA_MEDIA',
      modalidade: 'EXPECTATIVA',
      anoInicio: 2019,
      anoFim: 2022,
    })
    expect(
      lerFiltro(new URLSearchParams('indicador=X&modalidade=Y&de=abc&ate=1500'), 2026),
    ).toEqual({
      indicador: 'TAXA_OCUPACAO',
      modalidade: 'CONSOLIDADA',
      anoInicio: 2024,
      anoFim: 2026,
    })
  })

  it('só o ano final escolhido: começa dois anos antes dele', () => {
    expect(lerFiltro(new URLSearchParams('ate=2020'), 2026).anoInicio).toBe(2018)
  })

  it('ida e volta pela URL dá o mesmo filtro', () => {
    const filtro = lerFiltro(new URLSearchParams('indicador=FLUXO_TURISTAS&de=2017&ate=2025'), 2026)
    expect(lerFiltro(new URLSearchParams(filtroParaBusca(filtro)), 2026)).toEqual(filtro)
  })
})

describe('erroDoIntervalo', () => {
  it('aceita até 20 anos, do menor para o maior', () => {
    expect(erroDoIntervalo({ anoInicio: 2024, anoFim: 2026 })).toBeNull()
    expect(erroDoIntervalo({ anoInicio: 2007, anoFim: 2026 })).toBeNull()
  })

  it('recusa intervalo invertido ou longo demais, como a API', () => {
    expect(erroDoIntervalo({ anoInicio: 2026, anoFim: 2025 })).toBe(
      'O ano inicial não pode ser maior que o final.',
    )
    expect(erroDoIntervalo({ anoInicio: 2006, anoFim: 2026 })).toBe('Escolha no máximo 20 anos.')
  })
})

describe('textos e opções', () => {
  it('intervalo de anos', () => {
    expect(textoDoIntervalo(2024, 2026)).toBe('2024 a 2026')
    expect(textoDoIntervalo(2026, 2026)).toBe('2026')
  })

  it('anos de 2010 até o ano que vem, do mais novo ao mais antigo', () => {
    const anos = opcoesDeAno(2026).map((opcao) => opcao.valor)
    expect(anos[0]).toBe('2027')
    expect(anos.at(-1)).toBe('2010')
    expect(anos).toHaveLength(18)
  })

  it('cada indicador tem o seu formato', () => {
    expect(INDICADORES.TAXA_OCUPACAO.formatar(62.84)).toBe('62,8%')
    expect(INDICADORES.FLUXO_TURISTAS.formatar(496660)).toBe('496.660')
    expect(INDICADORES.DIARIA_MEDIA.formatar(765)).toMatch(/^R\$\s765$/)
    expect(INDICADORES.DIARIA_MEDIA.formatar(null)).toBe('—')
  })
})

describe('escalaDoIndicador', () => {
  const serie = (valores: (number | null)[]) => [{ nome: '2026', cor: 'red', valores }]

  it('a taxa vai sempre de 0 a 100%', () => {
    expect(escalaDoIndicador('TAXA_OCUPACAO', serie([40])).maximo).toBe(100)
  })

  it('fluxo e diária seguem o maior valor de todas as séries', () => {
    const fluxo = escalaDoIndicador('FLUXO_TURISTAS', [
      ...serie([120_000, null]),
      { nome: '2025', cor: 'blue', valores: [480_000] },
    ])
    expect(fluxo.maximo).toBe(500_000)
    expect(fluxo.formatarMarca(250_000)).toBe('250 mil')
    expect(fluxo.formatarMarca(0)).toBe('0')

    const diaria = escalaDoIndicador('DIARIA_MEDIA', serie([812.4]))
    expect(diaria.maximo).toBe(1_000)
    expect(diaria.formatarMarca(1_000)).toBe('R$ 1.000')
  })
})

describe('tabelaMensal', () => {
  it('todos os anos, do mais antigo ao mais novo, com a origem de cada valor', () => {
    const tabela = tabelaMensal({
      anos: [
        { ano: 2026, meses: [{ mes: 1, valor: 60, origem: 'SISTEMA' }] },
        { ano: 2018, meses: [{ mes: 1, valor: 55, origem: 'HISTORICO' }, { mes: 2 }] },
      ],
    })

    expect(tabela.anos).toEqual([2018, 2026])
    expect(tabela.linhas).toHaveLength(12)
    expect(tabela.linhas[0]?.celulas).toEqual([
      { valor: 55, historico: true },
      { valor: 60, historico: false },
    ])
    expect(tabela.linhas[1]?.celulas).toEqual([
      { valor: null, historico: false },
      { valor: null, historico: false },
    ])
    expect(temAlgumValor(tabela.linhas)).toBe(true)
  })

  it('sem resposta, sem valores', () => {
    const tabela = tabelaMensal(undefined)
    expect(tabela.anos).toEqual([])
    expect(temAlgumValor(tabela.linhas)).toBe(false)
  })
})

describe('tabelaDeFeriados', () => {
  const feriados = [
    {
      feriadoCodigo: 'CARNAVAL',
      nome: 'Carnaval',
      anos: [
        { ano: 2025, taxaOcupacao: 80, fluxoTotal: 50_000, diariaMedia: 900, origem: 'HISTORICO' },
        {
          ano: 2026,
          taxaOcupacao: 82.5,
          fluxoTotal: undefined,
          diariaMedia: 950,
          origem: 'SISTEMA',
        },
      ],
    },
  ]

  it('pega o campo do indicador escolhido', () => {
    expect(tabelaDeFeriados(feriados, 'TAXA_OCUPACAO')).toEqual({
      anos: [2025, 2026],
      linhas: [
        {
          codigo: 'CARNAVAL',
          nome: 'Carnaval',
          celulas: [
            { valor: 80, historico: true },
            { valor: 82.5, historico: false },
          ],
        },
      ],
    })
  })

  it('valor ausente não leva a marca de série histórica', () => {
    const fluxo = tabelaDeFeriados(feriados, 'FLUXO_TURISTAS').linhas[0]?.celulas
    expect(fluxo).toEqual([
      { valor: 50_000, historico: true },
      { valor: null, historico: false },
    ])
  })

  it('sem feriados, tabela vazia', () => {
    expect(tabelaDeFeriados([], 'DIARIA_MEDIA')).toEqual({ anos: [], linhas: [] })
  })
})
