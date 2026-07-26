# Delta: home-navigation

**Change ID:** `no-empty-state-flash`
**Affects:** o estado vazio e o resumo semanal da Home (`HomePage.tsx`) — nenhum
dos dois pode afirmar "não há nada" antes de a leitura responder

---

## ADDED

(None)

---

## MODIFIED

### Requirement: Home Accordion of Training Days

Mantém-se tudo o que já é exigido: a Home apresenta os dias de treino como um
**acordeão**, com nome e linha secundária de **categorias derivadas** (ou a
contagem de exercícios como fallback); o dia expandido faz **parte do endereço**
e sobrevive a sair da Home e voltar; expandir e recolher **não** empilha
histórico; um dia endereçado que não existe mais expande nada; e o gesto de
expandir é o toque no **cabeçalho do card** inteiro.

Acrescenta-se uma condição ao **estado vazio**: ele MUST ser exibido apenas
quando a leitura dos dias respondeu e não há nenhum dia. Enquanto a resposta não
chega — inclusive a cada volta para a Home, que a remonta —, a Home MUST NOT
exibir "Nenhum dia de treino ainda". Ver "Estados Vazios Só Depois da Resposta"
na spec app-foundation.

#### Scenario: Day header shows derived categories
- GIVEN "Dia 1" contains "Supino" (Peito) and "Tríceps Corda" (Tríceps)
- WHEN the user views Home
- THEN the "Dia 1" header shows "Peito · Tríceps" as its secondary line

#### Scenario: Header falls back to the count
- GIVEN "Dia 2" contains 3 exercises, none with a category
- WHEN the user views Home
- THEN the "Dia 2" header shows "3 exercícios" as its secondary line

#### Scenario: Expand a day
- GIVEN "Dia 1" contains "Rosca Direta" and "Supino"
- WHEN the user taps "Dia 1" on Home
- THEN the day expands and lists "Rosca Direta" and "Supino" with their media thumbnails (image or GIF)

#### Scenario: Collapse a day
- GIVEN "Dia 1" is expanded
- WHEN the user taps "Dia 1" again
- THEN the day collapses and hides its exercise list

#### Scenario: Expandir tocando fora do nome
- GIVEN "Dia 1" está recolhido
- WHEN o usuário toca no cabeçalho do card, numa região que não é o nome
- THEN "Dia 1" expande, exatamente como se o nome tivesse sido tocado

#### Scenario: Empty state
- GIVEN no training days exist
- WHEN the user opens Home and the read resolves
- THEN an empty state guides the user to create data in Settings

#### Scenario: O estado vazio não pisca ao voltar para a Home
- GIVEN existem dias de treino cadastrados
- WHEN o usuário abre um exercício, as Configurações ou as Sessões e volta para a Home
- THEN a Home mostra os dias
- AND "Nenhum dia de treino ainda" não é exibido em nenhum quadro da transição

#### Scenario: The expanded day survives leaving and returning
- GIVEN "Dia 3" is expanded on Home
- WHEN the user opens one of its exercises and then goes back
- THEN Home is shown with "Dia 3" still expanded

#### Scenario: Opening Home with a day addressed
- GIVEN the user opens Home addressed to "Dia 3" (e.g. reloads that address)
- WHEN Home renders
- THEN "Dia 3" is expanded

#### Scenario: A day that no longer exists
- GIVEN Home is opened addressed to a day that has since been deleted
- WHEN Home renders
- THEN no day is expanded and the screen behaves normally

#### Scenario: Toggling days does not pile up history
- GIVEN the user expands and collapses several days on Home
- WHEN the user then goes back
- THEN they leave Home, rather than stepping back through the accordion

---

### Requirement: Weekly Training Summary

Mantém-se tudo o que já é exigido: o resumo semanal no topo da Home, com as
sessões **concluídas nesta semana** contra a **meta fixa de 7**; a **trilha de
sete dias** começando na segunda, com os estados *done* / *today* / *future* /
*empty*; um dia passado sem treino renderiza vazio e não é acusado de falha;
tudo derivado do histórico de sessões concluídas, sem estado novo nem migração;
a sequência (*streak*) opcional; um dia com mais de uma sessão marcado; e o
escopo de **todas as academias**, inclusive as excluídas.

Acrescenta-se que o **zero state** é uma afirmação sobre os dados, e não sobre o
carregamento: "0 / 7 treinos" MUST ser exibido apenas quando o histórico já foi
lido. Enquanto a leitura não responde, o resumo MUST NOT mostrar uma contagem —
mostrar zero e depois corrigi-lo faz a Home piscar um número falso a cada
navegação.

#### Scenario: Summary reflects completed sessions
- GIVEN the user completed 3 sessions on distinct days of the current week
- WHEN the user opens Home
- THEN the summary shows the text "3 / 7 treinos"
- AND exactly 3 cells of the seven-day track are marked done

#### Scenario: A contagem não pisca zero antes do número real
- GIVEN o usuário concluiu 3 sessões nesta semana
- WHEN o usuário volta para a Home vindo de outra tela
- THEN o resumo mostra "3 / 7 treinos"
- AND "0 / 7 treinos" não é exibido em nenhum quadro da transição

#### Scenario: Semana sem histórico
- GIVEN não há sessões concluídas nesta semana
- WHEN a Home é aberta e a leitura do histórico responde
- THEN o resumo mostra um zero state válido — 0 concluídos, células vazias ou futuras

---

## REMOVED

(None)
