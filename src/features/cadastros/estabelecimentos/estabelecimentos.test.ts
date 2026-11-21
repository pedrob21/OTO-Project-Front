import { describe, expect, it } from 'vitest'
import {
  errosDoEstabelecimento,
  formDoEstabelecimento,
  pedidoDeAlteracao,
  pedidoDeCriacao,
} from './estabelecimentos'

const CADASTRO = {
  id: 12,
  ativo: true,
  dados: {
    nomeFantasia: 'Hotel Exemplo',
    cnpj: '12345678000190',
    latitude: -20.7376,
    funcionariosFixos: 25,
    funcionamento24h: false,
    possuiCadastur: true,
    cadasturExigencia: 'OBRIGATORIO' as const,
    horarioCheckIn: '14:00:00',
  },
  secretaria: {
    tipoHospedagemCodigo: 'HOTEL',
    situacao: 'IRREGULAR' as const,
    aceitaPesquisas: false,
    contatoNome: 'Maria',
  },
}

function preenchido() {
  return {
    ...formDoEstabelecimento(undefined, '2026-11-16'),
    'dados.nomeFantasia': 'Pousada Sol',
    'secretaria.tipoHospedagemCodigo': 'POUSADA',
    'capacidade.qtdUh': '10',
    'capacidade.qtdUhPcd': '1',
    'capacidade.qtdLeitos': '30',
    'capacidade.maxLeitosPorUh': '4',
  }
}

describe('formDoEstabelecimento', () => {
  it('novo: regular, aceita pesquisas e capacidade vigente desde hoje', () => {
    const form = formDoEstabelecimento(undefined, '2026-11-16')

    expect(form['secretaria.situacao']).toBe('REGULAR')
    expect(form['secretaria.aceitaPesquisas']).toBe(true)
    expect(form['capacidade.vigenteDesde']).toBe('2026-11-16')
    expect(form['dados.nomeFantasia']).toBe('')
  })

  it('edição parte do cadastro, com números em pt-BR e o horário sem segundos', () => {
    const form = formDoEstabelecimento(CADASTRO)

    expect(form).toMatchObject({
      'dados.nomeFantasia': 'Hotel Exemplo',
      'dados.latitude': '-20,7376',
      'dados.funcionariosFixos': '25',
      'dados.funcionamento24h': 'NAO',
      'dados.possuiCadastur': true,
      'dados.horarioCheckIn': '14:00',
      'dados.razaoSocial': '',
      'secretaria.situacao': 'IRREGULAR',
      'secretaria.aceitaPesquisas': false,
      'secretaria.contatoNome': 'Maria',
    })
  })
})

describe('errosDoEstabelecimento', () => {
  it('pede nome fantasia, tipo e a capacidade inicial', () => {
    const erros = errosDoEstabelecimento(formDoEstabelecimento(undefined, '2026-11-16'), true)

    expect(Object.keys(erros).toSorted()).toEqual([
      'capacidade.maxLeitosPorUh',
      'capacidade.qtdLeitos',
      'capacidade.qtdUh',
      'capacidade.qtdUhPcd',
      'dados.nomeFantasia',
      'secretaria.tipoHospedagemCodigo',
    ])
  })

  it('UH PCD não passa o total de UH, como na API', () => {
    const erros = errosDoEstabelecimento({ ...preenchido(), 'capacidade.qtdUhPcd': '11' }, true)

    expect(erros).toEqual({ 'capacidade.qtdUhPcd': 'As UH PCD não podem passar o total de UH.' })
  })

  it('na edição não há capacidade', () => {
    expect(errosDoEstabelecimento(formDoEstabelecimento(CADASTRO), false)).toEqual({})
  })
})

describe('pedidos', () => {
  it('criação com os três blocos e vazio como ausente', () => {
    const pedido = pedidoDeCriacao({
      ...preenchido(),
      'dados.cnpj': '12.345.678/0001-90',
      'dados.longitude': '-48,9',
      'dados.horarioCheckOut': '12:00',
      'dados.funcionamento24h': 'SIM',
    })

    expect(pedido.dados).toMatchObject({
      nomeFantasia: 'Pousada Sol',
      cnpj: '12345678000190',
      longitude: -48.9,
      horarioCheckOut: '12:00:00',
      funcionamento24h: true,
      possuiCadastur: false,
    })
    expect(pedido.dados.razaoSocial).toBeUndefined()
    expect(pedido.dados.cadasturExigencia).toBeUndefined()
    expect(pedido.secretaria).toEqual({
      tipoHospedagemCodigo: 'POUSADA',
      situacao: 'REGULAR',
      aceitaPesquisas: true,
    })
    expect(pedido.capacidade).toEqual({
      vigenteDesde: '2026-11-16',
      qtdUh: 10,
      qtdUhPcd: 1,
      qtdLeitos: 30,
      maxLeitosPorUh: 4,
    })
  })

  it('alteração manda dados e secretaria, sem capacidade', () => {
    const pedido = pedidoDeAlteracao(formDoEstabelecimento(CADASTRO))

    expect(Object.keys(pedido)).toEqual(['dados', 'secretaria'])
    expect(pedido.dados).toMatchObject({
      nomeFantasia: 'Hotel Exemplo',
      latitude: -20.7376,
      funcionamento24h: false,
      cadasturExigencia: 'OBRIGATORIO',
      horarioCheckIn: '14:00:00',
    })
    expect(pedido.secretaria).toMatchObject({ situacao: 'IRREGULAR', contatoNome: 'Maria' })
  })
})
