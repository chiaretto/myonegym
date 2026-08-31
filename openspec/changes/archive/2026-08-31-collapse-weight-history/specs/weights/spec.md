# Delta: weights

**Change ID:** `collapse-weight-history`
**Affects:** onde e quando o histórico de peso é exibido, nas duas telas do editor

---

## ADDED Requirements

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

## MODIFIED Requirements

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

## REMOVED

(None)
