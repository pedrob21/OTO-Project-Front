import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router'
import { listarPublicadas } from '@/api/resultados'
import { BaixarCsvButton } from '@/components/BaixarCsvButton'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Carregando } from '@/components/ui/Carregando'
import { ErroApi } from '@/components/ui/ErroApi'
import { Select } from '@/components/ui/Select'
import { Tabela } from '@/components/ui/Tabela'
import {
  CHAVE_PUBLICADAS,
  useCampanhasPublicadas,
} from '@/features/painel/hooks/useCampanhasPublicadas'
import comum from '@/features/pesquisas/comum.module.css'
import { formatarData, formatarInteiro, formatarPercentual } from '@/lib/formatos'
import type { Esquemas } from '@/types/dominio'
import {
  filtroParaBusca,
  lerFiltro,
  OPCOES_DE_MODALIDADE,
  OPCOES_DE_PERIODO,
  opcoesDeAno,
  rotuloDaModalidade,
  rotuloDoTipoDePeriodo,
  temFiltro,
  type FiltroRelatorios,
} from './relatorios'
import styles from './RelatoriosPage.module.css'

type Campanha = Esquemas['CampanhaPublicadaResponse']

function Taxa({ campanha }: { campanha: Campanha }) {
  return (
    <>
      {formatarPercentual(campanha.taxaOcupacao, 2)}
      {campanha.faixa?.nome && (
        <span className={styles.faixa}>
          <Badge variante="faixa">Faixa {campanha.faixa.nome.toLowerCase()}</Badge>
        </span>
      )}
    </>
  )
}

/**
 * Relatórios: as campanhas publicadas, com filtros, o relatório de cada uma (que pode ser impresso
 * em PDF) e o CSV. Os números vêm prontos da API, já com o sigilo aplicado conforme o perfil.
 */
export function RelatoriosPage() {
  const [busca, setBusca] = useSearchParams()
  const filtro = lerFiltro(busca)
  const filtrando = temFiltro(filtro)

  // Sem filtro, as duas consultas são a mesma (e o painel já costuma ter a lista em cache).
  const todas = useCampanhasPublicadas()
  const lista = useQuery({
    queryKey: filtrando ? [...CHAVE_PUBLICADAS, filtro] : CHAVE_PUBLICADAS,
    queryFn: ({ signal }) => listarPublicadas(filtro, signal),
    placeholderData: keepPreviousData,
  })

  function filtrar(mudanca: Partial<FiltroRelatorios>) {
    setBusca(filtroParaBusca({ ...filtro, ...mudanca }), { replace: true })
  }

  const campanhas = lista.data ?? []

  return (
    <>
      <div className={comum.titulos}>
        <p className={comum.sobrelinha}>Resultados publicados</p>
        <h1 className={comum.titulo}>Relatórios</h1>
        <p className={comum.introducao}>
          Escolha uma campanha para ver o relatório completo, gerar a versão em PDF ou baixar os
          dados em CSV.
        </p>
      </div>

      <Card titulo="Campanhas publicadas">
        <form
          className={styles.filtros}
          aria-label="Filtros dos relatórios"
          onSubmit={(evento) => evento.preventDefault()}
        >
          <Select
            variante="campo"
            rotulo="Modalidade"
            valor={filtro.modalidade ?? ''}
            opcoes={OPCOES_DE_MODALIDADE}
            aoMudar={(valor) =>
              filtrar({ modalidade: (valor || undefined) as FiltroRelatorios['modalidade'] })
            }
          />
          <Select
            variante="campo"
            rotulo="Período"
            valor={filtro.tipoPeriodo ?? ''}
            opcoes={OPCOES_DE_PERIODO}
            aoMudar={(valor) =>
              filtrar({ tipoPeriodo: (valor || undefined) as FiltroRelatorios['tipoPeriodo'] })
            }
          />
          <Select
            variante="campo"
            rotulo="Ano"
            valor={filtro.ano ? String(filtro.ano) : ''}
            opcoes={opcoesDeAno(todas.data ?? [], filtro.ano)}
            aoMudar={(valor) => filtrar({ ano: valor ? Number(valor) : undefined })}
          />
          {filtrando && (
            <Button
              variante="secundaria"
              className={styles.limpar}
              onClick={() => setBusca({}, { replace: true })}
            >
              Limpar filtros
            </Button>
          )}
        </form>

        {lista.isPending && <Carregando texto="Carregando os relatórios" />}
        {lista.isError && (
          <ErroApi
            mensagem="Não foi possível carregar os relatórios."
            detalhe={lista.error.message}
            aoTentarNovamente={() => void lista.refetch()}
          />
        )}
        {lista.isSuccess && (
          <>
            <p className={styles.contagem} aria-live="polite">
              {campanhas.length === 1
                ? '1 campanha publicada'
                : `${formatarInteiro(campanhas.length)} campanhas publicadas`}
              {filtrando && ' com os filtros escolhidos'}
            </p>
            <Tabela
              legenda="Campanhas publicadas"
              linhas={campanhas}
              chave={(campanha) => campanha.campanhaId ?? 0}
              vazio={
                filtrando
                  ? {
                      titulo: 'Nenhuma campanha publicada com esses filtros',
                      descricao: 'Mude ou limpe os filtros para ver as outras campanhas.',
                    }
                  : {
                      titulo: 'Nenhuma campanha publicada ainda',
                      descricao:
                        'Os relatórios aparecem aqui depois que a equipe do OTO publica o resultado de uma campanha.',
                    }
              }
              colunas={[
                {
                  titulo: 'Campanha',
                  celula: (campanha) => (
                    <>
                      {campanha.nome}
                      <span className={comum.secundario}>
                        {rotuloDaModalidade(campanha.modalidade)} ·{' '}
                        {rotuloDoTipoDePeriodo(campanha.tipoPeriodo)}
                      </span>
                    </>
                  ),
                },
                {
                  titulo: 'Período',
                  celula: (campanha) =>
                    `${formatarData(campanha.periodoInicio)} a ${formatarData(campanha.periodoFim)}`,
                },
                {
                  titulo: 'Publicação',
                  celula: (campanha) => formatarData(campanha.publicadaEm),
                },
                {
                  titulo: 'Taxa de ocupação',
                  numerica: true,
                  celula: (campanha) => <Taxa campanha={campanha} />,
                },
                {
                  titulo: 'Fluxo de turistas',
                  numerica: true,
                  celula: (campanha) => formatarInteiro(campanha.fluxoTotal),
                },
              ]}
              acoes={(campanha) => (
                <>
                  <Link
                    to={`/resultados/${campanha.campanhaId}`}
                    className={comum.botaoLink}
                    aria-label={`Ver relatório de ${campanha.nome}`}
                  >
                    Ver relatório
                  </Link>
                  <BaixarCsvButton
                    campanhaId={campanha.campanhaId ?? 0}
                    rotuloAcessivel={`Baixar CSV de ${campanha.nome}`}
                  />
                </>
              )}
            />
          </>
        )}
      </Card>
    </>
  )
}
