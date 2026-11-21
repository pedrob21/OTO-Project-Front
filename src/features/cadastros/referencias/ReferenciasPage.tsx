import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { buscarReferencias } from '@/api/referencias'
import { Carregando } from '@/components/ui/Carregando'
import { ErroApi } from '@/components/ui/ErroApi'
import { CabecalhoCadastro } from '../CabecalhoCadastro'
import { AbaDeReferencia } from './AbaDeReferencia'
import { Abas } from './Abas'
import { ABAS } from './referencias'

export function ReferenciasPage() {
  const [ativa, setAtiva] = useState(0)
  const referencias = useQuery({
    queryKey: ['referencias'],
    queryFn: ({ signal }) => buscarReferencias(signal),
    staleTime: Infinity,
  })
  const aba = ABAS[ativa] ?? ABAS[0]!

  return (
    <>
      <CabecalhoCadastro
        titulo="Referências"
        introducao="Listas usadas no resto do sistema: tipos de hospedagem, feriados e eventos das campanhas e faixas de ocupação dos resultados. O código não muda depois de criado, e só sai o que nunca foi usado."
      />

      {referencias.isPending ? (
        <Carregando texto="Carregando referências" />
      ) : referencias.isError ? (
        <ErroApi
          mensagem="Não foi possível carregar as referências."
          detalhe={referencias.error.message}
          aoTentarNovamente={() => void referencias.refetch()}
        />
      ) : (
        <Abas
          rotulo="Referências"
          abas={ABAS.map((item) => item.rotulo)}
          ativa={ativa}
          aoMudar={setAtiva}
        >
          <AbaDeReferencia key={aba.recurso} aba={aba} itens={aba.itens(referencias.data)} />
        </Abas>
      )}
    </>
  )
}
