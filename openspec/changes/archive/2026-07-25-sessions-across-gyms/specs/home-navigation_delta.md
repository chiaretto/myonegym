# Delta: home-navigation

**Change ID:** `sessions-across-gyms`
**Affects:** resumo semanal e "Próximo treino" na Home (`HomePage.tsx`) — ambos
deixam de ser recortados pela academia ativa

---

## ADDED

(None)

---

## MODIFIED

### Requirement: Weekly Training Summary

Mantém-se tudo o que já é exigido: a Home apresenta um **resumo semanal** no topo
do conteúdo, com quantas sessões foram **concluídas nesta semana** contra uma
**meta fixa de 7**; uma **trilha de sete dias**, começando na segunda-feira, com
os estados *done* / *today* / *future* / *empty*; um dia passado sem treino
renderiza vazio e **não** é acusado de falha; tudo é **derivado** do histórico de
sessões concluídas, sem estado novo nem migração; a semana sem histórico renderiza
um zero state válido; a sequência (*streak*) é opcional e também derivada; e um
dia com mais de uma sessão é marcado para que a diferença entre a contagem e a
trilha fique legível.

Acrescenta-se o **escopo**: a contagem, a trilha e a sequência MUST considerar as
sessões concluídas em **todas as academias**, e MUST NOT ser recortadas pela
academia ativa.

A pergunta que o resumo responde é "eu treinei esta semana?", não "eu treinei
esta semana **aqui**?" — quem treina em mais de um lugar tem uma semana só. Dois
treinos em academias diferentes na mesma semana MUST somar, e MUST marcar seus
respectivos dias na trilha.

Sessões cuja academia foi excluída MUST contar como qualquer outra: o treino
aconteceu.

#### Scenario: Summary reflects completed sessions
- GIVEN the user completed 3 sessions on distinct days of the current week
- WHEN the user opens Home
- THEN the summary shows the text "3 / 7 treinos"
- AND exactly 3 cells of the seven-day track are marked done

#### Scenario: Treinos em academias diferentes somam
- GIVEN o usuário treinou segunda na academia "A" e terça na academia "B"
- WHEN o usuário abre a Home, com qualquer uma das duas ativa
- THEN o resumo mostra "2 / 7 treinos"
- AND segunda e terça estão marcadas na trilha

#### Scenario: A contagem não muda ao trocar de academia
- GIVEN a Home mostra "2 / 7 treinos"
- WHEN o usuário troca a academia ativa
- THEN a contagem e a trilha continuam as mesmas

#### Scenario: Treino em academia excluída continua contando
- GIVEN o usuário treinou quarta e depois excluiu aquela academia
- WHEN o usuário abre a Home na mesma semana
- THEN quarta segue marcada na trilha e o treino segue somando na contagem

#### Scenario: Goal is fixed, not derived from configured days
- GIVEN the user has 4 configured training days
- WHEN the user opens Home
- THEN the summary shows a goal of 7, not 4

#### Scenario: Zero state at the start of the week
- GIVEN the user has completed no sessions in the current week
- WHEN the user opens Home on Monday
- THEN the summary renders "0 / 7 treinos" without error
- AND Monday is marked as today while the remaining six cells are future

#### Scenario: Week starts on Monday
- GIVEN the user completed a session on Sunday of the current week
- WHEN the user opens Home
- THEN that session counts toward the current week
- AND it is shown in the last cell of the track

#### Scenario: Past day with no session is not accused
- GIVEN today is Friday and the user did not train on Wednesday
- WHEN the user opens Home
- THEN Wednesday renders as an empty cell
- AND it carries no failure marker

#### Scenario: Two sessions on the same day stay legible
- GIVEN the user completed two sessions on Tuesday
- WHEN the user opens Home
- THEN Tuesday is marked as done and additionally flagged as having more than one session

---

### Requirement: Feature the Next Training Day

Mantém-se a mecânica: a Home MUST marcar **exatamente um** dia como
**"Próximo treino"**, escolhido a partir do histórico e não sempre o primeiro da
lista. O dia marcado MUST ser o **imediatamente seguinte**, na ordem de exibição
do acordeão, ao dia da **sessão concluída mais recente**. A escolha MUST **voltar
ao primeiro** dia quando não há sessões concluídas, quando o dia da sessão mais
recente era o **último** da lista, ou quando esse dia **não está mais** na lista
(por exemplo, foi excluído). A marcação MAY ser suprimida enquanto houver uma
sessão em andamento sendo retomada.

**Muda a origem do histórico.** A sessão mais recente MUST ser tomada entre
**todas as academias**, e não apenas a da academia ativa. Os dias de treino são
**globais** — não pertencem a academia nenhuma —, então a rotação "treinou o
Dia 1, o próximo é o Dia 2" MUST NOT se reiniciar porque o usuário passou a
treinar em outro lugar.

A sessão **em andamento**, essa sim, continua sendo por academia: a supressão da
marcação MUST considerar a sessão em andamento **da academia ativa** (ver
"Single Active Session Per Gym").

#### Scenario: No history features the first day
- GIVEN there are no completed sessions in any gym and days are "Dia 1", "Dia 2", "Dia 3"
- WHEN the user views Home
- THEN "Dia 1" is marked "Próximo treino"

#### Scenario: Advances to the day after the last session
- GIVEN days are "Dia 1", "Dia 2", "Dia 3" and the most recent completed session was for "Dia 1"
- WHEN the user views Home
- THEN "Dia 2" is marked "Próximo treino"

#### Scenario: Wraps to the first day after the last day
- GIVEN days are "Dia 1", "Dia 2", "Dia 3" and the most recent completed session was for "Dia 3" (the last day)
- WHEN the user views Home
- THEN "Dia 1" is marked "Próximo treino" (the rotation restarts)

#### Scenario: Uses the most recent session, not the highest day
- GIVEN the user completed "Dia 3" and then later completed "Dia 1"
- WHEN the user views Home
- THEN "Dia 2" is marked "Próximo treino" (based on the most recent session, "Dia 1")

#### Scenario: A rotação não se reinicia ao trocar de academia
- GIVEN o treino concluído mais recente foi o "Dia 2", na academia "A", e a
  academia "B" não tem nenhuma sessão
- WHEN o usuário torna "B" a academia ativa e abre a Home
- THEN "Dia 3" continua marcado como "Próximo treino"
- AND a rotação não volta para o "Dia 1"

#### Scenario: Deleted last-session day falls back to the first
- GIVEN the most recent completed session was for a day that has since been deleted
- WHEN the user views Home
- THEN "Dia 1" is marked "Próximo treino"

#### Scenario: A sessão em andamento continua sendo da academia ativa
- GIVEN há uma sessão em andamento na academia "A"
- WHEN o usuário torna "B" a academia ativa e abre a Home
- THEN nenhum dia é apresentado como retomável
- AND o "Próximo treino" segue marcado normalmente, a partir do histórico global

---

## REMOVED

(None)
