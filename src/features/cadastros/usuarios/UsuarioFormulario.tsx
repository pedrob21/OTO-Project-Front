import { useQuery } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { listarEstabelecimentos } from '@/api/estabelecimentos'
import { CampoTexto } from '@/components/ui/CampoTexto'
import { Select } from '@/components/ui/Select'
import type { Usuario } from '@/types/dominio'
import styles from '../Cadastros.module.css'
import { errosVisiveis, type FalhaDaApi } from '../falhaDaApi'
import { Formulario } from '../Formulario'
import { errosDoUsuario, formDoUsuario, PERFIS, type FormUsuario } from './usuarios'

type UsuarioFormularioProps = {
  usuario?: Usuario
  /** o próprio ADMIN logado: não pode tirar o próprio perfil */
  proprio: boolean
  enviando: boolean
  falha: FalhaDaApi | null
  aoEnviar: (form: FormUsuario) => void
  aoCancelar: () => void
}

export function UsuarioFormulario({
  usuario,
  proprio,
  enviando,
  falha,
  aoEnviar,
  aoCancelar,
}: UsuarioFormularioProps) {
  const [form, setForm] = useState(() => formDoUsuario(usuario))
  const [tentouEnviar, setTentouEnviar] = useState(false)
  const id = useId()
  const novo = usuario === undefined
  const erros = errosVisiveis(errosDoUsuario(form, novo), tentouEnviar, falha)

  const estabelecimentos = useQuery({
    queryKey: ['estabelecimentos'],
    queryFn: ({ signal }) => listarEstabelecimentos({}, signal),
  })

  function mudar<C extends keyof FormUsuario>(campo: C, valor: FormUsuario[C]) {
    setForm((atual) => ({ ...atual, [campo]: valor }))
  }

  function alternar(estabelecimentoId: number, marcado: boolean) {
    mudar(
      'estabelecimentoIds',
      marcado
        ? [...form.estabelecimentoIds, estabelecimentoId]
        : form.estabelecimentoIds.filter((atual) => atual !== estabelecimentoId),
    )
  }

  function enviar() {
    setTentouEnviar(true)
    if (Object.keys(errosDoUsuario(form, novo)).length === 0) aoEnviar(form)
  }

  return (
    <Formulario
      aoEnviar={enviar}
      aoCancelar={aoCancelar}
      enviando={enviando}
      rotuloEnviar={novo ? 'Criar usuário' : 'Salvar'}
      falha={falha?.mensagem}
    >
      <CampoTexto
        rotulo="Nome"
        value={form.nome}
        maxLength={150}
        autoComplete="off"
        onChange={(evento) => mudar('nome', evento.target.value)}
        erro={erros.nome}
      />
      <CampoTexto
        rotulo="E-mail"
        type="email"
        value={form.email}
        maxLength={254}
        autoComplete="off"
        disabled={!novo}
        ajuda={novo ? 'É o login do usuário.' : 'O e-mail não muda depois do cadastro.'}
        onChange={(evento) => mudar('email', evento.target.value)}
        erro={erros.email}
      />
      <div>
        <Select
          rotulo="Perfil"
          variante="campo"
          valor={form.perfil}
          opcoes={[{ valor: '', rotulo: 'Escolha o perfil' }, ...PERFIS]}
          aoMudar={(valor) => mudar('perfil', valor as FormUsuario['perfil'])}
          disabled={proprio}
          aria-invalid={erros.perfil ? true : undefined}
          aria-describedby={`${id}-perfil`}
        />
        <p id={`${id}-perfil`} className={erros.perfil ? styles.erroCampo : styles.ajuda}>
          {erros.perfil ??
            (proprio
              ? 'Você não pode tirar o seu próprio perfil de administrador.'
              : 'O parceiro responde às pesquisas dos seus estabelecimentos.')}
        </p>
      </div>

      {form.perfil === 'PARCEIRO' && (
        <fieldset
          className={styles.grupo}
          aria-describedby={erros.estabelecimentoIds ? `${id}-estabelecimentos` : undefined}
        >
          <legend className={styles.legendaCampo}>Estabelecimentos</legend>
          {estabelecimentos.isPending && <p className={styles.ajuda}>Carregando…</p>}
          {estabelecimentos.isError && (
            <p role="alert" className={styles.erroCampo}>
              Não foi possível carregar os estabelecimentos.
            </p>
          )}
          {estabelecimentos.data && (
            <div className={styles.opcoes}>
              {estabelecimentos.data.map(({ id: estabelecimentoId = 0, nomeFantasia, ativo }) => (
                <label key={estabelecimentoId} className={styles.marcacao}>
                  <input
                    type="checkbox"
                    checked={form.estabelecimentoIds.includes(estabelecimentoId)}
                    onChange={(evento) => alternar(estabelecimentoId, evento.target.checked)}
                  />
                  {ativo === false ? `${nomeFantasia} (inativo)` : nomeFantasia}
                </label>
              ))}
            </div>
          )}
          {erros.estabelecimentoIds && (
            <p id={`${id}-estabelecimentos`} className={styles.erroCampo}>
              {erros.estabelecimentoIds}
            </p>
          )}
        </fieldset>
      )}
    </Formulario>
  )
}
