# Delta: workout-sessions

**Change ID:** `cardio-share-card-hero`
**Affects:** o desenho da imagem compartilhada quando a sessão é de cardio

---

## MODIFIED Requirements

### Requirement: Share a Completed Session as an Image

The **completed** session detail MUST offer **two share actions**, each
generating a **PNG image** of the session and handing it to the device's share
mechanism:

- **"Compartilhar"** (detailed) — includes each exercise's **weight** and the
  session's **training duration**.
- **"Compartilhar sem pesos"** (simplified) — includes **neither weights nor
  duration**, so a user can show the workout without revealing how much they
  lift or how long they took.

Both images MUST resemble the session detail screen and MUST contain: the
session's **day name**, its **gym**, the **date**, the **exercise list** (media
thumbnail, name, category, done state) taken from the entry's **name snapshot**,
and the **done count**. The detailed variant additionally shows a **weight badge**
per entry — the exercise's **current target weight** resolved for the session's
gym, read **live** (consistent with View Session Detail — the session stores no
weight of its own) — and the **duration** (`completedAt − startedAt`).

**A sessão de cardio MUST usar outro desenho.** Ela tem exatamente uma entrada,
e nela `dayName` **é** o nome do exercício — de modo que o molde de lista escreve
o mesmo nome duas vezes, no título e na única linha, e reduz a **única** coisa
que aquela imagem tem para mostrar a uma miniatura. Num dia de treino a
miniatura é um marcador ao lado do que interessa, que é a lista; num cardio não
há lista, há uma atividade e a imagem dela.

Quando a sessão é de cardio **e a entrada tem imagem**, a imagem compartilhada
MUST:

- exibir a **foto ocupando a largura inteira** do cartão, recortada por
  preenchimento para uma proporção fixa — nunca distorcida;
- exibir **abaixo dela** o **nome do exercício** e, sob ele, as **categorias**;
- exibir o **estado de conclusão** junto ao nome;
- **não repetir o nome**. O dia continua nomeado na imagem, como acima, mas
  **uma vez** — como legenda da foto, e não também como título.

Um cardio **sem imagem** MUST manter o desenho de lista. O formato existe por
causa da foto; sem ela, um retângulo vazio ocupando metade do cartão seria pior
do que a linha compacta.

A distinção MUST seguir o **tipo da sessão**, não a contagem de entradas: um dia
de treino com um exercício só continua sendo uma lista — curta hoje, talvez com
três na próxima vez —, enquanto um cardio é uma atividade única, que o app já
trata à parte em toda a interface.

O **cabeçalho** (academia, data, duração) e o **rodapé** (contagem, marca) MUST
permanecer os mesmos nos dois desenhos.

The image MUST be rendered at a **fixed size**, independent of the user's
**font-scale** setting (see the `app-foundation` typography spec) — a shared
image is a fixed design, not a responsive screen.

The image MUST emphasise **done** entries over **skipped** ones — the opposite of
the runner, which dims and strikes through what is done because crossing an item
off a checklist reads as progress *there*. On a shared image that would invert the
meaning: the work the user did would look cancelled while the exercises they
skipped would look like the highlight.

The date on the image MUST be **absolute** (e.g. "16 jul 2026"), not the
**relative** label the screen uses ("Hoje"), because a shared image outlives the
day it was created.

An entry with **no target weight** MUST render **no weight badge** in the detailed
variant — the screen's **"definir"** hint is a call-to-action for the owner and
MUST NOT appear on a shared image.

Share actions MUST NOT be offered for an **in-progress** session.

#### Scenario: Two share actions on a completed session
- GIVEN a completed session for "Dia 1" is open from history
- WHEN the user views it
- THEN a "Compartilhar" action and a "Compartilhar sem pesos" action are shown

#### Scenario: No sharing while a session is in progress
- GIVEN gym "A" has an in-progress session
- WHEN the user views the runner
- THEN no share action is shown

#### Scenario: Detailed image includes weights and duration
- GIVEN a completed session for "Dia 1" in gym "A" lasting 48 minutes, with "Rosca Direta" (done, current target 22,5 KG) and "Supino" (not done, current target 40 KG)
- WHEN the user taps "Compartilhar"
- THEN a PNG is generated showing "Dia 1", gym "A", the date, both exercises with their names, categories, thumbnails and done states
- AND it shows "22,5 KG" and "40 KG"
- AND it shows the duration "48 min"

#### Scenario: Simplified image omits weights and duration
- GIVEN the same completed session
- WHEN the user taps "Compartilhar sem pesos"
- THEN a PNG is generated showing "Dia 1", gym "A", the date, both exercises with their names, categories, thumbnails and done states
- AND it shows **no** weight for any exercise
- AND it shows **no** training duration

#### Scenario: O cardio vira um retrato
- GIVEN uma sessão de cardio concluída de "Corrida Externa", que tem imagem
- WHEN o usuário compartilha
- THEN a imagem traz a foto ocupando a largura inteira do cartão
- AND o nome "Corrida Externa" e as categorias aparecem abaixo dela
- AND "Corrida Externa" aparece **uma única vez** na imagem

#### Scenario: Um cardio sem foto fica como está
- GIVEN uma sessão de cardio concluída cujo exercício não tem imagem
- WHEN o usuário compartilha
- THEN a imagem usa o desenho de lista, com a linha compacta

#### Scenario: Um dia com um exercício só continua sendo uma lista
- GIVEN uma sessão concluída de um dia de treino com um único exercício
- WHEN o usuário compartilha
- THEN a imagem usa o desenho de lista, e não o retrato

#### Scenario: The image shows the live target weight
- GIVEN a completed session referenced "Rosca Direta" while its target was 20 KG
- WHEN the target is later changed to 25 KG in that gym and the user shares the session with details
- THEN the image shows 25 KG (the card reads the live target, like the recap)

#### Scenario: An entry with no target shows no badge
- GIVEN a completed session entry "Agachamento" with no target weight in the session's gym
- WHEN the user taps "Compartilhar"
- THEN the image shows the "Agachamento" row with **no** weight badge
- AND the word "definir" does **not** appear on the image

#### Scenario: Done exercises are emphasised over skipped ones
- GIVEN a completed session where "Supino" is done and "Agachamento" was skipped
- WHEN the user shares it
- THEN "Supino" is rendered at full strength (not dimmed, not struck through)
- AND "Agachamento" recedes visually

#### Scenario: The image uses an absolute date
- GIVEN a session completed on 16 July 2026
- WHEN the user shares it on that same day
- THEN the image shows an absolute date ("16 jul 2026")
- AND it does **not** show the relative label "Hoje"

#### Scenario: The image ignores the font-scale setting
- GIVEN the user set the Aparência font scale to its maximum
- WHEN the user shares a completed session
- THEN the generated image is identical to the one produced at the default scale

#### Scenario: Image survives source exercise deletion
- GIVEN a completed session referencing "Rosca Direta"
- WHEN "Rosca Direta" is later deleted and the user shares the session
- THEN the image still shows the "Rosca Direta" name (from the entry snapshot)
- AND its thumbnail falls back to a placeholder and no weight badge is drawn

---

## ADDED

(None)

---

## REMOVED

(None)
