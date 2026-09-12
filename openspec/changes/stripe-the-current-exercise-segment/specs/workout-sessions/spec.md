# Delta: workout-sessions

**Change ID:** `stripe-the-current-exercise-segment`
**Affects:** como o segmento **atual** da barra de progresso segmentada se pinta

---

## MODIFIED Requirements

### Requirement: Segmented Progress on the Session Exercise Detail

O detalhe da entrada de sessão MUST exibir uma **barra de progresso segmentada**
com **um segmento por exercício da sessão**, na mesma ordem do runner. É a tela
onde o treino inteiro é passado, uma entrada por vez, e sem ela a única forma de
saber quantos exercícios faltam é sair para o runner.

Ela MUST viver na **barra flutuante inferior**, **abaixo** das setas e do
Concluir. Aquele bloco já é fixo e já é para onde o polegar volta entre as
séries, então o progresso viaja junto dos controles que andam por ele em vez de
abrir uma segunda faixa de chrome no topo da tela. Os controles MUST ficar com
a borda mais próxima do polegar, e a barra MUST NOT rolar com o conteúdo: ela é
chrome, e MUST permanecer visível em todas as abas.

Cada segmento MUST estar num de três estados, visualmente distinguíveis:
**concluído** (a entrada está marcada como feita), **atual** (é a entrada sendo
vista) e **pendente**. Uma entrada pode ser ao mesmo tempo atual e concluída; o
segmento MUST então dizer as duas coisas.

Os três MUST se distinguir por **cor cheia e textura**, e não por diferenças de
opacidade da mesma cor:

- **pendente** — a cor neutra de trilho, baixo;
- **atual, ainda não concluído** — a **cor de destaque cheia**, a mesma dos
  concluídos, carregando **faixas diagonais que correm na horizontal**, como
  uma barra de carregamento, e mais alto que os demais. A inclinação faz o
  desenho ler como movimento mesmo num quadro parado. As faixas MUST usar a
  cor do segmento **pendente**, de modo que leiam como o trilho vazio
  aparecendo através do preenchimento e não como um padrão impresso por cima;
- **concluído** — a cor de destaque cheia, **sólida**, baixo;
- **atual e concluído** — a cor de destaque cheia, **sólida e mais alta**. As
  faixas MUST NOT aparecer aqui: elas dizem "em andamento", que não é o caso de
  algo já feito, e é a ausência delas que separa este estado do anterior.

**CHANGED — o atual deixa de ser um tom diluído.** Ele era a cor de destaque a
uma fração da opacidade, sobre o fundo escuro do app, numa faixa de 6 a 10
pixels lida de relance no meio da série e muitas vezes de dois metros de
distância. Nessas condições a diferença entre "pendente" e "é aqui que estou"
ficava menor do que o olho separa sem parar para procurar, e a barra só
respondia bem a uma das duas perguntas que existe para responder. O que
distingue os estados passa a ser **textura e movimento**, que se enxergam de
relance, em vez de intensidade de tinta, que não.

O movimento das faixas MUST fechar o laço **sem costura**. O período de um
padrão inclinado é medido perpendicular às faixas, então o deslocamento por
ciclo MUST ser o **passo horizontal** — o período dividido pelo seno do ângulo —
e não o período cru; qualquer outro valor faz o desenho pular a cada volta.

Quem tiver pedido ao sistema para **reduzir movimento** MUST receber as faixas
**paradas**, e não a ausência delas. A distinção é de textura antes de ser de
animação, então ela sobrevive inteira sem o movimento — e um movimento perpétuo
no campo de visão, numa tela encarada entre séries por uma hora, é exatamente o
que essa preferência existe para evitar.

A barra MUST ser um **indicador**, não um controle: nenhum segmento é tocável, e
tocá-la MUST NOT navegar nem marcar nada. Durante o treino o polegar já mora
nessa faixa da tela, e um alvo de toque a mais ali produziria navegação
acidental; pular para outro exercício continua sendo o papel das setas e do
runner. A barra MUST carregar um **rótulo acessível** dizendo posição e
progresso (por exemplo "Exercício 2 de 5, 1 concluído"), com os segmentos em si
ocultos à tecnologia assistiva — eles são um desenho da mesma frase. As faixas
em movimento MUST NOT mudar nada disso: elas são pintura, e o rótulo continua
sendo quem diz a frase.

Com **uma única entrada** na sessão (o caso do cardio) a barra MUST NOT ser
exibida: um segmento de largura total não informa nada, pela mesma razão que já
esconde Voltar/Avançar nesse caso.

Enquanto uma **alternativa** está sendo vista, a barra MUST continuar refletindo
as entradas da sessão, com a entrada de origem como a atual — a prévia está ao
lado daquela entrada, não é outra.

O estado da barra MUST acompanhar imediatamente a marcação e a **desmarcação**
de uma entrada, sem recarregar a tela.

#### Scenario: Um segmento por exercício do dia
- GIVEN uma sessão em andamento de um dia com cinco exercícios
- WHEN o usuário abre o detalhe do segundo
- THEN a barra no topo mostra cinco segmentos
- AND o segundo está marcado como o atual

#### Scenario: O atual se anuncia de relance
- GIVEN o detalhe de uma entrada ainda não concluída
- WHEN o usuário olha a barra
- THEN o segmento atual está na cor de destaque cheia, a mesma dos concluídos
- AND ele carrega faixas diagonais correndo na horizontal, na cor de um
  segmento pendente
- AND é mais alto que os demais

#### Scenario: Atual e concluído dizem as duas coisas
- GIVEN o usuário está no detalhe de uma entrada que já marcou como concluída
- WHEN olha a barra
- THEN o segmento dela é mais alto, o que diz "é aqui que estou"
- AND é sólido, sem faixas, o que diz "e este já está feito"

#### Scenario: Menos movimento, mesmas faixas
- GIVEN um aparelho configurado para reduzir movimento
- WHEN o usuário abre o detalhe de uma entrada
- THEN o segmento atual continua listrado
- AND as faixas não se movem

#### Scenario: A barra fica sob os controles, na barra flutuante
- GIVEN o detalhe de uma entrada de sessão
- WHEN o usuário olha a barra fixa embaixo
- THEN a barra de progresso está ali, abaixo da linha `< Concluir >`

#### Scenario: A barra não rola com o conteúdo
- GIVEN o detalhe de uma entrada cujo conteúdo excede a altura da tela
- WHEN o usuário rola até o histórico de peso
- THEN a barra de progresso continua visível na barra flutuante

#### Scenario: A barra sobrevive à troca de aba
- GIVEN o detalhe de uma entrada na aba "Execução"
- WHEN o usuário abre "Notas" e depois "Foto"
- THEN a barra de progresso continua exibida, inalterada

#### Scenario: Os concluídos se distinguem dos pendentes
- GIVEN uma sessão de cinco exercícios com os dois primeiros concluídos
- WHEN o usuário abre o detalhe do terceiro
- THEN os dois primeiros segmentos aparecem como concluídos
- AND o terceiro aparece como o atual e os dois últimos como pendentes

#### Scenario: A barra é indicador, não navegação
- GIVEN o detalhe de uma entrada com a barra visível
- WHEN o usuário toca sobre um segmento de outro exercício
- THEN nada acontece — a tela não muda e nenhuma entrada é marcada
- AND nenhum segmento é exposto como botão ou link

#### Scenario: Marcar repinta a barra na hora
- GIVEN o usuário está no terceiro de cinco exercícios, ainda não concluído
- WHEN o marca como concluído
- THEN o terceiro segmento passa a aparecer como concluído
- AND as faixas somem dele

#### Scenario: Cardio não mostra a barra
- GIVEN uma sessão de cardio, que tem uma única entrada
- WHEN o usuário abre o detalhe dela
- THEN nenhuma barra de progresso segmentada é exibida

#### Scenario: A alternativa não muda o progresso
- GIVEN o usuário está vendo uma alternativa da segunda entrada de cinco
- WHEN observa o topo da tela
- THEN a barra segue com cinco segmentos e a segunda entrada como a atual

---

## ADDED

(None)

---

## REMOVED

(None)
