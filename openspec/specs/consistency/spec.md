# consistency Specification

## Purpose
A tela de **Consistência** (rota `/sessions`, aba do meio) responde "eu tenho sido constante?": cards de sequência (dias e semanas), um calendário mensal navegável, a lista dos treinos do mês, as últimas 12 semanas em blocos e os últimos 12 meses em barras. Tudo é derivado das sessões concluídas de **todas as academias** (`Session.completedAt`) — nenhum estado persistido novo, nenhum estado punitivo.

## Requirements
### Requirement: Tela de Consistência no Lugar de Sessões

O app MUST apresentar na rota `/sessions` a tela que reúne o histórico de
treinos, **rotulada "Histórico"** — tanto na aba da barra inferior quanto no
título da própria tela. A tela compõe, nesta ordem: os **cards de estatística**,
o **calendário mensal**, a **lista dos treinos do mês exibido**, os blocos das
**últimas 12 semanas** e o gráfico dos **últimos 12 meses**.

O rótulo MUST ser o **mesmo** nos dois lugares. "Consistência" nomeava a ideia
que a tela defende; "Histórico" nomeia o que ela mostra, que é o que alguém
procura ao percorrer quatro abas — e é o que o ícone da aba (`pi-history`) já
dizia. A capability continua se chamando `consistency`: o nome interno descreve
o propósito, e não precisa acompanhar o rótulo.

Todos os agregados MUST considerar as sessões concluídas em **todas as
academias** (sessões de academia excluída contam), MUST NOT ser recortados pela
academia ativa, e a tela MUST NOT oferecer seletor de academia.

Os agregados MUST contar **os dois tipos de sessão**: um dia só de cardio conta
como dia treinado na sequência, no "treinos no mês", nos blocos de 12 semanas e
nas barras de 12 meses. Cardio é treino; o que distingue os tipos no calendário
é a **estrela**, não a exclusão da contagem.

Todos os valores MUST ser **derivados** do histórico existente
(`Session.completedAt`); nenhum estado persistido novo é introduzido para esta
tela e nenhuma migração é necessária **por causa dela**.

Enquanto o histórico não foi lido, a tela MUST NOT exibir contagens. Sem nenhuma
sessão concluída, a tela MUST exibir um estado vazio válido que convida ao
primeiro treino.

#### Scenario: Cardio mantém a sequência viva
- GIVEN o usuário treinou musculação na segunda e fez só cardio na terça
- WHEN abre o Histórico na quarta
- THEN a sequência conta os dois dias

#### Scenario: Cardio conta no mês e nos gráficos
- GIVEN no mês houve 4 treinos de musculação e 3 cardios
- WHEN o usuário vê os cards e os gráficos
- THEN o "treinos no mês" conta 7
- AND os blocos de 12 semanas e as barras de 12 meses incluem os cardios

#### Scenario: A aba abre a tela
- GIVEN o app aberto na Home
- WHEN o usuário toca a aba rotulada "Histórico"
- THEN a rota `/sessions` mostra a tela (estatísticas, calendário, lista do mês,
  12 semanas, 12 meses), com "Histórico" no título

#### Scenario: Nenhum nome antigo sobrevive na aba
- GIVEN a barra inferior
- WHEN o usuário a percorre
- THEN nenhuma aba se chama "Consistência" nem "Sessões"

#### Scenario: Sem seletor de academia
- GIVEN o usuário está na tela de Histórico
- WHEN ele observa o cabeçalho
- THEN não há seletor de academia, e trocar a academia ativa em outra tela não
  altera nenhum número da tela

#### Scenario: Histórico vazio
- GIVEN não há sessões concluídas em nenhuma academia
- WHEN o usuário abre a tela
- THEN um estado vazio convida ao primeiro treino, sem calendário quebrado nem
  contagens falsas

---

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

- **treinou musculação** — disco de acento preenchido com o número do dia, mais
  um **ponto de canto**
- **treinou cardio** — o disco com uma **estrela**
- **treinou os dois** — o disco com o ponto **e** a estrela
- **hoje (sem sessão)** — **anel** de acento aberto
- **dia passado sem treino** — número **apagado**, sem disco e sem marca de
  falha (nenhum X, nenhum estado punitivo)
- **dia futuro** — número mais apagado que o passado
- **dias dos meses vizinhos** — não exibidos

O ponto e a estrela são **sinais somados**, e não estados novos: o disco continua
respondendo "houve treino", e eles respondem **"de que tipo"**. Um dia com
musculação **e** cardio MUST mostrar os dois, em cantos distintos; um dia só de
cardio MUST mostrar disco **e** estrela — cardio é treino.

Os sinais respondem "houve um destes", e MUST NOT contar: dois treinos de
musculação no mesmo dia MUST parecer iguais a um. Contar era o que o ponto fazia
antes — ele marcava "2+ sessões" —, e essa contagem MUST ceder o lugar: um dia
com um treino e um cardio ganhava o badge e afirmava dois treinos, que é falso, e
o tipo, que é a pergunta que a célula não respondia, não tinha sinal nenhum.

Como toda sessão é de um tipo ou do outro, uma célula de dia **treinado** MUST
carregar ao menos um dos dois sinais.

O que o ponto deixou de **contar** ele MUST NOT deixar de **informar**: a
descrição auxiliar da célula MUST continuar dando o número real de sessões do
dia — nada mais o desenha.

Os dois sinais MUST ser discretos o bastante para não competir com o número do
dia, e a **legenda** MUST descrevê-los pelo que eles passaram a significar,
incluindo o caso em que os dois aparecem juntos. A legenda MUST NOT continuar
oferecendo um disco **sem sinal** como exemplo de "treinou": esse desenho não
ocorre mais.

A navegação MUST alcançar até o **primeiro mês com sessão** (o controle "‹"
desabilita antes disso) e MUST NOT passar do **mês corrente** (o controle "›"
desabilita nele). Trocar o mês MUST atualizar **junto** o calendário, o card
"Treinos no mês" e a lista do mês — um só estado de mês.

#### Scenario: Dia só de cardio
- GIVEN o usuário concluiu apenas um cardio no dia 12
- WHEN vê o calendário do mês
- THEN o dia 12 aparece como dia treinado, com a estrela
- AND não mostra o ponto de musculação

#### Scenario: Dia só de musculação
- GIVEN no dia 15 houve apenas musculação
- WHEN o usuário vê o calendário
- THEN o dia 15 mostra o disco com o ponto de musculação
- AND não mostra a estrela

#### Scenario: Dia com musculação e cardio
- GIVEN no dia 14 houve um treino de musculação e um cardio
- WHEN o usuário vê o calendário
- THEN o dia 14 mostra o disco com o ponto **e** a estrela

#### Scenario: Repetir o mesmo tipo não acrescenta sinal
- GIVEN o usuário concluiu dois treinos de musculação (academias diferentes) no dia 16
- WHEN ele vê o calendário do mês
- THEN o dia 16 mostra o disco com o ponto de musculação e nada mais
- AND está igual ao dia 15, que teve um treino só

#### Scenario: Vários cardios também não somam sinal
- GIVEN no dia 12 houve dois cardios e nenhum treino de musculação
- WHEN o usuário vê o calendário
- THEN o dia 12 mostra o disco e a estrela, sem o ponto de musculação

#### Scenario: Nenhum dia treinado fica sem sinal
- GIVEN o mês tem dias de musculação, dias de cardio e dias com os dois
- WHEN o usuário vê o calendário
- THEN toda célula de dia treinado carrega ao menos um dos dois sinais

#### Scenario: O número de sessões continua alcançável
- GIVEN no dia 16 houve dois treinos
- WHEN o usuário consulta a descrição auxiliar daquela célula
- THEN ela informa que houve duas sessões

#### Scenario: A legenda explica os dois sinais e a combinação
- GIVEN o usuário está na Consistência
- WHEN lê a legenda do calendário
- THEN há uma entrada para musculação, uma para cardio e uma para os dois juntos
- AND não há uma entrada oferecendo um disco sem sinal

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
