import { useEffect, useRef, useState } from 'react'

/** Largura atual do elemento, para o desenho do gráfico acompanhar o layout. */
export function useLargura<T extends HTMLElement>(larguraInicial: number) {
  const ref = useRef<T>(null)
  const [largura, setLargura] = useState(larguraInicial)

  useEffect(() => {
    const elemento = ref.current
    if (!elemento || typeof ResizeObserver === 'undefined') return

    const observador = new ResizeObserver(([entrada]) => {
      if (entrada && entrada.contentRect.width > 0) setLargura(entrada.contentRect.width)
    })
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [])

  return { ref, largura }
}
