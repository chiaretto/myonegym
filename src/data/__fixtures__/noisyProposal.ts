import type { MyOneGymDB } from '../../db/db'
import { createCategory, createDay, createExercise } from '../../db/repos'
import type { CatalogProposal } from '../catalogContract'

/**
 * The exchange from the bug report, transcribed.
 *
 * A real catalog and the proposal Gemini actually returned for it, kept byte
 * for byte rather than reduced to a minimal case: the two defects it carries
 * (a `mediaUrl` serialized as the *text* `"null"`, and an exercise pointing at
 * a category the same proposal dropped) were both invisible in the small
 * hand-written proposals the suite had until now, and the long real URLs — with
 * their `?fit=…&ssl=1` query strings — are part of what has to keep validating.
 *
 * The ids in the report (`Cardio` is 7, `HIIT` is 10) are positions here, not
 * literals: seeding returns the ids the database actually handed out and the
 * proposal is built from those, so the fixture works in a fresh database and in
 * a shared one whose auto-increment has already moved on.
 */

/** Ids by position — `categories[0]` is Peito, `exercises[9]` is HIIT. */
export interface SeededCatalog {
  categories: number[]
  exercises: number[]
  days: number[]
}

/** `[name, mediaUrl, categoryId]`, in id order — exercise 1 first. */
const EXERCISES: [string, string | null, number][] = [
  ['Supino Reto com Barra', 'https://www.mundoboaforma.com.br/wp-content/uploads/2020/12/supino-reto.gif', 1],
  ['Supino Inclinado com Barra', 'https://www.mundoboaforma.com.br/wp-content/uploads/2020/12/supino-inclinado-com-barra.gif', 1],
  ['Crucifixo Reto', 'https://static1.minhavida.com.br/articles/5b/21/98/c7/makatserchykshutterstock-orig-1.jpg', 1],
  ['Tríceps Pulley (Barra Reta)', 'https://i0.wp.com/meutreinador.com/wp-content/uploads/2024/04/Passo-03_Extensao-de-Triceps-na-Polia.png?resize=675%2C811&ssl=1', 4],
  ['Tríceps Testa com Barra Reta', 'https://www.hipertrofia.org/blog/wp-content/uploads/2024/02/barbell-lying-triceps-extension-skull-crusher.gif', 4],
  ['Mergulho em Paralelas', 'https://www.mundoboaforma.com.br/wp-content/uploads/2020/12/paralelas.gif', 4],
  ['Prancha Abdominal (Isometria)', 'https://treinomestre.com.br/wp-content/uploads/2017/01/prancha-isometrica-abdominal.jpg', 6],
  ['Elevação de Pernas na Barra Fixa', 'https://www.hipertrofia.org/blog/wp-content/uploads/2019/10/c.jpg', 6],
  ['Abdominal Oblíquo com Anilha', 'https://www.mundoboaforma.com.br/wp-content/uploads/2021/09/abdominal-obliquo-rotacao-russa-com-anilha-e-pernas-parra-cima.gif', 6],
  // The one the proposal returns as the string "null".
  ['HIIT (Esteira ou Bike)', null, 7],
  ['Barra Fixa Braço Fechado', 'https://www.mundoboaforma.com.br/wp-content/uploads/2016/08/costas-barra-fixa-fechada-chinup.gif', 2],
  ['Remada Curvada com Barra', 'https://treinomestre.com.br/wp-content/uploads/2015/03/remada-curvada-capa.jpg', 2],
  ['Pulldown na Polia', 'https://www.hipertrofia.org/blog/wp-content/uploads/2024/09/pulldown-corda.gif', 2],
  ['Rosca Direta com Barra', 'https://grandeatleta.com.br/wp-content/uploads/2018/07/rosca-direta.gif', 3],
  ['Rosca Martelo com Halteres', 'https://treinomestre.com.br/wp-content/uploads/2017/12/Rosca-Martelo-com-halteres.jpg', 3],
  ['Rosca Concentrada (1 Braço)', 'https://treinomestre.com.br/wp-content/uploads/2018/09/rosca-concentrada-erros-.jpg', 3],
  ['Barra Fixa Braço Aberto', 'https://grandeatleta.com.br/wp-content/uploads/2018/09/na-maquina-auxilio.jpg', 2],
  ['Desenvolvimento com Halteres', 'https://i0.wp.com/meutreinador.com/wp-content/uploads/2023/12/03_Desenvolvimento-com-Halteres-Sentado.gif?fit=1080%2C1080&ssl=1', 5],
  ['Elevação Lateral', 'https://i0.wp.com/meutreinador.com/wp-content/uploads/2023/11/elevacao-lateral-com-halteres.gif?fit=720%2C720&ssl=1', 5],
  ['Elevação Frontal com Anilha', 'https://www.hipertrofia.org/blog/wp-content/uploads/2018/09/elevacao-frontal-com-anilha-v2.gif', 5],
  ['Remada Alta com Barra', 'https://treinototal.com.br/wp-content/uploads/2023/04/trapezio-1.jpg', 5],
  ['Encolhimento para Trapézio (Halteres)', 'https://www.hipertrofia.org/blog/wp-content/uploads/2024/01/dumbbell-shrug.gif', 8],
  ['Puxada Frontal Aberta na Polia', 'https://www.mundoboaforma.com.br/wp-content/uploads/2020/12/costas-puxada-aberta-com-barra-no-pulley.gif', 2],
  ['Puxada com Triângulo (Pegada Fechada)', 'https://www.mundoboaforma.com.br/wp-content/uploads/2020/12/costas-puxada-para-frente-no-pulley-com-triangulo.gif', 2],
  ['Remada Sentada na Polia (Triangulo Neutro)', 'https://fitcron.com/wp-content/uploads/2021/04/26611301-Cable-Seated-Row-with-V-bar_Back_720.gif', 2],
  ['Puxada Articulada Unilateral', 'https://meutreinador.com/wp-content/uploads/2023/11/145_Puxada-alta-unilateral.jpg', 2],
  ['Voador Inverso (Peck Deck Reverso)', 'https://www.mundoboaforma.com.br/wp-content/uploads/2020/12/ombros-voador-invertido-na-maquina.gif', 2],
]

/** Category names in id order — Peito is 1, Trapézio is 8. */
const CATEGORIES = ['Peito', 'Costas', 'Bíceps', 'Tríceps', 'Ombros', 'Core', 'Cardio', 'Trapézio']

const DAYS: [string, number[]][] = [
  ['Dia 1 - Peito e Tríceps', [1, 2, 3, 4, 5, 6]],
  ['Dia 2 - Core e HIIT', [7, 8, 9, 10]],
  ['Dia 3 - Costas e Bíceps', [11, 12, 13, 14, 15, 16]],
  ['Dia 4 - Full Upper', [1, 12, 14, 4, 17]],
  ['Dia 5 - Ombros e Trapézio', [18, 19, 20, 21, 22]],
  ['Dia 6 - Costas (Máquina)', [23, 24, 25, 26, 27]],
]

/** Write the catalog from the report into `d`, and report the ids it received. */
export async function seedReportedCatalog(d: MyOneGymDB): Promise<SeededCatalog> {
  const categories: number[] = []
  for (const name of CATEGORIES) categories.push(await createCategory(name, d))

  const exercises: number[] = []
  for (const [name, mediaUrl, category] of EXERCISES) {
    exercises.push(
      await createExercise(
        { name, mediaUrl: mediaUrl ?? undefined, categoryIds: [categories[category - 1]] },
        d,
      ),
    )
  }

  const days: number[] = []
  for (const [name, positions] of DAYS) {
    days.push(await createDay({ name, exerciseIds: positions.map((p) => exercises[p - 1]) }, d))
  }

  return { categories, exercises, days }
}

/**
 * The proposal as it came back, defects included:
 *
 * - exercise 10 carries `mediaUrl: "null"` — the four characters, not the JSON
 *   literal, which is what `validateMediaUrl` refuses;
 * - it still points at category ref `"7"` (Cardio), which the proposal itself
 *   left out of the category list.
 */
export function reportedProposal(seeded: SeededCatalog): CatalogProposal {
  const catRef = (position: number) => String(seeded.categories[position - 1])
  const exRef = (position: number) => String(seeded.exercises[position - 1])

  const category = (position: number) => ({
    ref: catRef(position),
    id: seeded.categories[position - 1],
    name: CATEGORIES[position - 1],
  })

  /** An existing exercise, echoed back the way the proposal echoed it. */
  const kept = (position: number, categoryPosition: number) => ({
    ref: exRef(position),
    id: seeded.exercises[position - 1],
    name: EXERCISES[position - 1][0],
    mediaUrl: EXERCISES[position - 1][1],
    categoryRefs: [catRef(categoryPosition)],
    alternativeRefs: [] as string[],
  })

  return {
    summary:
      'Reorganizei seus treinos em uma nova rotina de 3 dias, mantendo no máximo 6 exercícios em cada um. Conforme solicitado, removi os dias excedentes (Dias 4, 5 e 6) e os exercícios de Trapézio (id 21, 22) e a Categoria de Trapézio que não entraram nos novos treinos.',
    // Cardio (7) and Trapézio (8) are absent — but exercise 10 still points at
    // Cardio, which is the second half of the report.
    categories: [category(1), category(2), category(3), category(4), category(5), category(6)],
    exercises: [
      kept(1, 1),
      kept(2, 1),
      kept(3, 1),
      kept(4, 4),
      kept(6, 4),
      kept(7, 6),
      kept(8, 6),
      kept(9, 6),
      { ...kept(10, 7), mediaUrl: 'null' },
      kept(11, 2),
      kept(12, 2),
      kept(13, 2),
      kept(14, 3),
      kept(15, 3),
      kept(16, 3),
      kept(18, 5),
      kept(19, 5),
      kept(20, 5),
    ],
    days: [
      {
        ref: String(seeded.days[0]),
        id: seeded.days[0],
        name: 'Dia A - Superior (Peito, Ombros e Tríceps)',
        exerciseRefs: [exRef(1), exRef(2), exRef(3), exRef(4), exRef(6), exRef(18)],
      },
      {
        ref: String(seeded.days[2]),
        id: seeded.days[2],
        name: 'Dia B - Costas e Bíceps',
        exerciseRefs: [exRef(11), exRef(12), exRef(13), exRef(14), exRef(15), exRef(16)],
      },
      {
        ref: String(seeded.days[1]),
        id: seeded.days[1],
        name: 'Dia C - Core, Cardio e Ombros',
        exerciseRefs: [exRef(7), exRef(8), exRef(9), exRef(10), exRef(19), exRef(20)],
      },
    ],
  }
}
