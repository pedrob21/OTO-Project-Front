import { lerDecimal, textoDoNumero } from '@/lib/numeros'

export type TipoCampo = 'texto' | 'email' | 'data' | 'hora' | 'inteiro' | 'decimal' | 'cnpj'

/** Campo de texto do formulário. `nome` é o caminho na API, como os `campos` dos erros. */
export type DefCampo = {
  nome: string
  rotulo: string
  tipo?: TipoCampo
  obrigatorio?: boolean
  /** caracteres, ou o maior valor nos números */
  maximo?: number
  /** menor valor nos números */
  minimo?: number
  /** casas decimais */
  casas?: number
  ajuda?: string
  largo?: boolean
}

const DATA = /^\d{4}-\d{2}-\d{2}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function semPontuacao(cnpj: string): string {
  return cnpj.replace(/[.\-/\s]/g, '')
}

/** Erro de um campo, ou undefined. */
export function erroDoCampo(campo: DefCampo, valor: string): string | undefined {
  const digitado = valor.trim()
  if (!digitado) return campo.obrigatorio ? 'Preencha este campo.' : undefined

  switch (campo.tipo) {
    case 'inteiro':
    case 'decimal': {
      const numero = lerDecimal(digitado, campo.tipo === 'inteiro' ? 0 : (campo.casas ?? 2))
      if (numero === null) {
        return campo.tipo === 'inteiro'
          ? 'Use um número inteiro.'
          : `Use um número com até ${campo.casas ?? 2} casas decimais.`
      }
      if (campo.minimo !== undefined && numero < campo.minimo) {
        return `Use um valor a partir de ${textoDoNumero(campo.minimo)}.`
      }
      if (campo.maximo !== undefined && numero > campo.maximo) {
        return `Use um valor até ${textoDoNumero(campo.maximo)}.`
      }
      return undefined
    }
    case 'cnpj':
      return /^\d{14}$/.test(semPontuacao(digitado)) ? undefined : 'O CNPJ tem 14 dígitos.'
    case 'data':
      return DATA.test(digitado) ? undefined : 'Informe uma data válida.'
    case 'email':
      if (!EMAIL.test(digitado)) return 'Informe um e-mail válido.'
      break
  }
  if (campo.maximo !== undefined && digitado.length > campo.maximo) {
    return `Use até ${campo.maximo} caracteres.`
  }
  return undefined
}

/** Valor que vai para a API: vazio vira undefined (a API grava null). */
export function valorDoCampo(campo: DefCampo, valor: string): string | number | undefined {
  const digitado = valor.trim()
  if (!digitado) return undefined
  if (campo.tipo === 'inteiro' || campo.tipo === 'decimal') {
    return lerDecimal(digitado, campo.casas ?? 6) ?? undefined
  }
  if (campo.tipo === 'cnpj') return semPontuacao(digitado)
  return digitado
}
