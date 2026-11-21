import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { abrirRodada, encerrarRodada, prorrogarRodada, reabrirRodada } from '@/api/rodadas'
import { Button } from '@/components/ui/Button'
import { CampoTexto } from '@/components/ui/CampoTexto'
import type { Esquemas } from '@/types/dominio'
import comum from '../comum.module.css'
import { erroDoPrazo } from '../rodadas'
import styles from './AcoesDaRodada.module.css'

type Pedido =
  | { tipo: 'abrir'; prazo: string }
  | { tipo: 'prorrogar'; prazo: string }
  | { tipo: 'encerrar' }
  | { tipo: 'reabrir'; prazo: string }

const SUCESSO: Record<Pedido['tipo'], string> = {
  abrir: 'Pesquisa aberta para respostas.',
  prorrogar: 'Prazo de resposta prorrogado.',
  encerrar: 'Pesquisa encerrada. A equipe ainda pode lançar respostas até publicar.',
  reabrir: 'Pesquisa reaberta para respostas.',
}

const ID_ENCERRAR = 'encerrar-pesquisa'
const ID_SEM_REABRIR = 'motivo-sem-reabrir'
const ID_CONFIRMACAO = 'confirmar-encerramento'

function executar(rodadaId: number, pedido: Pedido) {
  switch (pedido.tipo) {
    case 'abrir':
      return abrirRodada(rodadaId, { prazoResposta: pedido.prazo })
    case 'prorrogar':
      return prorrogarRodada(rodadaId, { prazoResposta: pedido.prazo })
    case 'encerrar':
      return encerrarRodada(rodadaId)
    case 'reabrir':
      return reabrirRodada(rodadaId, { prazoResposta: pedido.prazo })
  }
}

type AcoesDaRodadaProps = {
  rodada: Esquemas['RodadaResponse']
  /** "2026-11-16" */
  hoje: string
}

/** As ações que a API aceita em cada situação: abrir, prorrogar, encerrar e reabrir. */
export function AcoesDaRodada({ rodada, hoje }: AcoesDaRodadaProps) {
  const queryClient = useQueryClient()
  const [prazo, setPrazo] = useState('')
  const [tentou, setTentou] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const confirmacaoRef = useRef<HTMLDivElement>(null)

  const acao = useMutation({
    mutationFn: (pedido: Pedido) => executar(rodada.id ?? 0, pedido),
    onMutate: () => setMensagem(''),
    onSuccess: async (_, pedido) => {
      setMensagem(SUCESSO[pedido.tipo])
      setConfirmando(false)
      setPrazo('')
      setTentou(false)
      await queryClient.invalidateQueries({ queryKey: ['rodadas'] })
    },
  })

  useEffect(() => {
    if (confirmando) confirmacaoRef.current?.focus()
  }, [confirmando])

  const status = rodada.status ?? 'RASCUNHO'
  const temPublicada = (rodada.campanhas ?? []).some((campanha) => campanha.publicada)
  const erroPrazo = erroDoPrazo(prazo, status === 'RASCUNHO' ? hoje : rodada.dataAbertura)

  function enviarPrazo(evento: FormEvent) {
    evento.preventDefault()
    if (acao.isPending) return
    setTentou(true)
    if (erroPrazo) return
    const tipo = status === 'RASCUNHO' ? 'abrir' : status === 'ABERTA' ? 'prorrogar' : 'reabrir'
    acao.mutate({ tipo, prazo })
  }

  function cancelarEncerramento() {
    setConfirmando(false)
    document.getElementById(ID_ENCERRAR)?.focus()
  }

  const semReabrir = status === 'ENCERRADA' && temPublicada
  const botaoDoPrazo = {
    RASCUNHO: 'Abrir pesquisa',
    ABERTA: 'Prorrogar prazo',
    ENCERRADA: 'Reabrir pesquisa',
  }[status]

  return (
    <div className={styles.acoes}>
      <form className={comum.acoes} onSubmit={enviarPrazo} noValidate>
        <CampoTexto
          className={styles.campoPrazo}
          rotulo={status === 'RASCUNHO' ? 'Prazo de resposta' : 'Novo prazo de resposta'}
          type="date"
          min={status === 'RASCUNHO' ? hoje : rodada.dataAbertura}
          value={prazo}
          disabled={semReabrir}
          onChange={(evento) => setPrazo(evento.target.value)}
          erro={tentou ? erroPrazo : undefined}
        />
        <Button
          type="submit"
          variante={status === 'ABERTA' ? 'secundaria' : 'primaria'}
          disabled={acao.isPending || semReabrir}
          aria-describedby={semReabrir ? ID_SEM_REABRIR : undefined}
        >
          {botaoDoPrazo}
        </Button>
        {status === 'ABERTA' && (
          <Button
            id={ID_ENCERRAR}
            variante="secundaria"
            disabled={acao.isPending}
            aria-expanded={confirmando}
            aria-controls={confirmando ? ID_CONFIRMACAO : undefined}
            onClick={() => setConfirmando(true)}
          >
            Encerrar pesquisa
          </Button>
        )}
      </form>

      {semReabrir && (
        <p id={ID_SEM_REABRIR} className={styles.motivo}>
          Há campanha publicada. Cancele a publicação antes de reabrir a pesquisa.
        </p>
      )}

      {confirmando && (
        <div
          id={ID_CONFIRMACAO}
          ref={confirmacaoRef}
          tabIndex={-1}
          role="group"
          aria-labelledby="titulo-encerrar"
          aria-describedby="texto-encerrar"
          className={comum.confirmacao}
        >
          <h3 id="titulo-encerrar" className={comum.tituloConfirmacao}>
            Encerrar a pesquisa {rodada.codigo}?
          </h3>
          <p id="texto-encerrar">
            Os parceiros não poderão mais responder. A equipe do OTO ainda pode lançar respostas até
            publicar, e a pesquisa pode ser reaberta enquanto nenhuma campanha for publicada.
          </p>
          <div className={comum.acoes}>
            <Button disabled={acao.isPending} onClick={() => acao.mutate({ tipo: 'encerrar' })}>
              {acao.isPending ? 'Encerrando…' : 'Confirmar encerramento'}
            </Button>
            <Button variante="secundaria" onClick={cancelarEncerramento}>
              Voltar
            </Button>
          </div>
        </div>
      )}

      {acao.isError && (
        <div role="alert" className={comum.alerta}>
          {acao.error.message}
        </div>
      )}
      <p role="status" className={comum.sucesso}>
        {mensagem}
      </p>
    </div>
  )
}
