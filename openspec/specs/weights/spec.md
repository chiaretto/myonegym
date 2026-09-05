# weights Specification

## Purpose
TBD - created by archiving change bootstrap-myonegym. Update Purpose after archive.

## Requirements

### Requirement: Track a Global Target Weight

Cada exercício **de Força** MUST ter um **peso alvo global** — um único valor +
**unidade** (**KG**, **LB** ou **#**) válido em **todas** as academias. Uma
academia MAY ter uma **exceção**: um peso próprio para aquele exercício, que
prevalece sobre o global **apenas nela**.

O peso exibido e editado para `(academia ativa, exercício)` MUST ser a exceção
quando ela existe e, caso contrário, o peso global. A unidade acompanha o
registro que prevaleceu — global e exceção MAY usar unidades diferentes.

Um exercício de **Cardio** MUST NOT ter peso: o cartão "Peso alvo", o editor, a
linha do tempo do histórico e o badge de peso MUST NOT ser exibidos para ele —
nem no detalhe do catálogo, nem no detalhe dentro de uma sessão, nem em lista
alguma. Não há "definir" a oferecer, porque não há o que definir.

Registros de peso e de histórico de um exercício que **passou a ser Cardio**
MUST NOT ser apagados: eles deixam de ser exibidos enquanto ele for Cardio e
voltam se ele voltar a ser Força.

#### Scenario: Set a weight with no exception
- GIVEN "Rosca Direta" existe e ainda não tem peso
- WHEN o usuário abre o detalhe do exercício e salva 20 com unidade "KG"
- THEN o peso global de "Rosca Direta" é 20 KG
- AND toda academia mostra 20 KG para esse exercício

#### Scenario: Weight is shared across gyms by default
- GIVEN "Rosca Direta" tem peso global 20 KG e nenhuma exceção
- WHEN o usuário troca a academia ativa de "A" para "B"
- THEN "Rosca Direta" continua mostrando 20 KG

#### Scenario: An exception overrides the global weight in one gym only
- GIVEN "Rosca Direta" tem peso global 20 KG e uma exceção de 15 LB na academia "B"
- WHEN o usuário abre o exercício na academia "B"
- THEN ele mostra 15 LB
- AND na academia "A" continua mostrando 20 KG

#### Scenario: Cardio não tem cartão de peso
- GIVEN "Esteira" é um exercício de Cardio
- WHEN o usuário abre o detalhe dela, no catálogo ou dentro de uma sessão
- THEN nenhum cartão "Peso alvo", editor ou histórico de peso é exibido
- AND a observação e as fotos continuam disponíveis

#### Scenario: Cardio não pede "definir"
- GIVEN uma lista que exibiria o badge de peso de um exercício
- WHEN o exercício é de Cardio
- THEN nenhum badge é exibido — nem valor, nem o convite "definir"

#### Scenario: O peso volta com o tipo
- GIVEN "Esteira" tinha 5 KG registrados quando era Força
- WHEN ela vira Cardio e depois volta a ser Força
- THEN os 5 KG e o histórico anterior voltam a ser exibidos

#### Scenario: No active gym
- GIVEN nenhuma academia existe ainda
- WHEN o usuário abre o detalhe de um exercício de Força
- THEN o campo de peso pede que ele crie/selecione uma academia primeiro
- AND nenhum peso pode ser salvo enquanto não houver academia ativa

### Requirement: Global Weight Sentinel

O peso global MUST ser persistido na mesma tabela dos pesos por academia,
usando o **id de academia reservado `0`** (`GLOBAL_GYM_ID`) — ids reais de
academia são gerados a partir de 1, então a sentinela nunca colide. O mesmo
vale para o histórico global.

A sentinela é um detalhe da camada de dados: nenhuma tela MUST receber
`gymId = 0` como se fosse uma academia. A resolução (exceção → global) e o
escopo resultante MUST ser produzidos pelo repositório, e as telas consomem
valor + escopo já resolvidos.

#### Scenario: Global row is keyed by the sentinel
- GIVEN nenhum peso registrado para "Rosca Direta"
- WHEN o usuário salva 20 KG com a flag desmarcada
- THEN existe uma linha de peso `(0, Rosca Direta) = 20 KG`
- AND nenhuma linha de peso é criada para a academia ativa

#### Scenario: The sentinel never reaches the UI as a gym
- GIVEN "Rosca Direta" tem apenas peso global
- WHEN o detalhe do exercício é aberto em qualquer academia
- THEN nenhum nome/rótulo de academia é derivado da linha global
- AND a seleção de academia ativa não lista a sentinela

### Requirement: Per-Gym Exception Flag

O editor de peso MUST oferecer, no modo de edição, uma flag **"Só nessa
academia"** que decide o **escopo** do salvamento. A flag MUST aparecer nas duas
telas que usam o editor — o detalhe do exercício no catálogo
(`/exercise/:id?day=N`) e o detalhe do exercício em sessão
(`/session/:id/entry/:entryId`, aba Execução) — e MUST estar oculta quando o
editor está em modo somente-leitura (sessão concluída).

O estado inicial da flag MUST refletir o escopo vigente do par
`(academia ativa, exercício)`: **desmarcada** quando o peso exibido é o global,
**marcada** quando existe exceção para essa academia. A flag NÃO tem efeito
algum antes de **Salvar**.

#### Scenario: Flag comes unchecked for a global weight
- GIVEN "Rosca Direta" tem peso global 20 KG e a academia "A" não tem exceção
- WHEN o usuário toca em editar o peso na academia "A"
- THEN a flag "Só nessa academia" aparece **desmarcada**

#### Scenario: Flag comes checked when an exception exists
- GIVEN "Rosca Direta" tem peso global 20 KG e uma exceção de 15 KG na academia "A"
- WHEN o usuário toca em editar o peso na academia "A"
- THEN o editor mostra 15 KG
- AND a flag "Só nessa academia" aparece **marcada**

#### Scenario: Flag is available on the in-session editor
- GIVEN uma sessão em andamento na academia "A"
- WHEN o usuário abre o detalhe do exercício da sessão e toca em editar o peso
- THEN a flag "Só nessa academia" é oferecida, com o mesmo estado inicial do catálogo

#### Scenario: No flag on a completed session
- GIVEN uma sessão **concluída**
- WHEN o usuário abre o detalhe do exercício da sessão
- THEN o peso é exibido somente para referência
- AND nenhuma flag de escopo é apresentada

### Requirement: Create, Update and Remove a Gym Exception

Salvar o peso MUST gravar no escopo indicado pela flag:

- flag **desmarcada** → grava o **peso global** do exercício **e remove**
  a exceção da academia ativa, se existir;
- flag **marcada** → grava/atualiza **apenas a exceção** da academia ativa,
  deixando o peso global intacto.

Enquanto existe exceção, a flag MUST vir sempre marcada nas próximas edições
naquela academia. Desmarcá-la e salvar MUST devolver o par ao escopo global.

#### Scenario: Save with the flag unchecked changes the global weight
- GIVEN "Rosca Direta" tem peso global 20 KG e nenhuma exceção
- WHEN o usuário, na academia "A", edita para 22,5 KG com a flag desmarcada e salva
- THEN o peso global de "Rosca Direta" passa a ser 22,5 KG
- AND a academia "B" também passa a mostrar 22,5 KG

#### Scenario: Save with the flag checked creates an exception
- GIVEN "Rosca Direta" tem peso global 22,5 KG
- WHEN o usuário, na academia "A", edita para 15 KG, **marca** a flag e salva
- THEN a academia "A" passa a mostrar 15 KG
- AND o peso global permanece 22,5 KG
- AND a academia "B" continua mostrando 22,5 KG

#### Scenario: Saving again keeps the exception scope
- GIVEN a academia "A" tem exceção de 15 KG para "Rosca Direta"
- WHEN o usuário abre o editor, altera para 17,5 KG e salva
- THEN a flag estava marcada por padrão
- AND a exceção da academia "A" passa a 17,5 KG, sem alterar o peso global

#### Scenario: Unchecking the flag returns the pair to the global weight
- GIVEN a academia "A" tem exceção de 17,5 KG e o peso global é 22,5 KG
- WHEN o usuário abre o editor, **desmarca** a flag e salva o valor exibido (17,5 KG)
- THEN a exceção da academia "A" deixa de existir
- AND o peso global de "Rosca Direta" passa a 17,5 KG
- AND todas as academias, inclusive "A", passam a mostrar 17,5 KG

#### Scenario: Unit follows the scope being saved
- GIVEN o peso global de "Rosca Direta" é 20 KG
- WHEN o usuário, na academia "A", salva 45 com unidade "LB" e a flag marcada
- THEN a exceção da academia "A" é 45 LB
- AND o peso global segue 20 KG

### Requirement: Edit and Save Weight

O peso alvo MUST continuar exigindo **editar → salvar** explícito, com o
**mesmo editor** disponível no detalhe do exercício no catálogo e no detalhe do
exercício em sessão (aba Execução) enquanto a sessão está **em andamento**.
Ambos editam o peso que vale para a academia da sessão/ativa — global ou
exceção, conforme a flag "Só nessa academia" — e, ao salvar, anexam um registro
de histórico **na mesma chave em que o peso foi gravado**. Não existe peso de
sessão. Numa sessão **concluída** o editor é exibido **somente-leitura**.

O editor MUST abrir num **popup ancorado ao topo da tela**, e não crescendo o
cartão no lugar.

CHANGED: o cartão crescia ao abrir — stepper, unidades, "Só nessa academia",
Cancelar/Salvar — e vive abaixo da mídia, então as ações terminavam sob a barra
fixa: o usuário digitava o peso e não via onde salvar. Aquilo foi remendado com
uma **rolagem até o topo**, que disputava com o foco automático do campo e ainda
assim fazia a página saltar. O popup **remove o problema** em vez de persegui-lo:
o formulário não divide layout com nada, e por isso não há mais rolagem a fazer,
a proteger, nem a desfazer.

**Ao topo, e não ao rodapé**, porque o campo é digitado: o teclado virtual ocupa
a metade de baixo da tela, e um painel ancorado embaixo abriria com o próprio
Salvar debaixo dele — exatamente a falha que a rolagem existia para evitar.

O cartão MUST continuar legível atrás do popup, e fechar — por Cancelar, por
Salvar ou por Esc — MUST devolver a tela como estava, com o valor atualizado no
cartão quando houve gravação.

O comportamento MUST NOT depender de qual das duas telas abriu o editor: o
editor é um componente só.

O botão do **histórico** MUST continuar alcançável durante a edição (ver *Weight
History Opens in a Modal*). Como o popup cobre o cartão em que ele mora, o
próprio popup MUST oferecê-lo, na sua linha de título.

Abrir o histórico **de dentro** do editor MUST empilhar os dois sem que um
gesto feche o outro por acidente: `Esc` MUST fechar **apenas o de cima**. Jogar
fora um peso meio digitado para dispensar uma lista seria uma troca ruim.

#### Scenario: Edit then save
- GIVEN "Rosca Direta" resolve para 20 KG na academia ativa
- WHEN o usuário toca em editar, muda para 22,5 e salva com a flag desmarcada
- THEN o peso global passa a 22,5 KG

#### Scenario: Change the unit
- GIVEN "Rosca Direta" é 20 KG globalmente
- WHEN o usuário edita a unidade para "LB" e salva com a flag desmarcada
- THEN o registro global passa a ter unidade "LB"

#### Scenario: Edit from the in-session detail updates the same weight
- GIVEN uma sessão em andamento na academia "A" e "Rosca Direta" resolvendo para 20 KG
- WHEN o usuário edita para 25 KG no detalhe do exercício da sessão e salva com a flag desmarcada
- THEN o peso global passa a 25 KG e um registro de histórico global é anexado
- AND o detalhe do exercício no catálogo mostra 25 KG

#### Scenario: In-session exception
- GIVEN uma sessão em andamento na academia "A" e peso global 25 KG
- WHEN o usuário salva 20 KG com a flag **marcada**
- THEN a academia "A" passa a ter exceção de 20 KG
- AND o restante do app segue com 25 KG fora de "A"

#### Scenario: Editar abre um popup no topo
- GIVEN o detalhe de um exercício, com o cartão de peso abaixo da mídia
- WHEN o usuário toca em "Editar"
- THEN o formulário abre num popup ancorado ao topo da tela
- AND Cancelar e Salvar estão visíveis sem que o usuário role
- AND a página atrás não é rolada

#### Scenario: O mesmo popup no catálogo e na sessão
- GIVEN o detalhe do mesmo exercício aberto pelo catálogo e depois em sessão
- WHEN o usuário toca em "Definir"/"Editar"
- THEN o popup abre igual nos dois

#### Scenario: Fechar devolve a tela
- GIVEN o popup de edição aberto
- WHEN o usuário cancela, ou pressiona Esc
- THEN o popup fecha, nada é gravado e a tela volta como estava

#### Scenario: Salvar atualiza o cartão atrás
- GIVEN o popup aberto com um valor novo digitado
- WHEN o usuário salva
- THEN o popup fecha e o cartão mostra o valor novo

#### Scenario: O histórico continua ao alcance durante a edição
- GIVEN o popup de edição aberto num exercício com histórico
- WHEN o usuário procura o histórico
- THEN o botão está na linha de título do próprio popup
- AND abri-lo mostra a linha do tempo sobre o editor

#### Scenario: Esc fecha só o de cima
- GIVEN o histórico aberto a partir do popup de edição
- WHEN o usuário pressiona Esc
- THEN o histórico fecha
- AND o popup de edição continua aberto, com o que já foi digitado

---

---

### Requirement: Weight Change History Follows the Scope

Toda alteração persistida de peso (valor ou unidade) MUST ser anexada a um
**histórico local** na **mesma chave** em que o peso foi gravado: o histórico
**global** quando o salvamento foi global, e o histórico **daquela academia**
quando foi uma exceção. Cada registro guarda valor, unidade e data/hora.

O detalhe do exercício MUST exibir o histórico **do escopo resolvido**: o da
academia quando existe exceção, senão o global — como linha do tempo
cronológica (mais recente primeiro) com valor, unidade, variação em relação ao
registro anterior e data relativa. Essa linha do tempo MUST ser alcançada por um
**botão no card do peso alvo** e exibida num **modal** (ver *Weight History Opens
in a Modal*): o que ela mostra não muda, apenas onde e quando é mostrada.

Remover uma exceção (desmarcar a flag e salvar) MUST NOT apagar os registros de
histórico daquela academia; eles simplesmente deixam de ser exibidos enquanto o
par estiver no escopo global, e voltam a aparecer se a exceção for recriada.

#### Scenario: Saving a global weight appends to the global history
- GIVEN "Rosca Direta" não tem histórico
- WHEN o usuário salva 20 KG com a flag desmarcada
- THEN um registro global `(Rosca Direta, 20, KG, <agora>)` é anexado
- AND a linha do tempo mostra o registro como o primeiro (sem variação)
- AND a mesma linha do tempo é vista em qualquer academia

#### Scenario: Saving an exception starts that gym's history
- GIVEN "Rosca Direta" tem histórico global com 3 registros
- WHEN o usuário salva 15 KG na academia "B" com a flag marcada
- THEN a linha do tempo exibida na academia "B" mostra **apenas** o registro de 15 KG
- AND na academia "A" a linha do tempo global de 3 registros permanece

#### Scenario: Timeline shows deltas from previous entry
- GIVEN o histórico global de "Rosca Direta" é 20 KG, depois 22,5 KG, depois 25 KG
- WHEN o usuário abre o detalhe do exercício
- THEN a linha do tempo mostra três linhas com "+2,5 KG", "+2,5 KG" e "1º registro"

#### Scenario: Unit change is recorded as an entry
- GIVEN o histórico do escopo atual termina em 20 KG
- WHEN o usuário salva 45 com unidade LB no mesmo escopo
- THEN um novo registro `(45, LB, <agora>)` é anexado nesse escopo
- AND a linha é marcada como troca de unidade (sem variação numérica)

#### Scenario: Removing an exception hides but preserves its history
- GIVEN a academia "B" tem exceção com 2 registros de histórico
- WHEN o usuário desmarca a flag e salva
- THEN a academia "B" passa a exibir a linha do tempo global
- AND ao recriar a exceção em "B" os 2 registros anteriores voltam a ser exibidos,
  seguidos do novo

### Requirement: Delete a History Entry

Cada linha do histórico MUST expor a ação **excluir**, operando sobre o escopo a
que o registro pertence — dentro do **modal** do histórico (ver *Weight History
Opens in a Modal*), que é onde as linhas passam a viver. Uma ação destrutiva e
rara a um toque de distância é a direção certa, e nada além da distância muda. Excluir um registro que não é o mais recente remove
apenas aquele registro. Excluir o **mais recente** MUST reverter o peso daquele
escopo para o registro anterior; se não houver anterior, o peso **daquele
escopo** deixa de existir — e, tratando-se de uma exceção, o par volta a
resolver para o peso global. A exclusão MUST ser confirmada pelo usuário.

#### Scenario: Delete a past entry
- GIVEN o histórico do escopo atual é [20 KG (t1), 22,5 KG (t2), 25 KG (t3)]
- WHEN o usuário exclui o registro t2 e confirma
- THEN o histórico passa a [20 KG (t1), 25 KG (t3)]
- AND o peso permanece 25 KG

#### Scenario: Delete the current entry reverts to the previous
- GIVEN o histórico do escopo atual é [20 KG (t1), 25 KG (t2 — atual)]
- WHEN o usuário exclui t2 e confirma
- THEN o histórico passa a [20 KG (t1)]
- AND o peso daquele escopo volta a 20 KG

#### Scenario: Deleting the last entry of an exception falls back to global
- GIVEN o peso global de "Rosca Direta" é 25 KG
- AND a academia "B" tem exceção de 15 KG com um único registro de histórico
- WHEN o usuário exclui esse registro na academia "B" e confirma
- THEN a exceção de "B" deixa de existir
- AND a academia "B" passa a mostrar 25 KG (o peso global) e a linha do tempo global

#### Scenario: Deleting the last global entry clears the global weight
- GIVEN "Rosca Direta" tem um único registro no histórico global
- WHEN o usuário o exclui e confirma
- THEN o exercício fica sem peso global (estado vazio)
- AND academias que tenham exceção continuam mostrando as suas

#### Scenario: Confirmation required
- GIVEN um registro está prestes a ser excluído
- WHEN o usuário toca no botão de exclusão
- THEN uma confirmação é apresentada antes da remoção
- AND recusar deixa o histórico inalterado

---

### Requirement: Gym Label Only Marks an Exception

O rótulo com o nome da academia no cartão de peso MUST ser exibido **apenas**
quando o peso vigente é uma **exceção** daquela academia. No escopo global
nenhum rótulo de academia é exibido — o peso é do exercício. O mesmo vale para o
sufixo do cabeçalho do histórico ("· nesta academia"), que MUST aparecer só no
escopo de exceção.

#### Scenario: No label for a global weight
- GIVEN "Rosca Direta" resolve para o peso global na academia "A"
- WHEN o usuário abre o detalhe do exercício
- THEN o cartão "Peso alvo" mostra o valor sem nenhum rótulo de academia
- AND o cabeçalho do histórico não traz o sufixo "· nesta academia"

#### Scenario: Label appears as soon as an exception is saved
- GIVEN o peso é global e nenhum rótulo é exibido
- WHEN o usuário marca "Só nessa academia" e salva
- THEN o cartão passa a exibir o rótulo com o nome da academia ativa
- AND o cabeçalho do histórico passa a trazer "· nesta academia"

#### Scenario: Label disappears when the exception is removed
- GIVEN a academia "A" tem exceção e o rótulo "A" está visível
- WHEN o usuário desmarca a flag e salva
- THEN o rótulo deixa de ser exibido

### Requirement: Weight Badges Resolve Global Plus Exceptions

Toda leitura de peso em lote MUST usar o peso **resolvido** para a academia em
questão: exceção quando existe, global caso contrário. Isso vale para os badges
da Home, a lista de exercícios da sessão e o card de compartilhamento. Exercícios de
**Cardio** MUST ser omitidos dessas leituras: eles não têm peso a resolver.

#### Scenario: Home badges show global weights
- GIVEN os exercícios do "Dia 1" têm apenas pesos globais
- WHEN o usuário abre a Home em qualquer academia
- THEN cada exercício mostra o badge do seu peso global

#### Scenario: Session list mixes global and exception weights
- GIVEN uma sessão na academia "B", onde "Supino" tem exceção de 30 KG
  e os demais exercícios só têm peso global
- WHEN o usuário abre a sessão
- THEN "Supino" mostra 30 KG e os demais mostram seus pesos globais

#### Scenario: A sessão de cardio não mostra badge
- GIVEN uma sessão de cardio da "Esteira"
- WHEN o usuário a abre
- THEN a linha da Esteira não traz badge de peso

#### Scenario: Share card prints the resolved weights
- GIVEN uma sessão concluída na academia "B" com uma exceção entre os exercícios
- WHEN o usuário gera o card detalhado
- THEN os pesos impressos são os resolvidos para "B"

### Requirement: Migrate Existing Per-Gym Weights to Global

A migração do banco (v9) MUST, para **cada exercício**, promover a peso
**global** o registro da **academia mais antiga que tenha peso para ele**
(ordem de criação da academia; desempate pelo id), levando junto **todo o
histórico** daquela academia para aquele exercício. Os registros das demais
academias MUST permanecer como estão e passam a valer como **exceções**.

A migração MUST NOT apagar nem mesclar registro algum.

#### Scenario: Single gym becomes fully global
- GIVEN existe apenas a academia "A", com pesos e histórico para 12 exercícios
- WHEN a migração roda
- THEN os 12 pesos e seus históricos passam a ser globais
- AND nenhuma exceção permanece
- AND o usuário vê exatamente os mesmos valores de antes

#### Scenario: Oldest gym with a record wins per exercise
- GIVEN "A" (criada primeiro) tem "Rosca Direta" 20 KG e "B" tem "Rosca Direta" 15 LB
- AND apenas "B" tem "Supino" 40 KG
- WHEN a migração roda
- THEN o peso global de "Rosca Direta" é 20 KG (de "A") e "B" fica com a exceção 15 LB
- AND o peso global de "Supino" é 40 KG (de "B"), sem exceção

#### Scenario: History travels with the promoted weight
- GIVEN "A" tem 3 registros de histórico para "Rosca Direta" e "B" tem 1
- WHEN a migração roda e "A" é promovida
- THEN os 3 registros passam a ser o histórico global do exercício
- AND o único registro de "B" permanece como histórico da exceção de "B"

#### Scenario: Nothing is deleted
- GIVEN qualquer conjunto de pesos e históricos por academia
- WHEN a migração roda
- THEN a soma de registros de peso e de histórico é a mesma de antes
  (apenas re-chaveados)
</content>

### Requirement: Weight History Opens in a Modal

O histórico de peso MUST ser alcançado por um **botão no card do peso alvo**,
na **linha de topo do card, alinhado horizontalmente com o rótulo "Peso alvo"**,
e MUST abrir num **modal**.

Ele estava sempre aberto, numa seção abaixo do card: com oito ou dez registros,
o gráfico e a linha do tempo ficavam mais altos que todo o resto da aba
"Execução" somada, empurrando as alternativas para muito abaixo da dobra. A
pergunta que essa tela responde entre uma série e outra é **quanto levantar
agora**; a trajetória dos últimos meses importa, mas é uma pergunta que se faz
de vez em quando — e, quando se faz, merece a tela inteira em vez de um pedaço
de card.

O botão MUST ser **discreto**. Ele divide a linha com um rótulo sobrescrito e
fica acima da figura do peso, que é onde o olho deve pousar: ele é uma **saída
para o passado**, não uma segunda coisa a fazer com o peso, e MUST NOT competir
com o número nem com a ação de editar. Discreto, porém, não é pequeno demais
para o dedo: o alvo de toque MUST permanecer confortável apesar do tamanho do
texto.

O botão MUST dizer **quantos registros** existem. É a contagem que responde
"tem alguma coisa aí?" antes de o modal custar um toque, e é o que separa um
controle mudo de um informativo.

O modal MUST mostrar o histórico **inteiro**, exatamente como ele é hoje:
gráfico e linha do tempo completa, com valor, unidade, variação, data relativa e
a ação de excluir por registro. Nada MUST ser retirado do conteúdo — só deixa de
ocupar a tela sem ser pedido. Ele MUST **rolar** quando a lista é mais alta que
a tela, e MUST poder ser fechado pelos mesmos gestos que fecham qualquer modal
do app.

Quando o peso em vigor é uma **exceção da academia**, o modal MUST dizer isso
(ver *Gym Label Only Marks an Exception*): o histórico é daquele escopo. No
escopo global não há o que qualificar.

O modal MUST começar **fechado** a cada visita, e esse estado MUST NOT ser
persistido: a resposta que a tela deve dar ao abrir é o peso, não a história
dele.

Sem **nenhum** registro, o botão MUST NOT ser exibido: um controle cujo único
truque é abrir um modal vazio não vale o lugar que ocupa. Pela mesma razão, se o
último registro for excluído **de dentro** do modal, ele MUST se fechar em vez
de ficar em pé mostrando nada.

O botão MUST continuar disponível **enquanto o peso está sendo editado**. Da
linha de topo, abrindo um modal, ele não custa altura nenhuma ao formulário —
Cancelar e Salvar seguem visíveis sem rolagem, que é o que a rolagem ao topo
existe para proteger (ver *Edit and Save Weight*) — e conferir quanto se
levantou da última vez é justamente o que se quer ao decidir o novo número.
Fechar o modal MUST devolver o formulário como estava.

Tudo isto vale igualmente nas **duas telas** que usam o editor — o detalhe do
catálogo e o exercício em sessão — e também numa sessão **concluída**, onde o
editor é somente-leitura: ali o modal abre e a ação de excluir segue ausente
como já é hoje.

#### Scenario: O botão fica na linha de topo, com a contagem
- GIVEN "Rosca Direta" tem cinco registros de histórico no escopo em vigor
- WHEN o usuário abre o detalhe do exercício
- THEN o card do peso mostra um botão de histórico na mesma linha do rótulo "Peso alvo"
- AND ele traz a contagem de cinco
- AND nem o gráfico nem a linha do tempo são exibidos na tela

#### Scenario: Um toque abre o modal com tudo
- GIVEN o botão de histórico visível
- WHEN o usuário toca nele
- THEN um modal é aberto com o gráfico e a linha do tempo completa
- AND cada registro traz valor, unidade, variação e data relativa

#### Scenario: Fechar devolve a tela
- GIVEN o modal do histórico aberto
- WHEN o usuário o fecha
- THEN o modal desaparece e nada do histórico permanece na tela

#### Scenario: Cada visita começa fechada
- GIVEN o usuário abriu o histórico e saiu da tela
- WHEN volta ao detalhe do mesmo exercício
- THEN o modal está fechado

#### Scenario: Sem registro, sem botão
- GIVEN um exercício sem nenhum registro de histórico no escopo em vigor
- WHEN o usuário abre o detalhe
- THEN nenhum botão de histórico é exibido

#### Scenario: O histórico segue à mão durante a edição
- GIVEN o card do peso em modo de edição
- WHEN o usuário olha a linha de topo do card
- THEN o botão de histórico continua ali
- AND Cancelar e Salvar continuam visíveis sem rolagem

#### Scenario: Consultar o histórico não perde o que estava sendo editado
- GIVEN o usuário está editando o peso
- WHEN abre o histórico e fecha o modal
- THEN o formulário de edição continua como estava, com Cancelar e Salvar à vista

#### Scenario: O modal diz de qual academia é o histórico
- GIVEN a academia ativa tem uma **exceção** para "Rosca Direta"
- WHEN o usuário abre o histórico
- THEN o modal indica que aquele histórico é daquela academia

#### Scenario: No escopo global não há o que qualificar
- GIVEN "Rosca Direta" resolve para o peso **global**
- WHEN o usuário abre o histórico
- THEN o modal não nomeia academia nenhuma

#### Scenario: Excluir continua funcionando, de dentro do modal
- GIVEN o modal aberto, com três registros
- WHEN o usuário exclui o registro mais recente e confirma
- THEN o registro é removido e o peso volta para o anterior, como sempre

#### Scenario: Excluir o último fecha o modal
- GIVEN o modal aberto com um único registro
- WHEN o usuário o exclui e confirma
- THEN o modal se fecha
- AND o botão de histórico deixa de ser exibido

#### Scenario: Vale nas duas telas
- GIVEN um exercício com histórico
- WHEN o usuário o abre pelo catálogo e, depois, pelo detalhe da entrada numa sessão
- THEN nas duas o botão aparece no mesmo lugar e abre o mesmo modal

#### Scenario: Sessão concluída abre sem oferecer exclusão
- GIVEN o detalhe de uma entrada de uma sessão já concluída
- WHEN o usuário abre o histórico
- THEN os registros são exibidos
- AND nenhuma ação de excluir é oferecida

---

### Requirement: The History Modal Reaches the Other Gyms

O modal do histórico MUST permitir **olhar outra academia** sem sair da que o
usuário está: um controle na **linha do título** troca de qual academia o peso
e o histórico estão sendo lidos.

A pergunta que isso responde é real e não tinha resposta: "quanto eu levanto
disso na outra academia?". Sem o controle, a única forma de saber era trocar a
academia ativa, ver, e trocar de volta — mexendo no estado do app inteiro para
ler um número.

O controle MUST ser **discreto** e MUST ter a mesma forma do seletor de academia
da Home, que é o gesto que o usuário já conhece para essa pergunta. Ele MUST
ficar **na linha do título**, à direita, e MUST NOT ocupar espaço acima do
gráfico: o conteúdo do modal é o histórico.

O controle MUST NOT ser exibido quando existe **uma única academia** — não há
para onde ir, e um controle que visivelmente não faz nada é pior do que nenhum.

A lista de academias MUST começar **fechada** e abrir a partir do controle,
dentro do próprio modal. Ela MUST NOT ser um segundo diálogo sobre o primeiro:
duas camadas modais responderiam ambas ao Esc e escureceriam a tela duas vezes,
por uma lista de poucos nomes.

O modal MUST dizer **de qual peso** aquela linha do tempo é: o **global**, que
vale em todas as academias, ou a **exceção daquela academia**. Isso não é
rótulo: uma academia sem exceção resolve para o peso global, então duas
academias podem mostrar exatamente os mesmos registros — e sem essa linha a
repetição se lê como defeito em vez de como o ponto. O valor em vigor MUST
aparecer junto.

Trocar a academia vista MUST ser um **consulta**, não uma mudança de contexto:
a academia ativa, o card, o editor e o salvar MUST continuar sendo os da
academia em que o usuário está. Fechar o modal MUST devolver a leitura à
academia ativa, e reabrir MUST começar nela — não na última consultada.

A ação de **excluir registro** MUST estar disponível apenas na academia ativa.
Um excluir alcançável a partir de uma consulta é um excluir que ninguém quis
fazer.

Como o título do modal passa a valer para qualquer academia, ele MUST NOT mais
qualificar uma delas — a informação de escopo mora na linha descrita acima, onde
também cabe o valor.

#### Scenario: Ver o peso de outra academia
- GIVEN o usuário está na academia "A" e o exercício tem uma exceção na "B"
- WHEN abre o histórico e escolhe "B" no controle do título
- THEN vê o peso e o histórico da exceção da "B"
- AND o modal informa que aquele peso é só daquela academia

#### Scenario: Uma academia sem exceção mostra o global, e diz isso
- GIVEN a academia "A" não tem exceção para o exercício
- WHEN o usuário abre o histórico
- THEN vê a linha do tempo do peso **global**
- AND o modal informa que aquele peso vale em todas as academias

#### Scenario: Consultar não muda a academia ativa
- GIVEN o usuário está na academia "A"
- WHEN olha a "B" no modal e fecha
- THEN o card continua mostrando o peso da "A"
- AND a academia ativa não mudou

#### Scenario: Reabrir começa na academia ativa
- GIVEN o usuário consultou a "B" e fechou o modal
- WHEN abre o histórico de novo
- THEN o controle mostra a academia ativa, não a última consultada

#### Scenario: Não dá para excluir o registro de outra academia
- GIVEN o modal aberto na academia ativa, com a ação de excluir disponível
- WHEN o usuário passa a olhar outra academia
- THEN nenhum registro oferece a ação de excluir

#### Scenario: Uma academia só, nenhum controle
- GIVEN o aparelho tem uma única academia
- WHEN o usuário abre o histórico
- THEN não há controle de troca de academia
