export const RODADA = {
  id: 5,
  codigo: '005/26',
  titulo: 'Consolidada de outubro',
  status: 'ABERTA',
  dataAbertura: '2026-11-01',
  prazoResposta: '2026-11-20',
  campanhas: [{ id: 50, nome: 'Consolidada de outubro de 2026', publicada: false }],
}

export const ACOMPANHAMENTO = {
  rodadaId: 5,
  codigo: '005/26',
  status: 'ABERTA',
  campanhas: [
    {
      campanhaId: 50,
      nome: 'Consolidada de outubro de 2026',
      qtdMh: 3,
      qtdRespondentes: 2,
      leitosTotal: 13508,
      leitosRespondentes: 9237,
      percentualLeitosRespondentes: 68.38,
      percentualMinimoPublicacao: 70,
      atingiuMinimo: false,
      estabelecimentos: [
        {
          estabelecimentoId: 7,
          nomeFantasia: 'Hotel Thermas',
          tipoHospedagemCodigo: 'HOTEL',
          qtdLeitos: 4271,
          respondeu: false,
          contatoNome: 'Marta',
          telefonePesquisas: '(17) 3281-0000',
          aceitaPesquisas: true,
        },
        {
          estabelecimentoId: 8,
          nomeFantasia: 'Pousada do Sol',
          tipoHospedagemCodigo: 'POUSADA',
          qtdLeitos: 37,
          respondeu: true,
          versao: 2,
          enviadoEm: '2026-11-05T13:00:00Z',
          aceitaPesquisas: false,
        },
        {
          estabelecimentoId: 9,
          nomeFantasia: 'Resort Águas',
          tipoHospedagemCodigo: 'RESORT',
          qtdLeitos: 9200,
          respondeu: true,
          versao: 1,
          enviadoEm: '2026-11-03T10:00:00Z',
        },
      ],
    },
  ],
}
