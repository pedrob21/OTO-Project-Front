import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { ErroRequisicao } from '@/api/erros'
import { buscarReferencias } from '@/api/referencias'
import { listarRodadas } from '@/api/rodadas'
import { IconeRelogio } from '@/components/icons'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CampoTexto } from '@/components/ui/CampoTexto'
import { hojeLocal, textoDoPrazo, textoDosDias } from '@/lib/datas'
import { formatarData } from '@/lib/formatos'
import { type Feriado, diariasDaCampanha, nomeDaCampanha } from './campanhas'
import { sugerirCodigo } from './codigo'
import { CampanhaCampos } from './components/CampanhaCampos'
import { ErroDeEnvio, type Etapa, type Salvo, enviarPesquisa, textoDaEtapa } from './envio'
import { estadoInicial, reduzirPesquisa } from './estado'
import styles from './NovaPesquisaPage.module.css'
import { campanhasRepetidas, errosDaPesquisa, idDoCampo } from './validacao'

const ROTULOS: Record<string, string> = {
  codigo: 'Código',
  titulo: 'Título',
  prazo: 'Prazo de resposta',
  campanhas: 'Campanhas',
  mes: 'mês',
  feriado: 'feriado',
  inicio: 'primeiro dia',
  fim: 'último dia',
  diarias: 'diárias',
  nome: 'nome',
}

const ID_ADICIONAR = 'adicionar-campanha'

function diarias(quantidade: string): string {
  return quantidade ? `${quantidade} ${quantidade === '1' ? 'diária' : 'diárias'}` : '—'
}

function focarCampo(campo: string) {
  document.getElementById(campo === 'campanhas' ? ID_ADICIONAR : idDoCampo(campo))?.focus()
}

type NovaPesquisaPageProps = {
  /** "2026-11-16". Fixa a data nos testes. */
  hoje?: string
}

export function NovaPesquisaPage({ hoje: hojeFixo }: NovaPesquisaPageProps) {
  const [hoje] = useState(() => hojeFixo ?? hojeLocal())
  const [estado, despachar] = useReducer(reduzirPesquisa, hoje, estadoInicial)
  const [tentouEnviar, setTentouEnviar] = useState(false)
  const [tocados, setTocados] = useState<Record<string, true>>({})
  const [salvo, setSalvo] = useState<Salvo>({ campanhas: {} })
  const [etapa, setEtapa] = useState<Etapa | null>(null)
  const [pedidosDeFoco, setPedidosDeFoco] = useState(0)
  const resumoRef = useRef<HTMLDivElement>(null)
  const sucessoRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const referencias = useQuery({
    queryKey: ['referencias'],
    queryFn: ({ signal }) => buscarReferencias(signal),
    staleTime: Infinity,
  })
  const rodadas = useQuery({
    queryKey: ['rodadas'],
    queryFn: ({ signal }) => listarRodadas(undefined, signal),
  })

  const feriados = useMemo<Feriado[]>(
    () =>
      (referencias.data?.feriados ?? [])
        .toSorted((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
        .map(({ codigo = '', nome = '' }) => ({ codigo, nome })),
    [referencias.data],
  )
  const codigoSugerido = useMemo(
    () => (rodadas.data ? sugerirCodigo(rodadas.data, hoje) : ''),
    [rodadas.data, hoje],
  )
  const codigo = estado.codigo ?? codigoSugerido
  const { titulo, prazo, campanhas } = estado
  const erros = useMemo(
    () => errosDaPesquisa({ codigo, titulo, prazo, campanhas }, feriados, hoje),
    [codigo, titulo, prazo, campanhas, feriados, hoje],
  )
  const repetidas = useMemo(() => campanhasRepetidas(campanhas), [campanhas])

  const envio = useMutation({
    mutationFn: () =>
      enviarPesquisa({
        codigo,
        titulo,
        prazo,
        campanhas,
        feriados,
        salvo,
        aoAvancar: setEtapa,
        aoSalvar: setSalvo,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rodadas'] }),
    onSettled: () => setEtapa(null),
  })

  useEffect(() => {
    if (pedidosDeFoco > 0) resumoRef.current?.focus()
  }, [pedidosDeFoco])
  useEffect(() => {
    if (envio.isSuccess) sucessoRef.current?.focus()
  }, [envio.isSuccess])

  const listaDeErros = Object.entries(erros)
  const posicaoDa = (chave: number) => campanhas.findIndex((item) => item.chave === chave) + 1
  const rotuloDoErro = (campo: string) => {
    const [chave, nome] = campo.split('.')
    return nome ? `Campanha ${posicaoDa(Number(chave))}, ${ROTULOS[nome]}` : ROTULOS[campo]
  }

  const falha = envio.error instanceof ErroDeEnvio ? envio.error : null
  const causa = falha?.causa instanceof ErroRequisicao ? falha.causa : null
  const camposDaApi = falha?.etapa.tipo === 'pesquisa' ? (causa?.campos ?? {}) : {}
  const erroDaCampanha = falha?.etapa.tipo === 'campanha' ? falha.etapa.chave : null
  const pesquisaCriada = salvo.rodada !== undefined
  const incluidas = Object.keys(salvo.campanhas).length

  const erroDe = (campo: string) =>
    camposDaApi[campo] ?? (tentouEnviar || tocados[campo] ? erros[campo] : undefined)
  const tocar = (campo: string) => () =>
    setTocados((atual) => (atual[campo] ? atual : { ...atual, [campo]: true }))

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (envio.isPending) return
    setTentouEnviar(true)
    if (listaDeErros.length > 0) {
      setPedidosDeFoco((atual) => atual + 1)
      return
    }
    envio.mutate()
  }

  function recomecar() {
    despachar({ tipo: 'reiniciar', hoje })
    setSalvo({ campanhas: {} })
    setTentouEnviar(false)
    setTocados({})
    envio.reset()
  }

  const cabecalho = (
    <div className={styles.titulos}>
      <p className={styles.sobrelinha}>Pesquisas com os parceiros</p>
      <h1 className={styles.titulo}>Nova pesquisa</h1>
      <p className={styles.introducao}>
        Escolha os períodos que os meios de hospedagem vão informar e até quando podem responder.
      </p>
    </div>
  )

  if (envio.isSuccess) {
    const prazoAberto = envio.data.prazoResposta ?? prazo
    return (
      <>
        {cabecalho}
        <div ref={sucessoRef} tabIndex={-1} className={styles.sucesso}>
          <Card
            titulo={`Pesquisa ${envio.data.codigo ?? codigo} aberta para respostas`}
            subtitulo={`Os meios de hospedagem podem responder até ${formatarData(prazoAberto)} (${textoDosDias(prazoAberto, hoje)}).`}
          >
            <ul className={styles.resumoCampanhas}>
              {campanhas.map((campanha) => (
                <li key={campanha.chave}>
                  <span>{nomeDaCampanha(campanha, feriados)}</span>
                  <span className={styles.diariasResumo}>
                    {diarias(diariasDaCampanha(campanha))}
                  </span>
                </li>
              ))}
            </ul>
            <div className={styles.acoesSucesso}>
              <Button onClick={() => navigate('/')}>Ir para o painel</Button>
              <Button variante="secundaria" onClick={recomecar}>
                Criar outra pesquisa
              </Button>
            </div>
          </Card>
        </div>
      </>
    )
  }

  return (
    <>
      {cabecalho}

      <form className={styles.grade} onSubmit={enviar} noValidate>
        {tentouEnviar && listaDeErros.length > 0 && (
          <div
            ref={resumoRef}
            tabIndex={-1}
            className={styles.resumoErros}
            aria-labelledby="resumo-erros"
          >
            <h2 id="resumo-erros" className={styles.tituloResumo}>
              {listaDeErros.length === 1
                ? 'Revise 1 campo antes de abrir a pesquisa'
                : `Revise ${listaDeErros.length} campos antes de abrir a pesquisa`}
            </h2>
            <ul className={styles.listaErros}>
              {listaDeErros.map(([campo, mensagem]) => (
                <li key={campo}>
                  <a
                    href={`#${campo === 'campanhas' ? ID_ADICIONAR : idDoCampo(campo)}`}
                    onClick={(evento) => {
                      evento.preventDefault()
                      focarCampo(campo)
                    }}
                  >
                    {rotuloDoErro(campo)}: {mensagem}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.principal}>
          <Card
            titulo="Pesquisa"
            subtitulo={
              pesquisaCriada
                ? `A pesquisa ${salvo.rodada?.codigo} já foi criada e não muda mais nesta tela.`
                : 'Identifica o envio aos parceiros no painel e no acompanhamento.'
            }
          >
            <fieldset className={styles.camposPesquisa} disabled={pesquisaCriada}>
              <legend className={styles.oculto}>Dados da pesquisa</legend>
              <CampoTexto
                id={idDoCampo('codigo')}
                rotulo="Código"
                value={codigo}
                maxLength={20}
                placeholder={rodadas.isPending ? 'Carregando…' : '018/26'}
                onChange={(evento) =>
                  despachar({ tipo: 'pesquisa', campo: 'codigo', valor: evento.target.value })
                }
                onBlur={tocar('codigo')}
                erro={erroDe('codigo')}
                ajuda={
                  estado.codigo === null && codigoSugerido ? 'Próximo número do ano.' : undefined
                }
              />
              <CampoTexto
                id={idDoCampo('titulo')}
                rotulo="Título"
                value={titulo}
                maxLength={200}
                placeholder="Consolidada de outubro e expectativa do feriado"
                onChange={(evento) =>
                  despachar({ tipo: 'pesquisa', campo: 'titulo', valor: evento.target.value })
                }
                onBlur={tocar('titulo')}
                erro={erroDe('titulo')}
              />
            </fieldset>
          </Card>

          <Card
            titulo="Campanhas"
            subtitulo="Cada campanha é um período que os meios de hospedagem vão informar: um mês ou um feriado."
            acao={
              <Button
                id={ID_ADICIONAR}
                variante="secundaria"
                onClick={() => despachar({ tipo: 'adicionar', hoje })}
              >
                Adicionar campanha
              </Button>
            }
          >
            {referencias.isError && (
              <p role="alert" className={styles.avisoReferencias}>
                Não foi possível carregar a lista de feriados.{' '}
                <button
                  type="button"
                  className={styles.usarSugestao}
                  onClick={() => void referencias.refetch()}
                >
                  Tentar de novo
                </button>
              </p>
            )}
            {campanhas.length === 0 ? (
              <p className={styles.semCampanhas}>
                {erroDe('campanhas') ?? 'Nenhuma campanha ainda. Adicione ao menos uma.'}
              </p>
            ) : (
              <ul className={styles.campanhas}>
                {campanhas.map((campanha, indice) => (
                  <CampanhaCampos
                    key={campanha.chave}
                    campanha={campanha}
                    posicao={indice + 1}
                    feriados={feriados}
                    carregandoFeriados={referencias.isPending}
                    repetida={repetidas.has(campanha.chave)}
                    mostrarErros={tentouEnviar}
                    incluida={salvo.campanhas[campanha.chave] !== undefined}
                    podeRemover={campanhas.length > 1}
                    erroApi={erroDaCampanha === campanha.chave ? falha?.message : undefined}
                    focar={estado.adicionada === campanha.chave}
                    anoAtual={Number(hoje.slice(0, 4))}
                    despachar={despachar}
                  />
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside className={styles.lateral} aria-label="Prévia e envio">
          <Card
            titulo="Prévia no painel"
            subtitulo="Assim a pesquisa aparece para a equipe do OTO."
          >
            <div className={styles.previa}>
              <div className={styles.situacao}>
                <Badge variante="aberta" icone={<IconeRelogio tamanho={14} />}>
                  Aberta
                </Badge>
                <span className={styles.codigoPrevia}>Rodada {codigo || '—'}</span>
              </div>
              <p
                className={titulo ? styles.tituloPrevia : `${styles.tituloPrevia} ${styles.vazio}`}
              >
                {titulo || 'Título da pesquisa'}
              </p>
              <p className={styles.prazoPrevia}>{textoDoPrazo(prazo || undefined, hoje)}</p>
              <ul className={styles.campanhasPrevia}>
                {campanhas.map((campanha, indice) => (
                  <li key={campanha.chave}>
                    <span>{nomeDaCampanha(campanha, feriados) || `Campanha ${indice + 1}`}</span>
                    <span className={styles.diariasResumo}>
                      {diarias(diariasDaCampanha(campanha))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.envio}>
              <CampoTexto
                id={idDoCampo('prazo')}
                rotulo="Prazo de resposta"
                type="date"
                min={hoje}
                value={prazo}
                onChange={(evento) =>
                  despachar({ tipo: 'pesquisa', campo: 'prazo', valor: evento.target.value })
                }
                onBlur={tocar('prazo')}
                erro={falha?.etapa.tipo === 'abrir' ? falha.message : erroDe('prazo')}
                ajuda="A pesquisa abre hoje, e os parceiros respondem até esse dia."
              />

              {falha && falha.etapa.tipo !== 'abrir' && (
                <div role="alert" className={styles.falha}>
                  <p className={styles.tituloFalha}>
                    {falha.etapa.tipo === 'pesquisa'
                      ? 'Não foi possível criar a pesquisa.'
                      : 'Não foi possível incluir uma das campanhas.'}
                  </p>
                  <p>{falha.message}</p>
                </div>
              )}
              {falha && pesquisaCriada && (
                <p className={styles.salvoAte}>
                  A pesquisa {salvo.rodada?.codigo} já foi criada
                  {incluidas > 0 &&
                    `, com ${incluidas} de ${campanhas.length} ${campanhas.length === 1 ? 'campanha' : 'campanhas'}`}
                  . Corrija e envie de novo: o envio continua de onde parou.
                </p>
              )}

              <div>
                <Button type="submit" className={styles.botaoEnviar} disabled={envio.isPending}>
                  {envio.isPending ? 'Abrindo a pesquisa…' : 'Abrir pesquisa'}
                </Button>
                <p role="status" className={styles.etapa}>
                  {etapa ? textoDaEtapa(etapa) : ''}
                </p>
              </div>
            </div>
          </Card>
        </aside>
      </form>
    </>
  )
}
