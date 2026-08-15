# Delta: consistency

**Change ID:** `add-cardio-exercise-type`
**Affects:** `src/features/consistency/ConsistencyPage.tsx`,
`src/features/consistency/consistency.css`

---

## MODIFIED

### Requirement: Calendário Mensal de Treinos

*(única mudança: o dia que teve cardio ganha uma **estrela**; todo o resto do
requisito permanece)*

A tela MUST exibir um **calendário do mês**, grade **segunda-first** (mesma
convenção de `startOfWeek`), navegável por **mês anterior / próximo mês**. Os
dias MUST comunicar:

- **treinou** — disco de acento preenchido com o número do dia
- **2+ sessões** — o disco de treino com um **badge de canto**
- **hoje (sem sessão)** — **anel** de acento aberto
- **dia passado sem treino** — número **apagado**, sem disco e sem marca de
  falha (nenhum X, nenhum estado punitivo)
- **dia futuro** — número mais apagado que o passado
- **dias dos meses vizinhos** — não exibidos

Um dia em que houve **pelo menos uma sessão de cardio** MUST exibir, além do que
já exibiria, uma **estrela**. A estrela é um **sinal somado**, não um estado
novo: ela responde "que tipo de treino houve", enquanto o disco continua
respondendo "houve treino". Um dia com musculação **e** cardio MUST mostrar os
dois sinais, e um dia só de cardio MUST mostrar disco **e** estrela — cardio é
treino.

A estrela MUST ser discreta o bastante para não competir com o número do dia, e
MUST aparecer na **legenda** do calendário como os demais sinais.

A navegação MUST alcançar até o **primeiro mês com sessão** (o controle "‹"
desabilita antes disso) e MUST NOT passar do **mês corrente** (o controle "›"
desabilita nele). Trocar o mês MUST atualizar **junto** o calendário, o card
"Treinos no mês" e a lista do mês — um só estado de mês.

#### Scenario: Dia só de cardio
- GIVEN o usuário concluiu apenas um cardio no dia 12
- WHEN vê o calendário do mês
- THEN o dia 12 aparece como dia treinado, com a estrela

#### Scenario: Dia com musculação e cardio
- GIVEN no dia 14 houve um treino de musculação e um cardio
- WHEN o usuário vê o calendário
- THEN o dia 14 mostra o disco de treino, o badge de 2+ sessões e a estrela

#### Scenario: Dia só de musculação não tem estrela
- GIVEN no dia 15 houve apenas musculação
- WHEN o usuário vê o calendário
- THEN o dia 15 mostra o disco, sem estrela

#### Scenario: A legenda explica a estrela
- GIVEN o usuário está na Consistência
- WHEN lê a legenda do calendário
- THEN há uma entrada indicando que a estrela marca o dia com cardio

#### Scenario: Dia com duas sessões
- GIVEN o usuário concluiu duas sessões (academias diferentes) no dia 16
- WHEN ele vê o calendário do mês
- THEN o dia 16 aparece como disco de treino com o badge de 2+

#### Scenario: Hoje sem sessão é um anel, não uma falta
- GIVEN hoje é dia 26 e não há sessão concluída hoje
- WHEN o usuário vê o calendário
- THEN o dia 26 mostra o anel de "hoje", distinto dos dias passados sem treino

#### Scenario: Limites da navegação
- GIVEN a primeira sessão do histórico foi em março e hoje é julho
- WHEN o usuário navega com "‹"
- THEN a navegação para em março (o "‹" desabilita)
- AND o "›" desabilita ao voltar a julho

#### Scenario: O mês é um só estado
- GIVEN o calendário mostra julho
- WHEN o usuário toca "‹" para junho
- THEN o calendário, o card "Treinos em junho" e a lista de treinos mudam
  juntos para junho

---

### Requirement: Tela de Consistência no Lugar de Sessões

*(única mudança: os agregados passam a contar as sessões de cardio; todo o
resto do requisito permanece)*

O app MUST apresentar uma tela de **Consistência** na rota `/sessions`. A tela
compõe, nesta ordem: os **cards de estatística**, o **calendário mensal**, a
**lista dos treinos do mês exibido**, os blocos das **últimas 12 semanas** e o
gráfico dos **últimos 12 meses**.

Todos os agregados MUST considerar as sessões concluídas em **todas as
academias** (sessões de academia excluída contam), MUST NOT ser recortados pela
academia ativa, e a tela MUST NOT oferecer seletor de academia.

Os agregados MUST contar **os dois tipos de sessão**: um dia só de cardio conta
como dia treinado na sequência, no "treinos no mês", nos blocos de 12 semanas e
nas barras de 12 meses. Cardio é treino; o que distingue os tipos no calendário
é a **estrela**, não a exclusão da contagem.

Todos os valores MUST ser **derivados** do histórico existente
(`Session.completedAt`); nenhum estado persistido novo é introduzido para a
Consistência e nenhuma migração é necessária **por causa dela**.

Enquanto o histórico não foi lido, a tela MUST NOT exibir contagens. Sem nenhuma
sessão concluída, a tela MUST exibir um estado vazio válido que convida ao
primeiro treino.

#### Scenario: Cardio mantém a sequência viva
- GIVEN o usuário treinou musculação na segunda e fez só cardio na terça
- WHEN abre a Consistência na quarta
- THEN a sequência conta os dois dias

#### Scenario: Cardio conta no mês e nos gráficos
- GIVEN no mês houve 4 treinos de musculação e 3 cardios
- WHEN o usuário vê os cards e os gráficos
- THEN o "treinos no mês" conta 7
- AND os blocos de 12 semanas e as barras de 12 meses incluem os cardios

#### Scenario: A aba abre a tela nova
- GIVEN o app aberto na Home
- WHEN o usuário toca a aba rotulada "Consistência"
- THEN a rota `/sessions` mostra a tela de Consistência (estatísticas,
  calendário, lista do mês, 12 semanas, 12 meses)

#### Scenario: Sem seletor de academia
- GIVEN o usuário está na tela de Consistência
- WHEN ele observa o cabeçalho
- THEN não há seletor de academia, e trocar a academia ativa em outra tela não
  altera nenhum número da Consistência

#### Scenario: Histórico vazio
- GIVEN não há sessões concluídas em nenhuma academia
- WHEN o usuário abre a Consistência
- THEN um estado vazio convida ao primeiro treino, sem calendário quebrado nem
  contagens falsas

---

## ADDED

(Nenhum.)

## REMOVED

(Nenhum.)
