import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  alterarHistorico,
  excluirHistorico,
  gravarHistorico,
  listarHistorico,
  type FiltroHistorico,
} from '@/api/historico'
import { buscarReferencias } from '@/api/referencias'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CampoTexto } from '@/components/ui/CampoTexto'
import { Carregando } from '@/components/ui/Carregando'
import { Dialogo } from '@/components/ui/Dialogo'
import { ErroApi } from '@/components/ui/ErroApi'
import { Select } from '@/components/ui/Select'
import { Tabela, type ColunaTabela } from '@/components/ui/Tabela'
import type { Esquemas } from '@/types/dominio'
import { CabecalhoCadastro } from '../CabecalhoCadastro'
import styles from '../Cadastros.module.css'
import { Confirmacao } from '../Confirmacao'
import { useMutacaoCadastro } from '../useMutacaoCadastro'
import local from './Historico.module.css'
import { HistoricoFormulario } from './HistoricoFormulario'
import {
  formatarValor,
  INDICADORES,
  MODALIDADES,
  pedidoDoHistorico,
  rotuloDaModalidade,
  rotuloDoIndicador,
  textoDoPeriodo,
  type FormHistorico,
} from './historico'
import { ImportacaoCsv } from './ImportacaoCsv'

type Historico = Esquemas['HistoricoResponse']
type Edicao =
  { tipo: 'novo' } | { tipo: 'corrigir'; item: Historico } | { tipo: 'excluir'; item: Historico }

type Filtros = { indicador: string; modalidade: string; ano: string; tipo: string }

function filtroDaApi({ indicador, modalidade, ano, tipo }: Filtros): FiltroHistorico {
  return {
    indicador: (indicador || undefined) as FiltroHistorico['indicador'],
    modalidade: (modalidade || undefined) as FiltroHistorico['modalidade'],
    ano: /^\d{4}$/.test(ano) ? Number(ano) : undefined,
    tipo: tipo || undefined,
  }
}

export function HistoricoPage() {
  const [filtros, setFiltros] = useState<Filtros>({
    indicador: '',
    modalidade: '',
    ano: '',
    tipo: '',
  })
  const [edicao, setEdicao] = useState<Edicao | null>(null)
  const [aviso, setAviso] = useState('')
  const filtro = filtroDaApi(filtros)

  const historico = useQuery({
    queryKey: ['historico', filtro],
    queryFn: ({ signal }) => listarHistorico(filtro, signal),
  })
  const referencias = useQuery({
    queryKey: ['referencias'],
    queryFn: ({ signal }) => buscarReferencias(signal),
    staleTime: Infinity,
  })
  const feriados = referencias.data?.feriados ?? []
  const tipos = referencias.data?.tiposHospedagem ?? []
  const periodo = (item: Historico) => textoDoPeriodo(item, feriados)
  const nomeDoTipo = ({ tipoHospedagemCodigo: codigo }: Historico) =>
    codigo ? (tipos.find((tipo) => tipo.codigo === codigo)?.nome ?? codigo) : undefined
  /** "Taxa de ocupação, consolidada, Julho de 2024, Hotel" */
  const descricao = (item: Historico) =>
    [
      rotuloDoIndicador(item.indicador),
      rotuloDaModalidade(item.modalidade).toLowerCase(),
      periodo(item),
      nomeDoTipo(item),
    ]
      .filter(Boolean)
      .join(', ')

  const fechar = () => setEdicao(null)
  const filtrar = (campo: keyof Filtros) => (valor: string) =>
    setFiltros((atual) => ({ ...atual, [campo]: valor }))

  const salvar = useMutacaoCadastro({
    acao: (form: FormHistorico) =>
      edicao?.tipo === 'corrigir'
        ? alterarHistorico(edicao.item.id ?? 0, pedidoDoHistorico(form))
        : gravarHistorico(pedidoDoHistorico(form)),
    invalidar: [['historico']],
    aoConcluir: (salvo) => {
      setAviso(`Valor ${edicao?.tipo === 'novo' ? 'gravado' : 'corrigido'}: ${descricao(salvo)}.`)
      fechar()
    },
  })

  const exclusao = useMutacaoCadastro({
    acao: (item: Historico) => excluirHistorico(item.id ?? 0),
    invalidar: [['historico']],
    aoConcluir: (_, item) => {
      setAviso(`Valor excluído: ${descricao(item)}.`)
      fechar()
    },
  })

  function abrir(nova: Edicao) {
    salvar.reset()
    exclusao.reset()
    setAviso('')
    setEdicao(nova)
  }

  const colunas: ColunaTabela<Historico>[] = [
    { titulo: 'Período', celula: periodo },
    { titulo: 'Indicador', celula: (item) => rotuloDoIndicador(item.indicador) },
    { titulo: 'Modalidade', celula: (item) => rotuloDaModalidade(item.modalidade) },
    { titulo: 'Tipo', celula: (item) => nomeDoTipo(item) ?? 'Geral' },
    { titulo: 'Valor', celula: formatarValor, numerica: true },
    { titulo: 'Fonte', celula: (item) => item.fonte },
  ]

  return (
    <>
      <CabecalhoCadastro
        titulo="Série histórica"
        introducao="Valores anteriores ao sistema, usados nos comparativos com o ano anterior e nos gráficos do painel. Quando o sistema tem resultado publicado para o mesmo período, vale o do sistema."
      />

      <p role="status" className={styles.aviso}>
        {aviso}
      </p>

      <div className={local.cartoes}>
        <ImportacaoCsv />

        <Card
          titulo="Valores gravados"
          acao={<Button onClick={() => abrir({ tipo: 'novo' })}>Novo valor</Button>}
        >
          <div className={local.filtros}>
            <Select
              rotulo="Indicador"
              variante="campo"
              valor={filtros.indicador}
              opcoes={[{ valor: '', rotulo: 'Todos' }, ...INDICADORES]}
              aoMudar={filtrar('indicador')}
            />
            <Select
              rotulo="Modalidade"
              variante="campo"
              valor={filtros.modalidade}
              opcoes={[{ valor: '', rotulo: 'Todas' }, ...MODALIDADES]}
              aoMudar={filtrar('modalidade')}
            />
            <CampoTexto
              rotulo="Ano"
              inputMode="numeric"
              maxLength={4}
              value={filtros.ano}
              placeholder="Todos"
              onChange={(evento) => filtrar('ano')(evento.target.value)}
            />
            <Select
              rotulo="Tipo de hospedagem"
              variante="campo"
              valor={filtros.tipo}
              opcoes={[
                { valor: '', rotulo: 'Todos' },
                ...tipos.map(({ codigo = '', nome = '' }) => ({ valor: codigo, rotulo: nome })),
              ]}
              aoMudar={filtrar('tipo')}
            />
          </div>

          {historico.isPending ? (
            <Carregando texto="Carregando a série histórica" />
          ) : historico.isError ? (
            <ErroApi
              mensagem="Não foi possível carregar a série histórica."
              detalhe={historico.error.message}
              aoTentarNovamente={() => void historico.refetch()}
            />
          ) : (
            <Tabela
              legenda="Valores da série histórica"
              colunas={colunas}
              linhas={historico.data}
              chave={(item) => item.id ?? 0}
              vazio={{
                titulo: 'Nenhum valor encontrado',
                descricao: 'Importe um CSV ou grave um valor em "Novo valor".',
              }}
              acoes={(item) => (
                <>
                  <Button
                    variante="secundaria"
                    aria-label={`Corrigir ${descricao(item)}`}
                    onClick={() => abrir({ tipo: 'corrigir', item })}
                  >
                    Corrigir
                  </Button>
                  <Button
                    variante="secundaria"
                    aria-label={`Excluir ${descricao(item)}`}
                    onClick={() => abrir({ tipo: 'excluir', item })}
                  >
                    Excluir
                  </Button>
                </>
              )}
            />
          )}
        </Card>
      </div>

      {(edicao?.tipo === 'novo' || edicao?.tipo === 'corrigir') && (
        <Dialogo
          titulo={edicao.tipo === 'novo' ? 'Novo valor' : `Corrigir ${descricao(edicao.item)}`}
          descricao={
            edicao.tipo === 'novo'
              ? 'Se já houver valor para o mesmo indicador, período e tipo, ele é substituído.'
              : 'Dá para mudar também o indicador, o período e o tipo.'
          }
          largura="larga"
          aoFechar={fechar}
        >
          <HistoricoFormulario
            item={edicao.tipo === 'corrigir' ? edicao.item : undefined}
            referencias={referencias.data}
            enviando={salvar.isPending}
            falha={salvar.falha}
            aoEnviar={(form) => salvar.mutate(form)}
            aoCancelar={fechar}
          />
        </Dialogo>
      )}

      {edicao?.tipo === 'excluir' && (
        <Confirmacao
          titulo="Excluir valor"
          mensagem={`Excluir ${descricao(edicao.item)} (${formatarValor(edicao.item)})?`}
          rotuloConfirmar="Excluir"
          enviando={exclusao.isPending}
          falha={exclusao.falha?.mensagem}
          aoConfirmar={() => exclusao.mutate(edicao.item)}
          aoCancelar={fechar}
        />
      )}
    </>
  )
}
