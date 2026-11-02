const REFERENCIA = '/docs/referencia/painel-oto-desktop.png'

export type Area = [x: number, y: number, largura: number, altura: number]

/** Trecho da tela exportada, em coordenadas do frame de 1440 px. */
export function Recorte({ area: [x, y, largura, altura] }: { area: Area }) {
  return (
    <div
      style={{
        width: largura,
        height: altura,
        backgroundImage: `url(${REFERENCIA})`,
        backgroundSize: '1440px auto',
        backgroundPosition: `${-x}px ${-(y + 1)}px`,
      }}
    />
  )
}
