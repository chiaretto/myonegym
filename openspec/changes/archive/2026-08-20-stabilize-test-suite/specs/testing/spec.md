# Delta: testing

**Change ID:** `stabilize-test-suite`
**Affects:** capability nova — o contrato da suíte automatizada

---

## ADDED Requirements

### Requirement: A Suíte Só Fica Vermelha Quando Algo Quebrou

A suíte automatizada MUST ser **determinística**: rodá-la duas vezes sobre o
mesmo código MUST dar o mesmo resultado. Um teste que falha numa rodada e passa
na seguinte, sem nada ter mudado, MUST ser tratado como **defeito da suíte**, e
não como ruído a conviver.

A razão é o que o vermelho significa. Uma suíte que reprova por acaso ensina a
rodar de novo em vez de investigar, e a partir daí ela deixa de valer como sinal
enquanto continua custando o tempo de espera — o pior dos dois mundos.

Um teste que **alcança** um prazo MUST ser investigado antes de o prazo ser
aumentado. Subir o teto é a resposta certa quando o prazo é que estava errado, e
a errada quando o teste degradou; distinguir os dois casos é o trabalho, e pulá-lo
transforma a configuração numa catraca que só sobe.

#### Scenario: Mesma entrada, mesmo resultado
- GIVEN a suíte passa numa rodada completa
- WHEN ela é rodada de novo, sem alteração alguma no código
- THEN passa de novo

#### Scenario: Um teste intermitente é defeito
- GIVEN um teste que falha em algumas rodadas e passa em outras
- WHEN isso é observado
- THEN é tratado como defeito da suíte, e não como resultado aceitável

#### Scenario: Investigar antes de afrouxar
- GIVEN um teste passou a alcançar o prazo configurado
- WHEN alguém vai corrigir
- THEN o teste é investigado antes de o prazo ser aumentado

---

### Requirement: Os Prazos São Escolhidos, e a Escolha Fica Escrita

A configuração da suíte MUST declarar explicitamente cada prazo que ela impõe — o
do **teste**, o dos **hooks** e o das **utilidades assíncronas** da Testing
Library —, e MUST trazer a razão do número ao lado dele.

Um valor herdado do padrão da ferramenta não é uma escolha: os padrões do vitest
e da Testing Library são calibrados para **teste de unidade** — uma função, uma
asserção, milissegundos —, e esta suíte é dominada por **integração** que monta o
app inteiro sobre um IndexedDB falso. O prazo certo para um não é o prazo certo
para o outro, e nada na configuração dizia qual dos dois estava valendo.

Os números MUST ser derivados do que foi **medido**, e MUST NOT ser escolhidos
"bem altos por precaução": um teto folgado demais transforma um travamento em
espera longa, o que atrasa o diagnóstico em vez de ajudá-lo.

#### Scenario: A configuração diz o que impõe
- GIVEN alguém abre a configuração da suíte
- WHEN procura quanto tempo um teste tem
- THEN o valor está declarado ali, com a razão ao lado

#### Scenario: O número vem da medição
- GIVEN um prazo precisa ser definido
- WHEN o valor é escolhido
- THEN ele parte da pior duração observada, com folga, e não de um palpite

---

### Requirement: Subir um Teto Não Pode Esconder Lentidão

Quando um prazo é aumentado, a suíte MUST continuar **nomeando** os testes lentos
no seu relatório, ainda que eles passem. Um limiar de lentidão MUST ser declarado
explicitamente para isso.

É o contrapeso que separa ajustar o prazo de afrouxar a régua: sem ele, um teste
que fosse de 900 ms a 4 s deixaria de reprovar e ninguém saberia — a degradação
seria absorvida em silêncio, que é exatamente o que o teto mais alto poderia
custar. O tempo tolerado no **reprovar** continua reportado no **listar**.

A lista de testes lentos MUST ser registrada quando os prazos mudarem, para
servir de linha de base à próxima comparação.

#### Scenario: O lento aparece mesmo passando
- GIVEN um teste que passa, mas leva bem mais que o limiar declarado
- WHEN a suíte roda
- THEN o relatório o nomeia

#### Scenario: A linha de base é comparável
- GIVEN os prazos da suíte foram alterados
- WHEN a mudança é concluída
- THEN a lista de testes lentos de antes e a de depois estão registradas
