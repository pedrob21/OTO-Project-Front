export const CAPACIDADE_ANTIGA = {
  id: 1,
  vigenteDesde: '2025-01-01',
  qtdUh: 20,
  qtdUhPcd: 1,
  qtdLeitos: 50,
  maxLeitosPorUh: 3,
  leitosUteis: 40,
}

export const resumoDePousada = (id: number, nomeFantasia: string, ativo = true) => ({
  id,
  nomeFantasia,
  tipoHospedagemCodigo: 'POUSADA',
  situacao: 'REGULAR',
  ativo,
})
