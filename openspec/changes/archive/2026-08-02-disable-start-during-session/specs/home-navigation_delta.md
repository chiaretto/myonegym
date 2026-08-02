# Delta: home-navigation

**Change ID:** `disable-start-during-session`
**Affects:** Home accordion — a affordance de iniciar/retomar de cada dia

---

## ADDED

(None — o comportamento novo é uma extensão do requisito existente, editado
abaixo.)

---

## MODIFIED

### Requirement: Start or Resume a Workout From a Day

Each training day on the Home accordion MUST expose a **start workout**
affordance that begins a session for that day in the **active gym** (see the
workout-sessions spec). When the active gym already has an in-progress session,
the affordance MUST instead offer to **resume** that session rather than start a
new one.

Como existe no máximo **uma sessão em andamento por academia** (ver *Single
Active Session Per Gym*), enquanto a academia ativa tiver uma sessão aberta as
affordances de iniciar dos **demais** dias MUST se apresentar como
**desabilitadas**, e MUST NOT continuar com a aparência de uma ação disponível.
Um botão que se oferece a iniciar um treino que a regra não permite iniciar
custa ao usuário um toque para descobrir uma regra que a tela tinha como mostrar.

O estado desabilitado MUST ser **visível** — a affordance perde a cor de ação e
passa a neutra — e MUST ser **anunciado** à tecnologia assistiva. O nome
acessível MUST continuar sendo exatamente **"Iniciar"**: o botão segue sendo o
botão de iniciar aquele dia, apenas indisponível agora.

A affordance desabilitada MUST NOT ficar inerte ao toque. Num aparelho de toque,
um controle que não responde não se distingue de um app travado — a mesma razão
pela qual o cabeçalho inteiro do card responde (ver *Training Day Card*). Tocá-la
MUST **explicar** por que iniciar não é possível, e MUST NOT levar o usuário para
a sessão de **outro** dia: quem tocou em "Iniciar" no Dia 3 não pediu para abrir
o treino do Dia 1. O caminho para retomar é a affordance de **"Continuar"** — que
MUST permanecer com a aparência de ação e, sendo a única assim na tela, aponta
para si.

O bloqueio MUST ser aplicado apenas quando a existência da sessão em andamento já
é **conhecida**. Enquanto a leitura não responde, nenhuma affordance MUST ser
apresentada como desabilitada — pintar e despintar os botões faz a Home piscar a
cada volta para ela, o mesmo defeito que "Estados Vazios Só Depois da Resposta"
(spec app-foundation) evita nas contagens e listas.

Como a sessão em andamento é **por academia**, o bloqueio MUST acompanhar a
academia ativa: tornar ativa uma academia sem sessão aberta MUST devolver todas
as affordances ao estado normal.

#### Scenario: Start a workout from Home
- GIVEN gym "A" is active and "Dia 1" is shown on Home with no active session
- WHEN the user taps the start-workout affordance on "Dia 1"
- THEN an in-progress session for "Dia 1" is created in gym "A"
- AND the user is taken to the active-session runner

#### Scenario: Resume instead of starting a second session
- GIVEN gym "A" already has an in-progress session for "Dia 1"
- WHEN the user views Home
- THEN the affordance invites the user to resume the active session
- AND tapping it opens the existing session rather than creating a new one

#### Scenario: Os outros dias ficam visivelmente desabilitados
- GIVEN a academia "A" tem uma sessão em andamento do "Dia 1"
- AND a Home mostra "Dia 1", "Dia 2" e "Dia 3"
- WHEN o usuário vê a Home
- THEN as affordances de iniciar de "Dia 2" e "Dia 3" são exibidas neutras, sem a
  cor de ação
- AND a affordance de "Dia 1" segue com a cor de ação, rotulada "Continuar"

#### Scenario: A tecnologia assistiva ouve o mesmo
- GIVEN a academia "A" tem uma sessão em andamento do "Dia 1"
- WHEN a tecnologia assistiva lê a affordance de "Dia 2"
- THEN ela é anunciada como desabilitada
- AND seu nome continua sendo exatamente "Iniciar"

#### Scenario: Tocar no botão desabilitado explica, e não navega
- GIVEN a academia "A" tem uma sessão em andamento do "Dia 1"
- WHEN o usuário toca na affordance de iniciar de "Dia 3"
- THEN é exibida uma explicação de que já há um treino em andamento
- AND nenhuma sessão nova é criada
- AND o usuário permanece na Home, sem ser levado para a sessão do "Dia 1"

#### Scenario: O botão desabilitado não expande o dia
- GIVEN "Dia 3" está recolhido e sua affordance de iniciar está desabilitada
- WHEN o usuário toca nessa affordance
- THEN "Dia 3" permanece recolhido

#### Scenario: Nenhum botão pisca cinza antes da resposta
- GIVEN não há nenhuma sessão em andamento na academia ativa
- WHEN o usuário volta para a Home vindo de outra tela
- THEN nenhuma affordance de iniciar é exibida como desabilitada em nenhum quadro
  da transição

#### Scenario: Concluir o treino devolve os botões
- GIVEN a academia "A" tinha uma sessão em andamento do "Dia 1"
- WHEN o usuário conclui essa sessão e volta para a Home
- THEN todas as affordances de iniciar voltam ao estado normal

#### Scenario: Trocar de academia devolve os botões
- GIVEN a academia "A" tem uma sessão em andamento e a academia "B" não tem
- WHEN o usuário torna "B" a academia ativa
- THEN nenhuma affordance de iniciar é exibida como desabilitada

#### Scenario: Start requires an active gym
- GIVEN no gym is active
- WHEN the user taps the start-workout affordance
- THEN starting is blocked and the user is prompted to create/select a gym first

---

## REMOVED

(None)
