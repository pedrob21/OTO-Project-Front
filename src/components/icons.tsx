import type { SVGProps } from 'react'

type IconeProps = SVGProps<SVGSVGElement> & { tamanho?: number }

function Icone({ tamanho = 16, children, ...props }: IconeProps) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export function IconeSetaBaixo(props: IconeProps) {
  return (
    <Icone {...props}>
      <path d="m5 9 7 7 7-7" />
    </Icone>
  )
}

export function IconeDownload(props: IconeProps) {
  return (
    <Icone {...props}>
      <path d="M12 3v13" />
      <path d="m6 11 6 6 6-6" />
      <path d="M4 21h16" />
    </Icone>
  )
}

export function IconeAlta(props: IconeProps) {
  return (
    <Icone {...props}>
      <path d="M6 18 18 6" />
      <path d="M8 6h10v10" />
    </Icone>
  )
}

export function IconeBaixa(props: IconeProps) {
  return (
    <Icone {...props}>
      <path d="M6 6l12 12" />
      <path d="M18 8v10H8" />
    </Icone>
  )
}

export function IconeSeta(props: IconeProps) {
  return (
    <Icone {...props}>
      <path d="M4 12h16" />
      <path d="m14 6 6 6-6 6" />
    </Icone>
  )
}

export function IconeRelogio(props: IconeProps) {
  return (
    <Icone {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Icone>
  )
}

export function IconeCheck(props: IconeProps) {
  return (
    <Icone {...props}>
      <path d="m5 13 4 4L19 7" />
    </Icone>
  )
}
