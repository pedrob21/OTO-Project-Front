export const CATALOGO = [
  {
    id: 1,
    categoria: 'SERVICOS_EQUIPAMENTOS',
    codigo: 'LAZER',
    nome: 'Lazer',
    exclusivoSecretaria: false,
    ordem: 1,
    ativo: true,
    itens: [
      {
        id: 10,
        codigo: 'PISCINA',
        nome: 'Piscina',
        permiteComplemento: true,
        ordem: 1,
        ativo: true,
      },
      { id: 11, codigo: 'SAUNA', nome: 'Sauna', permiteComplemento: false, ordem: 2, ativo: false },
    ],
  },
  {
    id: 2,
    categoria: 'SERVICOS_EQUIPAMENTOS',
    codigo: 'ANTIGOS',
    nome: 'Antigos',
    exclusivoSecretaria: true,
    ordem: 2,
    ativo: false,
    itens: [],
  },
  {
    id: 3,
    categoria: 'ACESSIBILIDADE',
    codigo: 'ESTRUTURA',
    nome: 'Estrutura',
    exclusivoSecretaria: false,
    ordem: 1,
    ativo: true,
    itens: [
      { id: 20, codigo: 'RAMPA', nome: 'Rampa', permiteComplemento: false, ordem: 1, ativo: true },
    ],
  },
]
