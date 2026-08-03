# Delta: AI Assistant

**Change ID:** `fix-assistant-proposal-apply`
**Affects:** `openspec/specs/ai-assistant/spec.md` — "A Proposal Arrives as a
Reviewable Card in the Thread", "Applying a Proposal Preserves References",
"Failures Are Reported Without Touching Data"

---

## ADDED

### Requirement: A Proposal Is Repaired Before It Is Shown

O retorno do modelo pode chegar com ruído que não expressa intenção nenhuma:
uma `mediaUrl` serializada como o texto `"null"`, um `categoryRef` apontando
para uma categoria que a própria proposta não trouxe. Antes de virar card, a
proposta MUST passar por um reparo conservador contra o catálogo atual.

O reparo MUST se limitar a:

- `mediaUrl` que é sentinela de texto (`"null"`, `"undefined"`, vazio ou só
  espaços) vira ausência de imagem;
- `mediaUrl` que não é uma URL de imagem válida: o exercício que já existe
  MUST manter a URL guardada; o exercício novo fica sem imagem;
- referência (categoria de um exercício, alternativa, exercício de um dia) que
  não resolve dentro da proposta MUST ser descartada, junto com a
  auto-referência em alternativas.

A regra que delimita o reparo: **ele descarta vínculo, nunca entidade.** O
reparo MUST NOT remover, criar ou renomear categoria, exercício ou dia, MUST NOT
alterar id nem ordem, e MUST NOT mudar o que a proposta remove.

Tudo o que sobra MUST seguir para a validação e recusar a proposta inteira como
já recusa hoje: `ref` repetido, id repetido, nome vazio, id que não existe mais
no catálogo.

Só MUST ser reportado o reparo que **muda o resultado**. Uma normalização que o
apply já faria de qualquer jeito — espaço em volta de uma URL, `mediaUrl` vazia,
uma alternativa que aponta para o próprio exercício — é feita em silêncio: uma
linha no card sobre ela concorreria com as linhas que a pessoa precisa ler.

O impacto mostrado no card MUST ser medido sobre a proposta **reparada** — a que
será aplicada. A história enviada ao modelo, porém, MUST guardar a chamada como
ela veio (ver "A História Devolve a Chamada do Modelo Intacta"): o reparo é o que
o app fez do que o modelo disse, e o modelo fica sabendo do resultado pela
resposta da função, não por uma cópia editada do próprio turno.

O reparo MUST NOT afrouxar a validação: uma proposta reparada ainda é validada
por inteiro, dentro da transação, contra o catálogo lido ali.

#### Scenario: Uma mediaUrl que veio como texto "null"
- GIVEN a proposta traz um exercício existente com `mediaUrl` igual à string `"null"`
- WHEN a proposta chega
- THEN ela é entendida como "sem imagem", o card aparece normalmente
- AND aceitar aplica sem erro

#### Scenario: Uma mediaUrl inválida não apaga a foto que já existia
- GIVEN "Rosca Direta" tem uma imagem guardada
- AND a proposta devolve para ela uma `mediaUrl` que não é URL de imagem
- WHEN a proposta chega
- THEN o card diz que manteve a imagem anterior
- AND aceitar deixa a imagem guardada como estava

#### Scenario: Uma categoria omitida derruba só o vínculo
- GIVEN a proposta omite a categoria "Cardio" e mantém um exercício apontando para ela
- WHEN a proposta chega
- THEN o exercício fica sem aquela categoria e o card diz isso
- AND o exercício continua na proposta, não é removido

#### Scenario: O reparo não muda o que a proposta remove
- GIVEN uma proposta com refs pendurados em exercícios e dias
- WHEN ela é reparada
- THEN a quantidade de categorias, exercícios e dias é exatamente a mesma
- AND os nomes que o card promete remover são os mesmos de antes do reparo

#### Scenario: Uma proposta sem ruído não é tocada
- GIVEN uma proposta coerente
- WHEN ela é reparada
- THEN ela sai idêntica e nenhum reparo é listado no card

#### Scenario: Uma normalização que não muda nada não vira aviso
- GIVEN a proposta traz um exercício com `mediaUrl` vazia
- WHEN ela é reparada
- THEN o exercício fica sem imagem, como já ficaria
- AND nenhum reparo é listado no card

#### Scenario: O que não é ruído continua recusando a proposta
- GIVEN uma proposta com dois exercícios usando o mesmo `ref`
- WHEN o usuário tenta aceitar
- THEN a proposta é recusada inteira, com explicação, e nada é escrito

### Requirement: A História Devolve a Chamada do Modelo Intacta

A conversa continua depois de uma proposta — a pessoa recusa e diz o que
ajustar, ou aceita e segue pedindo outra coisa —, e cada turno reenvia a
história inteira. O turno em que o modelo propôs MUST voltar **exatamente como
chegou**, na mesma part: a chamada de função, seus argumentos e a assinatura de
raciocínio que a acompanha.

Essa assinatura é um token opaco que o modelo emite junto da chamada e exige de
volta nos turnos seguintes. Uma história remontada a partir da chamada — nome e
argumentos, sem a part em volta — é recusada com 400, e o que a pessoa vê é a
conversa morrer logo depois de recusar uma proposta.

Por ser opaca, a assinatura MUST ser tratada como se valesse para a part inteira:
nada nela é editado ao devolver, nem os argumentos. Ela MUST ser opcional na
leitura — um modelo que não emitir assinatura continua funcionando.

#### Scenario: Recusar e continuar conversando
- GIVEN o usuário recusou uma proposta
- WHEN ele manda a mensagem seguinte
- THEN o turno da proposta vai junto com a assinatura que veio com ele
- AND o assistente responde normalmente

#### Scenario: A chamada volta sem edição
- GIVEN uma proposta que precisou de reparo antes de virar card
- WHEN o turno seguinte é enviado
- THEN a chamada na história tem os argumentos originais do modelo
- AND o que foi realmente aplicado chega ao modelo pela resposta da função

#### Scenario: Um modelo sem assinatura continua funcionando
- GIVEN a resposta não traz assinatura nenhuma
- WHEN a proposta é lida
- THEN ela vira card normalmente

---

## MODIFIED

### Requirement: A Proposal Arrives as a Reviewable Card in the Thread

*(acréscimo à requisito existente)*

Quando a proposta tiver passado por reparo, o card MUST listar cada reparo em
português, junto do impacto e **antes** dos botões de decisão — nunca depois de
aplicar. Sem reparo, o card MUST ficar exatamente como está hoje.

O card MUST descrever o efeito para a pessoa, não o defeito do payload: "manteve
a imagem anterior de Rosca Direta", "HIIT ficou sem a categoria Cardio".

#### Scenario: O card mostra os reparos antes de decidir
- GIVEN uma proposta que precisou de reparo em dois exercícios
- WHEN o card aparece
- THEN os dois reparos estão listados junto do impacto
- AND os botões de aceitar e recusar continuam disponíveis

#### Scenario: Sem reparo, sem ruído visual
- GIVEN uma proposta que não precisou de reparo
- WHEN o card aparece
- THEN nenhuma seção de reparos é mostrada


### Requirement: Failures Are Reported Without Touching Data

*(acréscimo à requisito existente)*

Nenhuma falha ao aplicar uma proposta MUST ser reportada sem causa. A mensagem
MUST dizer o que impediu a aplicação — inclusive quando o erro vem de uma
validação de campo ou do banco, e não da validação da proposta. Uma mensagem
genérica do tipo "não consegui aplicar" MUST NOT ser o que a pessoa vê,
qualquer que seja a origem da falha.

A falha MUST continuar deixando o catálogo intacto e a proposta pendente, para
que a pessoa possa ajustar a seleção e tentar de novo.

#### Scenario: Um campo inválido explica a recusa
- GIVEN aplicar falha porque um campo de um exercício não passa na validação
- WHEN o erro aparece na conversa
- THEN a mensagem diz qual exercício e qual foi o problema
- AND o catálogo está intacto e a proposta segue pendente

#### Scenario: Uma falha inesperada ainda diz alguma coisa
- GIVEN aplicar falha por um erro que não é de validação de proposta
- WHEN o erro aparece na conversa
- THEN a mensagem carrega a causa original
- AND o catálogo está intacto

---

## REMOVED

(Nenhum requisito removido)
