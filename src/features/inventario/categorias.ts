import type { Esquemas } from '@/types/dominio'

export type CategoriaDeInventario = NonNullable<Esquemas['CatalogoGrupo']['categoria']>

export const CATEGORIAS: { codigo: CategoriaDeInventario; titulo: string }[] = [
  { codigo: 'SERVICOS_EQUIPAMENTOS', titulo: 'Serviços e equipamentos' },
  { codigo: 'ACESSIBILIDADE', titulo: 'Acessibilidade' },
  { codigo: 'SUSTENTABILIDADE', titulo: 'Sustentabilidade' },
]
