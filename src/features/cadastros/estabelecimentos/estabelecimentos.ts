import { textoDoNumero } from '@/lib/numeros'
import type { Esquemas } from '@/types/dominio'
import { type DefCampo, erroDoCampo, valorDoCampo } from '../campos'
import {
  CAMPOS_CAPACIDADE as CAMPOS_DA_CAPACIDADE,
  errosDaCapacidade,
} from '../capacidades/capacidades'
import type { ErrosDoFormulario, RegraDoCampo } from '../falhaDaApi'

export type GrupoDeCampos = { titulo: string; campos: DefCampo[] }

// Limites iguais aos da API (DadosCadastrais e DadosSecretaria).
export const GRUPOS_DADOS: Record<
  'cadastrais' | 'endereco' | 'contato' | 'cadastur' | 'funcionamento',
  GrupoDeCampos
> = {
  cadastrais: {
    titulo: 'Dados cadastrais',
    campos: [
      { nome: 'dados.nomeFantasia', rotulo: 'Nome fantasia', obrigatorio: true, maximo: 200 },
      { nome: 'dados.razaoSocial', rotulo: 'Razão social', maximo: 200 },
      { nome: 'dados.cnpj', rotulo: 'CNPJ', tipo: 'cnpj', ajuda: '14 dígitos.' },
      { nome: 'dados.dataAbertura', rotulo: 'Data de abertura', tipo: 'data' },
      { nome: 'dados.cnae', rotulo: 'CNAE', maximo: 20 },
      { nome: 'dados.proprietarios', rotulo: 'Proprietários', maximo: 300, largo: true },
    ],
  },
  endereco: {
    titulo: 'Endereço',
    campos: [
      { nome: 'dados.endereco', rotulo: 'Endereço', maximo: 300, largo: true },
      { nome: 'dados.bairro', rotulo: 'Bairro', maximo: 120 },
      { nome: 'dados.regiao', rotulo: 'Região', maximo: 120 },
      { nome: 'dados.localizacao', rotulo: 'Localização', maximo: 300 },
      {
        nome: 'dados.latitude',
        rotulo: 'Latitude',
        tipo: 'decimal',
        minimo: -90,
        maximo: 90,
        casas: 6,
      },
      {
        nome: 'dados.longitude',
        rotulo: 'Longitude',
        tipo: 'decimal',
        minimo: -180,
        maximo: 180,
        casas: 6,
      },
    ],
  },
  contato: {
    titulo: 'Contato',
    campos: [
      { nome: 'dados.telefoneComercial', rotulo: 'Telefone comercial', maximo: 30 },
      { nome: 'dados.emailComercial', rotulo: 'E-mail comercial', tipo: 'email', maximo: 254 },
      { nome: 'dados.site', rotulo: 'Site', maximo: 300 },
      { nome: 'dados.facebook', rotulo: 'Facebook', maximo: 300 },
      { nome: 'dados.instagram', rotulo: 'Instagram', maximo: 300 },
    ],
  },
  cadastur: {
    titulo: 'Cadastur',
    campos: [
      { nome: 'dados.cadasturNumero', rotulo: 'Número do Cadastur', maximo: 30 },
      { nome: 'dados.cadasturValidade', rotulo: 'Validade do Cadastur', tipo: 'data' },
    ],
  },
  funcionamento: {
    titulo: 'Funcionamento',
    campos: [
      {
        nome: 'dados.funcionariosFixos',
        rotulo: 'Funcionários fixos',
        tipo: 'inteiro',
        minimo: 0,
      },
      {
        nome: 'dados.funcionariosTemporarios',
        rotulo: 'Funcionários temporários',
        tipo: 'inteiro',
        minimo: 0,
      },
      { nome: 'dados.horarioCheckIn', rotulo: 'Check-in', tipo: 'hora' },
      { nome: 'dados.horarioCheckOut', rotulo: 'Check-out', tipo: 'hora' },
      { nome: 'dados.formasReserva', rotulo: 'Formas de reserva', maximo: 300, largo: true },
      { nome: 'dados.formasPagamento', rotulo: 'Formas de pagamento', maximo: 300, largo: true },
    ],
  },
}

export const CAMPOS_SECRETARIA: DefCampo[] = [
  { nome: 'secretaria.contatoNome', rotulo: 'Contato para as pesquisas', maximo: 150 },
  { nome: 'secretaria.telefonePesquisas', rotulo: 'Telefone para as pesquisas', maximo: 30 },
  {
    nome: 'secretaria.emailPesquisas',
    rotulo: 'E-mail para as pesquisas',
    tipo: 'email',
    maximo: 254,
  },
]

export const CAMPOS_CAPACIDADE: DefCampo[] = CAMPOS_DA_CAPACIDADE.map((campo) => ({
  ...campo,
  nome: `capacidade.${campo.nome}`,
}))

export const EXIGENCIAS_CADASTUR = [
  { valor: '', rotulo: 'Não informado' },
  { valor: 'OBRIGATORIO', rotulo: 'Obrigatório' },
  { valor: 'OPCIONAL', rotulo: 'Opcional' },
  { valor: 'NAO_CONSTA', rotulo: 'Não consta' },
]

export const SITUACOES = [
  { valor: 'REGULAR', rotulo: 'Regular' },
  { valor: 'IRREGULAR', rotulo: 'Irregular' },
]

export const REGRAS_ESTABELECIMENTO: RegraDoCampo[] = [
  { campo: 'dados.cnpj', padrao: /CNPJ/ },
  { campo: 'capacidade.qtdUhPcd', padrao: /UH PCD/ },
  { campo: 'secretaria.tipoHospedagemCodigo', padrao: /tipo de hospedagem/i },
]

/** Valores digitados, pelo `nome` do campo. Marcações em booleano. */
export type FormEstabelecimento = Record<string, string | boolean>

function texto(valor: unknown): string {
  if (valor === null || valor === undefined) return ''
  return typeof valor === 'number' ? textoDoNumero(valor) : String(valor)
}

const CAMPOS_DADOS = Object.values(GRUPOS_DADOS).flatMap((grupo) => grupo.campos)

export function formDoEstabelecimento(
  estabelecimento?: Esquemas['EstabelecimentoResponse'],
  hoje = '',
): FormEstabelecimento {
  const dados: Record<string, unknown> = estabelecimento?.dados ?? {}
  const secretaria: Record<string, unknown> = estabelecimento?.secretaria ?? {}
  const form: FormEstabelecimento = {}
  for (const campo of CAMPOS_DADOS) form[campo.nome] = texto(dados[campo.nome.slice(6)])
  for (const campo of CAMPOS_SECRETARIA) form[campo.nome] = texto(secretaria[campo.nome.slice(11)])
  for (const campo of CAMPOS_CAPACIDADE) form[campo.nome] = ''
  form['capacidade.vigenteDesde'] = hoje
  form['dados.horarioCheckIn'] = texto(dados.horarioCheckIn).slice(0, 5)
  form['dados.horarioCheckOut'] = texto(dados.horarioCheckOut).slice(0, 5)
  form['dados.cadasturExigencia'] = texto(dados.cadasturExigencia)
  form['dados.possuiCadastur'] = dados.possuiCadastur === true
  form['dados.funcionamento24h'] =
    dados.funcionamento24h === true ? 'SIM' : dados.funcionamento24h === false ? 'NAO' : ''
  form['secretaria.tipoHospedagemCodigo'] = texto(secretaria.tipoHospedagemCodigo)
  form['secretaria.situacao'] = texto(secretaria.situacao) || 'REGULAR'
  form['secretaria.aceitaPesquisas'] = estabelecimento ? secretaria.aceitaPesquisas === true : true
  return form
}

export function errosDoEstabelecimento(
  form: FormEstabelecimento,
  novo: boolean,
  somenteDados = false,
): ErrosDoFormulario {
  const erros: ErrosDoFormulario = {}
  const campos = somenteDados
    ? CAMPOS_DADOS
    : [...CAMPOS_DADOS, ...CAMPOS_SECRETARIA, ...(novo ? CAMPOS_CAPACIDADE : [])]
  for (const campo of campos) {
    const erro = erroDoCampo(campo, String(form[campo.nome] ?? ''))
    if (erro) erros[campo.nome] = erro
  }
  if (!somenteDados && !form['secretaria.tipoHospedagemCodigo']) {
    erros['secretaria.tipoHospedagemCodigo'] = 'Escolha o tipo de hospedagem.'
  }
  if (novo && !erros['capacidade.qtdUhPcd'])
    Object.assign(erros, errosDaCapacidade(form, 'capacidade.'))
  return erros
}

function bloco(campos: DefCampo[], form: FormEstabelecimento, prefixo: string) {
  return Object.fromEntries(
    campos.map((campo) => [
      campo.nome.slice(prefixo.length + 1),
      valorDoCampo(campo, String(form[campo.nome] ?? '')),
    ]),
  )
}

function dadosDoPedido(form: FormEstabelecimento): Esquemas['DadosCadastrais'] {
  const hora = (valor: string | boolean | undefined) => (valor ? `${valor}:00` : undefined)
  return {
    ...bloco(CAMPOS_DADOS, form, 'dados'),
    nomeFantasia: String(form['dados.nomeFantasia']).trim(),
    horarioCheckIn: hora(form['dados.horarioCheckIn']),
    horarioCheckOut: hora(form['dados.horarioCheckOut']),
    cadasturExigencia:
      (form['dados.cadasturExigencia'] as Esquemas['DadosCadastrais']['cadasturExigencia']) ||
      undefined,
    possuiCadastur: form['dados.possuiCadastur'] === true,
    funcionamento24h:
      form['dados.funcionamento24h'] === '' ? undefined : form['dados.funcionamento24h'] === 'SIM',
  }
}

function secretariaDoPedido(form: FormEstabelecimento): Esquemas['DadosSecretaria'] {
  return {
    ...bloco(CAMPOS_SECRETARIA, form, 'secretaria'),
    tipoHospedagemCodigo: String(form['secretaria.tipoHospedagemCodigo']),
    situacao: form['secretaria.situacao'] as Esquemas['DadosSecretaria']['situacao'],
    aceitaPesquisas: form['secretaria.aceitaPesquisas'] === true,
  }
}

export function pedidoDeCriacao(form: FormEstabelecimento): Esquemas['CriacaoRequest'] {
  return {
    dados: dadosDoPedido(form),
    secretaria: secretariaDoPedido(form),
    capacidade: bloco(CAMPOS_CAPACIDADE, form, 'capacidade') as Esquemas['CapacidadeRequest'],
  }
}

/** O PARCEIRO altera só os dados cadastrais: o bloco da Secretaria nem vai no pedido. */
export function pedidoDeAlteracao(
  form: FormEstabelecimento,
  somenteDados = false,
): Esquemas['AtualizacaoRequest'] {
  return somenteDados
    ? { dados: dadosDoPedido(form) }
    : { dados: dadosDoPedido(form), secretaria: secretariaDoPedido(form) }
}
