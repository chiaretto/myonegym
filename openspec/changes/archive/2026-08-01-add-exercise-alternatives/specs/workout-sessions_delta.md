# Delta: workout-sessions

**Change ID:** `add-exercise-alternatives`
**Affects:** detalhe da entrada da sessão

---

## ADDED

### Requirement: Do an Alternative Instead

Durante uma sessão **em andamento**, o usuário MUST poder registrar que fez uma
**alternativa** do exercício da linha, no lugar dele — a máquina estava ocupada,
a academia da vez não tem aquele aparelho, o ombro reclamou.

O caminho MUST ser o mesmo de consultar: na seção **"Alternativas"** do detalhe
da entrada (ver a capability `exercises`), tocar uma alternativa abre o detalhe
dela **dentro da sessão**, mostrando a **mídia**, o **peso alvo**, as
**observações** e as **fotos** daquele exercício naquela academia — é com isso
que o usuário decide. A partir daí, uma ação **"Fiz este no lugar"** MUST
substituir o exercício da linha.

A troca MUST:

- reescrever o **exercício** da entrada e o **snapshot do nome**;
- **preservar o estado de concluído** — a troca diz *qual* foi feito, não desfaz
  o que foi feito;
- **não criar nem remover entradas**: o treino continua com exatamente as linhas
  que o dia tinha, e o progresso não se mexe;
- valer apenas entre **alternativas do exercício atual** da entrada.

Enquanto o usuário está vendo a alternativa, a tela MUST deixar claro que está
**um nível abaixo** da entrada: o indicador **"Concluído"** pertence à entrada e
MUST NOT ser exibido sobre a alternativa, Voltar MUST retornar à entrada (não ao
runner), e a navegação Voltar/Avançar entre exercícios da sessão MUST NOT ser
oferecida ali.

Com a sessão **concluída**, a seção "Alternativas" MUST continuar navegável — é
referência —, mas a ação **"Fiz este no lugar" MUST NOT ser oferecida**: um
histórico registra o que aconteceu.

#### Scenario: Fazer a alternativa no lugar
- GIVEN uma sessão em andamento na entrada "Supino Reto", que tem "Supino
  Máquina" como alternativa
- WHEN o usuário abre "Supino Máquina" na seção Alternativas e toca "Fiz este no
  lugar"
- THEN a entrada passa a ser "Supino Máquina"
- AND o peso alvo, as observações e as fotos exibidos passam a ser os dela

#### Scenario: A decisão é informada pelo peso da alternativa
- GIVEN "Supino Reto" está em 60 KG e "Supino Máquina" em 45 KG na academia da
  sessão
- WHEN o usuário abre "Supino Máquina" a partir da entrada
- THEN o card "Peso alvo" mostra 45 KG antes de qualquer troca

#### Scenario: A troca preserva o concluído
- GIVEN a entrada "Supino Reto" está marcada como concluída
- WHEN o usuário troca por "Crucifixo"
- THEN a entrada continua concluída, agora registrando "Crucifixo"

#### Scenario: A troca não muda o tamanho do treino
- GIVEN uma sessão em andamento com 2 entradas
- WHEN o usuário troca o exercício de uma delas
- THEN a sessão continua com 2 entradas e o progresso não muda

#### Scenario: A alternativa não herda o concluído da entrada
- GIVEN a entrada "Supino Reto" está concluída
- WHEN o usuário abre "Supino Máquina" na seção Alternativas
- THEN o indicador "Concluído" não é exibido
- AND a tela indica que aquilo é uma alternativa de "Supino Reto"

#### Scenario: Voltar da alternativa devolve à entrada
- GIVEN o usuário está vendo "Supino Máquina" a partir da entrada "Supino Reto"
- WHEN toca Voltar
- THEN o detalhe da entrada "Supino Reto" é exibido (não o runner)

#### Scenario: Trocar é possível nos dois sentidos
- GIVEN o usuário trocou "Supino Reto" por "Supino Máquina"
- WHEN abre a seção Alternativas da entrada
- THEN "Supino Reto" está listado e pode ser escolhido de volta

#### Scenario: Sessão concluída não permite trocar
- GIVEN uma sessão concluída cuja entrada tem alternativas
- WHEN o usuário abre uma delas a partir do recap
- THEN o detalhe é exibido
- AND nenhuma ação "Fiz este no lugar" é oferecida

#### Scenario: Entrada sem alternativas
- GIVEN uma entrada cujo exercício não tem alternativas
- WHEN o usuário abre seu detalhe
- THEN nenhuma seção "Alternativas" é exibida

---

## MODIFIED

### Requirement: Session Exercise Detail

Each session entry MUST have a **detail screen** (reached by tapping its row in
the runner or the completed-session recap). The detail MUST render the exercise's
**media** (static image or animated GIF, played animated), the exercise **name —
once, in the screen's top bar** — its **category** context, and — for the weight
— the **same "Peso alvo" editor used on the catalog exercise detail** (see the
`weights` capability), scoped to the **session's gym**: the per-gym **target
weight** (edit → save, value + unit KG/LB/#) together with the per-gym
**weight-history timeline** (with per-entry delete). Saving the weight MUST
update the exercise's **per-gym target weight** and append a **history** entry —
the session stores no independent weight.

Quando o exercício da entrada tem **alternativas**, o detalhe MUST apresentar a
seção **"Alternativas"** descrita na capability `exercises`, no corpo da aba
"Execução", abaixo do peso alvo. Tocar uma alternativa abre o detalhe dela
**dentro da sessão** — ver *Do an Alternative Instead*. Enquanto uma alternativa
está sendo vista, o detalhe MUST NOT oferecer uma nova seção "Alternativas" a
partir dela: o usuário está escolhendo o que fazer nesta linha, não navegando o
catálogo.

The detail MUST NOT repeat the exercise name in the body, and MUST NOT show the
session's **training-day** name — see the `exercises` capability's *Single
Exercise Title on Detail Views*, which governs the header of both detail views.

While the session is **in progress** the Peso alvo editor and its history delete
MUST be **editable**. When the parent session is **completed**, the weight card
MUST be **read-only** — it shows the gym's **current** target for reference (no
edit, no history delete).

The detail MUST present its content in **tabs**: an **"Execução"** tab containing
the guided stepper, the Peso alvo editor and the Alternativas section described
here, an **"Observações"** tab that shows and edits the **per-gym exercise note**
for `(session.gymId, exerciseId)` (see the `exercise-notes` capability), and a
**"Foto"** tab that shows and manages the **per-gym exercise photos** for the
same pair (see the `exercise-photos` capability). The note tab provides an
editable text field with an explicit save; the photo tab lists the pair's photos
and lets the user attach one (camera or gallery) or delete one. Both the note and
the photos are **durable and per `(gym, exercise)`**, so they are shared with the
catalog exercise detail and with future sessions of the same exercise in the same
gym. Enquanto uma **alternativa** está sendo vista, as três abas MUST refletir o
exercício **exibido**, não o da entrada — é a nota e a foto daquele aparelho que
ajudam a decidir. When the entry has no linked exercise (`exerciseId` absent
because the source exercise was deleted), the Observações **and Foto** tabs MUST
show an empty/disabled state (nothing can be attached to a missing exercise).

Unlike the Peso alvo editor, the Observações and Foto tabs MUST remain
**editable even when the parent session is completed** — a note and a photo
describe the exercise in that gym, not that session, so there is nothing to
freeze.

The stepper's controls (the done call-to-action and Voltar/Avançar, described
below) MUST be presented as a **floating bar fixed to the bottom of the screen**,
**visible on every tab** — not as content inside the "Execução" panel. Mid-set the
user reaches for these first, so they must not require scrolling, and a bar that
vanished when switching to Observações or Foto would not read as fixed chrome.

The bar MUST NOT cover any content: the screen's content MUST reserve room equal
to the bar's **actual height**, at **any font-size setting** (see the
`app-foundation` typography spec — the bar scales with it, so a fixed reservation
would hide content at large scales). Transient messages MUST NOT render
underneath the bar either.

Enquanto uma **alternativa** está sendo vista, essa mesma barra MUST carregar a
única decisão que cabe ali — **"Fiz este no lugar"** — e **nenhum**
Voltar/Avançar: percorrer os exercícios pertence à lista da sessão, e esta tela
está ao lado dela.

The detail MUST act as a **guided stepper** over the session's exercises:

- The **done control** MUST **visually reflect whether the current entry is
  already done**, so stepping between exercises makes each one's status obvious:
  - **Not done** → a prominent **call-to-action** (e.g., "Concluir") that
    **marks the entry done and advances** to the next exercise's detail. On the
    **last** exercise, it either **prompts to finish the workout** (when all
    entries are now done — see below) or returns to the session overview / runner.
  - **Already done** → a **distinct completed state** (e.g., "Concluído" with a
    check and a calmer/confirmed styling), clearly different from the pending
    call-to-action; activating it still advances (and, on the last exercise, runs
    the same finish check).
  - The detail SHOULD also show a **"Concluído" indicator** (e.g., a chip in the
    header's label row, above the tabs) when the entry is done, reinforcing the
    status at a glance.
- **Voltar** and **Avançar** controls MUST navigate to the **previous / next**
  exercise **without changing the done state**, and MUST be disabled at the
  first / last exercise respectively.

When the user completes the **last exercise in the list** via the done
call-to-action and, as a result, **all** of the session's entries are done, the
detail MUST **prompt** the user that all exercises are complete and ask whether to
**finish the workout**. **Confirming** MUST complete the session (see Complete a
Session) and leave for the session history. **Declining or dismissing** MUST
return to the **runner** (the session's exercise list) with the session still in
progress. If completing the last exercise leaves **any entry not done** (skipped
via Avançar), the detail MUST NOT prompt and MUST return to the runner.

Un-marking an entry is done from the runner list (not the detail). When the
parent session is **completed**, the detail MUST be **read-only** (no weight
editing, no history delete, no marking, no swapping) and MUST show the static done
state; Voltar/Avançar MAY still be used to browse. The detail MUST render from the
entry's name snapshot where the source exercise was deleted (media falls back to
a placeholder and the live target/history are empty).

#### Scenario: A seção Alternativas fica na aba Execução
- GIVEN uma sessão em andamento na entrada de um exercício com alternativas
- WHEN o detalhe renderiza
- THEN a seção "Alternativas" aparece abaixo do card "Peso alvo"

#### Scenario: A barra troca de papel sobre a alternativa
- GIVEN o usuário está vendo uma alternativa a partir da entrada
- WHEN olha a barra inferior
- THEN ela oferece "Fiz este no lugar"
- AND não oferece Voltar/Avançar entre exercícios da sessão

#### Scenario: As abas seguem o exercício exibido
- GIVEN "Supino Máquina" tem foto na academia da sessão e "Supino Reto" não
- WHEN o usuário abre "Supino Máquina" a partir da entrada "Supino Reto" e vai à
  aba "Foto"
- THEN a foto de "Supino Máquina" é exibida

#### Scenario: Read-only for a completed session
- GIVEN a completed session's recap
- WHEN the user opens an entry's detail
- THEN the media, the current target weight, done state, and history are shown
- AND the weight cannot be edited, history entries cannot be deleted, and the done state cannot be changed
- AND Voltar/Avançar may still be used to browse the exercises

---

## REMOVED

(None)
