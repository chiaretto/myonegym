# Delta: exercises

**Change ID:** `add-exercise-warmups`
**Affects:** `src/db/types.ts` (`Exercise.warmupIds`), `src/db/repos.ts`,
`src/features/settings/ExercisesPage.tsx` (formulário),
`src/features/exercise/ExerciseDetailPage.tsx`

---

## ADDED

### Requirement: Warmup Button on the Exercise Detail

Todo **detalhe de exercício** — o do catálogo (`/exercise/:id`) e o de uma
entrada de sessão — MUST oferecer, no corpo da aba de execução, um controle que
abre os **aquecimentos** daquele exercício no visualizador de tela cheia (ver a
capability `warmups`).

O controle MUST NOT ser exibido quando o exercício não tem aquecimento algum:
não ter é o caso normal, e um botão que só abre um vazio é ruído — a mesma
decisão que a seção "Alternativas" já tomou.

Fechar o visualizador MUST devolver o usuário **à tela e à aba de onde saiu**,
sem perder o contexto de dia nem o item de sessão que estava aberto.

O controle MUST indicar **quantos** aquecimentos existem, para a pessoa saber o
que a espera antes de abrir a tela cheia.

#### Scenario: O botão aparece quando há aquecimento
- GIVEN "Supino" tem dois aquecimentos vinculados
- WHEN o usuário abre o detalhe do exercício
- THEN um controle de aquecimento é oferecido, indicando dois

#### Scenario: Sem aquecimento, sem botão
- GIVEN "Rosca Direta" não tem aquecimento algum
- WHEN o usuário abre o detalhe do exercício
- THEN nenhum controle de aquecimento é exibido

#### Scenario: Disponível também dentro da sessão
- GIVEN uma sessão em andamento com "Supino", que tem aquecimentos
- WHEN o usuário abre o detalhe daquela entrada
- THEN o controle de aquecimento é oferecido ali também

#### Scenario: Fechar devolve ao ponto de partida
- GIVEN o usuário abriu os aquecimentos a partir do detalhe de uma entrada de
  sessão
- WHEN fecha o visualizador
- THEN volta àquele detalhe, na mesma aba
- AND a sessão continua em andamento, inalterada

---

## MODIFIED

### Requirement: Register an Exercise

*(única mudança: o formulário passa a permitir vincular **aquecimentos**; todo o
resto do requisito permanece)*

O usuário MUST poder cadastrar um exercício com **nome**, **mídia** opcional
(imagem ou GIF), **categorias** (zero ou mais), **tipo** (**Força** ou
**Cardio**, ver *Exercise Kind*) e **aquecimentos** (zero ou mais, ver a
capability `warmups`). O nome MUST ser obrigatório; o tipo MUST vir preenchido
como **Força**.

O seletor de aquecimentos MUST permitir escolher vários e MUST manter os já
escolhidos visíveis independentemente da busca, para que desmarcar não exija
encontrá-los de novo — o mesmo comportamento do seletor de alternativas. A
**ordem de seleção** MUST ser preservada: é ela que o visualizador percorre.

#### Scenario: Criar com tipo
- GIVEN o formulário de exercício aberto
- WHEN o usuário informa nome, escolhe o tipo e salva
- THEN o exercício é persistido com o tipo escolhido

#### Scenario: Vincular aquecimentos
- GIVEN existem os aquecimentos "A", "B" e "C"
- WHEN o usuário escolhe "C" e depois "A" no formulário do "Supino" e salva
- THEN o "Supino" fica com os dois, nessa ordem
- AND "B" segue existindo, sem vínculo com ele

#### Scenario: Nome continua obrigatório
- GIVEN o formulário de exercício aberto
- WHEN o usuário salva sem nome
- THEN o cadastro é bloqueado com uma mensagem de validação

---

## REMOVED

(Nenhum.)
