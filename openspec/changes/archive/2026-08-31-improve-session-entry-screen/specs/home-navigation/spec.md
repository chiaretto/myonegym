# Delta: home-navigation

**Change ID:** `improve-session-entry-screen`
**Affects:** o que acontece ao tocar Iniciar com um treino já em andamento

---

## MODIFIED Requirements

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
pela qual o cabeçalho inteiro do card responde (ver *Training Day Card*).

Tocá-la MUST abrir um **diálogo modal**, e MUST NOT se limitar a uma mensagem
passageira. Um aviso discreto é o instrumento errado para uma bifurcação: é
silencioso, sai sozinho e deixa o usuário encarando o botão que acabou de
recusá-lo. O diálogo MUST NOT levar direto para a sessão de **outro** dia — quem
tocou em "Iniciar" no Dia 3 não pediu para abrir o treino do Dia 1 —, mas MUST
oferecer esse caminho **nomeado**, junto das demais saídas.

O diálogo MUST dizer qual treino está em andamento e quanto dele já foi feito, e
MUST apresentar **todas as saídas de uma vez**, porque duas delas alteram dados e
o usuário precisa ver isso antes de escolher, não depois:

1. **Concluir o atual e iniciar o novo** — o treino aberto é encerrado com o que
   já estava marcado e vai para o histórico. Esta saída MUST respeitar o mesmo
   piso do runner (ver *Complete a Session*, em `workout-sessions`): com
   **nenhum** exercício marcado ela MUST ser apresentada como indisponível, com a
   razão à vista, porque uma sessão vazia se abandona em vez de se concluir.
2. **Voltar ao treino atual** — abre a sessão em andamento.
3. **Descartar o atual e iniciar o novo** — a sessão aberta e suas entradas são
   apagadas. Sendo irreversível, MUST se apresentar como destrutiva e MUST NOT
   ocupar a posição de ação primária.

O diálogo MUST poder ser **fechado sem escolher**, por um controle de fechar
explícito e pelos gestos que já fecham qualquer modal do app. Fechar MUST
significar **nada acontece**: nenhuma sessão criada, encerrada ou apagada, e o
usuário permanece na Home como estava. Fechar MUST NOT ser sinônimo de nenhuma
das opções.

Isso vale igualmente quando a sessão que bloqueia é um **cardio**, que não tem
dia e portanto não tem card próprio nesta tela. O diálogo MUST nomear o **tipo**
em andamento, e é essa palavra que aponta para a aba Cardio (ver a capability
`cardio`), onde a mesma colisão MUST ser respondida pelo **mesmo diálogo**: duas
telas que recusam a mesma coisa pela mesma razão não podem responder de formas
diferentes.

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
- THEN abre um diálogo dizendo que já há um treino em andamento, e qual
- AND ele oferece concluir e iniciar, voltar ao atual, e descartar e iniciar
- AND nenhuma sessão nova é criada enquanto nada for escolhido
- AND o usuário não é levado para a sessão do "Dia 1" sem pedir

#### Scenario: Fechar o diálogo não faz nada
- GIVEN o diálogo aberto sobre uma sessão em andamento do "Dia 1"
- WHEN o usuário o fecha pelo controle de fechar
- THEN a sessão do "Dia 1" continua em andamento, intacta
- AND nenhuma sessão nova foi criada
- AND o usuário permanece na Home

#### Scenario: Voltar ao treino atual
- GIVEN o diálogo aberto sobre uma sessão em andamento do "Dia 1"
- WHEN o usuário escolhe voltar ao treino atual
- THEN a sessão do "Dia 1" é aberta, ainda em andamento
- AND nenhuma sessão nova é criada

#### Scenario: Concluir o atual e iniciar o novo
- GIVEN a sessão do "Dia 1" tem ao menos um exercício concluído
- WHEN o usuário escolhe concluir e iniciar "Dia 3"
- THEN a sessão do "Dia 1" passa a concluída, preservando o que estava marcado
- AND uma sessão do "Dia 3" é criada e aberta

#### Scenario: Sem nada marcado, concluir não é oferecido
- GIVEN a sessão do "Dia 1" não tem nenhum exercício concluído
- WHEN o diálogo é aberto
- THEN a opção de concluir e iniciar é exibida indisponível
- AND a razão é exibida junto dela

#### Scenario: Descartar o atual e iniciar o novo
- GIVEN o diálogo aberto sobre uma sessão em andamento do "Dia 1"
- WHEN o usuário escolhe descartar "Dia 1"
- THEN a sessão do "Dia 1" e suas entradas são apagadas
- AND uma sessão do "Dia 3" é criada e aberta

#### Scenario: Um cardio em andamento também só é explicado, nunca aberto
- GIVEN a academia "A" tem um **cardio** em andamento, que não tem card na Home
- WHEN o usuário toca na affordance de iniciar de "Dia 1"
- THEN o diálogo nomeia um **cardio** em andamento e oferece as mesmas três saídas
- AND nenhuma sessão nova é criada enquanto nada for escolhido
- AND o usuário não é levado para a sessão de cardio sem tê-la escolhido

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

## ADDED

(None)

---

## REMOVED

(None)
