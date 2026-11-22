import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  alterarUsuario,
  criarUsuario,
  gerarLinkDeSenha,
  inativarUsuario,
  listarUsuarios,
  reativarUsuario,
} from '@/api/usuarios'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Carregando } from '@/components/ui/Carregando'
import { Dialogo } from '@/components/ui/Dialogo'
import { ErroApi } from '@/components/ui/ErroApi'
import { Tabela, type ColunaTabela } from '@/components/ui/Tabela'
import { useAuth } from '@/features/auth/AuthContext'
import type { Esquemas, Usuario } from '@/types/dominio'
import { CabecalhoCadastro } from '../CabecalhoCadastro'
import styles from '../Cadastros.module.css'
import { useMutacaoCadastro } from '../useMutacaoCadastro'
import { LinkDeAcesso } from './LinkDeAcesso'
import { UsuarioFormulario } from './UsuarioFormulario'
import { pedidoDoUsuario, REGRAS_USUARIO, rotuloDoPerfil, type FormUsuario } from './usuarios'

const CHAVE = ['usuarios']

type Edicao =
  | { tipo: 'novo' }
  | { tipo: 'editar'; usuario: Usuario }
  | { tipo: 'link'; usuario: Usuario; link: Esquemas['LinkAcesso']; criado: boolean }

function Situacao({ usuario }: { usuario: Usuario }) {
  if (!usuario.ativo) return <Badge variante="inativa">Inativo</Badge>
  if (usuario.primeiroAcessoPendente) return <Badge variante="aberta">Convite pendente</Badge>
  return <Badge variante="publicada">Ativo</Badge>
}

export function UsuariosPage() {
  const { usuario: logado } = useAuth()
  const [edicao, setEdicao] = useState<Edicao | null>(null)
  const [aviso, setAviso] = useState('')
  const usuarios = useQuery({ queryKey: CHAVE, queryFn: ({ signal }) => listarUsuarios(signal) })

  const fechar = () => setEdicao(null)
  const proprio = (usuario: Usuario) => usuario.id === logado?.id

  const salvar = useMutacaoCadastro({
    acao: (form: FormUsuario) => {
      const pedido = pedidoDoUsuario(form)
      if (edicao?.tipo === 'editar' && edicao.usuario.id !== undefined) {
        const { nome, perfil, estabelecimentoIds } = pedido
        return alterarUsuario(edicao.usuario.id, { nome, perfil, estabelecimentoIds }).then(
          (usuario) => ({ usuario, convite: undefined }),
        )
      }
      return criarUsuario(pedido)
    },
    invalidar: [CHAVE],
    regras: REGRAS_USUARIO,
    aoConcluir: ({ usuario, convite }) => {
      if (convite && usuario) {
        setEdicao({ tipo: 'link', usuario, link: convite, criado: true })
        setAviso(`Usuário ${usuario.nome} criado.`)
      } else {
        fechar()
        setAviso(`Usuário ${usuario?.nome} alterado.`)
      }
    },
  })

  const situacao = useMutacaoCadastro({
    acao: ({ usuario, ativo }: { usuario: Usuario; ativo: boolean }) =>
      ativo ? reativarUsuario(usuario.id ?? 0) : inativarUsuario(usuario.id ?? 0),
    invalidar: [CHAVE],
    aoConcluir: (_, { usuario, ativo }) =>
      setAviso(`Usuário ${usuario.nome} ${ativo ? 'reativado' : 'inativado'}.`),
  })

  const link = useMutacaoCadastro({
    acao: (usuario: Usuario) => gerarLinkDeSenha(usuario.id ?? 0),
    invalidar: [],
    aoConcluir: (novoLink, usuario) =>
      setEdicao({ tipo: 'link', usuario, link: novoLink, criado: false }),
  })

  function limpar() {
    salvar.reset()
    situacao.reset()
    link.reset()
    setAviso('')
  }

  function abrir(nova: Edicao) {
    limpar()
    setEdicao(nova)
  }

  const colunas: ColunaTabela<Usuario>[] = [
    {
      titulo: 'Nome',
      celula: (usuario) => (
        <>
          {usuario.nome}
          {proprio(usuario) && <span className={styles.secundario}> (você)</span>}
        </>
      ),
    },
    { titulo: 'E-mail', celula: (usuario) => usuario.email },
    { titulo: 'Perfil', celula: (usuario) => rotuloDoPerfil(usuario.perfil) },
    {
      titulo: 'Estabelecimentos',
      celula: (usuario) =>
        usuario.perfil === 'PARCEIRO'
          ? (usuario.estabelecimentos ?? []).map((item) => item.nomeFantasia).join(', ') || '—'
          : '—',
    },
    { titulo: 'Situação', celula: (usuario) => <Situacao usuario={usuario} /> },
  ]

  const falhaDaLinha = situacao.isError
    ? `Não foi possível ${situacao.variables.ativo ? 'reativar' : 'inativar'} ${situacao.variables.usuario.nome}.`
    : link.isError
      ? `Não foi possível gerar o link de ${link.variables.nome}.`
      : null

  return (
    <>
      <CabecalhoCadastro
        titulo="Usuários"
        introducao="Quem entra no sistema. O parceiro responde às pesquisas dos estabelecimentos vinculados a ele; o visualizador só consulta os resultados."
      />

      <p role="status" className={styles.aviso}>
        {aviso}
      </p>
      {falhaDaLinha && (
        <div className={styles.falhaDaPagina}>
          <ErroApi
            mensagem={falhaDaLinha}
            detalhe={situacao.falha?.mensagem ?? link.falha?.mensagem}
          />
        </div>
      )}

      <Card
        titulo="Usuários cadastrados"
        acao={<Button onClick={() => abrir({ tipo: 'novo' })}>Novo usuário</Button>}
      >
        {usuarios.isPending ? (
          <Carregando texto="Carregando usuários" reservarAltura />
        ) : usuarios.isError ? (
          <ErroApi
            mensagem="Não foi possível carregar os usuários."
            detalhe={usuarios.error.message}
            aoTentarNovamente={() => void usuarios.refetch()}
          />
        ) : (
          <Tabela
            legenda="Usuários cadastrados"
            colunas={colunas}
            linhas={usuarios.data}
            chave={(usuario) => usuario.id ?? 0}
            vazio={{
              titulo: 'Nenhum usuário cadastrado',
              descricao: 'Cadastre o primeiro em "Novo usuário".',
            }}
            acoes={(usuario) => (
              <>
                <Button
                  variante="secundaria"
                  aria-label={`Editar ${usuario.nome}`}
                  onClick={() => abrir({ tipo: 'editar', usuario })}
                >
                  Editar
                </Button>
                {usuario.ativo && (
                  <Button
                    variante="secundaria"
                    aria-label={`Gerar link de senha para ${usuario.nome}`}
                    disabled={link.isPending}
                    onClick={() => {
                      limpar()
                      link.mutate(usuario)
                    }}
                  >
                    Gerar link de senha
                  </Button>
                )}
                {!proprio(usuario) && (
                  <Button
                    variante="secundaria"
                    aria-label={`${usuario.ativo ? 'Inativar' : 'Reativar'} ${usuario.nome}`}
                    disabled={situacao.isPending}
                    onClick={() => {
                      limpar()
                      situacao.mutate({ usuario, ativo: !usuario.ativo })
                    }}
                  >
                    {usuario.ativo ? 'Inativar' : 'Reativar'}
                  </Button>
                )}
              </>
            )}
          />
        )}
      </Card>

      {(edicao?.tipo === 'novo' || edicao?.tipo === 'editar') && (
        <Dialogo
          key={edicao.tipo}
          titulo={edicao.tipo === 'novo' ? 'Novo usuário' : `Editar ${edicao.usuario.nome}`}
          descricao={
            edicao.tipo === 'novo'
              ? 'Depois de criar, você recebe o link para o usuário definir a senha.'
              : undefined
          }
          aoFechar={fechar}
        >
          <UsuarioFormulario
            usuario={edicao.tipo === 'editar' ? edicao.usuario : undefined}
            proprio={edicao.tipo === 'editar' && proprio(edicao.usuario)}
            enviando={salvar.isPending}
            falha={salvar.falha}
            aoEnviar={(form) => salvar.mutate(form)}
            aoCancelar={fechar}
          />
        </Dialogo>
      )}

      {edicao?.tipo === 'link' && (
        <Dialogo
          key="link"
          titulo={edicao.criado ? 'Usuário criado' : `Link de senha de ${edicao.usuario.nome}`}
          aoFechar={fechar}
        >
          <LinkDeAcesso link={edicao.link} nome={edicao.usuario.nome} aoConcluir={fechar} />
        </Dialogo>
      )}
    </>
  )
}
