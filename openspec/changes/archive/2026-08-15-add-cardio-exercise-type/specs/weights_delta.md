# Delta: weights

**Change ID:** `add-cardio-exercise-type`
**Affects:** `src/features/exercise/WeightEditor.tsx` (quem o renderiza),
`src/features/exercise/ExerciseDetailPage.tsx`,
`src/features/session/SessionEntryPage.tsx`

---

## MODIFIED

### Requirement: Track a Global Target Weight

*(única mudança: o peso passa a valer para exercícios de **Força**; todo o resto
do requisito permanece)*

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

---

### Requirement: Weight Badges Resolve Global Plus Exceptions

*(única mudança: a leitura em lote passa a ignorar exercícios de Cardio)*

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

---

## ADDED

(Nenhum.)

## REMOVED

(Nenhum.)
