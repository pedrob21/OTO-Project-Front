import type { components } from '@/api/schema'

/** Tipos da API, gerados do backend com `npm run api:tipos` (backend no ar). */
export type Esquemas = components['schemas']

export type Usuario = Esquemas['UsuarioResponse']
export type Perfil = NonNullable<Usuario['perfil']>
export type Modalidade = NonNullable<Esquemas['ResultadoResponse']['campanha']>['modalidade']
export type Indicador = NonNullable<Esquemas['SerieMensalResponse']['indicador']>
export type StatusRodada = NonNullable<Esquemas['RodadaResponse']['status']>
