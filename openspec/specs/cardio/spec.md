# cardio Specification

## Purpose
A aba **Cardio**: a metade avulsa do treino. Musculação é rotina e vive em dias;
cardio não — começa a partir do próprio exercício, não tem peso, e conta como
treino em toda a Consistência (ver a estrela do calendário, na capability
`consistency`).

## Requirements

### Requirement: Cardio Tab

A barra de abas MUST oferecer uma aba **Cardio**, posicionada **ao lado de
Treinos**, apontando para a rota `/cardio`. As demais abas MUST manter rótulo,
ícone e ordem relativa.

Com quatro abas, a barra MUST continuar legível na **tela mais estreita
suportada** e no **maior tamanho de fonte** oferecido em Aparência: sem
**transbordo horizontal**, sem corte e sem sobreposição. Um rótulo que não caiba
em uma linha MUST **quebrar** — a tela tem folga vertical e nenhuma horizontal,
então empurrar a barra para fora é o único desfecho inaceitável.

#### Scenario: A aba abre a tela de cardio
- GIVEN o app aberto na Home
- WHEN o usuário toca a aba "Cardio"
- THEN a rota `/cardio` é exibida
- AND a aba Cardio aparece como ativa

#### Scenario: Quatro abas cabem
- GIVEN um aparelho estreito e a fonte no tamanho máximo
- WHEN o usuário observa a barra de abas
- THEN os quatro rótulos aparecem inteiros, sem corte
- AND a barra não transborda para os lados — um rótulo longo quebra em duas
  linhas em vez de empurrar a barra

### Requirement: Cardio Screen

A tela de Cardio MUST listar **os exercícios de Cardio do catálogo que o usuário
não ocultou** (ver *Hidden Cardio Exercises*) — mais o exercício dono de um
cardio em andamento, oculto ou não (ver *A Running Cardio Outranks Hidden*) — e
nada mais. Ela MUST NOT ter dias de treino, acordeão ou agrupamento: cardio é
avulso.

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
vazio** que explica o que é a aba e leva ao cadastro. Com exercícios cadastrados
e **todos ocultos**, o estado vazio é outro (ver *The Tab Says What It Is
Hiding*). Enquanto a lista não foi lida, a tela MUST NOT afirmar nenhum dos dois
(ver *Estados Vazios Só Depois da Resposta*).

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

#### Scenario: A lista mostra só cardio, e só o que não está oculto
- GIVEN o catálogo tem "Supino" (Força) e "Esteira", "Bicicleta" e "Natação"
  (Cardio), e "Natação" está oculta
- WHEN o usuário abre a aba Cardio
- THEN a lista mostra "Esteira" e "Bicicleta"
- AND nem "Supino" nem "Natação" aparecem

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

---

### Requirement: Hidden Cardio Exercises

O usuário MUST poder **ocultar** um exercício de cardio da aba Cardio, e
devolvê-lo depois. Vale para as **duas fontes** do catálogo: um exercício oficial
não pode ser editado nem excluído, e é justamente por isso que precisa poder ser
ocultado — a lista oficial cresce por decisão de quem a publica, não de quem
treina.

Ocultar MUST ser **global**, não por academia: o que a pessoa pratica é dela, não
do prédio.

Ocultar MUST afetar **somente a listagem da aba Cardio**. O exercício MUST
continuar na lista de Exercícios das Configurações, no detalhe, como alternativa,
no histórico e em toda a Consistência. Nada é apagado e nenhuma sessão passada
muda.

O oculto MUST NOT ser gravado no exercício: um oficial não tem registro onde
gravá-lo. Ele é um fato à parte, chaveado pelo id do exercício, como o peso e a
nota já são.

Um exercício oculto que deixa de ser Cardio MUST manter a marca, sem efeito
enquanto for Força, e voltar oculto se virar Cardio de novo — a mesma política dos
pesos de um exercício que vira Cardio. **Excluir** o exercício MUST apagar a
marca junto.

#### Scenario: Ocultar tira o exercício da aba
- GIVEN a aba Cardio lista "Esteira", "Bicicleta" e "Natação"
- WHEN o usuário oculta "Natação" em Configurações → Cardio e abre a aba Cardio
- THEN a lista mostra "Esteira" e "Bicicleta"
- AND "Natação" não aparece

#### Scenario: Mostrar devolve
- GIVEN "Natação" está oculta
- WHEN o usuário volta a mostrá-la em Configurações → Cardio
- THEN "Natação" reaparece na aba Cardio, na sua posição por nome

#### Scenario: Um oficial se oculta como um do usuário
- GIVEN "Remo" vem do catálogo oficial e "Escada do prédio" foi criado pelo usuário
- WHEN o usuário oculta os dois
- THEN nenhum dos dois aparece na aba Cardio
- AND nenhum dos dois foi alterado ou excluído do catálogo

#### Scenario: Oculto só na aba
- GIVEN "Natação" está oculta e tem um cardio concluído na terça
- WHEN o usuário abre Configurações → Exercícios, o histórico e a Consistência
- THEN "Natação" segue listada entre os exercícios
- AND a sessão de terça segue no histórico e a terça segue marcada com a estrela

#### Scenario: Vale em toda academia
- GIVEN "Natação" foi oculta com a "Academia A" ativa
- WHEN o usuário troca para a "Academia B" e abre a aba Cardio
- THEN "Natação" continua oculta

#### Scenario: Excluir o exercício leva a marca junto
- GIVEN "Escada do prédio" (do usuário) está oculta
- WHEN o usuário a exclui
- THEN nenhuma marca de oculto resta para aquele id

---

### Requirement: A Running Cardio Outranks Hidden

Enquanto existe um **cardio em andamento**, a linha do exercício dono da sessão
MUST aparecer na aba Cardio **mesmo que ele esteja oculto**, oferecendo
"Continuar". Essa linha é a única porta para a sessão (ver *Cardio Screen*):
escondê-la deixaria um treino em andamento sem caminho de volta, que é o único
desfecho que a aba não pode produzir.

Encerrada ou descartada a sessão, o exercício MUST voltar a não aparecer.

#### Scenario: Ocultar o exercício em andamento não esconde a sessão
- GIVEN existe um cardio da "Natação" em andamento
- WHEN o usuário oculta "Natação" e abre a aba Cardio
- THEN a linha da "Natação" aparece, com "Continuar" disponível
- AND tocá-la abre a sessão em andamento

#### Scenario: Concluída a sessão, o oculto volta a valer
- GIVEN "Natação" está oculta e aparece na aba por estar em andamento
- WHEN o usuário conclui o cardio e volta à aba
- THEN "Natação" não aparece mais

---

### Requirement: The Tab Says What It Is Hiding

Havendo ao menos um exercício oculto, a aba Cardio MUST dizer **quantos**, sob a
lista, com um caminho direto para a tela que os gerencia. Uma lista que encolhe
sem aviso é indistinguível de um exercício que sumiu.

Quando **todos** os exercícios de cardio estão ocultos, a aba MUST exibir um
estado vazio **próprio**, que nomeia a causa e leva à mesma tela. Ela MUST NOT
exibir o estado de "nenhum cardio cadastrado": há cardio cadastrado, e mandar o
usuário cadastrar outro é responder à pergunta errada.

A aba MUST NOT afirmar nenhum dos dois estados, nem pintar a lista, antes de
conhecer **tanto** os exercícios **quanto** os ocultos: filtrar com uma resposta
provisória mostraria a lista inteira e a encolheria em seguida (ver *Estados
Vazios Só Depois da Resposta*).

O resumo da semana MUST aparecer também no estado de todos-ocultos: a semana não
depende do que a lista mostra.

#### Scenario: A aba conta os ocultos
- GIVEN três exercícios de cardio estão ocultos e dois visíveis
- WHEN o usuário abre a aba Cardio
- THEN sob a lista aparece que há 3 ocultos, com um link "Gerenciar"
- AND o link abre Configurações → Cardio

#### Scenario: Sem ocultos, sem aviso
- GIVEN nenhum exercício de cardio está oculto
- WHEN o usuário abre a aba Cardio
- THEN nenhum aviso de ocultos aparece

#### Scenario: Todos ocultos não é "nenhum cardio"
- GIVEN existem cinco exercícios de cardio e os cinco estão ocultos
- WHEN o usuário abre a aba Cardio
- THEN um estado vazio diz que todos os cardios estão ocultos
- AND oferece o caminho para Configurações → Cardio
- AND não convida a cadastrar um exercício novo

#### Scenario: A lista não pisca inteira
- GIVEN "Natação" está oculta
- WHEN a aba Cardio é aberta e as leituras ainda não responderam
- THEN nenhuma linha é exibida até que exercícios e ocultos sejam conhecidos
- AND "Natação" não aparece em momento algum

---

### Requirement: Manage Cardio Visibility in Settings

As Configurações MUST oferecer, no grupo **Cadastros**, uma entrada **Cardio**
que abre a tela `/settings/cardio`. A entrada MUST mostrar quantos exercícios
estão **visíveis** na aba.

A tela MUST listar **todos** os exercícios de cardio, das duas fontes, por nome —
ocultos inclusive, que é para isso que ela existe. Cada linha MUST mostrar a
mídia, o nome e as categorias, e um **interruptor** que diz se o exercício aparece
na aba Cardio. O interruptor MUST ser anunciado como tal por leitores de tela, com
o nome do exercício no rótulo.

Alternar MUST valer **na hora**, sem botão de salvar: é uma preferência por linha,
não um formulário.

Sem nenhum exercício de cardio, a tela MUST exibir um estado vazio que leva ao
cadastro, e MUST NOT afirmá-lo antes de a lista responder.

A tela MUST continuar legível na tela mais estreita suportada e no maior tamanho
de fonte: o nome quebra; o interruptor não é empurrado para fora.

#### Scenario: A entrada existe e conta
- GIVEN existem nove exercícios de cardio e três estão ocultos
- WHEN o usuário abre Configurações
- THEN o grupo Cadastros tem a entrada "Cardio", indicando 6
- AND tocá-la abre `/settings/cardio`

#### Scenario: A tela lista tudo, oculto ou não
- GIVEN "Natação" está oculta e "Esteira" não
- WHEN o usuário abre Configurações → Cardio
- THEN as duas aparecem, "Esteira" com o interruptor ligado e "Natação" desligado
- AND nenhum exercício de Força aparece

#### Scenario: Alternar grava na hora
- GIVEN o interruptor da "Natação" está ligado
- WHEN o usuário o desliga e sai da tela sem mais nada
- THEN "Natação" está oculta na aba Cardio
- AND continua oculta depois de recarregar o app

#### Scenario: Voltar devolve às Configurações
- GIVEN o usuário está em Configurações → Cardio
- WHEN toca voltar
- THEN a tela de Configurações é exibida
