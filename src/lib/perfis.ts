import type { Perfil } from '@/types/dominio'

export type ItemSubmenu = { rotulo: string; para: string }

export type ItemMenu = {
  rotulo: string
  /** sem destino, o item aparece desativado até a página existir */
  para?: string
  /** sem lista, aparece para todos os perfis */
  perfis?: Perfil[]
  /** destino conforme o perfil; perfil sem página vê o item desativado */
  paginaPorPerfil?: Partial<Record<Perfil, string>>
  temSubmenu?: boolean
  /** com a lista, o item abre o submenu em vez de levar a uma página */
  submenu?: ItemSubmenu[]
}

export const SUBMENU_CADASTROS: ItemSubmenu[] = [
  { rotulo: 'Usuários', para: '/cadastros/usuarios' },
  { rotulo: 'Estabelecimentos', para: '/cadastros/estabelecimentos' },
  { rotulo: 'Parâmetros de cálculo', para: '/cadastros/parametros' },
  { rotulo: 'Hospedagem caseira (RHC)', para: '/cadastros/rhc' },
  { rotulo: 'Referências', para: '/cadastros/referencias' },
  { rotulo: 'Inventário', para: '/cadastros/inventario' },
  { rotulo: 'Série histórica', para: '/cadastros/historico' },
]

export const ITENS_MENU: ItemMenu[] = [
  { rotulo: 'Painel', para: '/' },
  {
    rotulo: 'Pesquisas',
    perfis: ['ADMIN', 'PARCEIRO'],
    paginaPorPerfil: { ADMIN: '/pesquisas', PARCEIRO: '/pesquisas/responder' },
    temSubmenu: true,
  },
  { rotulo: 'Meu estabelecimento', para: '/meu-estabelecimento', perfis: ['PARCEIRO'] },
  { rotulo: 'Indicadores', para: '/indicadores' },
  { rotulo: 'Relatórios', para: '/relatorios' },
  { rotulo: 'Cadastros', perfis: ['ADMIN'], temSubmenu: true, submenu: SUBMENU_CADASTROS },
]

export function itensDoPerfil(perfil: Perfil | undefined): ItemMenu[] {
  return ITENS_MENU.filter(
    (item) => !item.perfis || (perfil !== undefined && item.perfis.includes(perfil)),
  ).map(({ paginaPorPerfil, ...item }) =>
    paginaPorPerfil ? { ...item, para: perfil && paginaPorPerfil[perfil] } : item,
  )
}

/** "Admin OTO" → "AO"; "Ana" → "A" */
export function iniciais(nome: string | undefined): string {
  const palavras = (nome ?? '').trim().split(/\s+/).filter(Boolean)
  return palavras
    .slice(0, 2)
    .map((palavra) => palavra.charAt(0).toUpperCase())
    .join('')
}
