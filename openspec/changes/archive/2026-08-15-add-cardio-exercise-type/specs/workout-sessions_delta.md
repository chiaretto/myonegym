# Delta: workout-sessions

**Change ID:** `add-cardio-exercise-type`
**Affects:** `src/db/types.ts` (`Session.kind`), `src/db/repos.ts`
(`startCardioSession`, `completeSession`),
`src/features/session/SessionPage.tsx`,
`src/features/session/SessionEntryPage.tsx`

---

## MODIFIED

### Requirement: Single Active Session Per Gym

*(única mudança: a regra passa a valer **entre** os dois tipos de sessão)*

At most **one in-progress session** MAY exist for a gym at a time, **de
qualquer tipo**. While a session is active for the gym, starting another MUST be
prevented — seja um dia de treino, seja um cardio; the user resumes the existing
session instead.

A regra é deliberadamente única para os dois tipos: o app já comunica "há um
treino em andamento" na Home, e um segundo invariante só para cardio faria a
mesma tela responder duas perguntas diferentes.

#### Scenario: Prevent a second active session
- GIVEN gym "A" has an in-progress session for "Dia 1"
- WHEN the user tries to start a workout for "Dia 2" in gym "A"
- THEN a new session is NOT created
- AND the user is directed to resume or complete the active "Dia 1" session

#### Scenario: Um cardio não começa durante um treino
- GIVEN a academia "A" tem um treino de musculação em andamento
- WHEN o usuário tenta iniciar um cardio na aba Cardio
- THEN nenhuma sessão nova é criada
- AND ele é direcionado a retomar ou concluir a sessão em andamento

#### Scenario: Toda sessão em andamento tem um caminho visível de volta
- GIVEN existe uma sessão em andamento, de qualquer tipo
- WHEN o usuário percorre as telas de onde se inicia um treino
- THEN pelo menos uma delas oferece retomá-la explicitamente
- AND nenhuma tela recusa o início sem levar o usuário à sessão que bloqueia

#### Scenario: Um treino não começa durante um cardio
- GIVEN a academia "A" tem um cardio em andamento
- WHEN o usuário tenta iniciar o "Dia 1" na Home
- THEN nenhuma sessão nova é criada

#### Scenario: Active session is per gym
- GIVEN gym "A" has an in-progress session
- WHEN the user switches the active gym to "B"
- THEN gym "B" has no in-progress session and the user may start one in "B"

---

### Requirement: Session History Across Gyms

*(única mudança: as sessões de cardio entram no histórico e são
identificáveis; todo o resto do requisito permanece)*

O histórico de sessões concluídas MUST ser apresentado **dentro da tela de
Consistência** (capability `consistency`), como a **lista dos treinos do mês
exibido** pelo calendário.

A lista MUST incluir as sessões de **cardio** junto das de musculação, ordenadas
pela mesma regra, e cada item MUST deixar claro **qual dos dois** foi — o item
de cardio resume o **nome do exercício** feito, no lugar do nome do dia.

Todo o resto permanece: mais recentes primeiro, recolhida nos 3 mais recentes do
mês com "Ver mais N treinos", abrangendo **todas as academias** com a academia
identificada em cada item, sessões de academia excluída ainda visíveis, chevron
icon-only ao fim de cada card, e o toque abrindo o detalhe da sessão.

#### Scenario: Um cardio aparece no histórico do mês
- GIVEN o usuário concluiu um cardio de "Esteira" no dia 12
- WHEN abre a Consistência no mês do dia 12
- THEN a lista do mês inclui aquele item, resumindo "Esteira"
- AND ele é distinguível de um treino de musculação

#### Scenario: A lista mistura os dois tipos
- GIVEN no mês houve dois dias de musculação e três cardios
- WHEN o usuário expande a lista do mês
- THEN os cinco aparecem juntos, em ordem cronológica inversa

### Requirement: Session Exercise Detail

*(única mudança: o cartão de peso não é exibido quando o exercício é de
**Cardio**; todo o resto do requisito permanece)*

O detalhe da entrada de sessão MUST continuar como está — abas "Execução",
"Observações" e "Foto" como primeiro controle abaixo da barra de título, a mídia
dentro de "Execução", as categorias e a nota em "Observações", as fotos em
"Foto", os rótulos de status acima das abas e a barra fixa embaixo.

Quando o exercício da entrada é de **Cardio**, a aba "Execução" MUST NOT exibir
o cartão "Peso alvo", o editor nem a linha do tempo do histórico — ela mostra a
mídia (e as alternativas, se houver). "Observações" e "Foto" MUST continuar
funcionando exatamente como para um exercício de Força: nota e fotos são por
`(academia, exercício)` e são justamente o que ajuda num cardio (a tela da
esteira, o ajuste do banco da bike).

#### Scenario: Cardio sem peso na aba Execução
- GIVEN uma sessão de cardio da "Esteira" em andamento
- WHEN o usuário abre o detalhe da entrada
- THEN a aba "Execução" mostra a mídia e nenhum cartão de peso
- AND as abas "Observações" e "Foto" continuam disponíveis

#### Scenario: A nota do cardio é durável e por academia
- GIVEN o usuário escreveu "nível 8, 25 min" na Esteira da academia "A"
- WHEN abre a Esteira de novo em "A", num cardio futuro ou pelo catálogo
- THEN a nota está lá
- AND ela não aparece na Esteira da academia "B"

---

## ADDED

### Requirement: A Cardio Session Carries No Gym Tag

O cabeçalho de uma sessão de **cardio** MUST NOT exibir o rótulo com o nome da
academia. Onde a pessoa correu não é uma propriedade da corrida, e o chip era a
única coisa naquela tela sugerindo que o exercício pertencia a um lugar.

A sessão continua **armazenada por academia** — o que muda é só o que a tela
afirma. A lista da Consistência, que mistura academias no mesmo mês, MUST
continuar identificando de qual academia foi cada treino, inclusive os de
cardio: ali a informação distingue itens, em vez de decorar um.

Uma sessão de **musculação** MUST continuar exibindo o rótulo.

#### Scenario: Cardio sem rótulo de academia
- GIVEN uma sessão de cardio em andamento na academia "A"
- WHEN o usuário a abre
- THEN o cabeçalho mostra o nome do exercício e quando começou
- AND nenhum rótulo de academia é exibido

#### Scenario: Musculação mantém o rótulo
- GIVEN uma sessão de musculação na academia "A"
- WHEN o usuário a abre
- THEN o cabeçalho exibe o rótulo "A"

*(o início e a conclusão de um cardio estão na capability `cardio`.)*

## REMOVED

(Nenhum.)
