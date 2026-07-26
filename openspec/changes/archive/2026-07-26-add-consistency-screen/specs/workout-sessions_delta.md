# Delta: Workout Sessions

**Change ID:** `add-consistency-screen`
**Affects:** a apresentação do histórico (requirement "Session History Across
Gyms"). Iniciar/rodar/concluir/excluir sessão, detalhe e compartilhamento
ficam intactos.

---

## ADDED

(None)

---

## MODIFIED

### Requirement: Run a Session

While a session is in progress, the user MUST be able to **mark each entry as
done** (and toggle it back). Each entry MUST be presented as a **Home-style row**
— a **media thumbnail**, the exercise **name** and **category**, a **done
checkbox**, and a compact **read-only weight badge** showing the exercise's
**current per-gym target weight** for the session's gym (or a "definir" hint when
unset). Each row MUST end with an **icon-only navigation indicator** (a chevron,
no label), so that "tapping opens the detail" is visible rather than something
the user has to discover. Tapping the row (outside the checkbox) MUST open that
entry's **detail** (see Session Exercise Detail). Marking an entry done MUST be
possible from the list checkbox **or** from the detail, and the session's
progress MUST reflect either. **Adjusting the weight** for an entry happens on
the detail screen and updates the **exercise's per-gym target weight** (and its
history) — there is no separate per-session weight. Changes to the done state
persist immediately and are local.

#### Scenario: Entry rows look like Home rows
- GIVEN an in-progress session for a day with "Rosca Direta" (Bíceps, target 20 KG in the session's gym)
- WHEN the user views the runner
- THEN the "Rosca Direta" row shows a media thumbnail, its name and category, a done checkbox, and a "20 KG" badge (the current target)

#### Scenario: Rows show a visible navigation affordance
- GIVEN an in-progress session listing "Rosca Direta"
- WHEN the user views the runner
- THEN the row ends with an icon-only chevron indicating it opens the detail
- AND the chevron carries no text label

#### Scenario: Mark an exercise done from the list
- GIVEN an in-progress session with entry "Rosca Direta" not done
- WHEN the user taps its done checkbox in the list
- THEN the entry is recorded as done
- AND the session progress count reflects it

#### Scenario: Tapping a row opens the detail
- GIVEN an in-progress session listing "Rosca Direta"
- WHEN the user taps the row (not the checkbox)
- THEN the session exercise detail for "Rosca Direta" opens

#### Scenario: Un-mark a done exercise
- GIVEN entry "Supino" is marked done
- WHEN the user toggles it off (from the list or the detail)
- THEN the entry is no longer marked done

### Requirement: Session History Across Gyms

O histórico de sessões concluídas MUST ser apresentado **dentro da tela de
Consistência** (capability `consistency`), como a **lista dos treinos do mês
exibido** pelo calendário — não mais como uma lista única de todo o período.

A lista MUST mostrar as sessões concluídas do **mês exibido**, mais recentes
primeiro, cada uma resumindo o nome do dia, a data e a contagem de itens
concluídos. Ela MUST abrir **recolhida nos 3 treinos mais recentes** do mês,
com um link discreto **"Ver mais N treinos"** (N = quantos faltam) que expande
o restante no lugar; expandida, o link MUST virar **"Ver menos"**. Trocar o mês
exibido MUST recolher a lista de volta ao estado de 3.

O histórico MUST continuar abrangendo **todas as academias**, e MUST NOT ser
filtrado pela academia ativa. Como a lista mistura academias, cada item MUST
indicar **de qual academia** foi aquele treino; sessões de academia **excluída**
MUST continuar aparecendo, identificadas como de uma academia removida.
Qualquer contagem apresentada MUST se referir ao conjunto exibido (o mês),
sem sugerir recorte por academia. A tela MUST NOT oferecer o controle de troca
de academia ativa.

Tocar um item MUST continuar abrindo o **detalhe da sessão** existente, com
compartilhar e excluir inalterados. Cada card MUST terminar com um **indicador
de navegação icon-only** (chevron, sem rótulo) — o mesmo sinal das linhas do
runner e das linhas de exercício da Home.

#### Scenario: Lista recolhida com "Ver mais"
- GIVEN o mês exibido tem 13 sessões concluídas
- WHEN o usuário abre a Consistência
- THEN a lista mostra as 3 mais recentes
- AND um link "Ver mais 10 treinos" aparece abaixo dela

#### Scenario: Expandir e recolher
- GIVEN a lista está recolhida com "Ver mais 10 treinos"
- WHEN o usuário toca o link
- THEN as 13 sessões do mês aparecem e o link vira "Ver menos"
- AND WHEN o usuário navega para outro mês
- THEN a lista volta recolhida (3 mais recentes do novo mês)

#### Scenario: Mês com 3 ou menos treinos não tem "Ver mais"
- GIVEN o mês exibido tem 2 sessões concluídas
- WHEN o usuário vê a lista
- THEN as 2 aparecem e nenhum link "Ver mais" é exibido

#### Scenario: Cada item diz de onde veio
- GIVEN uma sessão feita na academia "Smart Fit" no mês exibido
- WHEN o usuário vê essa sessão na lista
- THEN o item mostra "Smart Fit" junto das demais informações do treino

#### Scenario: Sessão de academia excluída
- GIVEN o usuário concluiu um treino numa academia e depois excluiu essa academia
- WHEN o usuário vê a lista do mês daquele treino
- THEN a sessão continua listada, identificada como de uma academia removida

#### Scenario: A lista não segue a academia ativa
- GIVEN a Consistência está aberta com a academia "A" ativa
- WHEN o usuário troca a academia ativa para "B" e volta
- THEN a lista continua mostrando exatamente as mesmas sessões

#### Scenario: Abrir o detalhe a partir da lista
- GIVEN a lista do mês mostra a sessão "Dia 1 – Peito e Tríceps"
- WHEN o usuário toca o card
- THEN o detalhe da sessão abre, com compartilhar e excluir como hoje

#### Scenario: Cards mostram o indicador de navegação
- GIVEN a lista do mês mostra uma sessão
- WHEN o usuário vê o card
- THEN ele termina com um chevron icon-only indicando que abre o detalhe

#### Scenario: Empty history
- GIVEN não há sessões concluídas em nenhuma academia
- WHEN o usuário abre a Consistência
- THEN um estado vazio convida o usuário a iniciar o primeiro treino

---

## REMOVED

(None — os requisitos de escopo global do histórico são preservados; muda a
apresentação: recorte mensal e lista recolhível dentro da tela de
Consistência.)
