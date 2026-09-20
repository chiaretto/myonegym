# Delta: consistency

**Change ID:** `fix-session-day-by-start`
**Affects:** calendário, estrela de cardio, sequências, treinos do mês, 12
semanas, 12 meses, faixa "Esta semana" (Home e Cardio), data dos itens do
histórico, data da imagem compartilhada, linha da sessão concluída

---

## ADDED Requirements

### Requirement: O Dia de um Treino É o Dia em que Ele Começou

Todo lugar que situa um treino num **dia** — o calendário mensal e a sua
estrela, a sequência de dias e de semanas, os treinos do mês, os blocos de 12
semanas, as barras de 12 meses, a faixa "Esta semana" da Home e da aba Cardio,
a data de cada item do histórico, a data da imagem compartilhada e a linha da
sessão concluída — MUST usar o instante em que a sessão **começou**
(`Session.startedAt`), e MUST NOT usar o instante de conclusão.

Um treino iniciado antes da meia-noite e concluído depois dela é o treino do
dia em que **começou**. Para quem treinou, a noite de terça é terça; um app que
o registra na quarta quebra uma sequência que não quebrou e acende um dia que
não houve.

A regra MUST viver **num lugar só** (`workoutAt`, em `lib/consistency`), e os
callers MUST obter o dia por ele, e não lendo o campo — para que a próxima tela
que precise de "quando foi" não decida de novo.

O instante de conclusão continua com os seus dois usos, que não são "quando
foi": a **duração** (`completedAt − startedAt`) e o **estado** de concluída. A
linha da sessão concluída MUST dizer o dia do treino ("Feito ontem") e, ao
lado, a duração — nunca "Concluído hoje" sobre um treino que o calendário põe
em ontem.

Não há migração: o instante de início sempre foi gravado. Um histórico
existente passa a ser lido corretamente na próxima abertura.

#### Scenario: O treino da noite fica no dia em que começou
- GIVEN uma sessão iniciada às 23h40 de terça e concluída às 00h15 de quarta
- WHEN o usuário abre o Histórico
- THEN o calendário marca a terça, e não a quarta
- AND o item da lista é datado de terça
- AND a duração exibida é 35 min

#### Scenario: A sequência não quebra na virada do dia
- GIVEN o usuário treinou na segunda e iniciou o treino de terça às 23h50, concluindo depois da meia-noite
- WHEN abre o Histórico na quarta
- THEN a sequência de dias conta segunda e terça

#### Scenario: A faixa da semana acende o dia certo
- GIVEN uma sessão iniciada no sábado à noite e concluída na madrugada de domingo
- WHEN o usuário abre a Home ou a aba Cardio
- THEN a célula acesa em "Esta semana" é a de sábado

#### Scenario: A estrela de cardio segue a mesma regra
- GIVEN um cardio iniciado às 23h55 de quinta e concluído às 00h20 de sexta
- WHEN o usuário abre o Histórico
- THEN a estrela está na quinta

#### Scenario: A sessão aberta diz o dia do treino
- GIVEN a sessão de terça à noite, concluída na madrugada de quarta
- WHEN o usuário a abre na quarta
- THEN a linha diz "Feito ontem · 35 min"

#### Scenario: A imagem compartilhada leva o dia do treino
- GIVEN a mesma sessão
- WHEN o usuário compartilha a imagem
- THEN a data impressa é a de terça
