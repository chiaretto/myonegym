# Delta: Consistency (nova capability)

**Change ID:** `add-consistency-screen`
**Affects:** nova tela em `/sessions` (aba "Consistência"), agregados derivados
de sessões concluídas

---

## ADDED

### Requirement: Tela de Consistência no Lugar de Sessões

O app MUST apresentar uma tela de **Consistência** na rota `/sessions`,
substituindo a listagem plana anterior. A aba do meio da tab bar MUST passar a
rotular-se **"Consistência"**, mantendo o mesmo ícone e a mesma posição. A tela
compõe, nesta ordem: os **cards de estatística**, o **calendário mensal**, a
**lista dos treinos do mês exibido**, os blocos das **últimas 12 semanas** e o
gráfico dos **últimos 12 meses**.

Todos os agregados MUST considerar as sessões concluídas em **todas as
academias** (sessões de academia excluída contam), MUST NOT ser recortados pela
academia ativa, e a tela MUST NOT oferecer seletor de academia — mesma decisão
do histórico global.

Todos os valores MUST ser **derivados** do histórico existente
(`Session.completedAt`); nenhum estado persistido novo é introduzido e nenhuma
migração é necessária.

Enquanto o histórico não foi lido, a tela MUST NOT exibir contagens (ver
"Estados Vazios Só Depois da Resposta" em app-foundation). Sem nenhuma sessão
concluída, a tela MUST exibir um estado vazio válido que convida ao primeiro
treino.

#### Scenario: A aba abre a tela nova
- GIVEN o app aberto na Home
- WHEN o usuário toca a aba do meio, rotulada "Consistência"
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

### Requirement: Cards de Sequência e do Mês

O topo da tela MUST exibir **três cards na mesma linha**:

1. **Dias em sequência** — dias consecutivos com ≥1 sessão concluída,
   terminando hoje ou ontem (hoje ainda sem treino não zera a contagem de
   ontem). Este card carrega a **chama** e o **destaque de acento**, e MUST
   mostrar o mesmo valor que o pill da chama do resumo semanal da Home.
2. **Semanas em sequência** — semanas consecutivas (seg-first) com ≥1 sessão
   concluída, terminando na semana corrente. A semana corrente MUST contar
   quando já tem sessão e MUST NOT quebrar a sequência enquanto não termina.
3. **Treinos no mês exibido** — total de sessões concluídas no mês que o
   calendário mostra; o rótulo MUST nomear o mês (ex.: "Treinos em julho").

A régua diária é termômetro; a régua que define "manter a sequência" é a
**semanal**. Nenhum card MUST apresentar estado punitivo.

#### Scenario: Dias em sequência não zera de manhã
- GIVEN o usuário treinou ontem e anteontem e hoje ainda não treinou
- WHEN ele abre a Consistência de manhã
- THEN "Dias em sequência" mostra 2

#### Scenario: Semana corrente não quebra a sequência
- GIVEN as 5 semanas anteriores têm sessão e a semana corrente ainda não tem
- WHEN o usuário abre a Consistência na segunda-feira
- THEN "Semanas em sequência" mostra 5 (a semana corrente não conta nem quebra)

#### Scenario: Semana vazia no passado quebra a sequência
- GIVEN houve sessões por 9 semanas, uma semana inteira sem sessão, e depois 6
  semanas com sessão até hoje
- WHEN o usuário abre a Consistência
- THEN "Semanas em sequência" mostra 6

#### Scenario: O card do mês segue o mês exibido
- GIVEN o calendário mostra junho com 9 sessões concluídas
- WHEN o usuário observa os cards
- THEN o terceiro card mostra 9 com o rótulo nomeando junho

### Requirement: Calendário Mensal de Treinos

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

A navegação MUST alcançar até o **primeiro mês com sessão** (o controle "‹"
desabilita antes disso) e MUST NOT passar do **mês corrente** (o controle "›"
desabilita nele). Trocar o mês MUST atualizar **junto** o calendário, o card
"Treinos no mês" e a lista do mês — um só estado de mês.

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

### Requirement: Últimas 12 Semanas em Blocos

A tela MUST exibir uma fileira de **12 blocos, um por semana** (seg-first,
terminando na semana corrente), cada bloco mostrando **a contagem de sessões
da semana** e com intensidade visual proporcional (0 = apagado, 1–2 = tom
médio, 3+ = acento pleno). Rótulos de mês MUST ancorar onde cada mês começa, e
uma legenda "menos → mais" MUST acompanhar. Uma semana sem sessão MUST exibir
"0" — presença apagada, não erro.

#### Scenario: Semana vazia aparece como lacuna legível
- GIVEN uma semana de viagem sem nenhuma sessão entre semanas ativas
- WHEN o usuário vê os 12 blocos
- THEN o bloco daquela semana mostra "0" em tom apagado, entre blocos coloridos

#### Scenario: Os blocos batem com o calendário
- GIVEN a semana corrente tem 4 sessões nos dias 20, 22, 24 e 25
- WHEN o usuário compara o último bloco com o calendário
- THEN o bloco mostra "4" e o calendário marca exatamente esses 4 dias

### Requirement: Últimos 12 Meses em Barras

A tela MUST exibir um gráfico de **barras dos últimos 12 meses** (terminando no
mês corrente): barras na cor de acento com altura proporcional ao máximo do
período, a **contagem sobre cada barra** em tinta de texto, e o **mês corrente
em tom médio** (parcial, "em andamento") com legenda distinguindo mês completo
de mês em andamento. Rótulos de mês MAY ser alternados para caber; a leitura
completa de cada barra MUST estar disponível ao toque.

#### Scenario: Mês corrente é visivelmente parcial
- GIVEN estamos no dia 26 e o mês corrente tem 13 sessões
- WHEN o usuário vê o gráfico
- THEN a barra do mês corrente mostra "13" no tom médio de "em andamento",
  distinta dos meses completos

#### Scenario: Contagem visível em cada barra
- GIVEN 12 meses com históricos variados
- WHEN o usuário vê o gráfico
- THEN cada barra tem sua contagem legível sobre ela, sem depender de toque

---

## MODIFIED

(Nenhum — capability nova. As mudanças no histórico estão no delta de
`workout-sessions`.)

---

## REMOVED

(None)
