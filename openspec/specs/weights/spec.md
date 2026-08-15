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

### Requirement: Weight Change History Follows the Scope

Toda alteração persistida de peso (valor ou unidade) MUST ser anexada a um
**histórico local** na **mesma chave** em que o peso foi gravado: o histórico
**global** quando o salvamento foi global, e o histórico **daquela academia**
quando foi uma exceção. Cada registro guarda valor, unidade e data/hora.

O detalhe do exercício MUST exibir o histórico **do escopo resolvido**: o da
academia quando existe exceção, senão o global — como linha do tempo
cronológica (mais recente primeiro) com valor, unidade, variação em relação ao
registro anterior e data relativa.

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
que o registro pertence. Excluir um registro que não é o mais recente remove
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

Toda leitura de peso em lote — os badges da Home, a lista de exercícios da
sessão e o card de compartilhamento — MUST usar o peso **resolvido** para a
academia em questão: exceção quando existe, global caso contrário. Exercícios de
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
