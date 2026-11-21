import { useMutation } from '@tanstack/react-query'
import { baixarResultadoCsv } from '@/api/resultados'
import { IconeDownload } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { ErroApi } from '@/components/ui/ErroApi'

type BaixarCsvButtonProps = {
  campanhaId: number
}

export function BaixarCsvButton({ campanhaId }: BaixarCsvButtonProps) {
  const download = useMutation({
    mutationFn: () => baixarResultadoCsv(campanhaId),
  })

  return (
    <>
      <Button
        variante="secundaria"
        iconeEsquerda={<IconeDownload tamanho={16} />}
        disabled={download.isPending}
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
