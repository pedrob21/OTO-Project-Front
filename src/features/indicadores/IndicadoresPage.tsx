import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { buscarFeriados, buscarSerieMensal } from '@/api/dashboard'
import { GraficoLinhasMensal } from '@/components/charts/GraficoLinhasMensal'
import { Card } from '@/components/ui/Card'
import { Carregando } from '@/components/ui/Carregando'
import { ErroApi } from '@/components/ui/ErroApi'
import { EstadoVazio } from '@/components/ui/EstadoVazio'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'
import { seriesDeOcupacao, textoDosAnos } from '@/features/painel/ocupacaoMensal'
import comum from '@/features/pesquisas/comum.module.css'
import { hojeLocal } from '@/lib/datas'
import { capitalizar, formatarMes } from '@/lib/formatos'
import {
  erroDoIntervalo,
  filtroParaBusca,
  INDICADORES,
  lerFiltro,
  OPCOES_DE_INDICADOR,
  OPCOES_DE_MODALIDADE,
  opcoesDeAno,
  escalaDoIndicador,
  tabelaDeFeriados,
  tabelaMensal,
  temAlgumValor,
  textoDoIntervalo,
  type Celula,
  type FiltroIndicadores,
} from './indicadores'
import styles from './IndicadoresPage.module.css'

type Visao = 'grafico' | 'tabela'

const VISOES: { valor: Visao; rotulo: string }[] = [
  { valor: 'grafico', rotulo: 'Gráfico' },
  { valor: 'tabela', rotulo: 'Tabela' },
]

type IndicadoresPageProps = {
  /** "2026-11-16". Fixa o ano atual nos testes. */
  hoje?: string
}

/** O valor, com a marca "H" quando vem da série histórica importada e não de pesquisa do sistema. */
function Valor({ celula, formatar }: { celula: Celula; formatar: Definicao['formatar'] }) {
  return (
    <>
      {formatar(celula.valor)}
      {celula.historico && (
        <sup className={styles.marcaHistorico}>
          <span aria-hidden="true">H</span>
          <span className={comum.oculto}> (série histórica)</span>
        </sup>
      )}
    </>
  )
}

type Definicao = (typeof INDICADORES)[keyof typeof INDICADORES]

function TabelaPorAno({
  legenda,
  titulo,
  anos,
  linhas,
  formatar,
}: {
  legenda: string
  titulo: string
  anos: number[]
  linhas: { chave: string; rotulo: string; celulas: Celula[] }[]
  formatar: Definicao['formatar']
}) {
  return (
    <div className={styles.rolagem} role="region" aria-label={legenda} tabIndex={0}>
      <table className={styles.tabela}>
        <caption className={comum.oculto}>{legenda}</caption>
        <thead>
          <tr>
            <th scope="col">{titulo}</th>
            {anos.map((ano) => (
              <th key={ano} scope="col">
                {ano}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr key={linha.chave}>
              <th scope="row">{linha.rotulo}</th>
              {linha.celulas.map((celula, indice) => (
                <td key={anos[indice]}>
                  <Valor celula={celula} formatar={formatar} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Indicadores: a série mês a mês e os feriados ano a ano, da taxa de ocupação, do fluxo de turistas
 * ou da diária média. Junta as pesquisas publicadas no sistema com a série histórica importada.
 */
export function IndicadoresPage({ hoje: hojeFixo }: IndicadoresPageProps) {
  const [anoAtual] = useState(() => Number((hojeFixo ?? hojeLocal()).slice(0, 4)))
  const [visao, setVisao] = useState<Visao>('grafico')
  const [busca, setBusca] = useSearchParams()
  const filtro = lerFiltro(busca, anoAtual)
  const erro = erroDoIntervalo(filtro)
  const definicao = INDICADORES[filtro.indicador]
  const intervalo = textoDoIntervalo(filtro.anoInicio, filtro.anoFim)
  const { indicador, modalidade, anoInicio, anoFim } = filtro

  const serie = useQuery({
    queryKey: ['dashboard', 'serie-mensal', indicador, modalidade, anoInicio, anoFim],
    queryFn: ({ signal }) =>
      buscarSerieMensal({ indicador, modalidade, anoInicio, anoFim }, signal),
    enabled: !erro,
    placeholderData: keepPreviousData,
  })
  const feriados = useQuery({
    queryKey: ['dashboard', 'feriados', 'intervalo', modalidade, anoInicio, anoFim],
    queryFn: ({ signal }) => buscarFeriados({ modalidade, anoInicio, anoFim }, signal),
    enabled: !erro,
    placeholderData: keepPreviousData,
  })

  function filtrar(mudanca: Partial<FiltroIndicadores>) {
    setBusca(filtroParaBusca({ ...filtro, ...mudanca }), { replace: true })
  }

  const series = serie.data ? seriesDeOcupacao(serie.data) : []
  const mensal = tabelaMensal(serie.data)
  const temMensal = temAlgumValor(mensal.linhas)
  const porFeriado = tabelaDeFeriados(feriados.data, indicador)
  const anosDoGrafico = textoDosAnos(series)
  const opcoesAno = opcoesDeAno(anoAtual)
  const tituloDoIndicador = definicao.rotulo
  const modalidadeEmTexto = modalidade === 'CONSOLIDADA' ? 'consolidada' : 'expectativa'

  return (
    <>
      <div className={comum.titulos}>
        <p className={comum.sobrelinha}>Séries do turismo em Olímpia</p>
        <h1 className={comum.titulo}>Indicadores</h1>
        <p className={comum.introducao}>
          Acompanhe {definicao.artigo} mês a mês e nos feriados, comparando os anos. Os valores vêm
          das pesquisas publicadas e, para os anos anteriores ao sistema, da série histórica do
          Observatório.
        </p>
      </div>

      <form
        className={styles.filtros}
        aria-label="Filtros dos indicadores"
        onSubmit={(evento) => evento.preventDefault()}
      >
        <SegmentedControl
          rotulo="Indicador"
          rotuloVisivel
          valor={indicador}
          opcoes={OPCOES_DE_INDICADOR}
          aoMudar={(valor) => filtrar({ indicador: valor })}
        />
        <Select
          variante="campo"
          rotulo="Modalidade"
          valor={modalidade}
          opcoes={OPCOES_DE_MODALIDADE}
          aoMudar={(valor) => filtrar({ modalidade: valor as FiltroIndicadores['modalidade'] })}
        />
        <Select
          variante="campo"
          rotulo="De"
          valor={String(anoInicio)}
          opcoes={opcoesAno}
          aoMudar={(valor) => filtrar({ anoInicio: Number(valor) })}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? 'erro-intervalo' : undefined}
        />
        <Select
          variante="campo"
          rotulo="Até"
          valor={String(anoFim)}
          opcoes={opcoesAno}
          aoMudar={(valor) => filtrar({ anoFim: Number(valor) })}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? 'erro-intervalo' : undefined}
        />
      </form>
      {erro && (
        <p id="erro-intervalo" className={`${comum.alerta} ${styles.erro}`} role="alert">
          {erro}
        </p>
      )}

      {!erro && (
        <div className={comum.pilha}>
          <Card
            titulo={`${tituloDoIndicador} mês a mês`}
            subtitulo={`Modalidade ${modalidadeEmTexto}, ${intervalo}`}
            acao={
              <SegmentedControl
                rotulo={`Visualização: ${tituloDoIndicador.toLowerCase()} mês a mês`}
                valor={visao}
                opcoes={VISOES}
                aoMudar={setVisao}
              />
            }
          >
            {serie.isPending && <Carregando texto="Carregando a série mensal" />}
            {serie.isError && (
              <ErroApi
                mensagem="Não foi possível carregar a série mensal."
                detalhe={serie.error.message}
                aoTentarNovamente={() => void serie.refetch()}
              />
            )}
            {serie.isSuccess && !temMensal && (
              <EstadoVazio
                titulo={`Sem valores mensais de ${intervalo}`}
                descricao="Escolha outros anos ou a outra modalidade. As expectativas costumam ser feitas só para feriados e eventos."
              />
            )}
            {serie.isSuccess && temMensal && visao === 'grafico' && (
              <>
                <ul className={styles.legenda}>
                  {series.map(({ nome, cor }, indice) => (
                    <li key={nome} className={indice === 0 ? styles.itemPrincipal : styles.item}>
                      <span className={styles.traco} style={{ background: cor }} />
                      {nome}
                    </li>
                  ))}
                </ul>
                <GraficoLinhasMensal
                  series={series}
                  rotulo={`${tituloDoIndicador} mensal, ${anosDoGrafico}`}
                  escala={escalaDoIndicador(indicador, series)}
                  formatarValor={definicao.formatar}
                />
                {mensal.anos.length > series.length && (
                  <p className={styles.nota}>
                    O gráfico compara os três anos mais recentes do intervalo ({anosDoGrafico}). A
                    tabela traz todos os anos.
                  </p>
                )}
              </>
            )}
            {serie.isSuccess && temMensal && visao === 'tabela' && (
              <TabelaPorAno
                legenda={`${tituloDoIndicador} por mês, ${intervalo}`}
                titulo="Mês"
                anos={mensal.anos}
                linhas={mensal.linhas.map((linha) => ({
                  chave: String(linha.mes),
                  rotulo: capitalizar(formatarMes(linha.mes)),
                  celulas: linha.celulas,
                }))}
                formatar={definicao.formatar}
              />
            )}
          </Card>

          <Card
            titulo={`${tituloDoIndicador} nos feriados e eventos`}
            subtitulo={`Modalidade ${modalidadeEmTexto}, ${intervalo}`}
          >
            {feriados.isPending && <Carregando texto="Carregando os feriados" />}
            {feriados.isError && (
              <ErroApi
                mensagem="Não foi possível carregar os feriados."
                detalhe={feriados.error.message}
                aoTentarNovamente={() => void feriados.refetch()}
              />
            )}
            {feriados.isSuccess && !temAlgumValor(porFeriado.linhas) && (
              <EstadoVazio
                titulo={`Sem feriados com ${definicao.rotulo.toLowerCase()} em ${intervalo}`}
                descricao="Os feriados aparecem aqui quando há pesquisa publicada ou valor na série histórica."
              />
            )}
            {feriados.isSuccess && temAlgumValor(porFeriado.linhas) && (
              <TabelaPorAno
                legenda={`${tituloDoIndicador} por feriado e ano, ${intervalo}`}
                titulo="Feriado ou evento"
                anos={porFeriado.anos}
                linhas={porFeriado.linhas.map((linha) => ({
                  chave: linha.codigo,
                  rotulo: linha.nome,
                  celulas: linha.celulas,
                }))}
                formatar={definicao.formatar}
              />
            )}
          </Card>

          <p className={styles.fonte}>
            <span aria-hidden="true">H</span>
            <span className={comum.oculto}>Valores marcados como série histórica</span>: valor da
            série histórica importada pela equipe do OTO. Os demais vêm das pesquisas publicadas no
            sistema. Os números são da cidade toda, sem separar por estabelecimento.{' '}
            <Link to="/metodologia" className={comum.link}>
              Como os indicadores são calculados
            </Link>
          </p>
        </div>
      )}
    </>
  )
}
