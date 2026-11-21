import type { Esquemas, Perfil, Usuario } from '@/types/dominio'
import type { ErrosDoFormulario, RegraDoCampo } from '../falhaDaApi'

export type FormUsuario = {
  nome: string
  email: string
  perfil: Perfil | ''
  estabelecimentoIds: number[]
}

export const PERFIS: { valor: Perfil; rotulo: string }[] = [
  { valor: 'ADMIN', rotulo: 'Administrador' },
  { valor: 'PARCEIRO', rotulo: 'Parceiro' },
  { valor: 'VISUALIZADOR', rotulo: 'Visualizador' },
]

// Limites iguais aos da API (UsuarioRequest).
const MAXIMO = { nome: 150, email: 254 }

// A API devolve essas regras em 422, sem `campos`.
export const REGRAS_USUARIO: RegraDoCampo[] = [
  { campo: 'email', padrao: /e-mail/i },
  { campo: 'estabelecimentoIds', padrao: /estabelecimento/i },
  { campo: 'perfil', padrao: /perfil/i },
]

export function rotuloDoPerfil(perfil: Perfil | undefined): string {
  return PERFIS.find((item) => item.valor === perfil)?.rotulo ?? '—'
}

export function formDoUsuario(usuario?: Usuario): FormUsuario {
  return {
    nome: usuario?.nome ?? '',
    email: usuario?.email ?? '',
    perfil: usuario?.perfil ?? '',
    estabelecimentoIds: (usuario?.estabelecimentos ?? []).flatMap(({ id }) =>
      id === undefined ? [] : [id],
    ),
  }
}

export function errosDoUsuario(form: FormUsuario, novo: boolean): ErrosDoFormulario {
  const erros: ErrosDoFormulario = {}
  const nome = form.nome.trim()
  const email = form.email.trim()

  if (!nome) erros.nome = 'Informe o nome.'
  else if (nome.length > MAXIMO.nome) erros.nome = `Use até ${MAXIMO.nome} caracteres.`

  if (novo) {
    if (!email) erros.email = 'Informe o e-mail.'
    else if (email.length > MAXIMO.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      erros.email = 'Informe um e-mail válido, como ana@hotel.com.'
    }
  }

  if (!form.perfil) erros.perfil = 'Escolha o perfil.'
  if (form.perfil === 'PARCEIRO' && form.estabelecimentoIds.length === 0) {
    erros.estabelecimentoIds = 'Escolha ao menos um estabelecimento para o parceiro.'
  }
  return erros
}

/** Só o PARCEIRO é vinculado a estabelecimentos: para os outros, a API recusa a lista. */
export function pedidoDoUsuario(form: FormUsuario): Esquemas['UsuarioRequest'] {
  const perfil = form.perfil as Perfil
  return {
    nome: form.nome.trim(),
    email: form.email.trim(),
    perfil,
    estabelecimentoIds: perfil === 'PARCEIRO' ? form.estabelecimentoIds : [],
  }
}

/** Endereço da página de senha que o ADMIN envia ao usuário. */
export function enderecoDoLink(token: string, origem = window.location.origin): string {
  return `${origem}/definir-senha?token=${encodeURIComponent(token)}`
}
