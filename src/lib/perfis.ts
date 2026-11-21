import type { Perfil } from '@/types/dominio'

export type ItemMenu = {
  rotulo: string
  /** sem destino, o item aparece desativado até a página existir */
  para?: string
  /** sem lista, aparece para todos os perfis */
  perfis?: Perfil[]
  /** destino conforme o perfil; perfil sem página vê o item desativado */
  paginaPorPerfil?: Partial<Record<Perfil, string>>
  temSubmenu?: boolean
}

export const ITENS_MENU: ItemMenu[] = [
  { rotulo: 'Painel', para: '/' },
  {
    rotulo: 'Pesquisas',
    perfis: ['ADMIN', 'PARCEIRO'],
    paginaPorPerfil: { ADMIN: '/pesquisas/nova', PARCEIRO: '/pesquisas/responder' },
    temSubmenu: true,
  },
  { rotulo: 'Indicadores', temSubmenu: true },
  { rotulo: 'Relatórios', temSubmenu: true },
  { rotulo: 'Cadastros', temSubmenu: true },
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
