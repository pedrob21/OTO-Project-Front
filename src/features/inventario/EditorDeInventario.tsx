import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { buscarCatalogo, buscarInventario, salvarInventario } from '@/api/inventario'
import { Button } from '@/components/ui/Button'
import { CampoTexto } from '@/components/ui/CampoTexto'
import { Card } from '@/components/ui/Card'
import { Carregando } from '@/components/ui/Carregando'
import { ErroApi } from '@/components/ui/ErroApi'
import { EstadoVazio } from '@/components/ui/EstadoVazio'
import { formatarDataHora } from '@/lib/formatos'
import { useMutacaoCadastro } from '../cadastros/useMutacaoCadastro'
import { CATEGORIAS } from './categorias'
import styles from './EditorDeInventario.module.css'

type Marcados = Record<number, string>

type EditorDeInventarioProps = {
  estabelecimentoId: number
  /** O catálogo traz os grupos exclusivos da Secretaria; o PARCEIRO não os vê nem os altera. */
  ocultarExclusivosDaSecretaria?: boolean
  /** Dentro do card de outra tela: categorias como seções com h4, sem Card próprio. */
  embutido?: boolean
}

export function EditorDeInventario({
  estabelecimentoId,
  ocultarExclusivosDaSecretaria = false,
  embutido = false,
}: EditorDeInventarioProps) {
  const chave = ['estabelecimentos', estabelecimentoId, 'inventario']
  const [rascunho, setRascunho] = useState<Marcados | null>(null)
  const [aviso, setAviso] = useState('')

  const catalogo = useQuery({
    queryKey: ['inventario', 'catalogo'],
    queryFn: ({ signal }) => buscarCatalogo(signal),
  })
  const inventario = useQuery({
    queryKey: chave,
    queryFn: ({ signal }) => buscarInventario(estabelecimentoId, signal),
  })

  const grupos = (catalogo.data ?? []).filter(
    (grupo) => !(ocultarExclusivosDaSecretaria && grupo.exclusivoSecretaria),
  )
  const doServidor: Marcados = Object.fromEntries(
    (inventario.data?.itens ?? []).map((marcado) => [marcado.itemId, marcado.complemento ?? '']),
  )
  const marcados = rascunho ?? doServidor

  function mudar(alterar: (atuais: Marcados) => Marcados) {
    setAviso('')
    setRascunho(alterar(marcados))
  }

  function alternar(itemId: number, marcado: boolean) {
    mudar((atuais) => {
      const { [itemId]: _, ...resto } = atuais
      return marcado ? { ...resto, [itemId]: '' } : resto
    })
  }

  // Só vão no corpo os itens que a tela mostra: o que ela esconde ou que saiu do catálogo, a API mantém como está.
  const salvar = useMutacaoCadastro({
    acao: () =>
      salvarInventario(estabelecimentoId, {
        itens: grupos
          .flatMap((grupo) => grupo.itens ?? [])
          .filter((item) => (item.id ?? 0) in marcados)
          .map((item) => {
            const itemId = item.id ?? 0
            const complemento = item.permiteComplemento ? marcados[itemId]?.trim() : ''
            return complemento ? { itemId, complemento } : { itemId }
          }),
      }),
    invalidar: [chave],
    aoConcluir: () => {
      setRascunho(null)
      setAviso('Inventário salvo.')
    },
  })

  if (catalogo.isPending || inventario.isPending)
    return <Carregando texto="Carregando inventário" />

  const falhaDeLeitura = catalogo.isError ? catalogo : inventario.isError ? inventario : null
  if (falhaDeLeitura) {
    return (
      <ErroApi
        mensagem="Não foi possível carregar o inventário."
        detalhe={falhaDeLeitura.error?.message}
        aoTentarNovamente={() => void falhaDeLeitura.refetch()}
      />
    )
  }

  return (
    <form
      className={styles.editor}
      onSubmit={(evento) => {
        evento.preventDefault()
        salvar.reset()
        salvar.mutate()
      }}
    >
      <p className={styles.atualizado}>
        {inventario.data?.inventarioAtualizadoEm
          ? `Inventário atualizado em ${formatarDataHora(inventario.data?.inventarioAtualizadoEm)}.`
          : 'Inventário ainda não preenchido.'}
      </p>

      {grupos.length === 0 && (
        <EstadoVazio titulo="Catálogo vazio" descricao="Não há itens de inventário cadastrados." />
      )}

      {CATEGORIAS.map(({ codigo, titulo }) => {
        const dosGrupos = grupos.filter((grupo) => grupo.categoria === codigo)
        if (dosGrupos.length === 0) return null
        const conteudo = (
          <>
            {dosGrupos.map((grupo) => (
              <fieldset key={grupo.id} className={styles.grupo}>
                <legend className={styles.nomeDoGrupo}>{grupo.nome}</legend>
                <ul className={styles.itens}>
                  {(grupo.itens ?? []).map((item) => {
                    const itemId = item.id ?? 0
                    const marcado = itemId in marcados
                    return (
                      <li key={itemId} className={styles.item}>
                        <label className={styles.opcao}>
                          <input
                            type="checkbox"
                            checked={marcado}
                            onChange={(evento) => alternar(itemId, evento.target.checked)}
                          />
                          {item.nome}
                        </label>
                        {marcado && item.permiteComplemento && (
                          <CampoTexto
                            className={styles.complemento}
                            rotulo={`Complemento de ${item.nome}`}
                            maxLength={300}
                            value={marcados[itemId]}
                            onChange={(evento) =>
                              mudar((atuais) => ({ ...atuais, [itemId]: evento.target.value }))
                            }
                          />
                        )}
                      </li>
                    )
                  })}
                </ul>
              </fieldset>
            ))}
          </>
        )
        return embutido ? (
          <section key={codigo} aria-label={titulo}>
            <h4 className={styles.categoria}>{titulo}</h4>
            {conteudo}
          </section>
        ) : (
          <Card key={codigo} titulo={titulo}>
            {conteudo}
          </Card>
        )
      })}

      <div className={styles.rodape}>
        <Button type="submit" disabled={salvar.isPending}>
          {salvar.isPending ? 'Salvando' : 'Salvar inventário'}
        </Button>
        <p role="status" className={styles.atualizado}>
          {aviso}
        </p>
        {salvar.falha?.mensagem && (
          <p role="alert" className={styles.falha}>
            {salvar.falha.mensagem}
          </p>
        )}
      </div>
    </form>
  )
}
