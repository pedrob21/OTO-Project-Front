import type { DefCampo } from '../campos'
import type { RegraDoCampo } from '../falhaDaApi'

const ORDEM: DefCampo = {
  nome: 'ordem',
  rotulo: 'Ordem',
  tipo: 'inteiro',
  minimo: 1,
  maximo: 9999,
  ajuda: 'Posição nas listas. Sem ordem, o novo vai para o fim.',
}

function codigo(maximo: number, existente: boolean): DefCampo {
  return {
    nome: 'codigo',
    rotulo: 'Código',
    tipo: 'codigo',
    maximo,
    desativado: existente,
    ajuda: existente
      ? 'O código não muda: é a referência usada no resto do sistema.'
      : 'Opcional. Sem código, ele é gerado do nome, como AREA_DE_LAZER.',
  }
}

// Limites iguais aos da API (GrupoRequest e ItemRequest).
export function camposDoGrupo(existente: boolean): DefCampo[] {
  return [
    codigo(60, existente),
    { nome: 'nome', rotulo: 'Nome', obrigatorio: true, maximo: 150 },
    ORDEM,
    {
      nome: 'exclusivoSecretaria',
      rotulo: 'Exclusivo da Secretaria: o parceiro não vê nem preenche',
      tipo: 'marcacao',
    },
  ]
}

export function camposDoItem(existente: boolean): DefCampo[] {
  return [
    codigo(80, existente),
    { nome: 'nome', rotulo: 'Nome', obrigatorio: true, maximo: 200 },
    { nome: 'descricao', rotulo: 'Descrição', maximo: 300, largo: true },
    ORDEM,
    {
      nome: 'permiteComplemento',
      rotulo: 'Aceita complemento em texto, como no item "Outros"',
      tipo: 'marcacao',
    },
  ]
}

export const REGRAS_CATALOGO: RegraDoCampo[] = [{ campo: 'codigo', padrao: /código/i }]
