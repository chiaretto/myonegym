# Delta: cardio

**Change ID:** `improve-session-entry-screen`
**Affects:** o que acontece ao tocar Iniciar na aba Cardio com uma sessão já aberta

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

Tocar um deles MUST abrir o **mesmo diálogo modal** que a Home abre na mesma
colisão (ver *Start or Resume a Workout From a Day*, em `home-navigation`), e
MUST NOT se limitar a uma mensagem passageira. Duas telas que recusam a mesma
coisa pela mesma razão não podem responder de formas diferentes.

O diálogo MUST NOT navegar sozinho para lugar nenhum — nem para a sessão que
bloqueia: quem tocou "Iniciar" na Bicicleta pediu para começar a Bicicleta, e
abrir outra coisa por conta própria é um desfecho que ninguém pediu. As mesmas
três saídas MUST ser oferecidas, **nomeadas** — concluir o atual e iniciar,
voltar ao atual, descartar o atual e iniciar —, com a mesma regra de que
concluir só é oferecido quando há ao menos um exercício marcado. Fechar o
diálogo MUST significar que nada acontece.

O diálogo MUST nomear o **tipo** da sessão em andamento (treino ou cardio): é
essa palavra que diz em qual aba procurá-la.

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
- THEN abre o mesmo diálogo da Home, dizendo que já há um **cardio** em andamento
- AND ele oferece concluir e iniciar, voltar ao atual, e descartar e iniciar
- AND nenhuma sessão nova é criada enquanto nada for escolhido
- AND o usuário não é levado à sessão da Esteira sem tê-la escolhido

#### Scenario: A explicação nomeia o tipo que está rodando
- GIVEN existe um **treino de musculação** em andamento na academia ativa
- WHEN o usuário toca "Iniciar" em um exercício de cardio
- THEN o diálogo fala de um **treino** em andamento, não de um cardio

#### Scenario: Fechar o diálogo na aba Cardio não faz nada
- GIVEN o diálogo aberto sobre um cardio da "Esteira" em andamento
- WHEN o usuário o fecha pelo controle de fechar
- THEN a sessão da Esteira continua em andamento, intacta
- AND nenhuma sessão nova foi criada

#### Scenario: O cardio em andamento é alcançável a partir da sua linha
- GIVEN existe um **cardio** em andamento na academia ativa
- WHEN o usuário abre a aba Cardio
- THEN a linha daquele exercício oferece **"Continuar"**, disponível
- AND tocá-la abre a sessão em andamento
- AND as demais linhas seguem indisponíveis

---

## ADDED

(None)

---

## REMOVED

(None)
