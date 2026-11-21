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
    expect(rotulos('VISUALIZADOR')).toEqual(['Painel', 'Indicadores', 'Relatórios'])
  })

  it('Cadastros só aparece para o ADMIN, com o submenu', () => {
    const cadastros = itensDoPerfil('ADMIN').find((item) => item.rotulo === 'Cadastros')

    expect(cadastros?.submenu?.map((item) => item.para)).toEqual([
      '/cadastros/usuarios',
      '/cadastros/estabelecimentos',
      '/cadastros/parametros',
      '/cadastros/rhc',
      '/cadastros/referencias',
      '/cadastros/inventario',
      '/cadastros/historico',
    ])
    expect(rotulos('PARCEIRO')).not.toContain('Cadastros')
    expect(rotulos('VISUALIZADOR')).not.toContain('Cadastros')
    expect(rotulos(undefined)).not.toContain('Cadastros')
  })

  it('Pesquisas leva cada perfil à sua página', () => {
    const pesquisas = (perfil: Parameters<typeof itensDoPerfil>[0]) =>
      itensDoPerfil(perfil).find((item) => item.rotulo === 'Pesquisas')

    expect(pesquisas('ADMIN')?.para).toBe('/pesquisas')
    expect(pesquisas('PARCEIRO')?.para).toBe('/pesquisas/responder')
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
