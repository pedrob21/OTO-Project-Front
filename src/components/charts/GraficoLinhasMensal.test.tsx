import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GraficoLinhasMensal, type SerieMensal } from './GraficoLinhasMensal'
import { escalaAutomatica } from './escala'
import { useLargura } from './useLargura'

const ATUAL: SerieMensal = {
  nome: '2026',
  cor: 'red',
  valores: [60, 62, 65, 70, 72, 68, 85, 62.8, null, null, null, null],
}
const ANTERIOR: SerieMensal = {
  nome: '2025',
  cor: 'blue',
  valores: [55, 58, 60, 64, 66, 63, 80, 58.7, 52, 49.5, 51, 70],
}

function grafico() {
  return screen.getByRole('group', { name: 'Taxa. Use as setas para percorrer os meses.' })
}

type Entrada = { contentRect: { width: number } }

/** ResizeObserver de mentira: guarda o callback para o teste disparar mudanças de tamanho. */
function instalarResizeObserver() {
  const observadores: { callback: (entradas: Entrada[]) => void; desconectado: boolean }[] = []
  class ResizeObserverFalso {
    registro: (typeof observadores)[number]
    constructor(callback: (entradas: Entrada[]) => void) {
      this.registro = { callback, desconectado: false }
      observadores.push(this.registro)
    }
    observe() {}
    disconnect() {
      this.registro.desconectado = true
    }
  }
  vi.stubGlobal('ResizeObserver', ResizeObserverFalso)
  return observadores
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('GraficoLinhasMensal', () => {
  it('o ponteiro mostra a leitura do mês mais próximo e some ao sair', () => {
    render(<GraficoLinhasMensal rotulo="Taxa" series={[ATUAL, ANTERIOR]} />)

    fireEvent.pointerMove(grafico(), { clientX: 0 })
    expect(screen.getByRole('status')).toHaveTextContent('janeiro')
    expect(screen.getByRole('status')).toHaveTextContent('60,0%')
    expect(screen.getByRole('status')).toHaveTextContent('55,0%')

    fireEvent.pointerMove(grafico(), { clientX: 5000 })
    expect(screen.getByRole('status')).toHaveTextContent('dezembro')
    expect(screen.getByRole('status')).toHaveTextContent('—')

    fireEvent.pointerLeave(grafico())
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('a leitura dos últimos meses vai para a esquerda da guia', () => {
    render(<GraficoLinhasMensal rotulo="Taxa" series={[ATUAL]} />)

    fireEvent.pointerMove(grafico(), { clientX: 0 })
    const inicio = parseFloat(screen.getByRole('status').style.left)
    fireEvent.pointerMove(grafico(), { clientX: 5000 })
    const fim = parseFloat(screen.getByRole('status').style.left)

    const guia = document.querySelector('.guia')
    expect(fim).toBeLessThan(Number(guia?.getAttribute('x1')))
    expect(inicio).toBeGreaterThan(0)
  })

  it('perder o foco esconde a leitura; outras teclas não fazem nada', async () => {
    render(<GraficoLinhasMensal rotulo="Taxa" series={[ATUAL]} />)
    grafico().focus()

    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('status')).toHaveTextContent('setembro')

    await userEvent.keyboard('a')
    expect(screen.getByRole('status')).toHaveTextContent('setembro')

    fireEvent.blur(grafico())
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('as setas param em janeiro e em dezembro', async () => {
    render(<GraficoLinhasMensal rotulo="Taxa" series={[ANTERIOR]} />)
    grafico().focus()

    await userEvent.keyboard('{ArrowRight}{ArrowRight}')
    expect(screen.getByRole('status')).toHaveTextContent('dezembro')

    await userEvent.keyboard('{Escape}{ArrowLeft}')
    expect(screen.getByRole('status')).toHaveTextContent('novembro')

    for (let i = 0; i < 12; i++) await userEvent.keyboard('{ArrowLeft}')
    expect(screen.getByRole('status')).toHaveTextContent('janeiro')
  })

  it('foco pelo teclado já abre a leitura no último mês com dado', async () => {
    render(
      <>
        <button>antes</button>
        <GraficoLinhasMensal rotulo="Taxa" series={[ATUAL]} />
      </>,
    )
    screen.getByRole('button', { name: 'antes' }).focus()

    await userEvent.tab()

    expect(grafico()).toHaveFocus()
    expect(screen.getByRole('status')).toHaveTextContent('agosto')
  })

  it('rótulo do último ponto vai para a esquerda perto da borda', () => {
    render(<GraficoLinhasMensal rotulo="Taxa" series={[ANTERIOR]} />)

    const rotulo = screen.getByText('70,0%').closest('text')
    expect(rotulo).toHaveAttribute('text-anchor', 'end')
  })

  it('sem séries, desenha só a grade', async () => {
    const { container } = render(<GraficoLinhasMensal rotulo="Taxa" series={[]} />)

    expect(container.querySelector('.area')).toBeNull()
    expect(container.querySelector('circle')).toBeNull()
    expect(screen.getByText('100%')).toBeInTheDocument()

    grafico().focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('status')).toHaveTextContent('fevereiro')
  })

  it('série sem nenhum valor não marca ponto final', () => {
    const { container } = render(
      <GraficoLinhasMensal
        rotulo="Taxa"
        series={[{ nome: 'vazia', cor: 'red', valores: Array(12).fill(null) }]}
      />,
    )

    expect(container.querySelector('circle')).toBeNull()
  })

  it('acompanha a largura do contêiner', () => {
    const observadores = instalarResizeObserver()
    const { container } = render(<GraficoLinhasMensal rotulo="Taxa" series={[ATUAL]} />)

    act(() => observadores[0]?.callback([{ contentRect: { width: 400 } }]))

    expect(container.querySelector('svg')).toHaveAttribute('width', '400')
  })
})

describe('GraficoLinhasMensal com outra escala', () => {
  it('usa as marcas e o formato do indicador', () => {
    const { container } = render(
      <GraficoLinhasMensal
        series={[
          {
            nome: '2026',
            cor: 'red',
            valores: [400, 500, null, null, null, null, null, null, null, null, null, 812.4],
          },
        ]}
        rotulo="Diária"
        escala={escalaAutomatica(812.4, (valor) => `R$ ${valor}`, 56)}
        formatarValor={(valor) => `R$ ${valor}`}
      />,
    )

    const marcas = [...container.querySelectorAll('text')].map((texto) => texto.textContent)
    expect(marcas).toEqual(expect.arrayContaining(['R$ 0', 'R$ 500', 'R$ 1000']))
    expect(marcas.some((marca) => marca?.endsWith('%'))).toBe(false)
    expect(container.textContent).toContain('R$ 812.4')
  })
})

describe('useLargura', () => {
  it('sem ResizeObserver, fica na largura inicial', () => {
    vi.stubGlobal('ResizeObserver', undefined)
    const elemento = document.createElement('div')

    const { result } = renderHook(() => {
      const largura = useLargura<HTMLDivElement>(300)
      largura.ref.current = elemento
      return largura
    })

    expect(result.current.largura).toBe(300)
  })

  it('sem elemento, não observa', () => {
    const observadores = instalarResizeObserver()

    const { result } = renderHook(() => useLargura<HTMLDivElement>(300))

    expect(result.current.largura).toBe(300)
    expect(observadores).toHaveLength(0)
  })

  it('ignora largura zero e desconecta ao desmontar', () => {
    const observadores = instalarResizeObserver()
    const elemento = document.createElement('div')

    const { result, unmount } = renderHook(() => {
      const largura = useLargura<HTMLDivElement>(300)
      largura.ref.current = elemento
      return largura
    })
    const [observador] = observadores

    act(() => observador?.callback([{ contentRect: { width: 0 } }]))
    expect(result.current.largura).toBe(300)

    act(() => observador?.callback([]))
    expect(result.current.largura).toBe(300)

    act(() => observador?.callback([{ contentRect: { width: 640 } }]))
    expect(result.current.largura).toBe(640)

    unmount()
    expect(observador?.desconectado).toBe(true)
  })
})
