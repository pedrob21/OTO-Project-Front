import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { listarRespostasDaCampanha } from '@/api/respostas'
import { buscarAcompanhamento, buscarRodada } from '@/api/rodadas'
import { Card } from '@/components/ui/Card'
import { Carregando } from '@/components/ui/Carregando'
import { ErroApi } from '@/components/ui/ErroApi'
import { EstadoVazio } from '@/components/ui/EstadoVazio'
import type { Esquemas } from '@/types/dominio'
import comum from './comum.module.css'
import { FormularioResposta } from './components/FormularioResposta'

/** Mesmas regras da API para o ADMIN: com a pesquisa aberta ou encerrada, até publicar. */
function bloqueioDoAdmin(
  rodada: Esquemas['RodadaResponse'],
  campanhaId: number,
): string | undefined {
  if (rodada.status === 'RASCUNHO') return 'A pesquisa ainda não foi aberta para respostas.'
  const campanha = rodada.campanhas?.find((item) => item.id === campanhaId)
  if (campanha?.publicada) {
    return 'A campanha já foi publicada. Cancele a publicação para mudar as respostas.'
  }
  return undefined
}

/** A equipe do OTO lança a resposta recebida por telefone ou WhatsApp (RF-15). */
export function LancarRespostaPage() {
  const parametros = useParams()
  const id = Number(parametros.id)
  const campanhaId = Number(parametros.campanhaId)
  const estabelecimentoId = Number(parametros.estabelecimentoId)

  const rodada = useQuery({
    queryKey: ['rodadas', id],
    queryFn: ({ signal }) => buscarRodada(id, signal),
  })
  const acompanhamento = useQuery({
    queryKey: ['rodadas', id, 'acompanhamento'],
    queryFn: ({ signal }) => buscarAcompanhamento(id, signal),
  })
  const respostas = useQuery({
    queryKey: ['campanhas', campanhaId, 'respostas'],
    queryFn: ({ signal }) => listarRespostasDaCampanha(campanhaId, signal),
  })

  const campanha = acompanhamento.data?.campanhas?.find((item) => item.campanhaId === campanhaId)
  const estabelecimento = campanha?.estabelecimentos?.find(
    (item) => item.estabelecimentoId === estabelecimentoId,
  )
  const resposta = respostas.data?.find((item) => item.estabelecimentoId === estabelecimentoId)
  const falha = [rodada, acompanhamento, respostas].find((consulta) => consulta.isError)
  const carregando = [rodada, acompanhamento, respostas].some((consulta) => consulta.isPending)

  return (
    <>
      <div className={comum.titulos}>
        <Link to={`/pesquisas/${id}`} className={comum.voltar}>
          Voltar ao acompanhamento
        </Link>
        <p className={comum.sobrelinha}>
          {rodada.data ? `Rodada ${rodada.data.codigo}` : 'Pesquisas com os parceiros'}
        </p>
        <h1 className={comum.titulo}>Lançar resposta</h1>
        <p className={comum.introducao}>
          Para respostas recebidas por telefone ou WhatsApp. Fica registrado quem lançou, e o envio
          substitui a resposta anterior do estabelecimento.
        </p>
      </div>

      {falha ? (
        <ErroApi
          mensagem="Não foi possível carregar os dados da resposta."
          detalhe={falha.error?.message}
          aoTentarNovamente={() => void falha.refetch()}
        />
      ) : carregando ? (
        <Carregando texto="Carregando a resposta" />
      ) : !estabelecimento || !rodada.data ? (
        <EstadoVazio
          titulo="Este estabelecimento não participa desta campanha"
          descricao="Confira no acompanhamento da pesquisa."
        />
      ) : (
        <Card titulo={estabelecimento.nomeFantasia} subtitulo={campanha?.nome}>
          <FormularioResposta
            campanhaId={campanhaId}
            estabelecimentoId={estabelecimentoId}
            atual={resposta && { ...resposta, respostaId: resposta.id }}
            bloqueio={bloqueioDoAdmin(rodada.data, campanhaId)}
            atualizar={[
              ['rodadas', id],
              ['campanhas', campanhaId],
            ]}
          />
        </Card>
      )}
    </>
  )
}
