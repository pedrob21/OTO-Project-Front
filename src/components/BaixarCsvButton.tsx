import { useMutation } from '@tanstack/react-query'
import { baixarResultadoCsv } from '@/api/resultados'
import { IconeDownload } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { ErroApi } from '@/components/ui/ErroApi'

type BaixarCsvButtonProps = {
  campanhaId: number
  /** nome acessível, quando há vários botões na tela: "Baixar CSV de Agosto de 2026" */
  rotuloAcessivel?: string
}

export function BaixarCsvButton({ campanhaId, rotuloAcessivel }: BaixarCsvButtonProps) {
  const download = useMutation({
    mutationFn: () => baixarResultadoCsv(campanhaId),
  })

  return (
    <>
      <Button
        variante="secundaria"
        iconeEsquerda={<IconeDownload tamanho={16} />}
        disabled={download.isPending}
        aria-label={rotuloAcessivel}
        onClick={() => download.mutate()}
      >
        {download.isPending ? 'Baixando…' : 'Baixar CSV'}
      </Button>
      {download.error && (
        <ErroApi mensagem="Não foi possível baixar o CSV." detalhe={download.error.message} />
      )}
    </>
  )
}
