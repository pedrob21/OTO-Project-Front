import { describe, expect, it } from 'vitest'
import {
  enderecoDoLink,
  errosDoUsuario,
  formDoUsuario,
  pedidoDoUsuario,
  rotuloDoPerfil,
} from './usuarios'

const VAZIO = { nome: '', email: '', perfil: '' as const, estabelecimentoIds: [] }

describe('errosDoUsuario', () => {
  it('novo usuário pede nome, e-mail e perfil', () => {
    expect(errosDoUsuario(VAZIO, true)).toEqual({
      nome: 'Informe o nome.',
      email: 'Informe o e-mail.',
      perfil: 'Escolha o perfil.',
    })
  })

  it('na edição o e-mail não é conferido, porque não muda', () => {
    expect(errosDoUsuario({ ...VAZIO, nome: 'Ana', perfil: 'ADMIN' }, false)).toEqual({})
  })

  it.each(['ana', 'ana@', 'ana@hotel', 'a na@hotel.com'])('e-mail inválido: %s', (email) => {
    expect(errosDoUsuario({ ...VAZIO, email }, true).email).toMatch(/e-mail válido/)
  })

  it('nome com mais de 150 caracteres', () => {
    expect(errosDoUsuario({ ...VAZIO, nome: 'a'.repeat(151) }, false).nome).toBe(
      'Use até 150 caracteres.',
    )
  })

  it('PARCEIRO precisa de estabelecimento; os outros não', () => {
    expect(errosDoUsuario({ ...VAZIO, perfil: 'PARCEIRO' }, false).estabelecimentoIds).toBeDefined()
    expect(
      errosDoUsuario({ ...VAZIO, perfil: 'PARCEIRO', estabelecimentoIds: [3] }, false)
        .estabelecimentoIds,
    ).toBeUndefined()
    expect(
      errosDoUsuario({ ...VAZIO, perfil: 'VISUALIZADOR' }, false).estabelecimentoIds,
    ).toBeUndefined()
  })
})

describe('pedidoDoUsuario', () => {
  it('apara os textos e só manda estabelecimentos para o PARCEIRO', () => {
    const form = {
      nome: ' Ana ',
      email: ' ana@hotel.com ',
      perfil: 'ADMIN' as const,
      estabelecimentoIds: [3],
    }

    expect(pedidoDoUsuario(form)).toEqual({
      nome: 'Ana',
      email: 'ana@hotel.com',
      perfil: 'ADMIN',
      estabelecimentoIds: [],
    })
    expect(pedidoDoUsuario({ ...form, perfil: 'PARCEIRO' }).estabelecimentoIds).toEqual([3])
  })
})

describe('formDoUsuario', () => {
  it('parte do usuário da API', () => {
    expect(
      formDoUsuario({
        nome: 'Ana',
        email: 'ana@hotel.com',
        perfil: 'PARCEIRO',
        estabelecimentos: [{ id: 12, nomeFantasia: 'Hotel' }, { nomeFantasia: 'sem id' }],
      }),
    ).toEqual({ nome: 'Ana', email: 'ana@hotel.com', perfil: 'PARCEIRO', estabelecimentoIds: [12] })
    expect(formDoUsuario()).toEqual(VAZIO)
  })
})

describe('textos', () => {
  it('rótulo do perfil', () => {
    expect(rotuloDoPerfil('VISUALIZADOR')).toBe('Visualizador')
    expect(rotuloDoPerfil(undefined)).toBe('—')
  })

  it('endereço do link de senha com o token escapado', () => {
    expect(enderecoDoLink('a+b/c', 'https://oto.app')).toBe(
      'https://oto.app/definir-senha?token=a%2Bb%2Fc',
    )
  })
})
