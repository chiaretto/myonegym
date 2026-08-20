# Delta: cardio

**Change ID:** `fix-cardio-rotation-and-week-star`
**Affects:** o resumo da semana na aba Cardio, e o efeito de concluir um cardio
sobre o marcador "Próximo treino"

---


## MODIFIED Requirements

### Requirement: Cardio Screen

A tela de Cardio MUST listar **os exercícios de Cardio do catálogo** e nada
mais. Ela MUST NOT ter dias de treino, acordeão ou agrupamento: cardio é avulso.

Cada linha MUST mostrar a **mídia**, o **nome** e as **categorias** do
exercício, e MUST oferecer um **"Iniciar" próprio**. Tocar a linha (fora do
Iniciar) MUST abrir o detalhe do exercício.

Desse detalhe, **voltar** MUST devolver o usuário à **aba Cardio**, e MUST NOT
levá-lo à Home. A aba é de onde ele veio; a Home é para onde ele caía por falta
de informação, não por decisão.

A origem MUST viajar no **endereço**, e não na pilha de histórico: é o que faz o
voltar sobreviver a um recarregamento e a um link compartilhado — a mesma escolha
que o detalhe aberto a partir de um **dia de treino** já faz. Abrir uma
**alternativa** a partir daí MUST preservar essa origem, sob pena de perder o
caminho de volta uma tela adiante.

Um exercício de cardio MAY continuar em um dia de treino (ver *Changing an
Exercise to Cardio Leaves the Days*), então os dois caminhos até o detalhe
existem. Quando o endereço carregar **as duas** origens, o **dia** MUST vencer:
é dele que a visita partiu, e é para lá que voltar significa alguma coisa.

A tela MUST exibir, acima da lista, o mesmo **resumo da semana** da tela de
Treinos — a contagem "N / 7 treinos", a sequência e a trilha dos sete dias. Ele
MUST contar **as mesmas sessões** que conta na Home: a semana é a mesma, olhada
de outra aba, e um número só-de-cardio aqui seria o único lugar do app em
desacordo com os demais agregados.

A trilha MUST marcar com uma **estrela** o dia em que houve cardio, exatamente
como na aba Treinos e no calendário da Consistência (ver *Weekly Training
Summary*, em `home-navigation`). É o mesmo widget nas duas abas: um sinal que
aparecesse só aqui seria uma segunda gramática para a mesma trilha.

A tela MUST NOT exibir peso em lugar algum — exercícios de cardio não têm peso.

Sem nenhum exercício de Cardio cadastrado, a tela MUST exibir um **estado
vazio** que explica o que é a aba e leva ao cadastro. Enquanto a lista não foi
lida, a tela MUST NOT afirmar que está vazia (ver *Estados Vazios Só Depois da
Resposta*).

Enquanto existe uma **sessão em andamento** na academia ativa, os controles
"Iniciar" MUST ser apresentados **indisponíveis**, pelo mesmo motivo e com o
mesmo tratamento visual que a Home já aplica aos dias.

Tocar um deles MUST **explicar** que já existe sessão aberta, e MUST NOT navegar
para lugar nenhum — nem para a sessão que bloqueia. Quem tocou "Iniciar" na
Bicicleta pediu para começar a Bicicleta; abrir outra coisa é um terceiro
desfecho que ninguém pediu. A explicação MUST nomear o **tipo** da sessão em
andamento (treino ou cardio): é essa palavra que diz em qual aba procurá-la.

A única linha que abre a sessão é a **dona** dela, e ela não se apresenta como
"Iniciar" — se apresenta como "Continuar".

#### Scenario: A lista mostra só cardio
- GIVEN o catálogo tem "Supino" (Força) e "Esteira" e "Bicicleta" (Cardio)
- WHEN o usuário abre a aba Cardio
- THEN a lista mostra "Esteira" e "Bicicleta"
- AND "Supino" não aparece

#### Scenario: Voltar do detalhe devolve à aba Cardio
- GIVEN o usuário abriu o detalhe da "Esteira" tocando a linha na aba Cardio
- WHEN toca voltar
- THEN a aba Cardio é exibida de novo
- AND ele não é levado à Home

#### Scenario: Uma alternativa não perde o caminho de volta
- GIVEN o usuário abriu o detalhe da "Esteira" a partir da aba Cardio e de lá
  abriu uma alternativa
- WHEN toca voltar
- THEN a aba Cardio é exibida

#### Scenario: Vindo de um dia, voltar é para o dia
- GIVEN a "Esteira" também está no "Dia 1" e o usuário abriu seu detalhe a
  partir da Home
- WHEN toca voltar
- THEN a Home é exibida com o "Dia 1" ainda aberto

#### Scenario: Cada exercício tem seu Iniciar
- GIVEN a aba Cardio lista três exercícios
- WHEN o usuário observa a tela
- THEN cada linha traz o seu próprio "Iniciar"
- AND não há um botão único que inicie a lista inteira

#### Scenario: O resumo da semana está na aba
- GIVEN houve um treino concluído nesta semana
- WHEN o usuário abre a aba Cardio
- THEN o resumo da semana aparece acima da lista, com a mesma contagem da Home
- AND a trilha dos sete dias marca o dia treinado

#### Scenario: A trilha da aba Cardio marca o dia de cardio
- GIVEN o usuário concluiu um cardio na terça desta semana
- WHEN o usuário abre a aba Cardio
- THEN a célula de terça aparece como dia treinado, com a estrela
- AND a mesma célula aparece igual na aba Treinos

#### Scenario: Nenhum peso na tela
- GIVEN a aba Cardio lista exercícios
- WHEN o usuário observa as linhas
- THEN nenhuma exibe peso nem o convite "definir"

#### Scenario: Estado vazio
- GIVEN não há exercício de Cardio cadastrado
- WHEN o usuário abre a aba
- THEN um estado vazio explica a aba e oferece o caminho para cadastrar

#### Scenario: Iniciar indisponível durante um treino
- GIVEN existe uma sessão em andamento na academia ativa
- WHEN o usuário abre a aba Cardio
- THEN os controles "Iniciar" aparecem indisponíveis

#### Scenario: Tocar um Iniciar indisponível explica, e não navega
- GIVEN existe um **cardio** da "Esteira" em andamento na academia ativa
- WHEN o usuário toca "Iniciar" na linha da Bicicleta
- THEN é exibida uma explicação de que já há um **cardio** em andamento
- AND nenhuma sessão nova é criada
- AND o usuário permanece na aba Cardio, sem ser levado à sessão da Esteira

#### Scenario: A explicação nomeia o tipo que está rodando
- GIVEN existe um **treino de musculação** em andamento na academia ativa
- WHEN o usuário toca "Iniciar" em um exercício de cardio
- THEN a explicação fala de um **treino** em andamento, não de um cardio

#### Scenario: O cardio em andamento é alcançável a partir da sua linha
- GIVEN existe um **cardio** em andamento na academia ativa
- WHEN o usuário abre a aba Cardio
- THEN a linha daquele exercício oferece **"Continuar"**, disponível
- AND tocá-la abre a sessão em andamento
- AND as demais linhas seguem indisponíveis

---

### Requirement: Start and Complete a Cardio

Tocar **Iniciar** em um exercício de cardio MUST criar uma **sessão de cardio**
na academia ativa contendo **aquele exercício apenas**, e abrir a **tela da
sessão** — a mesma de um treino de musculação. Retomar um cardio em andamento
MUST levar ao mesmo lugar.

Pular direto para o detalhe do exercício pouparia um toque numa lista de um
item, mas deixaria a sessão sem nenhuma tela que o usuário tivesse visto: nada
para onde voltar, nada para onde retomar, e uma fileira de exceções só-de-cardio
rio abaixo para manter isso coerente. Uma forma só para os dois tipos de treino
vale o toque.

A sessão MUST guardar o próprio **tipo** e o **nome do exercício**, para que o
histórico continue correto se o exercício mudar de tipo, for renomeado ou for
excluído.

Iniciar MUST exigir academia ativa e MUST respeitar **uma sessão ativa por
academia** — a mesma regra dos dias de treino, valendo entre os dois tipos.

Do detalhe de um exercício em sessão de cardio, **voltar** MUST devolver o
usuário à **tela da sessão**, refazendo o caminho de entrada como em qualquer
outro treino.

O detalhe de um exercício em sessão de cardio MUST NOT oferecer os controles
**Voltar/Avançar** entre exercícios: há um só, e dois controles permanentemente
mortos dizem menos que controle nenhum.

**Concluir** MUST encerrar a sessão de cardio diretamente, sem exigir que a
única entrada seja marcada antes: com um item só, pedir a marcação e depois a
conclusão seria pedir a mesma informação duas vezes. A sessão concluída MUST
entrar no histórico como qualquer outra, e o usuário MUST chegar ao **resumo da
sessão**, com o compartilhamento à mão (ver *Complete a Session*, em
`workout-sessions`).

Concluir um cardio MUST NOT alterar o marcador **"Próximo treino"** da Home. Uma
sessão de cardio não tem dia, então não há rotação que ela possa avançar — e
tampouco reiniciar. O marcador MUST continuar apontando para o dia seguinte ao
do último treino de **força** (ver *Feature the Next Training Day*, em
`home-navigation`).

#### Scenario: Iniciar um cardio
- GIVEN "Esteira" é um exercício de Cardio e há academia ativa
- WHEN o usuário toca "Iniciar" na linha da Esteira
- THEN uma sessão de cardio é criada na academia ativa, com a Esteira como
  único item
- AND a **tela da sessão** é aberta, com a Esteira como sua única entrada

#### Scenario: Voltar devolve à tela da sessão
- GIVEN o usuário iniciou um cardio e abriu o detalhe do exercício a partir da
  tela da sessão
- WHEN toca voltar
- THEN a tela da sessão é exibida de novo

#### Scenario: Sem Voltar/Avançar numa sessão de um exercício só
- GIVEN o detalhe de um exercício numa sessão de cardio
- WHEN o usuário observa a barra inferior
- THEN não há controles de exercício anterior nem de próximo exercício
- AND a ação de concluir continua disponível

#### Scenario: Concluir encerra direto
- GIVEN uma sessão de cardio da Esteira está em andamento
- WHEN o usuário toca "Concluir"
- THEN a sessão é encerrada e registrada no histórico
- AND não foi preciso marcar o item antes

#### Scenario: Concluir um cardio não mexe no Próximo treino
- GIVEN o último treino de força foi o "Dia 1" e a Home marca o "Dia 2" como
  "Próximo treino"
- WHEN o usuário conclui um cardio
- THEN a Home segue marcando o "Dia 2" como "Próximo treino"

#### Scenario: Um cardio em andamento nunca fica sem caminho de volta
- GIVEN existe um cardio da "Esteira" em andamento
- WHEN o usuário tenta iniciar um treino a partir de um dia na Home
- THEN nenhuma sessão nova é criada e ele permanece na Home
- AND a explicação nomeia o **cardio** em andamento, e é isso que aponta para a
  aba Cardio — onde a linha da Esteira oferece "Continuar"

#### Scenario: Uma sessão ativa por academia vale entre os tipos
- GIVEN há um treino de musculação em andamento na academia ativa
- WHEN o usuário tenta iniciar um cardio
- THEN o início é bloqueado
- AND a tela explica que já há um treino em andamento, sem levá-lo até ele

#### Scenario: Sem academia não se inicia
- GIVEN nenhuma academia existe (ou nenhuma está ativa)
- WHEN o usuário tenta iniciar um cardio
- THEN o início é bloqueado e ele é convidado a criar/selecionar uma academia

#### Scenario: O histórico sobrevive a mudanças no exercício
- GIVEN uma sessão de cardio da "Esteira" foi concluída
- WHEN a "Esteira" é renomeada, vira Força ou é excluída
- THEN a sessão concluída continua registrada como cardio, com o nome que tinha
