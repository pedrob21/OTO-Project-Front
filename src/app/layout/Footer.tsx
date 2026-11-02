import selo from '@/assets/selo-observatorio.png'
import styles from './Footer.module.css'

export function Footer() {
  return (
    <footer className={styles.rodape}>
      <div className={styles.conteudo}>
        <div className={styles.instituicao}>
          <p className={styles.nome}>Observatório de Turismo de Olímpia</p>
          <p>Secretaria Municipal de Turismo da Estância Turística de Olímpia</p>
          <p className={styles.projeto}>Protótipo acadêmico da Equipe 4 · dados ilustrativos</p>
        </div>
        <img
          src={selo}
          alt="Selo do Observatório de Turismo de Olímpia"
          width={106}
          height={106}
          className={styles.selo}
        />
        <p className={styles.nota}>
          Taxa de ocupação ponderada pelas UH dos respondentes. Turistas estimados pela média entre
          o mínimo e o máximo de leitos por UH, com projeção dos não respondentes, da hospedagem
          caseira e do day use.
        </p>
      </div>
    </footer>
  )
}
