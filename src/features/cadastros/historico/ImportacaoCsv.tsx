import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { importarHistorico } from '@/api/historico'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CampoTexto } from '@/components/ui/CampoTexto'
import { formatarInteiro } from '@/lib/formatos'
import styles from '../Cadastros.module.css'
import { useMutacaoCadastro } from '../useMutacaoCadastro'
import local from './Historico.module.css'

// A API lista no máximo 100 erros.
const MAXIMO_LISTADO = 100

function plural(quantidade: number | undefined, singular: string, varios: string) {
  return `${formatarInteiro(quantidade)} ${quantidade === 1 ? singular : varios}`
}

export function ImportacaoCsv() {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [fonte, setFonte] = useState('')
  const [tentouEnviar, setTentouEnviar] = useState(false)

  const queryClient = useQueryClient()

  // Com erro em alguma linha, nada foi gravado: a lista não muda.
  const importacao = useMutacaoCadastro({
    acao: ({ arquivo, fonte }: { arquivo: File; fonte: string }) =>
      importarHistorico(arquivo, fonte.trim()),
    invalidar: [],
    aoConcluir: ({ erros }) => {
      if (!erros?.length) void queryClient.invalidateQueries({ queryKey: ['historico'] })
    },
  })
  const resultado = importacao.data
  const erros = resultado?.erros ?? []

  const erroDoArquivo = tentouEnviar && !arquivo ? 'Escolha o arquivo CSV.' : undefined
  const erroDaFonte =
    tentouEnviar && !fonte.trim()
      ? 'Informe a fonte dos dados.'
      : fonte.trim().length > 200
        ? 'Use até 200 caracteres.'
        : undefined

  function importar() {
    setTentouEnviar(true)
    if (arquivo && fonte.trim() && fonte.trim().length <= 200) {
      importacao.mutate({ arquivo, fonte })
    }
  }

  return (
    <Card
      titulo="Importar CSV"
      subtitulo="A importação é tudo ou nada: se alguma linha tiver erro, nenhuma é gravada. Valores que já existem para a mesma combinação são atualizados."
    >
      <div className={local.importacao}>
        <p className={styles.ajuda}>
          Colunas, separadas por ponto e vírgula, como o Excel salva:{' '}
          <code>indicador;modalidade;ano;mes;feriado;tipo;valor;observacao</code>. O cabeçalho é
          opcional; informe o mês ou o feriado; vírgula é o separador decimal.
        </p>
        <form
          className={styles.grade}
          noValidate
          onSubmit={(evento) => {
            evento.preventDefault()
            importar()
          }}
        >
          <CampoTexto
            rotulo="Arquivo CSV"
            type="file"
            accept=".csv,text/csv"
            erro={erroDoArquivo}
            onChange={(evento) => {
              setArquivo(evento.target.files?.[0] ?? null)
              importacao.reset()
            }}
          />
          <CampoTexto
            rotulo="Fonte dos dados"
            value={fonte}
            maxLength={200}
            placeholder="Indicadores do Turismo 2017-2025"
            erro={erroDaFonte}
            onChange={(evento) => setFonte(evento.target.value)}
          />
          <div className={local.enviar}>
            <Button type="submit" disabled={importacao.isPending}>
              {importacao.isPending ? 'Importando…' : 'Importar'}
            </Button>
          </div>
        </form>

        {importacao.falha?.mensagem && (
          <div role="alert" className={styles.falha}>
            <p>Não foi possível importar. Nada foi gravado.</p>
            <p>{importacao.falha.mensagem}</p>
          </div>
        )}

        {resultado && erros.length === 0 && (
          <p role="status" className={local.sucesso}>
            Importação concluída: {plural(resultado.linhasLidas, 'linha lida', 'linhas lidas')},{' '}
            {plural(resultado.inseridos, 'valor novo', 'valores novos')} e{' '}
            {plural(resultado.atualizados, 'atualizado', 'atualizados')}.
          </p>
        )}

        {erros.length > 0 && (
          <div role="alert" className={local.errosDaImportacao}>
            <p className={local.tituloErros}>
              Nada foi gravado: {plural(erros.length, 'erro', 'erros')} em{' '}
              {plural(resultado?.linhasLidas, 'linha lida', 'linhas lidas')}. Corrija o arquivo e
              importe de novo.
            </p>
            {erros.length >= MAXIMO_LISTADO && (
              <p>A lista mostra só os primeiros {MAXIMO_LISTADO} erros.</p>
            )}
            <ul className={local.listaErros}>
              {erros.map(({ linha, mensagem }, indice) => (
                <li key={`${linha}-${indice}`}>
                  {linha ? `Linha ${linha}` : 'Arquivo'}: {mensagem}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  )
}
