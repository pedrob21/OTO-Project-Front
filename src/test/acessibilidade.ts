import axe from 'axe-core'

type Opcoes = {
  /**
   * Confere se todo o conteúdo está em regiões (main, nav, header…). Só faz sentido com o
   * AppLayout: as telas testadas sozinhas não têm o <main> em volta.
   */
  verificarRegioes?: boolean
}

/**
 * Roda o axe-core na tela renderizada e devolve as violações em texto ("regra: ajuda (alvo)"),
 * para o erro do teste já dizer o que corrigir. O contraste de cores fica de fora: o jsdom não
 * calcula estilos, e essa verificação é feita no navegador.
 */
export async function violacoesDeAcessibilidade(
  alvo: Element = document.body,
  { verificarRegioes = false }: Opcoes = {},
): Promise<string[]> {
  const { violations } = await axe.run(alvo, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: verificarRegioes },
    },
  })
  return violations.map(
    (violacao) =>
      `${violacao.id}: ${violacao.help} (${violacao.nodes.map((no) => no.target.join(' ')).join(', ')})`,
  )
}
