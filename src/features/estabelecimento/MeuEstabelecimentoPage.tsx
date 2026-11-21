import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { listarEstabelecimentos } from '@/api/estabelecimentos'
import { buscarReferencias } from '@/api/referencias'
import { Card } from '@/components/ui/Card'
import { Carregando } from '@/components/ui/Carregando'
import { ErroApi } from '@/components/ui/ErroApi'
import { EstadoVazio } from '@/components/ui/EstadoVazio'
import { CabecalhoCadastro } from '@/features/cadastros/CabecalhoCadastro'
import { hojeLocal } from '@/lib/datas'
import { CHAVE_ESTABELECIMENTOS } from './chaves'
import { MeuEstabelecimentoCard } from './MeuEstabelecimentoCard'
import styles from './MeuEstabelecimentoPage.module.css'

type MeuEstabelecimentoPageProps = {
  /** "2026-11-20". Fixa a data nos testes. */
  hoje?: string
}

export function MeuEstabelecimentoPage({ hoje: hojeFixo }: MeuEstabelecimentoPageProps) {
  const [hoje] = useState(() => hojeFixo ?? hojeLocal())
  const estabelecimentos = useQuery({
    queryKey: CHAVE_ESTABELECIMENTOS,
    queryFn: ({ signal }) => listarEstabelecimentos({}, signal),
  })
  const referencias = useQuery({
    queryKey: ['referencias'],
    queryFn: ({ signal }) => buscarReferencias(signal),
    staleTime: Infinity,
  })
  const tipos = referencias.data?.tiposHospedagem ?? []
  const nomeDoTipo = (codigo: string | undefined) =>
    tipos.find((tipo) => tipo.codigo === codigo)?.nome ?? codigo ?? '—'

  return (
    <>
      <CabecalhoCadastro
        sobrelinha="Meu estabelecimento"
        titulo="Meu estabelecimento"
        introducao="Confira os dados do seu estabelecimento e mantenha o cadastro em dia. Os dados da Secretaria só o OTO altera."
      />

      {estabelecimentos.isPending ? (
        <Carregando texto="Carregando os seus estabelecimentos" />
      ) : estabelecimentos.isError ? (
        <Card>
          <ErroApi
            mensagem="Não foi possível carregar os seus estabelecimentos."
            detalhe={estabelecimentos.error.message}
            aoTentarNovamente={() => void estabelecimentos.refetch()}
          />
        </Card>
      ) : estabelecimentos.data.length === 0 ? (
        <Card>
          <EstadoVazio
            titulo="Nenhum estabelecimento vinculado"
            descricao="Fale com o OTO para vincular o seu estabelecimento ao seu usuário."
          />
        </Card>
      ) : (
        <div className={styles.estabelecimentos}>
          {estabelecimentos.data.map((resumo) => (
            <MeuEstabelecimentoCard
              key={resumo.id}
              resumo={resumo}
              nomeDoTipo={nomeDoTipo}
              hoje={hoje}
            />
          ))}
        </div>
      )}
    </>
  )
}
