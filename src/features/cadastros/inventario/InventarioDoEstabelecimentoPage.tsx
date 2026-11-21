import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { buscarEstabelecimento } from '@/api/estabelecimentos'
import { EditorDeInventario } from '@/features/inventario/EditorDeInventario'
import { CabecalhoCadastro } from '../CabecalhoCadastro'

export function InventarioDoEstabelecimentoPage() {
  const id = Number(useParams().id)
  const estabelecimento = useQuery({
    queryKey: ['estabelecimentos', id],
    queryFn: ({ signal }) => buscarEstabelecimento(id, signal),
  })
  const nome = estabelecimento.data?.dados?.nomeFantasia

  return (
    <>
      <CabecalhoCadastro
        sobrelinha={
          <>
            Cadastros · <Link to="/cadastros/estabelecimentos">Estabelecimentos</Link>
          </>
        }
        titulo="Inventário do estabelecimento"
        introducao={
          <>
            {nome
              ? `Serviços, equipamentos, acessibilidade e sustentabilidade de ${nome}`
              : 'Serviços, equipamentos, acessibilidade e sustentabilidade do estabelecimento'}
            . Marque o que o estabelecimento oferece; o salvamento substitui a lista inteira.
          </>
        }
      />

      <EditorDeInventario estabelecimentoId={id} />
    </>
  )
}
