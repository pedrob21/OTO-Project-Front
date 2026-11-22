/** O eixo Y: até onde vai, onde ficam as marcas e como cada uma é escrita. */
export type EscalaY = {
  maximo: number
  marcas: number[]
  formatarMarca: (valor: number) => string
  /** espaço à esquerda para o texto das marcas; marcas longas, como "R$ 1.000", pedem mais */
  larguraMarcas?: number
}

export const ESCALA_PERCENTUAL: EscalaY = {
  maximo: 100,
  marcas: [0, 25, 50, 75, 100],
  formatarMarca: (valor) => `${valor}%`,
}

const PASSOS_REDONDOS = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 8, 10]

/** 0 a quatro passos "redondos" (1; 1,25; 1,5; 2; 2,5… × 10ⁿ), cobrindo o maior valor. */
export function escalaAutomatica(
  maiorValor: number,
  formatarMarca: (valor: number) => string,
  larguraMarcas?: number,
): EscalaY {
  const bruto = maiorValor > 0 ? maiorValor / 4 : 1
  const potencia = 10 ** Math.floor(Math.log10(bruto))
  const fator = PASSOS_REDONDOS.find((passo) => passo * potencia >= bruto) ?? 10
  // toPrecision tira o resto de ponto flutuante (0,1 × 7,5 = 0,7500000000000001)
  const passo = Number((fator * potencia).toPrecision(12))
  return {
    maximo: Number((passo * 4).toPrecision(12)),
    marcas: [0, 1, 2, 3, 4].map((indice) => Number((indice * passo).toPrecision(12))),
    formatarMarca,
    larguraMarcas,
  }
}
