import { useState } from 'react'
import {
  alterarReferencia,
  criarReferencia,
  excluirReferencia,
  type PedidoReferencia,
} from '@/api/referencias'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dialogo } from '@/components/ui/Dialogo'
import { Tabela, type ColunaTabela } from '@/components/ui/Tabela'
import styles from '../Cadastros.module.css'
import { formDosCampos, pedidoDosCampos, type FormDeCampos } from '../campos'
import { Confirmacao } from '@/components/ui/Confirmacao'
import { FormularioDeCampos } from '../FormularioDeCampos'
import { useMutacaoCadastro } from '../useMutacaoCadastro'
import { camposDaAba, REGRAS_REFERENCIA, type DefAba, type Referencia } from './referencias'

const CHAVE = ['referencias']

type Edicao =
  { tipo: 'nova' } | { tipo: 'editar'; item: Referencia } | { tipo: 'excluir'; item: Referencia }

type AbaDeReferenciaProps = {
  aba: DefAba
  itens: Referencia[]
}

/** Uma aba de Referências: a definição diz os campos e as colunas. */
export function AbaDeReferencia({ aba, itens }: AbaDeReferenciaProps) {
  const [edicao, setEdicao] = useState<Edicao | null>(null)
  const [aviso, setAviso] = useState('')
  const fechar = () => setEdicao(null)
  const final = aba.feminino ? 'a' : 'o'

  const salvar = useMutacaoCadastro({
    acao: (form: FormDeCampos) => {
      const item = edicao?.tipo === 'editar' ? edicao.item : undefined
      const pedido = pedidoDosCampos(camposDaAba(aba, item), form) as PedidoReferencia<
        typeof aba.recurso
      >
      return item?.codigo
        ? alterarReferencia(aba.recurso, item.codigo, pedido)
        : criarReferencia(aba.recurso, pedido)
    },
    invalidar: [CHAVE],
    regras: REGRAS_REFERENCIA,
    aoConcluir: (salvo) => {
      setAviso(
        `${aba.singular} ${salvo.nome} ${edicao?.tipo === 'nova' ? 'criad' : 'alterad'}${final}.`,
      )
      fechar()
    },
  })

  const exclusao = useMutacaoCadastro({
    acao: (item: Referencia) => excluirReferencia(aba.recurso, item.codigo ?? ''),
    invalidar: [CHAVE],
    aoConcluir: (_, item) => {
      setAviso(`${aba.singular} ${item.nome} excluíd${final}.`)
      fechar()
    },
  })

  function abrir(nova: Edicao) {
    salvar.reset()
    exclusao.reset()
    setAviso('')
    setEdicao(nova)
  }

  const colunas: ColunaTabela<Referencia>[] = [
    { titulo: 'Nome', celula: (item) => item.nome },
    { titulo: 'Código', celula: (item) => item.codigo },
    ...aba.colunas,
  ]
  const item = edicao?.tipo === 'editar' ? edicao.item : undefined

  return (
    <>
      <p role="status" className={styles.aviso}>
        {aviso}
      </p>

      <Card
        titulo={aba.rotulo}
        acao={<Button onClick={() => abrir({ tipo: 'nova' })}>{aba.novo}</Button>}
      >
        <Tabela
          legenda={aba.rotulo}
          colunas={colunas}
          linhas={itens}
          chave={(linha) => linha.codigo ?? ''}
          vazio={{ titulo: aba.vazio }}
          acoes={(linha) => (
            <>
              <Button
                variante="secundaria"
                aria-label={`Editar ${linha.nome}`}
                onClick={() => abrir({ tipo: 'editar', item: linha })}
              >
                Editar
              </Button>
              <Button
                variante="secundaria"
                aria-label={`Excluir ${linha.nome}`}
                onClick={() => abrir({ tipo: 'excluir', item: linha })}
              >
                Excluir
              </Button>
            </>
          )}
        />
      </Card>

      {(edicao?.tipo === 'nova' || edicao?.tipo === 'editar') && (
        <Dialogo titulo={item ? `Editar ${item.nome}` : aba.novo} aoFechar={fechar}>
          <FormularioDeCampos
            campos={camposDaAba(aba, item)}
            inicial={formDosCampos(camposDaAba(aba, item), item)}
            rotuloEnviar={item ? 'Salvar' : 'Criar'}
            enviando={salvar.isPending}
            falha={salvar.falha}
            aoEnviar={(form) => salvar.mutate(form)}
            aoCancelar={fechar}
          />
        </Dialogo>
      )}

      {edicao?.tipo === 'excluir' && (
        <Confirmacao
          titulo={`Excluir ${edicao.item.nome}`}
          mensagem="Só dá para excluir o que nunca foi usado. O que já aparece em estabelecimentos, campanhas, resultados ou na série histórica fica."
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
