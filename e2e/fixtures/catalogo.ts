export const itemPiscina = () => ({
  id: 10,
  codigo: 'PISCINA',
  nome: 'Piscina',
  permiteComplemento: true,
  ordem: 1,
  ativo: true,
})

export const itemAcademia = () => ({
  id: 11,
  codigo: 'ACADEMIA',
  nome: 'Academia',
  permiteComplemento: false,
  ordem: 2,
  ativo: false,
})

export const itemSelo = () => ({
  id: 30,
  codigo: 'SELO',
  nome: 'Selo verde',
  permiteComplemento: false,
  ordem: 1,
  ativo: true,
})

export const grupoLazer = (itens = [itemPiscina()]) => ({
  id: 1,
  categoria: 'SERVICOS_EQUIPAMENTOS',
  codigo: 'LAZER',
  nome: 'Lazer',
  exclusivoSecretaria: false,
  ordem: 1,
  ativo: true,
  itens,
})

export const grupoSelos = (itens = [itemSelo()]) => ({
  id: 3,
  categoria: 'SUSTENTABILIDADE',
  codigo: 'SELOS',
  nome: 'Selos da Secretaria',
  exclusivoSecretaria: true,
  ordem: 1,
  ativo: true,
  itens,
})

export const catalogoPadrao = () => [grupoLazer(), grupoSelos()]
