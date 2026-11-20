import { memo, useEffect, useRef, useState, type Dispatch } from 'react'
import { IconeCheck } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { CampoTexto } from '@/components/ui/CampoTexto'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'
import {
  type CampanhaRascunho,
  type Feriado,
  MODALIDADES,
  OPCOES_DE_MES,
  TIPOS_DE_PERIODO,
  diariasDaCampanha,
  diasDaCampanha,
  nomeDaCampanha,
  nomeSugerido,
  opcoesDeAno,
} from '../campanhas'
import type { AcaoPesquisa } from '../estado'
import { MENSAGEM_REPETIDA, errosDaCampanha, idDoCampo } from '../validacao'
import styles from '../NovaPesquisaPage.module.css'

type CampanhaCamposProps = {
  campanha: CampanhaRascunho
  posicao: number
  feriados: Feriado[]
  carregandoFeriados: boolean
  repetida: boolean
  /** depois da primeira tentativa de envio, todos os erros aparecem */
  mostrarErros: boolean
  /** já incluída na API: não muda mais */
  incluida: boolean
  podeRemover: boolean
  erroApi?: string
  focar: boolean
  /** para montar a lista de anos do campo de mês */
  anoAtual: number
  despachar: Dispatch<AcaoPesquisa>
}

/** Cada campanha só renderiza de novo quando as próprias props mudam. */
export const CampanhaCampos = memo(function CampanhaCampos({
  campanha,
  posicao,
  feriados,
  carregandoFeriados,
  repetida,
  mostrarErros,
  incluida,
  podeRemover,
  erroApi,
  focar,
  anoAtual,
  despachar,
}: CampanhaCamposProps) {
  const [tocados, setTocados] = useState<Record<string, true>>({})
  const tituloRef = useRef<HTMLHeadingElement>(null)
  const { chave } = campanha

  useEffect(() => {
    if (focar) tituloRef.current?.focus()
  }, [focar])

  const erros = errosDaCampanha(campanha, feriados)
  const campoDoPeriodo = campanha.tipoPeriodo === 'MENSAL' ? 'mes' : 'inicio'
  if (repetida && !erros[campoDoPeriodo]) erros[campoDoPeriodo] = MENSAGEM_REPETIDA

  const erroDe = (campo: string) =>
    mostrarErros || tocados[campo] || (campo === campoDoPeriodo && repetida)
      ? erros[campo]
      : undefined
  const tocar = (campo: string) => () =>
    setTocados((atual) => (atual[campo] ? atual : { ...atual, [campo]: true }))
  const mudar = (mudancas: Partial<Omit<CampanhaRascunho, 'chave'>>) =>
    despachar({ tipo: 'campanha', chave, mudancas })
  const id = (campo: string) => idDoCampo(`${chave}.${campo}`)

  const [anoDoMes = '', numeroDoMes = ''] = campanha.mes.split('-')
  const dias = diasDaCampanha(campanha)
  const sugestao = nomeSugerido(campanha, feriados)
  const nomeEditado = campanha.nome !== null && campanha.nome !== sugestao
  const diariasEditadas =
    campanha.diarias !== null && dias !== null && campanha.diarias !== String(dias)
  const opcoesFeriado = [
    { valor: '', rotulo: carregandoFeriados ? 'Carregando feriados…' : 'Escolha o feriado' },
    ...feriados.map(({ codigo, nome }) => ({ valor: codigo, rotulo: nome })),
  ]

  return (
    <li className={styles.campanha} aria-labelledby={`${id('titulo')}`}>
      <div className={styles.topoCampanha}>
        <h3 id={id('titulo')} ref={tituloRef} tabIndex={-1} className={styles.tituloCampanha}>
          Campanha {posicao}
        </h3>
        {incluida ? (
          <Badge variante="publicada" icone={<IconeCheck tamanho={14} />}>
            Incluída
          </Badge>
        ) : (
          podeRemover && (
            <Button
              variante="secundaria"
              className={styles.remover}
              onClick={() => despachar({ tipo: 'remover', chave })}
              aria-label={`Remover a campanha ${posicao}`}
            >
              Remover
            </Button>
          )
        )}
      </div>

      {erroApi && (
        <p role="alert" className={styles.erroCampanha}>
          {erroApi}
        </p>
      )}

      <fieldset className={styles.camposCampanha} disabled={incluida}>
        <legend className={styles.oculto}>Dados da campanha {posicao}</legend>

        <div className={styles.linha}>
          <SegmentedControl
            rotulo="Modalidade"
            rotuloVisivel
            valor={campanha.modalidade}
            opcoes={MODALIDADES}
            aoMudar={(modalidade) => mudar({ modalidade })}
          />
          <SegmentedControl
            rotulo="Período"
            rotuloVisivel
            valor={campanha.tipoPeriodo}
            opcoes={TIPOS_DE_PERIODO}
            aoMudar={(tipoPeriodo) => mudar({ tipoPeriodo })}
          />
        </div>

        {campanha.tipoPeriodo === 'MENSAL' ? (
          <div className={styles.linha}>
            {/* Dois selects em vez de type="month", que o Firefox mostra como texto livre. */}
            <Select
              id={id('mes')}
              className={styles.campoMes}
              variante="campo"
              rotulo="Mês"
              valor={numeroDoMes}
              opcoes={OPCOES_DE_MES}
              aoMudar={(mes) => mudar({ mes: `${anoDoMes}-${mes}` })}
              onBlur={tocar('mes')}
              aria-invalid={erroDe('mes') ? true : undefined}
              aria-describedby={erroDe('mes') ? `${id('mes')}-erro` : undefined}
            />
            <Select
              id={id('ano')}
              className={styles.campoAno}
              variante="campo"
              rotulo="Ano"
              valor={anoDoMes}
              opcoes={opcoesDeAno(anoAtual, Number(anoDoMes) || undefined)}
              aoMudar={(ano) => mudar({ mes: `${ano}-${numeroDoMes}` })}
              onBlur={tocar('mes')}
            />
            {erroDe('mes') && (
              <p id={`${id('mes')}-erro`} className={styles.erroSolto}>
                {erroDe('mes')}
              </p>
            )}
          </div>
        ) : (
          <div className={styles.linha}>
            <Select
              id={id('feriado')}
              className={styles.campoFeriado}
              variante="campo"
              rotulo="Qual feriado"
              valor={campanha.feriadoCodigo}
              opcoes={opcoesFeriado}
              aoMudar={(feriadoCodigo) => mudar({ feriadoCodigo })}
              onBlur={tocar('feriado')}
              aria-invalid={erroDe('feriado') ? true : undefined}
              aria-describedby={erroDe('feriado') ? `${id('feriado')}-erro` : undefined}
            />
            <CampoTexto
              id={id('inicio')}
              className={styles.campoData}
              rotulo="Primeiro dia"
              type="date"
              value={campanha.inicio}
              onChange={(evento) => mudar({ inicio: evento.target.value })}
              onBlur={tocar('inicio')}
              erro={erroDe('inicio')}
            />
            <CampoTexto
              id={id('fim')}
              className={styles.campoData}
              rotulo="Último dia"
              type="date"
              value={campanha.fim}
              min={campanha.inicio || undefined}
              onChange={(evento) => mudar({ fim: evento.target.value })}
              onBlur={tocar('fim')}
              erro={erroDe('fim')}
            />
            {erroDe('feriado') && (
              <p id={`${id('feriado')}-erro`} className={styles.erroSolto}>
                {erroDe('feriado')}
              </p>
            )}
          </div>
        )}

        <div className={styles.linha}>
          <div className={styles.campoDiarias}>
            <CampoTexto
              id={id('diarias')}
              rotulo="Diárias"
              type="number"
              inputMode="numeric"
              min={1}
              max={dias ?? undefined}
              value={diariasDaCampanha(campanha)}
              onChange={(evento) => mudar({ diarias: evento.target.value })}
              onBlur={tocar('diarias')}
              erro={erroDe('diarias')}
              ajuda={dias ? `O período tem ${dias} ${dias === 1 ? 'dia' : 'dias'}.` : undefined}
            />
            {diariasEditadas && (
              <button
                type="button"
                className={styles.usarSugestao}
                onClick={() => mudar({ diarias: null })}
              >
                Usar {dias}
              </button>
            )}
          </div>
          <div className={styles.campoNome}>
            <CampoTexto
              id={id('nome')}
              rotulo="Nome da campanha"
              value={nomeDaCampanha(campanha, feriados)}
              maxLength={150}
              onChange={(evento) => mudar({ nome: evento.target.value })}
              onBlur={tocar('nome')}
              erro={erroDe('nome')}
              ajuda={nomeEditado ? undefined : 'Sugerido a partir da modalidade e do período.'}
            />
            {nomeEditado && sugestao && (
              <button
                type="button"
                className={styles.usarSugestao}
                onClick={() => mudar({ nome: null })}
              >
                Usar “{sugestao}”
              </button>
            )}
          </div>
        </div>
      </fieldset>
    </li>
  )
})
