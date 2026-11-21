import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ErroRequisicao } from '@/api/erros'
import { buscarRhcVigente, corrigirRhc, excluirRhc, listarRhc, registrarRhc } from '@/api/rhc'
import { hojeLocal } from '@/lib/datas'
import { formatarData, formatarDecimal, formatarInteiro } from '@/lib/formatos'
import type { Esquemas } from '@/types/dominio'
import { CabecalhoCadastro } from '../CabecalhoCadastro'
import { CadastroDeVigencias } from '../CadastroDeVigencias'
import styles from '../Cadastros.module.css'
import { CAMPOS_RHC, REGRAS_RHC } from './rhc'

type Rhc = Esquemas['RhcResponse']

function Vigente() {
  const vigente = useQuery({
    queryKey: ['rhc', 'vigente'],
    queryFn: ({ signal }) => buscarRhcVigente(undefined, signal),
  })

  if (vigente.isPending) return null
  if (vigente.isError) {
    return (
      <p className={styles.resumo}>
        {vigente.error instanceof ErroRequisicao && vigente.error.status === 404
          ? 'Não há totais vigentes hoje: o RHC fica fora do fluxo de turistas.'
          : 'Não foi possível conferir os totais vigentes hoje.'}
      </p>
    )
  }
  const { vigenteDesde, qtdRegistros, leitosUteis } = vigente.data
  return (
    <p className={styles.resumo}>
      Vigente hoje, desde {formatarData(vigenteDesde)}: {formatarInteiro(qtdRegistros)} imóveis e{' '}
      {formatarDecimal(leitosUteis, 1)} leitos úteis no cálculo.
    </p>
  )
}

type RhcPageProps = {
  /** "2026-11-16". Fixa a data nos testes. */
  hoje?: string
}

export function RhcPage({ hoje: hojeFixo }: RhcPageProps) {
  const [hoje] = useState(() => hojeFixo ?? hojeLocal())

  return (
    <>
      <CabecalhoCadastro
        titulo="Hospedagem caseira (RHC)"
        introducao="Totais dos imóveis de aluguel por temporada do Registro de Hospedagem Caseira. O fluxo do RHC usa os leitos úteis da vigência do período e a taxa de ocupação geral."
      />
      <Vigente />
      <CadastroDeVigencias<Rhc, Esquemas['RhcRequest']>
        titulo="Totais do RHC"
        subtitulo="Leitos úteis = UH × (1 + pessoas por UH) ÷ 2"
        nome={{ texto: 'Totais do RHC', plural: true }}
        chave={['rhc']}
        listar={listarRhc}
        criar={registrarRhc}
        alterar={corrigirRhc}
        excluir={excluirRhc}
        campos={CAMPOS_RHC}
        regras={REGRAS_RHC}
        hoje={hoje}
        avisoDaCorrecao="Use só para lançamento digitado errado. Resultados já publicados não mudam."
        vazio={{
          titulo: 'Nenhum total do RHC cadastrado',
          descricao: 'Sem totais, o RHC fica fora do fluxo de turistas.',
        }}
        colunas={[
          {
            titulo: 'Imóveis',
            celula: (linha) => formatarInteiro(linha.qtdRegistros),
            numerica: true,
          },
          { titulo: 'UH', celula: (linha) => formatarInteiro(linha.qtdUh), numerica: true },
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
        ]}
      />
    </>
  )
}
