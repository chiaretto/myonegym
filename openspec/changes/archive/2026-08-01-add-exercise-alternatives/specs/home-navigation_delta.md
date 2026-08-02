# Delta: home-navigation

**Change ID:** `add-exercise-alternatives`
**Affects:** a barra Voltar/Avançar do detalhe do exercício

---

## MODIFIED

### Requirement: Open Exercise Detail

Tapping an exercise on Home MUST open its detail view showing the **rendered
media** (a static image or an animated GIF, played back animated) and the
**editable per-gym weight** (see weights spec).

The detail MUST **remember the training day it was opened from** — an exercise
may belong to several days, so the day cannot be inferred from the exercise. That
context MUST be carried in the **address**, so it survives a reload and the
browser's Back button. It has two consequences:

- **Going back MUST return to Home with that day still expanded** — not to a
  collapsed Home, which would make the user hunt for their place again.
- The detail MUST offer **Voltar / Avançar** controls that step to the
  **previous / next exercise of that day**, in the day's order, disabled at the
  first / last exercise. Stepping MUST preserve the day context. These controls
  MUST be presented as a **floating bar fixed to the bottom of the screen**, and
  MUST NOT cover any content (see the `workout-sessions` spec, which specifies the
  same bar for the in-session detail). There is **no "Concluir"** here — that
  belongs to a workout session.

**Alternativas não são paradas da navegação.** Um exercício alternativo que não
está no dia não é um passo do caminho por ele — ver *Alternatives Do Not Join a
Training Day* na capability `exercises`.

Abrir uma alternativa a partir do detalhe **carrega o dia adiante** no endereço,
para que Voltar continue devolvendo à Home com o dia expandido. Como essa
alternativa **pode não pertencer ao dia**, o detalhe MUST NOT exibir a barra
Voltar/Avançar quando o exercício exibido não está no dia do endereço: uma barra
com as duas setas desabilitadas informa menos que barra nenhuma.

When the detail is opened **without** a day (a direct link, a stale bookmark, or
a day that no longer exists), it MUST degrade gracefully: **no navigation bar**,
and going back returns to Home.

#### Scenario: Step through a day's exercises
- GIVEN "Dia 1" contains "Rosca Direta", "Supino" and "Tríceps Corda" in that order
- AND the user opened "Supino" from "Dia 1"
- WHEN the user taps "Avançar"
- THEN the detail for "Tríceps Corda" is shown, still in the context of "Dia 1"
- AND tapping "Voltar" twice from there returns to "Rosca Direta"

#### Scenario: O stepping ignora as alternativas
- GIVEN "Dia 1" contém "Supino Reto" e "Tríceps Corda", e "Supino Reto" tem
  "Supino Máquina" como alternativa (que não está no dia)
- AND o usuário abriu "Supino Reto" a partir de "Dia 1"
- WHEN toca "Avançar"
- THEN o detalhe de "Tríceps Corda" é exibido

#### Scenario: A alternativa aberta preserva o caminho de volta
- GIVEN o usuário abriu "Supino Reto" a partir de "Dia 1" e tocou "Supino
  Máquina" na seção Alternativas
- WHEN o usuário volta
- THEN a Home é exibida com "Dia 1" ainda expandido

#### Scenario: A alternativa fora do dia não mostra a barra
- GIVEN "Supino Máquina" não pertence a "Dia 1"
- WHEN o usuário abre seu detalhe a partir de "Supino Reto", no contexto de
  "Dia 1"
- THEN nenhuma barra Voltar/Avançar é exibida

#### Scenario: Navigation is disabled at the ends
- GIVEN the user opened the **first** exercise of "Dia 1"
- THEN "Voltar" is disabled
- AND GIVEN the user opened the **last** exercise of "Dia 1", "Avançar" is disabled

---

## ADDED

(None)

---

## REMOVED

(None)
