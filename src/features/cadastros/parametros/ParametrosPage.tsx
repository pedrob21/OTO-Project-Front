import { useState } from 'react'
import {
  alterarParametros,
  criarParametros,
  excluirParametros,
  listarParametros,
} from '@/api/parametros'
import { hojeLocal } from '@/lib/datas'
import { formatarInteiro, formatarMoeda, formatarPercentual } from '@/lib/formatos'
import type { Esquemas } from '@/types/dominio'
import { CabecalhoCadastro } from '../CabecalhoCadastro'
import { CadastroDeVigencias } from '../CadastroDeVigencias'
import { CAMPOS_PARAMETROS, errosDosParametros, REGRAS_PARAMETROS } from './parametros'

type Parametros = Esquemas['ParametroResponse']

type ParametrosPageProps = {
  /** "2026-11-16". Fixa a data nos testes. */
  hoje?: string
}

export function ParametrosPage({ hoje: hojeFixo }: ParametrosPageProps) {
  const [hoje] = useState(() => hojeFixo ?? hojeLocal())

  return (
    <>
      <CabecalhoCadastro
        titulo="Parâmetros de cálculo"
        introducao="Valores da metodologia usados no fluxo de turistas e na receita. Cada publicação usa os parâmetros vigentes no período e guarda qual vigência usou: uma vigência já usada em resultado publicado não pode ser corrigida nem excluída."
      />
      <CadastroDeVigencias<Parametros, Esquemas['ParametroRequest']>
        titulo="Vigências dos parâmetros"
        subtitulo="Números aceitam vírgula ou ponto, com até duas casas decimais."
        nome={{ texto: 'Parâmetros', plural: true }}
        chave={['parametros-calculo']}
        listar={listarParametros}
        criar={criarParametros}
        alterar={alterarParametros}
        excluir={excluirParametros}
        campos={CAMPOS_PARAMETROS}
        validar={errosDosParametros}
        regras={REGRAS_PARAMETROS}
        hoje={hoje}
        avisoDaCorrecao="Só para o que foi digitado errado e ainda não foi usado em resultado publicado. Para mudar a metodologia, inclua uma nova vigência."
        vazio={{
          titulo: 'Nenhum parâmetro cadastrado',
          descricao: 'Sem parâmetros vigentes, não é possível publicar resultados.',
        }}
        colunas={[
          {
            titulo: 'Day use',
            celula: (linha) => formatarPercentual(linha.percentualDayUse, 2),
            numerica: true,
          },
          {
            titulo: 'Permanência',
            celula: (linha) => `${formatarInteiro(linha.diasPermanenciaMedia)} dias`,
            numerica: true,
          },
          {
            titulo: 'Dias em parques',
            celula: (linha) => formatarInteiro(linha.diasEmParques),
            numerica: true,
          },
          {
            titulo: 'Gasto diário',
            celula: (linha) => formatarMoeda(linha.gastoMedioDiario, 2),
            numerica: true,
          },
          {
            titulo: 'Ingresso',
            celula: (linha) => formatarMoeda(linha.gastoMedioIngresso, 2),
            numerica: true,
          },
          {
            titulo: 'Mínimo de leitos',
            celula: (linha) => formatarPercentual(linha.percentualMinimoLeitosPublicacao, 2),
            numerica: true,
          },
          { titulo: 'Fonte', celula: (linha) => linha.fonte },
        ]}
      />
    </>
  )
}
