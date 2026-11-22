// Lighthouse CI: `npm run lighthouse` (celular) ou `LHCI_PERFIL=desktop npm run lighthouse`.
// O servidor de lighthouse/servidor.mjs serve o build e simula a API.

const perfil = process.env.LHCI_PERFIL === 'desktop' ? 'desktop' : 'celular'
const base = 'http://localhost:4179'

// Medidos em 22/11/2026, com folga para a variação entre execuções.
const limites =
  perfil === 'desktop'
    ? { desempenho: 0.9, lcp: 1500, tbt: 200 }
    : { desempenho: 0.75, lcp: 3500, tbt: 600 }

const paginas = ['/login', '/definir-senha?token=x', '/', '/metodologia', '/cadastros/usuarios']

module.exports = {
  ci: {
    collect: {
      startServerCommand: 'node lighthouse/servidor.mjs',
      startServerReadyPattern: 'pronto',
      url: paginas.map((pagina) => `${base}${pagina}`),
      numberOfRuns: 2,
      chromePath: process.env.CHROME_PATH || undefined,
      settings: {
        ...(perfil === 'desktop' ? { preset: 'desktop' } : {}),
        chromeFlags: '--no-sandbox --headless=new',
      },
    },
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:performance': ['warn', { minScore: limites.desempenho }],
        'categories:seo': ['warn', { minScore: 0.9 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: limites.lcp }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: limites.tbt }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: `.lighthouseci/relatorio-${perfil}`,
    },
  },
}
