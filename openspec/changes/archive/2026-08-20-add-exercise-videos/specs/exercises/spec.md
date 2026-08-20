# Delta: exercises

**Change ID:** `add-exercise-videos`
**Affects:** as abas do detalhe do exercício — a quarta aba e o rename de "Observações"

---

## MODIFIED Requirements

### Requirement: Exercise Note and Photos on the Catalog Detail

The **exercise detail page** (catalog, `/exercise/:id`) MUST present its content
in **tabs**, and those tabs MUST be the **first control below the top bar** —
before the media and before the target weight. The screen is opened to look
something up, and which of the four things the user wants is the first decision
they make on it.

Each tab MUST carry what belongs to it:

- **"Detalhe"** — the exercise's **media**, the per-gym **target weight** editor
  and its **history**, and the **Alternativas** section (see *Alternatives
  Section on the Exercise Detail*), in that order.
- **"Notas"** — the exercise's **categories**, shown as labels, and the
  **per-gym exercise note** for `(active gym, exerciseId)` (see the
  `exercise-notes` capability), with an editable text field and an explicit save.
  A aba chamava-se "Notas"; o rótulo mais curto é o que paga a quarta aba
  sem apertar a faixa numa tela estreita, e diz a mesma coisa.
- **"Vídeos"** — os **vídeos de execução** do exercício (ver a capability
  `exercise-videos`), listados e abertos no visualizador de tela cheia. Ao
  contrário da nota e das fotos, eles são do **exercício** e não do par
  `(academia, exercício)`: não dependem de academia ativa.
- **"Foto"** — the **per-gym exercise photos** for the same pair (see the
  `exercise-photos` capability): listing them, attaching one (camera or gallery)
  and deleting one.

The media MUST NOT be rendered outside the "Detalhe" tab, and the categories
MUST NOT be rendered above the tabs — that is the vertical space this
arrangement exists to free.

This MUST match the in-session exercise detail's arrangement (see the
`workout-sessions` capability, *Session Exercise Detail*), down to which tab
holds the media and the categories. The two screens are the same view in two
contexts and the user moves between them constantly; only their first tab's
**label** differs ("Detalhe" here, "Execução" in a session), because only one of
them is about executing something right now.

Both the note and the photos reflect the **same** data edited from the
in-session exercise detail (notes and photos are per `(gym, exercise)`, not per
session). When **no gym is active**, the Notas **and Foto** tabs MUST
prompt the user to create/select a gym first — the same treatment as the
target-weight editor — and nothing can be saved. A aba **"Vídeos"** MUST continuar funcionando sem
academia ativa — não há o que escopar.

#### Scenario: Edit a note from the catalog detail
- GIVEN gym "A" is active and "Rosca Direta" has no note in "A"
- WHEN the user opens the exercise detail, switches to "Notas", types "banco no furo 3", and saves
- THEN the note `(A, Rosca Direta) = "banco no furo 3"` is persisted
- AND opening "Rosca Direta" during a session in gym "A" shows the same note

#### Scenario: Note follows the active gym
- GIVEN "Rosca Direta" has a note in gym "A" and none in gym "B"
- WHEN the user makes gym "B" active and opens the exercise detail "Notas" tab
- THEN no note text is shown (the note is scoped to the active gym)

#### Scenario: No active gym prompts for one
- GIVEN no gym exists yet
- WHEN the user opens an exercise detail and switches to "Notas"
- THEN the tab prompts the user to create/select a gym first
- AND no note can be saved until a gym is active

#### Scenario: Attach a photo from the catalog detail
- GIVEN gym "A" is active and "Rosca Direta" has no photos in "A"
- WHEN the user opens the exercise detail, switches to "Foto", and attaches a photo
- THEN the photo is persisted for `(A, Rosca Direta)`
- AND opening "Rosca Direta" during a session in gym "A" shows the same photo

#### Scenario: Photos follow the active gym
- GIVEN "Rosca Direta" has photos in gym "A" and none in gym "B"
- WHEN the user makes gym "B" active and opens the exercise detail "Foto" tab
- THEN no photos are shown (photos are scoped to the active gym)

#### Scenario: No active gym prompts for one before a photo
- GIVEN no gym exists yet
- WHEN the user opens an exercise detail and switches to "Foto"
- THEN the tab prompts the user to create/select a gym first
- AND no photo can be attached until a gym is active

#### Scenario: The tabs come before everything else
- GIVEN the user opens an exercise from the catalog
- WHEN the detail renders
- THEN the "Detalhe", "Notas", "Vídeos" and "Foto" tabs appear directly below
  the top bar, above the media and the target weight
- AND reaching them requires no scrolling

#### Scenario: The media belongs to the first tab
- GIVEN an exercise with a media URL
- WHEN the user opens its detail and switches to "Notas"
- THEN no media is shown
- AND switching back to "Detalhe" shows it again, above the target weight

#### Scenario: A aba de vídeos não depende de academia
- GIVEN nenhuma academia existe ainda
- WHEN o usuário abre um exercício e vai em "Vídeos"
- THEN os vídeos são exibidos normalmente
- AND nenhum convite para criar academia aparece nessa aba

#### Scenario: Categories live in "Notas"
- GIVEN "Supino Reto" carries the categories "Peito" and "Tríceps"
- WHEN the user opens its catalog detail
- THEN no category label is shown above the tabs
- AND switching to "Notas" shows "Peito" and "Tríceps" above the note field
