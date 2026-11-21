import { type QueryKey, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useId, useState } from 'react'
import { buscarHistoricoDaResposta, enviarResposta } from '@/api/respostas'
import { ErroRequisicao } from '@/api/erros'
import { Button } from '@/components/ui/Button'
import { CampoTexto } from '@/components/ui/CampoTexto'
import { Tabela } from '@/components/ui/Tabela'
import { formatarData, formatarMoeda, formatarPercentual } from '@/lib/formatos'
import comum from '../comum.module.css'
import { paraCampo } from '../respostas'
import { type CamposResposta, validarResposta } from '../resposta'
import styles from './FormularioResposta.module.css'

export type RespostaAtual = {
  respostaId?: number
  taxaOcupacao?: number
  diariaMedia?: number
  versao?: number
  enviadoEm?: string
}

type FormularioRespostaProps = {
  campanhaId: number
  estabelecimentoId: number
  /** a última resposta enviada, se houver: preenche o formulário */
  atual?: RespostaAtual
  /** motivo para não aceitar resposta; sem ele, o formulário fica ativo */
  bloqueio?: string
  /** consultas que mudam com o envio, como a lista de pendências ou o acompanhamento */
  atualizar: QueryKey[]
}

function Historico({ respostaId }: { respostaId: number }) {
  const [aberto, setAberto] = useState(false)
  const historico = useQuery({
    queryKey: ['respostas', respostaId, 'historico'],
    queryFn: ({ signal }) => buscarHistoricoDaResposta(respostaId, signal),
    enabled: aberto,
  })

  return (
    <details
      className={styles.historico}
      onToggle={(evento) => setAberto(evento.currentTarget.open)}
    >
      <summary>Ver todas as versões enviadas</summary>
      {historico.isPending && aberto && <p role="status">Carregando as versões</p>}
      {historico.isError && <p role="alert">Não foi possível carregar as versões.</p>}
      {historico.data && (
        <Tabela
          legenda="Versões enviadas"
          linhas={historico.data}
          chave={(versao) => versao.versao ?? 0}
          vazio={{ titulo: 'Nenhuma versão enviada' }}
          colunas={[
            { titulo: 'Versão', celula: (versao) => versao.versao },
            {
              titulo: 'Taxa de ocupação',
              numerica: true,
              celula: (versao) => formatarPercentual(versao.taxaOcupacao, 2),
            },
            {
              titulo: 'Diária média',
              numerica: true,
              celula: (versao) => formatarMoeda(versao.diariaMedia, 2),
            },
            { titulo: 'Enviada em', celula: (versao) => formatarData(versao.enviadoEm) },
          ]}
        />
      )}
    </details>
  )
}

/**
 * Resposta de um estabelecimento a uma campanha. Serve ao parceiro e à equipe do OTO.
 * Se a API recusar (pesquisa fechada, por exemplo), o que foi digitado fica no formulário.
 */
export function FormularioResposta({
  campanhaId,
  estabelecimentoId,
  atual,
  bloqueio,
  atualizar,
}: FormularioRespostaProps) {
  const queryClient = useQueryClient()
  const id = useId()
  const [campos, setCampos] = useState<CamposResposta>(() => ({
    taxaOcupacao: paraCampo(atual?.taxaOcupacao),
    diariaMedia: paraCampo(atual?.diariaMedia),
  }))
  const [tentou, setTentou] = useState(false)

  const envio = useMutation({
    mutationFn: (dados: NonNullable<ReturnType<typeof validarResposta>['dados']>) =>
      enviarResposta(campanhaId, estabelecimentoId, dados),
    onSuccess: () =>
      Promise.all(atualizar.map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  })

  const { erros, dados } = validarResposta(campos)
  const camposDaApi = envio.error instanceof ErroRequisicao ? envio.error.campos : {}
  const erroDe = (campo: keyof CamposResposta) =>
    (tentou ? erros[campo] : undefined) ?? camposDaApi[campo]

  function mudar(campo: keyof CamposResposta, valor: string) {
    setCampos((anteriores) => ({ ...anteriores, [campo]: valor }))
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (envio.isPending) return
    setTentou(true)
    if (dados) envio.mutate(dados)
  }

  const enviada = envio.data
  const ultima = enviada
    ? { ...enviada, respostaId: enviada.id }
    : atual?.versao !== undefined
      ? atual
      : undefined

  return (
    <form className={styles.formulario} onSubmit={enviar} noValidate>
      {ultima && (
        <div className={styles.ultima}>
          <p>
            <strong>Última resposta enviada: versão {ultima.versao}</strong>
            {ultima.enviadoEm && ` em ${formatarData(ultima.enviadoEm)}`}
          </p>
          <p>
            Taxa de ocupação {formatarPercentual(ultima.taxaOcupacao, 2)} · diária média{' '}
            {formatarMoeda(ultima.diariaMedia, 2)}
          </p>
          <p className={comum.secundario}>
            Um novo envio substitui este. As versões anteriores ficam guardadas.
          </p>
          {ultima.respostaId !== undefined && <Historico respostaId={ultima.respostaId} />}
        </div>
      )}

      {bloqueio && (
        <p id={`${id}-bloqueio`} className={styles.bloqueio}>
          {bloqueio}
        </p>
      )}

      <fieldset className={styles.campos} disabled={bloqueio !== undefined}>
        <legend className={comum.oculto}>Resposta</legend>
        <CampoTexto
          id={`${id}-taxa`}
          rotulo="Taxa de ocupação (%)"
          inputMode="decimal"
          autoComplete="off"
          value={campos.taxaOcupacao}
          onChange={(evento) => mudar('taxaOcupacao', evento.target.value)}
          erro={erroDe('taxaOcupacao')}
          ajuda="De 0 a 100, com até duas casas decimais. Ex.: 72,5"
        />
        <CampoTexto
          id={`${id}-diaria`}
          rotulo="Diária média (R$, opcional)"
          inputMode="decimal"
          autoComplete="off"
          value={campos.diariaMedia}
          onChange={(evento) => mudar('diariaMedia', evento.target.value)}
          erro={erroDe('diariaMedia')}
          ajuda="Apartamento standard para 2 adultos e 1 criança de até 12 anos. Ex.: 410,00"
        />
      </fieldset>

      {envio.isError && (
        <div role="alert" className={comum.alerta}>
          <strong>Não foi possível enviar a resposta.</strong>
          <span>{envio.error.message}</span>
          <span>O que você digitou continua no formulário.</span>
        </div>
      )}

      <div className={comum.acoes}>
        <Button
          type="submit"
          disabled={envio.isPending || bloqueio !== undefined}
          aria-describedby={bloqueio ? `${id}-bloqueio` : undefined}
        >
          {envio.isPending ? 'Enviando…' : ultima ? 'Enviar correção' : 'Enviar resposta'}
        </Button>
      </div>
      <p role="status" className={comum.sucesso}>
        {enviada && !envio.isPending
          ? `Resposta enviada: versão ${enviada.versao} registrada.`
          : ''}
      </p>
    </form>
  )
}
