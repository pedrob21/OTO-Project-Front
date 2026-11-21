import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import {
  buscarEstabelecimento,
  corrigirCapacidade,
  excluirCapacidade,
  listarCapacidades,
  registrarCapacidade,
} from '@/api/estabelecimentos'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Carregando } from '@/components/ui/Carregando'
import { Dialogo } from '@/components/ui/Dialogo'
import { ErroApi } from '@/components/ui/ErroApi'
import { Tabela, type ColunaTabela } from '@/components/ui/Tabela'
import { hojeLocal } from '@/lib/datas'
import { formatarData, formatarDecimal, formatarInteiro } from '@/lib/formatos'
import type { Esquemas } from '@/types/dominio'
import { CabecalhoCadastro } from '../CabecalhoCadastro'
import styles from '../Cadastros.module.css'
import { formDosCampos, pedidoDosCampos, type FormDeCampos } from '../campos'
import { Confirmacao } from '@/components/ui/Confirmacao'
import { FormularioDeCampos } from '../FormularioDeCampos'
import { useMutacaoCadastro } from '../useMutacaoCadastro'
import { SituacaoDaVigencia } from '../SituacaoDaVigencia'
import { ordenarPorVigencia, situacaoDaVigencia } from '../vigencias'
import { CAMPOS_CAPACIDADE, errosDaCapacidade, REGRAS_CAPACIDADE } from './capacidades'

type Capacidade = Esquemas['CapacidadeResponse']
type Edicao =
  | { tipo: 'nova' }
  | { tipo: 'corrigir'; capacidade: Capacidade }
  | { tipo: 'excluir'; capacidade: Capacidade }

type CapacidadesPageProps = {
  /** "2026-11-16". Fixa a data nos testes. */
  hoje?: string
}

export function CapacidadesPage({ hoje: hojeFixo }: CapacidadesPageProps) {
  const [hoje] = useState(() => hojeFixo ?? hojeLocal())
  const id = Number(useParams().id)
  const [edicao, setEdicao] = useState<Edicao | null>(null)
  const [aviso, setAviso] = useState('')
  const chave = ['estabelecimentos', id, 'capacidades']

  const estabelecimento = useQuery({
    queryKey: ['estabelecimentos', id],
    queryFn: ({ signal }) => buscarEstabelecimento(id, signal),
  })
  const capacidades = useQuery({
    queryKey: chave,
    queryFn: ({ signal }) => listarCapacidades(id, signal),
  })
  const nome = estabelecimento.data?.dados?.nomeFantasia

  const fechar = () => setEdicao(null)

  // A lista de estabelecimentos mostra a capacidade vigente: muda junto.
  const salvar = useMutacaoCadastro({
    acao: (form: FormDeCampos) => {
      const pedido = pedidoDosCampos(CAMPOS_CAPACIDADE, form) as Esquemas['CapacidadeRequest']
      return edicao?.tipo === 'corrigir'
        ? corrigirCapacidade(id, edicao.capacidade.id ?? 0, pedido)
        : registrarCapacidade(id, pedido)
    },
    invalidar: [['estabelecimentos']],
    regras: REGRAS_CAPACIDADE,
    aoConcluir: (salva) => {
      setAviso(
        `Capacidade a partir de ${formatarData(salva.vigenteDesde)} ${edicao?.tipo === 'nova' ? 'incluída' : 'corrigida'}.`,
      )
      fechar()
    },
  })

  const excluir = useMutacaoCadastro({
    acao: (capacidade: Capacidade) => excluirCapacidade(id, capacidade.id ?? 0),
    invalidar: [['estabelecimentos']],
    aoConcluir: (_, capacidade) => {
      setAviso(`Capacidade a partir de ${formatarData(capacidade.vigenteDesde)} excluída.`)
      fechar()
    },
  })

  function abrir(nova: Edicao) {
    salvar.reset()
    excluir.reset()
    setAviso('')
    setEdicao(nova)
  }

  const colunas: ColunaTabela<Capacidade>[] = [
    { titulo: 'Vigente desde', celula: (linha) => formatarData(linha.vigenteDesde) },
    { titulo: 'UH', celula: (linha) => formatarInteiro(linha.qtdUh), numerica: true },
    { titulo: 'UH PCD', celula: (linha) => formatarInteiro(linha.qtdUhPcd), numerica: true },
    { titulo: 'Leitos', celula: (linha) => formatarInteiro(linha.qtdLeitos), numerica: true },
    {
      titulo: 'Pessoas por UH',
      celula: (linha) => formatarInteiro(linha.maxLeitosPorUh),
      numerica: true,
    },
    {
      titulo: 'Leitos úteis',
      celula: (linha) => formatarDecimal(linha.leitosUteis, 1),
      numerica: true,
    },
    {
      titulo: 'Situação',
      celula: (linha) => (
        <SituacaoDaVigencia situacao={situacaoDaVigencia(linha, capacidades.data ?? [], hoje)} />
      ),
    },
  ]

  return (
    <>
      <CabecalhoCadastro
        sobrelinha={
          <>
            Cadastros · <Link to="/cadastros/estabelecimentos">Estabelecimentos</Link>
          </>
        }
        titulo="Capacidade de hospedagem"
        introducao={
          <>
            {nome ? `UH e leitos de ${nome}` : 'UH e leitos do estabelecimento'}, por vigência. Cada
            cálculo usa a capacidade vigente no período. Para uma mudança real, inclua uma nova
            vigência; corrija ou exclua só o que foi digitado errado.
          </>
        }
      />

      <p role="status" className={styles.aviso}>
        {aviso}
      </p>

      <Card
        titulo={nome ?? 'Capacidades'}
        subtitulo="Leitos úteis = UH × (1 + pessoas por UH) ÷ 2"
        acao={<Button onClick={() => abrir({ tipo: 'nova' })}>Nova vigência</Button>}
      >
        {capacidades.isPending ? (
          <Carregando texto="Carregando capacidades" />
        ) : capacidades.isError ? (
          <ErroApi
            mensagem="Não foi possível carregar as capacidades."
            detalhe={capacidades.error.message}
            aoTentarNovamente={() => void capacidades.refetch()}
          />
        ) : (
          <Tabela
            legenda={`Capacidades${nome ? ` de ${nome}` : ''}`}
            colunas={colunas}
            linhas={ordenarPorVigencia(capacidades.data)}
            chave={(linha) => linha.id ?? 0}
            vazio={{
              titulo: 'Nenhuma capacidade cadastrada',
              descricao: 'Sem capacidade, o estabelecimento fica fora do cálculo.',
            }}
            acoes={(linha) => (
              <>
                <Button
                  variante="secundaria"
                  aria-label={`Corrigir a capacidade de ${formatarData(linha.vigenteDesde)}`}
                  onClick={() => abrir({ tipo: 'corrigir', capacidade: linha })}
                >
                  Corrigir
                </Button>
                <Button
                  variante="secundaria"
                  aria-label={`Excluir a capacidade de ${formatarData(linha.vigenteDesde)}`}
                  onClick={() => abrir({ tipo: 'excluir', capacidade: linha })}
                >
                  Excluir
                </Button>
              </>
            )}
          />
        )}
      </Card>

      {(edicao?.tipo === 'nova' || edicao?.tipo === 'corrigir') && (
        <Dialogo
          titulo={edicao.tipo === 'nova' ? 'Nova vigência de capacidade' : 'Corrigir capacidade'}
          descricao={
            edicao.tipo === 'nova'
              ? 'As vigências anteriores continuam valendo para os períodos delas.'
              : 'Use só para lançamento digitado errado. Resultados já publicados não mudam.'
          }
          aoFechar={fechar}
        >
          <FormularioDeCampos
            campos={CAMPOS_CAPACIDADE}
            inicial={formDosCampos(
              CAMPOS_CAPACIDADE,
              edicao.tipo === 'corrigir' ? edicao.capacidade : {},
              { vigenteDesde: hoje },
            )}
            validar={errosDaCapacidade}
            rotuloEnviar={edicao.tipo === 'nova' ? 'Incluir vigência' : 'Salvar correção'}
            enviando={salvar.isPending}
            falha={salvar.falha}
            aoEnviar={(form) => salvar.mutate(form)}
            aoCancelar={fechar}
          />
        </Dialogo>
      )}

      {edicao?.tipo === 'excluir' && (
        <Confirmacao
          titulo="Excluir capacidade"
          mensagem={`Excluir a capacidade a partir de ${formatarData(edicao.capacidade.vigenteDesde)}? Use só para lançamento feito por engano.`}
          rotuloConfirmar="Excluir"
          enviando={excluir.isPending}
          falha={excluir.falha?.mensagem}
          aoConfirmar={() => excluir.mutate(edicao.capacidade)}
          aoCancelar={fechar}
        />
      )}
    </>
  )
}
