import { describe, expect, it } from 'vitest'
import { iniciais, itensDoPerfil } from './perfis'

function rotulos(perfil: Parameters<typeof itensDoPerfil>[0]) {
  return itensDoPerfil(perfil).map((item) => item.rotulo)
}

describe('itensDoPerfil', () => {
  it('ADMIN e PARCEIRO veem Pesquisas', () => {
    expect(rotulos('ADMIN')).toContain('Pesquisas')
    expect(rotulos('PARCEIRO')).toContain('Pesquisas')
  })

  it('VISUALIZADOR não vê Pesquisas', () => {
    expect(rotulos('VISUALIZADOR')).toEqual(['Painel', 'Indicadores', 'Relatórios', 'Cadastros'])
  })

  it('perfil desconhecido só vê o que é de todos', () => {
    expect(rotulos(undefined)).not.toContain('Pesquisas')
  })
})

describe('iniciais', () => {
  it.each([
    ['Admin OTO', 'AO'],
    ['Ana', 'A'],
    ['maria da  silva', 'MD'],
    ['', ''],
    [undefined, ''],
  ])('%s → "%s"', (nome, esperado) => {
    expect(iniciais(nome)).toBe(esperado)
  })
})
