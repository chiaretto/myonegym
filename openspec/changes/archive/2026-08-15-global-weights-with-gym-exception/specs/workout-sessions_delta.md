# Delta: workout-sessions

**Change ID:** `global-weights-with-gym-exception`
**Affects:** `src/features/session/SessionEntryPage.tsx` (texto do requisito;
o comportamento vem do `WeightEditor` compartilhado)

---

## MODIFIED

### Requirement: Session Exercise Detail

Each session entry MUST have a **detail screen** (reached by tapping its row in
the runner or the completed-session recap), showing the exercise's **media**
(static image or animated GIF, played animated), the exercise **name — once, in
the screen's top bar** — its **category** context, and — for the weight — the
**same "Peso alvo" editor used on the catalog exercise detail** (see the
`weights` capability), resolvido para a **academia da sessão**: o **peso
global** do exercício, ou a **exceção** daquela academia quando existe (edit →
save, valor + unidade KG/LB/#), junto da **linha do tempo do histórico** do
escopo resolvido (com exclusão por registro). Salvar MUST gravar no escopo
indicado pela flag **"Só nessa academia"** — peso global por padrão, exceção da
academia da sessão quando marcada — e anexar um registro de **histórico** na
mesma chave. A sessão não guarda peso próprio.

The detail MUST present its content in **tabs**, and the tabs MUST be the
**first control below the top bar** — before the media, before the weight,
before anything else the screen shows. They are how the user moves around this
screen mid-workout, so reaching them MUST NOT require scrolling. Only the
entry's **status labels** (below) MAY precede them.

Each tab MUST carry what belongs to it, and nothing else:

- **"Execução"** — the exercise's **media**, the **Peso alvo** editor with its
  **history**, and the **Alternativas** section described below, in that order.
  The media lives **here**, not above the tabs: it illustrates how the movement
  is executed, which is a question the other two tabs do not ask, and it is tall
  enough to push their content off the fold if it sat outside them.
- **"Observações"** — the exercise's **categories**, shown as labels, and the
  **per-gym exercise note** for `(session.gymId, entry.exerciseId)` (see the
  `exercise-notes` capability), with an editable text field and an explicit
  save. Categories and the note are both **descriptions of the exercise**, and
  neither is acted upon between sets.
- **"Foto"** — the **per-gym exercise photos** for the same pair (see the
  `exercise-photos` capability): the pair's photos, attaching one (camera or
  gallery), and deleting one.

The media MUST NOT be rendered outside the "Execução" tab, and the categories
MUST NOT be rendered outside "Observações" — repeating either above the tabs
would give back exactly the vertical space this arrangement buys.

The entry's **status** labels — the **"Concluído"** indicator and, while
previewing an alternative, the **"Alternativa de X"** label — MUST sit **above
the tabs**, visible on every tab. They describe the **entry**, not a section of
it, exactly like the fixed stepper bar at the bottom.

A **nota** e as **fotos** continuam **duráveis e por `(academia, exercício)`**,
compartilhadas com o detalhe do catálogo e com sessões futuras do mesmo
exercício na mesma academia — diferentemente do **peso**, que é do exercício e
só é da academia quando há exceção. Enquanto uma **alternativa** está sendo
vista, as três abas MUST refletir o exercício **exibido**, não o da entrada — é
a nota e a foto daquele aparelho que ajudam a decidir. When the entry has no
linked exercise (`exerciseId` absent because the source exercise was deleted),
the Observações **and Foto** tabs MUST show an empty/disabled state (nothing can
be attached to a missing exercise).

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
MUST be **editable**, incluindo a flag "Só nessa academia". When the parent
session is **completed**, the weight card MUST be **read-only** — mostra o peso
**vigente** resolvido para a academia da sessão, para referência (sem edição,
sem exclusão de histórico, sem flag).

#### Scenario: Weight editor on the session detail edits the global weight
- GIVEN uma sessão em andamento na academia "A" e "Rosca Direta" com peso global 20 KG
- WHEN o usuário abre o detalhe da entrada, edita para 22,5 KG e salva com a flag desmarcada
- THEN o peso global passa a 22,5 KG e um registro de histórico global é anexado
- AND o detalhe do exercício no catálogo mostra 22,5 KG

#### Scenario: Weight editor on the session detail creates a gym exception
- GIVEN uma sessão em andamento na academia "A" e peso global 22,5 KG
- WHEN o usuário salva 18 KG com a flag "Só nessa academia" marcada
- THEN a academia "A" passa a ter exceção de 18 KG, com rótulo da academia
- AND o peso global permanece 22,5 KG

#### Scenario: Completed session shows the resolved weight without the flag
- GIVEN uma sessão **concluída** na academia "B", onde "Supino" tem exceção de 30 KG
- WHEN o usuário abre o detalhe daquela entrada
- THEN o cartão de peso mostra 30 KG somente-leitura, com o rótulo da academia "B"
- AND nenhuma flag de escopo é oferecida

---

## ADDED

(Nenhum.)

## REMOVED

(Nenhum.)
