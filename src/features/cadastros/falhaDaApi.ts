import { ErroRequisicao } from '@/api/erros'

/** Campo → mensagem, com os nomes de campo da API ("email", "dados.cnpj"). */
export type ErrosDoFormulario = Record<string, string>

/** Regras do OTO (422) que dizem respeito a um campo, como o e-mail repetido: a API não as manda em `campos`. */
export type RegraDoCampo = { campo: string; padrao: RegExp }

export type FalhaDaApi = { campos: ErrosDoFormulario; mensagem?: string }

export function falhaDaApi(erro: unknown, regras: RegraDoCampo[] = []): FalhaDaApi | null {
  if (!(erro instanceof Error)) return null
  if (!(erro instanceof ErroRequisicao)) return { campos: {}, mensagem: erro.message }
  if (Object.keys(erro.campos).length > 0) return { campos: erro.campos, mensagem: erro.message }
  const regra = erro.status === 422 && regras.find(({ padrao }) => padrao.test(erro.message))
  if (regra) return { campos: { [regra.campo]: erro.message } }
  return { campos: {}, mensagem: erro.message }
}

/** Os erros da API valem sobre os da tela, e os da tela só aparecem depois de tentar enviar. */
export function errosVisiveis(
  daTela: ErrosDoFormulario,
  tentouEnviar: boolean,
  falha: FalhaDaApi | null,
): ErrosDoFormulario {
  return { ...(tentouEnviar ? daTela : {}), ...falha?.campos }
}
