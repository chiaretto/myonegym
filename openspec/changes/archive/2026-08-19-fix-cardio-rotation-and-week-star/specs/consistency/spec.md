# Delta: consistency

**Change ID:** `fix-cardio-rotation-and-week-star`
**Affects:** o badge de "2+" nas células do calendário mensal

---

## MODIFIED Requirements

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
