import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  alterarGrupo,
  alterarItem,
  buscarCatalogoCompleto,
  criarGrupo,
  criarItem,
  excluirGrupo,
  excluirItem,
  inativarGrupo,
  inativarItem,
  reativarGrupo,
  reativarItem,
} from '@/api/inventario'
import { Button } from '@/components/ui/Button'
import { Carregando } from '@/components/ui/Carregando'
import { Confirmacao } from '@/components/ui/Confirmacao'
import { Dialogo } from '@/components/ui/Dialogo'
import { EstadoVazio } from '@/components/ui/EstadoVazio'
import { ErroApi } from '@/components/ui/ErroApi'
import type { Esquemas } from '@/types/dominio'
import { CATEGORIAS } from '@/features/inventario/categorias'
import { CabecalhoCadastro } from '../CabecalhoCadastro'
import styles from '../Cadastros.module.css'
import { formDosCampos, pedidoDosCampos, type FormDeCampos } from '../campos'
import { FormularioDeCampos } from '../FormularioDeCampos'
import { Abas } from '../referencias/Abas'
import { useMutacaoCadastro } from '../useMutacaoCadastro'
import { camposDoGrupo, camposDoItem, REGRAS_CATALOGO } from './catalogo'
import { GrupoDoCatalogo, type GrupoCatalogo, type ItemCatalogo } from './GrupoDoCatalogo'

const CHAVE = ['inventario']

type Edicao =
  | { tipo: 'novoGrupo' }
  | { tipo: 'grupo'; grupo: GrupoCatalogo }
  | { tipo: 'excluirGrupo'; grupo: GrupoCatalogo }
  | { tipo: 'novoItem'; grupo: GrupoCatalogo }
  | { tipo: 'item'; item: ItemCatalogo }
  | { tipo: 'excluirItem'; item: ItemCatalogo }

export function InventarioPage() {
  const [ativa, setAtiva] = useState(0)
  const [edicao, setEdicao] = useState<Edicao | null>(null)
  const [aviso, setAviso] = useState('')
  const categoria = CATEGORIAS[ativa] ?? CATEGORIAS[0]!
  const fechar = () => setEdicao(null)

  const catalogo = useQuery({
    queryKey: [...CHAVE, 'catalogo-completo'],
    queryFn: ({ signal }) => buscarCatalogoCompleto(signal),
  })
  const grupos = (catalogo.data ?? []).filter((grupo) => grupo.categoria === categoria.codigo)

  // O editor de inventário dos estabelecimentos lê o catálogo de ativos: muda junto.
  const salvarGrupo = useMutacaoCadastro({
    acao: (form: FormDeCampos) => {
      const existente = edicao?.tipo === 'grupo' ? edicao.grupo : undefined
      const pedido = {
        ...pedidoDosCampos(camposDoGrupo(!!existente), form),
        categoria: existente?.categoria ?? categoria.codigo,
      } as Esquemas['GrupoRequest']
      return existente ? alterarGrupo(existente.id ?? 0, pedido) : criarGrupo(pedido)
    },
    invalidar: [CHAVE],
    regras: REGRAS_CATALOGO,
    aoConcluir: (salvo) => {
      setAviso(`Grupo ${salvo.nome} ${edicao?.tipo === 'novoGrupo' ? 'criado' : 'alterado'}.`)
      fechar()
    },
  })

  const salvarItem = useMutacaoCadastro({
    acao: (form: FormDeCampos) => {
      const existente = edicao?.tipo === 'item' ? edicao.item : undefined
      const pedido = pedidoDosCampos(camposDoItem(!!existente), form) as Esquemas['ItemRequest']
      if (existente) return alterarItem(existente.id ?? 0, pedido)
      return criarItem(edicao?.tipo === 'novoItem' ? (edicao.grupo.id ?? 0) : 0, pedido)
    },
    invalidar: [CHAVE],
    regras: REGRAS_CATALOGO,
    aoConcluir: (salvo) => {
      setAviso(`Item ${salvo.nome} ${edicao?.tipo === 'novoItem' ? 'criado' : 'alterado'}.`)
      fechar()
    },
  })

  const situacao = useMutacaoCadastro({
    acao: (alvo: { grupo?: GrupoCatalogo; item?: ItemCatalogo }) => {
      if (alvo.grupo) {
        return (alvo.grupo.ativo ? inativarGrupo : reativarGrupo)(alvo.grupo.id ?? 0)
      }
      return (alvo.item?.ativo ? inativarItem : reativarItem)(alvo.item?.id ?? 0)
    },
    invalidar: [CHAVE],
    aoConcluir: (_, alvo) => {
      const nome = alvo.grupo?.nome ?? alvo.item?.nome
      const ativo = alvo.grupo ? alvo.grupo.ativo : alvo.item?.ativo
      setAviso(`${alvo.grupo ? 'Grupo' : 'Item'} ${nome} ${ativo ? 'inativado' : 'reativado'}.`)
    },
  })

  const exclusao = useMutacaoCadastro({
    acao: (alvo: Extract<Edicao, { tipo: 'excluirGrupo' | 'excluirItem' }>) =>
      alvo.tipo === 'excluirGrupo'
        ? excluirGrupo(alvo.grupo.id ?? 0)
        : excluirItem(alvo.item.id ?? 0),
    invalidar: [CHAVE],
    aoConcluir: (_, alvo) => {
      setAviso(
        alvo.tipo === 'excluirGrupo'
          ? `Grupo ${alvo.grupo.nome} excluído.`
          : `Item ${alvo.item.nome} excluído.`,
      )
      fechar()
    },
  })

  function abrir(nova: Edicao) {
    salvarGrupo.reset()
    salvarItem.reset()
    situacao.reset()
    exclusao.reset()
    setAviso('')
    setEdicao(nova)
  }

  function alternar(alvo: { grupo?: GrupoCatalogo; item?: ItemCatalogo }) {
    salvarGrupo.reset()
    salvarItem.reset()
    exclusao.reset()
    setAviso('')
    situacao.mutate(alvo)
  }

  const grupoEmEdicao = edicao?.tipo === 'grupo' ? edicao.grupo : undefined
  const itemEmEdicao = edicao?.tipo === 'item' ? edicao.item : undefined

  return (
    <>
      <CabecalhoCadastro
        titulo="Inventário"
        introducao="Catálogo dos serviços, equipamentos, itens de acessibilidade e de sustentabilidade que cada estabelecimento marca no inventário. O código não muda depois de criado. O que já foi marcado por algum estabelecimento não pode ser excluído: inative."
      />

      <p role="status" className={styles.aviso}>
        {aviso}
      </p>
      {situacao.falha?.mensagem && (
        <p role="alert" className={styles.falha}>
          {situacao.falha.mensagem}
        </p>
      )}

      {catalogo.isPending ? (
        <Carregando texto="Carregando o catálogo" />
      ) : catalogo.isError ? (
        <ErroApi
          mensagem="Não foi possível carregar o catálogo do inventário."
          detalhe={catalogo.error.message}
          aoTentarNovamente={() => void catalogo.refetch()}
        />
      ) : (
        <Abas
          rotulo="Categorias do inventário"
          abas={CATEGORIAS.map((item) => item.titulo)}
          ativa={ativa}
          aoMudar={setAtiva}
        >
          <Button onClick={() => abrir({ tipo: 'novoGrupo' })}>Novo grupo</Button>
          {grupos.length === 0 ? (
            <EstadoVazio titulo={`Nenhum grupo em ${categoria.titulo}`} />
          ) : (
            grupos.map((grupo) => (
              <GrupoDoCatalogo
                key={grupo.id}
                grupo={grupo}
                aoNovoItem={() => abrir({ tipo: 'novoItem', grupo })}
                aoEditarGrupo={() => abrir({ tipo: 'grupo', grupo })}
                aoAlternarGrupo={() => alternar({ grupo })}
                aoExcluirGrupo={() => abrir({ tipo: 'excluirGrupo', grupo })}
                aoEditarItem={(item) => abrir({ tipo: 'item', item })}
                aoAlternarItem={(item) => alternar({ item })}
                aoExcluirItem={(item) => abrir({ tipo: 'excluirItem', item })}
              />
            ))
          )}
        </Abas>
      )}

      {(edicao?.tipo === 'novoGrupo' || edicao?.tipo === 'grupo') && (
        <Dialogo
          titulo={grupoEmEdicao ? `Editar ${grupoEmEdicao.nome}` : 'Novo grupo'}
          aoFechar={fechar}
        >
          <FormularioDeCampos
            campos={camposDoGrupo(!!grupoEmEdicao)}
            inicial={formDosCampos(camposDoGrupo(!!grupoEmEdicao), grupoEmEdicao)}
            rotuloEnviar={grupoEmEdicao ? 'Salvar' : 'Criar'}
            enviando={salvarGrupo.isPending}
            falha={salvarGrupo.falha}
            aoEnviar={(form) => salvarGrupo.mutate(form)}
            aoCancelar={fechar}
          />
        </Dialogo>
      )}

      {(edicao?.tipo === 'novoItem' || edicao?.tipo === 'item') && (
        <Dialogo
          titulo={itemEmEdicao ? `Editar ${itemEmEdicao.nome}` : 'Novo item'}
          descricao={edicao.tipo === 'novoItem' ? `Em ${edicao.grupo.nome}.` : undefined}
          aoFechar={fechar}
        >
          <FormularioDeCampos
            campos={camposDoItem(!!itemEmEdicao)}
            inicial={formDosCampos(camposDoItem(!!itemEmEdicao), itemEmEdicao)}
            rotuloEnviar={itemEmEdicao ? 'Salvar' : 'Criar'}
            enviando={salvarItem.isPending}
            falha={salvarItem.falha}
            aoEnviar={(form) => salvarItem.mutate(form)}
            aoCancelar={fechar}
          />
        </Dialogo>
      )}

      {(edicao?.tipo === 'excluirGrupo' || edicao?.tipo === 'excluirItem') && (
        <Confirmacao
          titulo={`Excluir ${edicao.tipo === 'excluirGrupo' ? edicao.grupo.nome : edicao.item.nome}`}
          mensagem={
            edicao.tipo === 'excluirGrupo'
              ? 'Só dá para excluir um grupo sem itens. Se ele já foi usado, inative.'
              : 'Só dá para excluir um item que nenhum estabelecimento marcou. Se ele já foi usado, inative.'
          }
          rotuloConfirmar="Excluir"
          enviando={exclusao.isPending}
          falha={exclusao.falha?.mensagem}
          aoConfirmar={() => exclusao.mutate(edicao)}
          aoCancelar={fechar}
        />
      )}
    </>
  )
}
