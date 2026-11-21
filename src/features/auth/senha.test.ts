import { describe, expect, it } from 'vitest'
import { validarNovaSenha } from './senha'

describe('validarNovaSenha', () => {
  it('aceita de 8 a 72 caracteres iguais na confirmação', () => {
    expect(validarNovaSenha('12345678', '12345678')).toEqual({})
    expect(validarNovaSenha('a'.repeat(72), 'a'.repeat(72))).toEqual({})
  })

  it('recusa senha com menos de 8 caracteres', () => {
    expect(validarNovaSenha('1234567', '1234567').novaSenha).toBe(
      'A senha deve ter pelo menos 8 caracteres.',
    )
    expect(validarNovaSenha('', '').novaSenha).toBeDefined()
  })

  it('recusa senha com mais de 72 caracteres', () => {
    expect(validarNovaSenha('a'.repeat(73), 'a'.repeat(73)).novaSenha).toBe(
      'A senha deve ter no máximo 72 caracteres.',
    )
  })

  it('recusa confirmação diferente', () => {
    expect(validarNovaSenha('12345678', '12345679')).toEqual({
      confirmacao: 'As senhas não conferem.',
    })
  })
})
