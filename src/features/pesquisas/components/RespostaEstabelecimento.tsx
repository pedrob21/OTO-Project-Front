import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, memo, useId, useRef, useState } from 'react'
import { ErroRequisicao } from '@/api/erros'
import { buscarHistoricoDaResposta, enviarResposta } from '@/api/respostas'
import { IconeCheck, IconeRelogio } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { CampoTexto } from '@/components/ui/CampoTexto'
import { formatarDataHora, formatarDecimal } from '@/lib/formatos'
import type { Esquemas } from '@/types/dominio'
import {
  autorDaVersao,
  errosDaResposta,
  faixaDaTaxa,
  lerNumero,
  paraCampo,
  paraRespostaRequest,
  textoDaDiaria,
} from '../respostas'
import styles from '../ResponderPesquisaPage.module.css'

type RespostaEstabelecimentoProps = {
  pendencia: Esquemas['PendenciaResponse']
  faixas: Esquemas['FaixaRef'][]
  usuarioId: number | undefined
}

function Historico({
  respostaId,
  usuarioId,
}: {
  respostaId: number
  usuarioId: number | undefined
}) {
  const historico = useQuery({
    queryKey: ['respostas', respostaId, 'historico'],
    queryFn: ({ signal }) => buscarHistoricoDaResposta(respostaId, signal),
  })

  if (historico.isPending) return <p className={styles.notaVersao}>Carregando as versões…</p>
  if (historico.isError) {
    return <p className={styles.notaVersao}>Não foi possível carregar as versões anteriores.</p>
  }

  return (
    <ol className={styles.versoes}>
      {historico.data.map((versao, indice) => (
        <li key={versao.versao}>
          <span className={styles.numeroVersao}>
            Versão {versao.versao}
            {indice === 0 && ' (atual)'}
          </span>
          <span>
            {formatarDecimal(versao.taxaOcupacao)}% de ocupação, {textoDaDiaria(versao.diariaMedia)}
          </span>
          <span className={styles.autorVersao}>
            {formatarDataHora(versao.enviadoEm)}, {autorDaVersao(versao.enviadoPor, usuarioId)}
          </span>
        </li>
      ))}
    </ol>
  )
}

/** Um estabelecimento numa campanha: envia a resposta ou corrige a última. */
export const RespostaEstabelecimento = memo(function RespostaEstabelecimento({
  pendencia,
  faixas,
  usuarioId,
}: RespostaEstabelecimentoProps) {
  const { campanhaId = 0, estabelecimentoId = 0 } = pendencia
  // Depois do prazo mais a tolerância, a API recusa o envio do parceiro: o formulário fica só em leitura.
  const encerrada = pendencia.aceitaResposta === false
  const queryClient = useQueryClient()
  const [taxa, setTaxa] = useState(() => paraCampo(pendencia.taxaOcupacao))
  const [diaria, setDiaria] = useState(() => paraCampo(pendencia.diariaMedia))
  const [tocados, setTocados] = useState<{ taxa?: true; diaria?: true }>({})
  const [tentouEnviar, setTentouEnviar] = useState(false)
  const [historicoAberto, setHistoricoAberto] = useState(false)
  const taxaRef = useRef<HTMLInputElement>(null)
  const diariaRef = useRef<HTMLInputElement>(null)
  const id = useId()

  const envio = useMutation({
    mutationFn: () =>
      enviarResposta(campanhaId, estabelecimentoId, paraRespostaRequest(taxa, diaria)),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pendencias'] }),
        queryClient.invalidateQueries({ queryKey: ['respostas'] }),
      ]),
  })

  const erros = errosDaResposta(taxa, diaria)
  const camposDaApi = envio.error instanceof ErroRequisicao ? envio.error.campos : {}
  const erroDaTaxa =
    camposDaApi.taxaOcupacao ?? (tentouEnviar || tocados.taxa ? erros.taxa : undefined)
  const erroDaDiaria =
    camposDaApi.diariaMedia ?? (tentouEnviar || tocados.diaria ? erros.diaria : undefined)
  const erroGeral =
    envio.error && Object.keys(camposDaApi).length === 0 ? envio.error.message : undefined

  // A última versão salva: a que acabou de ser enviada, ou a que veio da lista, a mais nova.
  // Usar a recém-enviada evita que o botão volte a ficar ativo antes de a lista ser recarregada.
  const daLista = pendencia.respondida
    ? {
        id: pendencia.respostaId,
        taxaOcupacao: pendencia.taxaOcupacao,
        diariaMedia: pendencia.diariaMedia,
        versao: pendencia.versao,
        enviadoEm: pendencia.enviadoEm,
      }
    : undefined
  const ultima =
    envio.data && (envio.data.versao ?? 0) >= (daLista?.versao ?? 0) ? envio.data : daLista
  const respondida = ultima !== undefined
  const respostaId = ultima?.id

  const valorTaxa = lerNumero(taxa)
  const faixa = erros.taxa ? undefined : faixaDaTaxa(faixas, valorTaxa)
  const alterado =
    valorTaxa !== (ultima?.taxaOcupacao ?? null) ||
    (lerNumero(diaria) ?? null) !== (ultima?.diariaMedia ?? null)
  const podeEnviar = !encerrada && !envio.isPending && (!respondida || alterado)

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    setTentouEnviar(true)
    if (encerrada) return
    if (erros.taxa) return taxaRef.current?.focus()
    if (erros.diaria) return diariaRef.current?.focus()
    if (podeEnviar) envio.mutate()
  }

  const rotuloDoBotao = envio.isPending
    ? 'Enviando…'
    : respondida
      ? 'Salvar correção'
      : 'Enviar resposta'

  return (
    <li className={styles.estabelecimento} aria-labelledby={`${id}-nome`}>
      <div className={styles.topo}>
        <h3 id={`${id}-nome`} className={styles.nome}>
          {pendencia.nomeFantasia}
        </h3>
        {respondida ? (
          <Badge variante="publicada" icone={<IconeCheck tamanho={14} />}>
            Enviada
          </Badge>
        ) : encerrada ? (
          <Badge variante="inativa">Sem resposta</Badge>
        ) : (
          <Badge variante="aberta" icone={<IconeRelogio tamanho={14} />}>
            Pendente
          </Badge>
        )}
      </div>
      {respondida && (
        <p className={styles.meta}>
          Versão {ultima?.versao}, enviada em {formatarDataHora(ultima?.enviadoEm)}.
          {encerrada ? '' : ' Você pode corrigir enquanto a pesquisa estiver aberta.'}
        </p>
      )}

      <form className={styles.formulario} onSubmit={enviar} noValidate>
        <div className={styles.campoTaxa}>
          <CampoTexto
            ref={taxaRef}
            id={`${id}-taxa`}
            rotulo="Taxa de ocupação (%)"
            inputMode="decimal"
            autoComplete="off"
            value={taxa}
            disabled={encerrada}
            onChange={(evento) => setTaxa(evento.target.value)}
            onBlur={() => setTocados((atual) => ({ ...atual, taxa: true }))}
            erro={erroDaTaxa}
          />
          <div className={styles.ocupacao} aria-hidden="true">
            <span
              className={styles.ocupacaoPreenchida}
              style={{ width: `${faixa ? Math.min(valorTaxa ?? 0, 100) : 0}%` }}
            />
          </div>
          <p className={styles.faixa} aria-live="polite">
            {faixa ? `Faixa ${faixa.nome?.toLowerCase()} no painel` : ' '}
          </p>
        </div>

        <CampoTexto
          ref={diariaRef}
          id={`${id}-diaria`}
          className={styles.campoDiaria}
          rotulo="Diária média (R$)"
          inputMode="decimal"
          autoComplete="off"
          value={diaria}
          disabled={encerrada}
          onChange={(evento) => setDiaria(evento.target.value)}
          onBlur={() => setTocados((atual) => ({ ...atual, diaria: true }))}
          erro={erroDaDiaria}
          ajuda="Opcional. Apartamento standard para 2 adultos e 1 criança."
        />

        <Button type="submit" className={styles.enviar} disabled={!podeEnviar}>
          {rotuloDoBotao}
        </Button>
      </form>

      {erroGeral && (
        <p role="alert" className={styles.erroEnvio}>
          {erroGeral}
        </p>
      )}
      <p role="status" className={styles.confirmacao}>
        {envio.isSuccess && !alterado
          ? `Resposta salva como versão ${envio.data.versao}, em ${formatarDataHora(envio.data.enviadoEm)}.`
          : ''}
      </p>

      {respostaId !== undefined && (ultima?.versao ?? 0) > 1 && (
        <div className={styles.historico}>
          <button
            type="button"
            className={styles.alternarHistorico}
            aria-expanded={historicoAberto}
            onClick={() => setHistoricoAberto((aberto) => !aberto)}
          >
            {historicoAberto ? 'Esconder versões anteriores' : 'Ver versões anteriores'}
          </button>
          {historicoAberto && <Historico respostaId={respostaId} usuarioId={usuarioId} />}
        </div>
      )}
    </li>
  )
})
