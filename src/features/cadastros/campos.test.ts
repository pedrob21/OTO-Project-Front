import { describe, expect, it } from 'vitest'
import { erroDoCampo, valorDoCampo, type DefCampo } from './campos'

const nome: DefCampo = { nome: 'nome', rotulo: 'Nome', obrigatorio: true, maximo: 5 }
const uh: DefCampo = { nome: 'uh', rotulo: 'UH', tipo: 'inteiro', minimo: 1, maximo: 30 }
const taxa: DefCampo = { nome: 'taxa', rotulo: 'Taxa', tipo: 'decimal', minimo: 0, maximo: 100 }

describe('erroDoCampo', () => {
  it('obrigatório e tamanho', () => {
    expect(erroDoCampo(nome, '  ')).toBe('Preencha este campo.')
    expect(erroDoCampo(nome, 'Ana Souza')).toBe('Use até 5 caracteres.')
    expect(erroDoCampo(nome, 'Ana')).toBeUndefined()
    expect(erroDoCampo({ ...nome, obrigatorio: false }, '')).toBeUndefined()
  })

  it('inteiro com limites', () => {
    expect(erroDoCampo(uh, '2,5')).toBe('Use um número inteiro.')
    expect(erroDoCampo(uh, '0')).toBe('Use um valor a partir de 1.')
    expect(erroDoCampo(uh, '31')).toBe('Use um valor até 30.')
    expect(erroDoCampo(uh, '30')).toBeUndefined()
  })

  it('decimal com vírgula ou ponto e até duas casas', () => {
    expect(erroDoCampo(taxa, '80,5')).toBeUndefined()
    expect(erroDoCampo(taxa, '80.5')).toBeUndefined()
    expect(erroDoCampo(taxa, '80,555')).toBe('Use um número com até 2 casas decimais.')
    expect(erroDoCampo(taxa, '100,01')).toBe('Use um valor até 100.')
  })

  it('CNPJ, data e e-mail', () => {
    const cnpj: DefCampo = { nome: 'cnpj', rotulo: 'CNPJ', tipo: 'cnpj' }
    expect(erroDoCampo(cnpj, '12.345.678/0001-90')).toBeUndefined()
    expect(erroDoCampo(cnpj, '1234')).toBe('O CNPJ tem 14 dígitos.')
    expect(erroDoCampo({ nome: 'd', rotulo: 'Data', tipo: 'data' }, '2026-13')).toBe(
      'Informe uma data válida.',
    )
    expect(erroDoCampo({ nome: 'e', rotulo: 'E-mail', tipo: 'email' }, 'ana@')).toBe(
      'Informe um e-mail válido.',
    )
  })
})

describe('valorDoCampo', () => {
  it('vazio vira undefined, números viram número e o CNPJ perde a pontuação', () => {
    expect(valorDoCampo(nome, ' ')).toBeUndefined()
    expect(valorDoCampo(nome, ' Ana ')).toBe('Ana')
    expect(valorDoCampo(taxa, '80,5')).toBe(80.5)
    expect(valorDoCampo(uh, '12')).toBe(12)
    expect(valorDoCampo({ nome: 'c', rotulo: 'CNPJ', tipo: 'cnpj' }, '12.345.678/0001-90')).toBe(
      '12345678000190',
    )
  })
})
