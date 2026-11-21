import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { listarCapacidades, registrarCapacidade } from '@/api/estabelecimentos'
import { Button } from '@/components/ui/Button'
import { Carregando } from '@/components/ui/Carregando'
import { Dialogo } from '@/components/ui/Dialogo'
import { ErroApi } from '@/components/ui/ErroApi'
import { Tabela } from '@/components/ui/Tabela'
import { formDosCampos, pedidoDosCampos, type FormDeCampos } from '@/features/cadastros/campos'
import {
  CAMPOS_CAPACIDADE,
  errosDaCapacidade,
  REGRAS_CAPACIDADE,
} from '@/features/cadastros/capacidades/capacidades'
import { colunasDaCapacidade } from '@/features/cadastros/capacidades/colunasDaCapacidade'
import cadastros from '@/features/cadastros/Cadastros.module.css'
import { FormularioDeCampos } from '@/features/cadastros/FormularioDeCampos'
import { useMutacaoCadastro } from '@/features/cadastros/useMutacaoCadastro'
import { ordenarPorVigencia } from '@/features/cadastros/vigencias'
import { formatarData } from '@/lib/formatos'
import type { Esquemas } from '@/types/dominio'
import { CHAVE_ESTABELECIMENTOS } from './chaves'
import styles from './MeuEstabelecimentoCard.module.css'

type CapacidadeDoEstabelecimentoProps = {
  id: number
  nome: string | undefined
  hoje: string
}

/** Só leitura e nova vigência: corrigir e excluir são do ADMIN. */
export function CapacidadeDoEstabelecimento({ id, nome, hoje }: CapacidadeDoEstabelecimentoProps) {
  const [aberto, setAberto] = useState(false)
  const [aviso, setAviso] = useState('')
  const capacidades = useQuery({
    queryKey: [...CHAVE_ESTABELECIMENTOS, id, 'capacidades'],
    queryFn: ({ signal }) => listarCapacidades(id, signal),
  })

  const salvar = useMutacaoCadastro({
    acao: (form: FormDeCampos) =>
      registrarCapacidade(
        id,
        pedidoDosCampos(CAMPOS_CAPACIDADE, form) as Esquemas['CapacidadeRequest'],
      ),
    invalidar: [CHAVE_ESTABELECIMENTOS],
    regras: REGRAS_CAPACIDADE,
    aoConcluir: (salva) => {
      setAviso(`Capacidade a partir de ${formatarData(salva.vigenteDesde)} informada.`)
      setAberto(false)
    },
  })

  function abrir() {
    salvar.reset()
    setAviso('')
    setAberto(true)
  }

  const colunas = colunasDaCapacidade(capacidades.data ?? [], hoje)

  return (
    <section className={styles.grupo} aria-label="Capacidade">
      <div className={styles.cabecalhoDoGrupo}>
        <h3 className={styles.titulo}>Capacidade</h3>
        <Button
          variante="secundaria"
          aria-label={`Informar nova capacidade de ${nome ?? 'o estabelecimento'}`}
          onClick={abrir}
        >
          Informar nova capacidade
        </Button>
      </div>
      <p role="status" className={cadastros.aviso}>
        {aviso}
      </p>
      {capacidades.isPending ? (
        <Carregando texto="Carregando a capacidade" />
      ) : capacidades.isError ? (
        <ErroApi
          mensagem="Não foi possível carregar a capacidade."
          detalhe={capacidades.error.message}
          aoTentarNovamente={() => void capacidades.refetch()}
        />
      ) : (
        <Tabela
          legenda={`Capacidade${nome ? ` de ${nome}` : ''}`}
          colunas={colunas}
          linhas={ordenarPorVigencia(capacidades.data)}
          chave={(linha) => linha.id ?? 0}
          vazio={{
            titulo: 'Nenhuma capacidade cadastrada',
            descricao: 'Informe a capacidade em "Informar nova capacidade".',
          }}
        />
      )}
      <p className={styles.ajuda}>
        Para uma mudança real de UH ou leitos, informe uma nova vigência. Lançamento errado só o OTO
        corrige.
      </p>

      {aberto && (
        <Dialogo
          titulo="Informar nova capacidade"
          descricao="As vigências anteriores continuam valendo para os períodos delas."
          aoFechar={() => setAberto(false)}
        >
          <FormularioDeCampos
            campos={CAMPOS_CAPACIDADE}
            inicial={formDosCampos(CAMPOS_CAPACIDADE, {}, { vigenteDesde: hoje })}
            validar={errosDaCapacidade}
            rotuloEnviar="Incluir vigência"
            enviando={salvar.isPending}
            falha={salvar.falha}
            aoEnviar={(form) => salvar.mutate(form)}
            aoCancelar={() => setAberto(false)}
          />
        </Dialogo>
      )}
    </section>
  )
}
