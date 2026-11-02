import type { Perfil } from '@/types/dominio'

export type ItemMenu = {
  rotulo: string
  /** sem destino, o item aparece desativado até a página existir */
  para?: string
  /** sem lista, aparece para todos os perfis */
  perfis?: Perfil[]
  temSubmenu?: boolean
}

export const ITENS_MENU: ItemMenu[] = [
  { rotulo: 'Painel', para: '/' },
  { rotulo: 'Pesquisas', perfis: ['ADMIN', 'PARCEIRO'], temSubmenu: true },
  { rotulo: 'Indicadores', temSubmenu: true },
  { rotulo: 'Relatórios', temSubmenu: true },
  { rotulo: 'Cadastros', temSubmenu: true },
]

export function itensDoPerfil(perfil: Perfil | undefined): ItemMenu[] {
  return ITENS_MENU.filter(
    (item) => !item.perfis || (perfil !== undefined && item.perfis.includes(perfil)),
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
