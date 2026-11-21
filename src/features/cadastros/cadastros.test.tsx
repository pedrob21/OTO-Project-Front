import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ErroRequisicao } from '@/api/erros'
import { errosVisiveis, falhaDaApi } from './falhaDaApi'
import { useMutacaoCadastro } from './useMutacaoCadastro'

describe('falhaDaApi', () => {
  const regras = [{ campo: 'email', padrao: /e-mail/i }]

  it('sem erro, não há falha', () => {
    expect(falhaDaApi(null)).toBeNull()
  })

  it('erro de validação leva os campos e a mensagem geral', () => {
    const erro = new ErroRequisicao(400, 'Corrija os campos indicados.', { nome: 'obrigatório' })

    expect(falhaDaApi(erro, regras)).toEqual({
      campos: { nome: 'obrigatório' },
      mensagem: 'Corrija os campos indicados.',
    })
  })

  it('regra do OTO que é de um campo vai para o campo', () => {
    const erro = new ErroRequisicao(422, 'Já existe um usuário com este e-mail.')

    expect(falhaDaApi(erro, regras)).toEqual({
      campos: { email: 'Já existe um usuário com este e-mail.' },
    })
  })

  it('outras falhas ficam na mensagem geral', () => {
    expect(falhaDaApi(new ErroRequisicao(403, 'Acesso negado.'), regras)).toEqual({
      campos: {},
      mensagem: 'Acesso negado.',
    })
    expect(falhaDaApi(new ErroRequisicao(0, 'Sem conexão com e-mail'), regras)?.campos).toEqual({})
  })

  it('erros da tela só aparecem depois de tentar enviar, e os da API valem mais', () => {
    const daTela = { nome: 'Informe o nome.', email: 'Informe o e-mail.' }
    const falha = { campos: { email: 'repetido' } }

    expect(errosVisiveis(daTela, false, falha)).toEqual({ email: 'repetido' })
    expect(errosVisiveis(daTela, true, null)).toEqual(daTela)
    expect(errosVisiveis(daTela, true, falha)).toEqual({
      nome: 'Informe o nome.',
      email: 'repetido',
    })
  })
})

describe('useMutacaoCadastro', () => {
  function preparar() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    return { queryClient, wrapper }
  }

  it('busca a lista de novo antes de concluir', async () => {
    const { queryClient, wrapper } = preparar()
    const buscarLista = vi.fn().mockResolvedValueOnce(['a']).mockResolvedValue(['a', 'b'])
    const listaAoConcluir: unknown[] = []
    const aoConcluir = vi.fn(() => listaAoConcluir.push(queryClient.getQueryData(['itens'])))
    const { result } = renderHook(
      () => ({
        lista: useQuery({ queryKey: ['itens'], queryFn: buscarLista }),
        criar: useMutacaoCadastro({
          acao: async (nome: string) => ({ nome }),
          invalidar: [['itens']],
          aoConcluir,
        }),
      }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.lista.data).toEqual(['a']))

    await act(() => result.current.criar.mutateAsync('b'))

    expect(aoConcluir).toHaveBeenCalledWith({ nome: 'b' }, 'b')
    expect(listaAoConcluir).toEqual([['a', 'b']])
  })

  it('expõe a falha da API já separada por campo', async () => {
    const { wrapper } = preparar()
    const { result } = renderHook(
      () =>
        useMutacaoCadastro({
          acao: async () => {
            throw new ErroRequisicao(422, 'Já existe um estabelecimento com este CNPJ.')
          },
          invalidar: [],
          regras: [{ campo: 'dados.cnpj', padrao: /CNPJ/ }],
        }),
      { wrapper },
    )

    act(() => result.current.mutate(undefined))

    await waitFor(() =>
      expect(result.current.falha).toEqual({
        campos: { 'dados.cnpj': 'Já existe um estabelecimento com este CNPJ.' },
      }),
    )
  })
})
