# Delta: workout-sessions

**Change ID:** `sessions-across-gyms`
**Affects:** lista de sessões (`SessionsPage.tsx`), leitura do histórico
(`listSessionSummaries`, `SessionSummary`), e o escopo da academia ativa

---

## ADDED

(None)

---

## MODIFIED

### Requirement: Session History Per Gym

> **Renomeado para "Session History Across Gyms".** O escopo estava no próprio
> título, e é justamente o escopo que muda — o requisito antigo deve ser
> substituído por inteiro, título incluído.

### Requirement: Session History Across Gyms

O app MUST oferecer uma **visão de histórico** listando as sessões concluídas,
mais recentes primeiro, cada uma resumindo o nome do dia, a data e a contagem de
itens concluídos.

O histórico MUST abranger **todas as academias**, e MUST NOT ser filtrado pela
academia ativa. Um treino feito é um treino feito: o lugar onde ele aconteceu é
uma propriedade dele, não uma condição para enxergá-lo. Trocar a academia ativa
MUST NOT alterar a lista.

Como a lista mistura academias, cada item MUST indicar **de qual academia** foi
aquele treino.

A academia de uma sessão pode **não existir mais** — excluir uma academia não
exclui as sessões feitas nela. Essas sessões MUST continuar aparecendo, porque
correspondem a treinos que de fato aconteceram, e MUST ser identificadas como
sendo de uma academia removida, em vez de exibidas sem indicação alguma: um campo
vazio se leria como defeito da tela.

Qualquer contagem que a tela apresente MUST se referir ao total exibido, sem
sugerir um recorte por academia.

A tela de histórico MUST NOT oferecer o controle de troca de academia ativa:
nada do que ela mostra responde a ele, e um controle sem efeito visível se lê
como quebrado.

O escopo da academia ativa fica assim delimitado: ela MUST continuar governando
**onde um treino acontece** e a que pesos ele se refere, e MUST NOT governar
**o que o usuário consegue ver do próprio passado**.

#### Scenario: List completed sessions
- GIVEN gym "A" has three completed sessions
- WHEN the user opens the session history
- THEN the three sessions are listed newest first with day name, date, and done count

#### Scenario: Histórico reúne as academias
- GIVEN a academia "A" tem 3 sessões concluídas e a "B" tem 1
- WHEN o usuário abre o histórico
- THEN as 4 sessões aparecem numa lista só, da mais recente para a mais antiga
- AND a ordem é cronológica entre academias, não agrupada por academia

#### Scenario: A lista não segue a academia ativa
- GIVEN o histórico está aberto com a academia "A" ativa
- WHEN o usuário troca a academia ativa para "B"
- THEN a lista continua mostrando exatamente as mesmas sessões

#### Scenario: Cada item diz de onde veio
- GIVEN uma sessão feita na academia "Smart Fit"
- WHEN o usuário vê essa sessão no histórico
- THEN o item mostra "Smart Fit" junto das demais informações do treino

#### Scenario: Sessão de academia excluída
- GIVEN o usuário concluiu um treino numa academia e depois excluiu essa academia
- WHEN o usuário abre o histórico
- THEN a sessão continua listada
- AND ela é identificada como sendo de uma academia removida, e não com o espaço
  do nome em branco

#### Scenario: Sem controle de academia no histórico
- GIVEN o usuário está na tela de histórico
- WHEN ele observa o cabeçalho
- THEN não há seletor de academia ativa ali

#### Scenario: Empty history
- GIVEN there are no completed sessions in any gym
- WHEN the user opens the session history
- THEN an empty state invites the user to start their first workout

---

## REMOVED

(None — "Session History Per Gym" é substituído pelo requisito renomeado acima,
não removido do produto.)
