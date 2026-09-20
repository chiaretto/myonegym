# Delta: cardio

**Change ID:** `hide-cardio-exercises`
**Affects:** o que a aba Cardio lista; o estado vazio da aba; uma tela nova em
Configurações

---

## ADDED Requirements

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

---

## MODIFIED Requirements

### Requirement: Cardio Screen

Muda **apenas** o parágrafo de abertura; todo o restante do requisito e todos os
seus cenários permanecem como estão.

> A tela de Cardio MUST listar **os exercícios de Cardio do catálogo que o usuário
> não ocultou** (ver *Hidden Cardio Exercises*) — mais o exercício dono de um
> cardio em andamento, oculto ou não (ver *A Running Cardio Outranks Hidden*) — e
> nada mais. Ela MUST NOT ter dias de treino, acordeão ou agrupamento: cardio é
> avulso.

E o parágrafo do estado vazio passa a distinguir as duas causas:

> Sem nenhum exercício de Cardio cadastrado, a tela MUST exibir um **estado
> vazio** que explica o que é a aba e leva ao cadastro. Com exercícios cadastrados
> e **todos ocultos**, o estado vazio é outro (ver *The Tab Says What It Is
> Hiding*). Enquanto a lista não foi lida, a tela MUST NOT afirmar nenhum dos dois
> (ver *Estados Vazios Só Depois da Resposta*).

#### Scenario: A lista mostra só cardio, e só o que não está oculto
- GIVEN o catálogo tem "Supino" (Força) e "Esteira", "Bicicleta" e "Natação"
  (Cardio), e "Natação" está oculta
- WHEN o usuário abre a aba Cardio
- THEN a lista mostra "Esteira" e "Bicicleta"
- AND nem "Supino" nem "Natação" aparecem

---

## REMOVED Requirements

(None)
