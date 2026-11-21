import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Tabela, type ColunaTabela } from '@/components/ui/Tabela'
import { formatarInteiro } from '@/lib/formatos'
import type { Esquemas } from '@/types/dominio'
import styles from './GrupoDoCatalogo.module.css'

export type GrupoCatalogo = Esquemas['CatalogoGrupo']
export type ItemCatalogo = Esquemas['CatalogoItem']

type GrupoDoCatalogoProps = {
  grupo: GrupoCatalogo
  aoNovoItem: () => void
  aoEditarGrupo: () => void
  aoAlternarGrupo: () => void
  aoExcluirGrupo: () => void
  aoEditarItem: (item: ItemCatalogo) => void
  aoAlternarItem: (item: ItemCatalogo) => void
  aoExcluirItem: (item: ItemCatalogo) => void
}

function Situacao({ ativo }: { ativo?: boolean }) {
  return ativo ? 'Ativo' : <Badge variante="inativa">Inativo</Badge>
}

export function GrupoDoCatalogo({
  grupo,
  aoNovoItem,
  aoEditarGrupo,
  aoAlternarGrupo,
  aoExcluirGrupo,
  aoEditarItem,
  aoAlternarItem,
  aoExcluirItem,
}: GrupoDoCatalogoProps) {
  const detalhes = [
    grupo.codigo,
    grupo.exclusivoSecretaria ? 'Exclusivo da Secretaria' : null,
    grupo.ativo ? null : 'Inativo',
  ].filter(Boolean)

  const colunas: ColunaTabela<ItemCatalogo>[] = [
    { titulo: 'Nome', celula: (item) => item.nome },
    { titulo: 'Código', celula: (item) => item.codigo },
    { titulo: 'Complemento', celula: (item) => (item.permiteComplemento ? 'Sim' : 'Não') },
    { titulo: 'Ordem', celula: (item) => formatarInteiro(item.ordem), numerica: true },
    { titulo: 'Situação', celula: (item) => <Situacao ativo={item.ativo} /> },
  ]

  return (
    <Card
      titulo={grupo.nome}
      subtitulo={detalhes.join(' · ')}
      acao={
        <div className={styles.botoes}>
          <Button variante="secundaria" onClick={aoNovoItem}>
            Novo item
          </Button>
          <Button
            variante="secundaria"
            aria-label={`Editar o grupo ${grupo.nome}`}
            onClick={aoEditarGrupo}
          >
            Editar grupo
          </Button>
          <Button
            variante="secundaria"
            aria-label={`${grupo.ativo ? 'Inativar' : 'Reativar'} o grupo ${grupo.nome}`}
            onClick={aoAlternarGrupo}
          >
            {grupo.ativo ? 'Inativar grupo' : 'Reativar grupo'}
          </Button>
          <Button
            variante="secundaria"
            aria-label={`Excluir o grupo ${grupo.nome}`}
            onClick={aoExcluirGrupo}
          >
            Excluir grupo
          </Button>
        </div>
      }
    >
      <Tabela
        legenda={`Itens de ${grupo.nome}`}
        colunas={colunas}
        linhas={grupo.itens ?? []}
        chave={(item) => item.id ?? 0}
        vazio={{ titulo: 'Nenhum item neste grupo' }}
        acoes={(item) => (
          <>
            <Button
              variante="secundaria"
              aria-label={`Editar ${item.nome}`}
              onClick={() => aoEditarItem(item)}
            >
              Editar
            </Button>
            <Button
              variante="secundaria"
              aria-label={`${item.ativo ? 'Inativar' : 'Reativar'} ${item.nome}`}
              onClick={() => aoAlternarItem(item)}
            >
              {item.ativo ? 'Inativar' : 'Reativar'}
            </Button>
            <Button
              variante="secundaria"
              aria-label={`Excluir ${item.nome}`}
              onClick={() => aoExcluirItem(item)}
            >
              Excluir
            </Button>
          </>
        )}
      />
    </Card>
  )
}
