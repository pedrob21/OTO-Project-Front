import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { buscarParametrosVigentes } from '@/api/parametros'
import { Card } from '@/components/ui/Card'
import { Carregando } from '@/components/ui/Carregando'
import { ErroApi } from '@/components/ui/ErroApi'
import { formatarData, formatarInteiro, formatarMoeda, formatarPercentual } from '@/lib/formatos'
import type { Esquemas } from '@/types/dominio'
import styles from './MetodologiaPage.module.css'

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <Card titulo={titulo}>
      <div className={styles.texto}>{children}</div>
    </Card>
  )
}

function ParametrosVigentes({ parametros }: { parametros: Esquemas['ParametroResponse'] }) {
  const linhas: [string, string][] = [
    ['Day use sobre o público hospedado', formatarPercentual(parametros.percentualDayUse, 2)],
    ['Dias de ingresso em parque', formatarInteiro(parametros.diasEmParques)],
    ['Valor médio do ingresso', formatarMoeda(parametros.gastoMedioIngresso)],
    ['Dias de gasto médio', formatarInteiro(parametros.diasPermanenciaMedia)],
    ['Valor do gasto médio diário', formatarMoeda(parametros.gastoMedioDiario)],
    [
      'Mínimo de leitos respondentes para publicar',
      formatarPercentual(parametros.percentualMinimoLeitosPublicacao, 0),
    ],
  ]

  return (
    <>
      <dl className={styles.vigentes}>
        {linhas.map(([rotulo, valor]) => (
          <div key={rotulo} className={styles.linha}>
            <dt>{rotulo}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>
      <p className={styles.exemplo}>
        Em vigor desde {formatarData(parametros.vigenteDesde)}
        {parametros.fonte ? `. Fonte: ${parametros.fonte}` : ''}.
      </p>
    </>
  )
}

export function MetodologiaPage() {
  const parametros = useQuery({
    queryKey: ['parametros-vigentes'],
    queryFn: ({ signal }) => buscarParametrosVigentes(undefined, signal),
  })

  return (
    <>
      <div className={styles.titulos}>
        <p className={styles.sobrelinha}>Metodologia</p>
        <h1 className={styles.titulo}>Como calculamos a taxa de ocupação e o fluxo de turistas</h1>
        <p className={styles.introducao}>
          Os indicadores do painel vêm das respostas dos meios de hospedagem às pesquisas do
          Observatório. Esta página explica, sem fórmulas, como essas respostas viram números.
        </p>
      </div>

      <div className={styles.secoes}>
        <Secao titulo="Taxa de ocupação">
          <p>
            A taxa de ocupação é a média ponderada pelas unidades habitacionais (UH) dos meios de
            hospedagem que responderam à pesquisa. Um estabelecimento com mais UH pesa mais no
            resultado do que um menor.
          </p>
          <p>
            O RevPAR, receita por unidade habitacional disponível, é a diária média multiplicada
            pela taxa de ocupação.
          </p>
        </Secao>

        <Secao titulo="Leito útil">
          <p>
            O leito útil é a capacidade média efetivamente ocupada de cada unidade, e não o número
            de camas que ela tem.
          </p>
          <p className={styles.exemplo}>
            Exemplo: um quarto para 5 pessoas, com ocupação média de 3, conta 3 leitos úteis.
          </p>
          <p>
            O conceito vale para hotéis, pousadas, resorts e casas de temporada (hospedagem caseira,
            RHC).
          </p>
        </Secao>

        <Secao titulo="Fluxo de turistas">
          <p>
            O fluxo de turistas é medido em pernoites, isto é, leitos úteis ocupados por noite. Ele
            não conta pessoas distintas.
          </p>
          <p className={styles.exemplo}>Exemplo: quem fica 3 noites conta 3 vezes.</p>
        </Secao>

        <Secao titulo="Meios de hospedagem que não responderam">
          <p>
            Os não respondentes recebem a taxa média de ocupação da pesquisa. Assim, o resultado
            cobre todo o inventário, e não só quem respondeu.
          </p>
        </Secao>

        <Secao titulo="Day use">
          <p>
            O day use, visita de um dia sem pernoite, é estimado por um índice parametrizável
            aplicado sobre o público hospedado. Hoje o índice é de 15,15%.
          </p>
          <p>O fluxo total de turistas é a soma dos hospedados com o day use.</p>
        </Secao>

        <Secao titulo="Taxa de resposta e publicação">
          <p>
            A taxa de resposta é calculada por leitos, não pelo número de estabelecimentos. Isso
            importa porque os resorts, poucos em quantidade, concentram cerca de 79% das UH.
          </p>
          <p>
            Um resultado só é publicado quando os respondentes representam no mínimo 70% dos leitos.
          </p>
        </Secao>

        <Secao titulo="Sigilo dos dados">
          <p>
            O painel mostra apenas dados agregados. Os recortes por tipo de hospedagem com menos de
            3 respondentes ficam ocultos, para que nenhum estabelecimento possa ser identificado.
          </p>
        </Secao>

        <Secao titulo="Receita sem hospedagem">
          <p>
            A receita dos turistas fora da hospedagem é uma estimativa: 2 dias de ingresso em parque
            e 4 dias de gasto médio, com valores médios de R$ 105 por ingresso e R$ 250 por dia. Os
            números são parametrizáveis.
          </p>
        </Secao>

        <Secao titulo="Faixas de ocupação">
          <p>A taxa de ocupação é classificada em cinco faixas.</p>
          <ul className={styles.lista}>
            <li>Ruim: até 20%</li>
            <li>Regular: de 21 a 40%</li>
            <li>Boa: de 41 a 60%</li>
            <li>Ótima: de 61 a 80%</li>
            <li>Excelente: de 81 a 100%</li>
          </ul>
        </Secao>

        <Secao titulo="Valores em vigor">
          {parametros.isPending && <Carregando texto="Carregando os parâmetros" />}
          {parametros.isError && (
            <ErroApi
              mensagem="Não foi possível carregar os parâmetros em vigor."
              detalhe={parametros.error.message}
              aoTentarNovamente={() => void parametros.refetch()}
            />
          )}
          {parametros.data && <ParametrosVigentes parametros={parametros.data} />}
        </Secao>
      </div>
    </>
  )
}
