# Delta: workout-sessions

**Change ID:** `fix-session-day-by-start`
**Affects:** ordem e data dos itens do histórico

---

## MODIFIED Requirements

### Requirement: Session History Across Gyms

O histórico de sessões concluídas MUST ser apresentado **dentro da tela de
Consistência** (capability `consistency`), como a **lista dos treinos do mês
exibido** pelo calendário.

A lista MUST incluir as sessões de **cardio** junto das de musculação, ordenadas
pela mesma regra, e cada item MUST deixar claro **qual dos dois** foi — o item
de cardio resume o **nome do exercício** feito, no lugar do nome do dia.

A lista MUST ser ordenada e datada pelo instante em que cada sessão
**começou** — o mesmo instante que decide o dia no calendário (ver *O Dia de um
Treino É o Dia em que Ele Começou*, em `consistency`). Ordenar por um instante
e datar por outro poderia pôr o treino "de terça" acima do "de quarta" com o
rótulo dizendo o contrário. O desempate entre sessões iniciadas no mesmo
instante é o id.

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

#### Scenario: A ordem segue o início
- GIVEN a sessão A começou às 23h40 de terça e terminou às 00h15 de quarta, e a sessão B começou às 00h05 de quarta e terminou às 00h10
- WHEN o usuário abre a lista do mês
- THEN B aparece acima de A, datada de quarta, e A abaixo, datada de terça
