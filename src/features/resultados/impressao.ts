/**
 * Abre a impressão do navegador, onde dá para salvar em PDF. O título da aba vira o nome sugerido
 * do arquivo, e volta ao normal depois.
 */
export function gerarPdf(nomeDaCampanha: string | undefined) {
  const tituloAnterior = document.title
  document.title = `Relatório OTO - ${nomeDaCampanha ?? 'resultado da campanha'}`
  window.addEventListener('afterprint', () => (document.title = tituloAnterior), { once: true })
  window.print()
}
