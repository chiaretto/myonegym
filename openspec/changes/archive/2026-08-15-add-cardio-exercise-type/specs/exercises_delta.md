# Delta: exercises

**Change ID:** `add-cardio-exercise-type`
**Affects:** `src/db/types.ts`, `src/db/db.ts` (v10), `src/db/repos.ts`,
`src/features/settings/ExercisesPage.tsx` (formulário e lista),
`src/features/exercise/ExerciseDetailPage.tsx`

---

## ADDED

### Requirement: Exercise Kind — Força or Cardio

Todo exercício MUST ter um **tipo**: **Força** ou **Cardio**. O tipo é do
exercício (não da academia, não do dia) e MUST ser escolhido no formulário do
exercício, com **Força** como padrão.

O tipo MUST determinar três coisas, e nada além delas:

- **Peso.** Um exercício de Cardio MUST NOT ter peso alvo nem histórico de peso
  exibidos em lugar algum. Observação e fotos continuam disponíveis, por
  academia, como em qualquer exercício.
- **Dias de treino.** Um exercício de Cardio MUST NOT ser oferecido ao montar
  um dia de treino.
- **Onde ele é iniciado.** Força começa a partir de um **dia** na Home; Cardio
  começa a partir do **próprio exercício**, na aba Cardio.

Exercícios já cadastrados MUST passar a valer como **Força**, sem exigir revisão
do catálogo.

#### Scenario: Novo exercício nasce Força
- GIVEN o usuário abre o formulário de novo exercício
- WHEN observa o campo de tipo
- THEN "Força" está selecionado
- AND salvar sem tocar no campo cria um exercício de Força

#### Scenario: Cadastrar um cardio
- GIVEN o formulário de novo exercício está aberto
- WHEN o usuário informa "Esteira", escolhe **Cardio** e salva
- THEN o exercício é criado como Cardio
- AND ele aparece na aba Cardio, não na lista de exercícios de um dia

#### Scenario: O tipo é visível na lista do catálogo
- GIVEN existem exercícios dos dois tipos
- WHEN o usuário abre a lista de exercícios em Configurações
- THEN cada linha indica o tipo do exercício

#### Scenario: Exercícios existentes viram Força
- GIVEN um catálogo criado antes desta mudança
- WHEN o app é aberto pela primeira vez depois dela
- THEN todo exercício existente é Força
- AND nada no comportamento deles muda

---

### Requirement: Changing an Exercise to Cardio Leaves the Days

Mudar um exercício de **Força para Cardio** MUST removê-lo de **todos** os dias
de treino em que estiver, porque um dia não pode conter cardio.

A remoção MUST ser **confirmada** antes de acontecer, e a confirmação MUST
**nomear os dias** que perderão o exercício. Recusar MUST deixar o exercício e
os dias exatamente como estavam.

Os **pesos e o histórico de peso** já registrados para esse exercício MUST NOT
ser apagados: eles apenas deixam de ser exibidos enquanto ele for Cardio, e
voltam se ele voltar a ser Força. Uma troca de campo não destrói histórico em
silêncio.

#### Scenario: Trocar para Cardio remove dos dias, com aviso
- GIVEN "Esteira" é Força e está no "Dia 2" e no "Dia 4"
- WHEN o usuário muda o tipo para Cardio e salva
- THEN uma confirmação informa que ele sairá de "Dia 2" e "Dia 4"
- AND ao confirmar, o exercício vira Cardio e some desses dois dias

#### Scenario: Recusar a confirmação não muda nada
- GIVEN a confirmação da troca de tipo está na tela
- WHEN o usuário recusa
- THEN o exercício continua Força
- AND continua nos mesmos dias

#### Scenario: Trocar para Cardio sem estar em dia algum não pergunta
- GIVEN "Bicicleta" é Força e não está em nenhum dia
- WHEN o usuário muda o tipo para Cardio e salva
- THEN a troca acontece direto, sem confirmação

#### Scenario: O peso sobrevive à ida e à volta
- GIVEN "Esteira" tem peso e histórico registrados como Força
- WHEN o usuário a torna Cardio e depois volta a torná-la Força
- THEN o peso e o histórico anteriores voltam a ser exibidos

---

## MODIFIED

### Requirement: Register an Exercise

*(única mudança: o formulário passa a ter o campo **tipo**; todo o resto do
requisito permanece)*

O usuário MUST poder cadastrar um exercício com **nome**, **mídia** opcional
(imagem ou GIF), **categorias** (zero ou mais) e **tipo** (**Força** ou
**Cardio**, ver *Exercise Kind*). O nome MUST ser obrigatório; o tipo MUST vir
preenchido como **Força**.

#### Scenario: Criar com tipo
- GIVEN o formulário de exercício aberto
- WHEN o usuário informa nome, escolhe o tipo e salva
- THEN o exercício é persistido com o tipo escolhido

#### Scenario: Nome continua obrigatório
- GIVEN o formulário de exercício aberto
- WHEN o usuário salva sem nome
- THEN o cadastro é bloqueado com uma mensagem de validação

---

## REMOVED

(Nenhum.)
