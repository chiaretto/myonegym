# Delta: exercises

**Change ID:** `add-exercise-alternatives`
**Affects:** modelo do exercício, formulário de exercício, lista de exercícios,
detalhe do exercício

---

## ADDED

### Requirement: Alternative Exercises

Um exercício MUST poder declarar **n outros exercícios** como suas
**alternativas** — formas diferentes de treinar a mesma coisa (supino com barra
e supino na máquina; supino e crucifixo). A relação MUST ser:

- **Simétrica** — marcar B como alternativa de A marca A como alternativa de B,
  de modo que o par é declarado **uma vez**, do lado que o usuário estiver
  editando;
- **NÃO transitiva** — A pode listar B e C **sem** que B e C virem alternativas
  entre si. É isso que permite um mesmo exercício encabeçar **vários tipos de
  variação**: o supino reto troca pela máquina (mesmo movimento) e pelo
  crucifixo (mesmo músculo), e esses dois nunca se tornam intercambiáveis por
  associação;
- **Global** — pertence aos exercícios, não a um dia de treino nem a uma
  academia;
- **Opcional** — um exercício sem alternativas é o caso normal, e nada muda
  para ele.

As alternativas MUST NOT alterar a composição dos **dias de treino**: adicionar
um exercício a um dia adiciona **somente ele**, e as alternativas não entram
junto (ver *Alternatives Do Not Join a Training Day*).

O **peso alvo** MUST continuar por exercício: cada alternativa mantém seu
próprio valor por academia e seu próprio histórico (ver a capability `weights`).
Observações e fotos também continuam por `(academia, exercício)`.

#### Scenario: Declarar uma alternativa
- GIVEN os exercícios "Supino Reto" e "Supino Máquina" existem sem alternativas
- WHEN o usuário declara "Supino Máquina" como alternativa de "Supino Reto"
- THEN "Supino Reto" lista "Supino Máquina"
- AND "Supino Máquina" lista "Supino Reto" (a relação vale nos dois sentidos)

#### Scenario: Vários tipos de variação no mesmo exercício
- GIVEN "Supino Reto", "Supino Máquina" e "Crucifixo" existem
- WHEN o usuário declara "Supino Máquina" **e** "Crucifixo" como alternativas de
  "Supino Reto"
- THEN "Supino Reto" lista as duas
- AND "Supino Máquina" lista apenas "Supino Reto"
- AND "Crucifixo" lista apenas "Supino Reto"

#### Scenario: Escolher um exercício que já tem alternativas não absorve as dele
- GIVEN "Supino Máquina" já é alternativa de "Supino Halter"
- WHEN o usuário declara "Supino Máquina" como alternativa de "Supino Reto"
- THEN "Supino Máquina" passa a listar "Supino Halter" e "Supino Reto"
- AND "Supino Reto" e "Supino Halter" **não** viram alternativas um do outro

#### Scenario: Remover uma alternativa não mexe nas outras
- GIVEN "Supino Reto" tem "Supino Máquina" e "Crucifixo" como alternativas
- WHEN o usuário remove "Crucifixo"
- THEN "Supino Reto" mantém "Supino Máquina"
- AND "Crucifixo" fica sem alternativas
- AND as demais alternativas de "Supino Máquina", se houver, ficam intactas

#### Scenario: Desfazer o par
- GIVEN "Supino Reto" e "Supino Máquina" são alternativas entre si
- WHEN o usuário remove "Supino Máquina" das alternativas de "Supino Reto"
- THEN nenhum dos dois lista o outro

#### Scenario: Pesos permanecem separados
- GIVEN "Supino Reto" (60 KG na academia "A") e "Supino Máquina" (45 KG na
  academia "A") são alternativas entre si
- WHEN o usuário edita o peso alvo de "Supino Reto" para 62,5 KG
- THEN "Supino Máquina" continua em 45 KG na academia "A"
- AND o histórico de cada um registra apenas as próprias mudanças

### Requirement: Alternatives Do Not Join a Training Day

Declarar alternativas MUST NOT alterar nenhum dia de treino, nem no cadastro nem
na exibição. Um dia lista **exatamente** os exercícios que o usuário colocou
nele: as alternativas não são acrescentadas, não são agrupadas com nada, não
alteram a contagem de exercícios do dia e não viram parada da navegação
Voltar/Avançar. Elas são um caminho a percorrer a partir do detalhe, não uma
mudança na composição do treino.

O usuário **pode** colocar duas alternativas no mesmo dia, se quiser fazer as
duas — nesse caso são dois exercícios independentes, como quaisquer outros.

#### Scenario: O dia mostra só o que foi adicionado
- GIVEN "Supino Reto" tem "Supino Máquina" e "Crucifixo" como alternativas
- WHEN o usuário adiciona apenas "Supino Reto" a "Dia 1" e abre a Home
- THEN a lista de "Dia 1" mostra "Supino Reto" e nenhuma das alternativas

#### Scenario: A contagem do dia não muda
- GIVEN "Dia 1" contém 8 exercícios, um deles com duas alternativas
- WHEN o dia é listado
- THEN a contagem exibida continua sendo 8

#### Scenario: A sessão tem uma entrada por exercício do dia
- GIVEN "Dia 1" contém "Supino Reto" (com alternativas) e "Tríceps Corda"
- WHEN o usuário inicia o treino
- THEN a sessão tem duas entradas, "Supino Reto" e "Tríceps Corda"

### Requirement: Choose Alternatives in the Exercise Form

O formulário de exercício (novo e edição) MUST oferecer um seletor
**"Alternativas"** — seleção múltipla, com **busca por nome**, sobre os demais
exercícios cadastrados. O próprio exercício MUST NOT aparecer entre as opções, e
os já selecionados MUST permanecer visíveis independentemente da busca, para que
desmarcar não exija procurá-los de novo.

Salvar o exercício A com a seleção `L` MUST tornar `L` a lista de A e escrever
**apenas o vínculo de volta para A** nos demais — as alternativas que cada um
deles já tinha não são assunto dessa edição.

O formulário MUST explicar, em texto de apoio, que as alternativas **não** entram
nos dias de treino junto com o exercício.

#### Scenario: Selecionar alternativas ao criar
- GIVEN "Supino Reto" existe
- WHEN o usuário cria "Supino Máquina" e seleciona "Supino Reto" em Alternativas
- THEN os dois passam a ser alternativas entre si

#### Scenario: Selecionar várias de uma vez
- GIVEN "Supino Máquina" e "Crucifixo" existem
- WHEN o usuário edita "Supino Reto" e seleciona as duas
- THEN "Supino Reto" lista as duas, e cada uma delas lista apenas "Supino Reto"

#### Scenario: O próprio exercício não é uma opção
- GIVEN o usuário está editando "Supino Reto"
- WHEN abre o seletor de alternativas
- THEN "Supino Reto" não está entre as opções

#### Scenario: Buscar entre as opções
- GIVEN existem "Supino Reto", "Supino Máquina" e "Rosca Direta"
- WHEN o usuário digita "supino" na busca do seletor
- THEN apenas "Supino Máquina" é oferecido (o próprio exercício nunca aparece)
- AND os já selecionados continuam visíveis mesmo fora da busca

#### Scenario: Nenhuma alternativa é válido
- GIVEN o formulário de novo exercício está aberto
- WHEN o usuário salva sem selecionar nenhuma alternativa
- THEN o exercício é criado sem alternativas

### Requirement: Alternatives on the Exercises List

A lista de exercícios (Configurações → Exercícios) MUST indicar, em cada item
que tenha alternativas, **quais são elas** — junto dos rótulos de dia que o item
já mostra. Um exercício sem alternativas MUST NOT ganhar indicador nenhum (a
ausência é o caso comum e não precisa de ruído).

A indicação MUST atualizar automaticamente quando as alternativas mudam.

#### Scenario: Item com alternativas
- GIVEN "Supino Reto" tem "Supino Máquina" como alternativa
- WHEN o usuário vê a lista de Exercícios
- THEN o item "Supino Reto" indica "Supino Máquina" como alternativa

#### Scenario: Item sem alternativas
- GIVEN "Rosca Direta" não tem alternativas
- WHEN o usuário vê a lista
- THEN o item não mostra nenhum indicador de alternativa

#### Scenario: A indicação acompanha as mudanças
- GIVEN o item "Supino Reto" indica "Supino Máquina"
- WHEN o usuário desfaz o par
- THEN o indicador desaparece do item (atualiza ao vivo)

### Requirement: Alternatives Section on the Exercise Detail

Todo **detalhe de exercício** — o do catálogo (`/exercise/:id`) e o de uma
entrada de sessão — MUST apresentar uma seção **"Alternativas"** listando os
exercícios alternativos, cada um com sua **miniatura** e seu **nome**, e cada um
**tocável** para abrir o detalhe correspondente.

A seção MUST ficar no corpo da tela (junto do peso alvo), não na faixa de
rótulos do cabeçalho: é um lugar para onde ir, não um rótulo, e cresce com o
número de alternativas.

A seção MUST NOT ser exibida quando o exercício não tem alternativas — um card
vazio apareceria em quase todo exercício do catálogo.

Abrir uma alternativa a partir do catálogo MUST **preservar o contexto de dia**
presente no endereço, de modo que Voltar continue devolvendo à Home com aquele
dia expandido. Como a alternativa pode **não** pertencer àquele dia, ver *Open
Exercise Detail* na capability `home-navigation` para o comportamento da barra
Voltar/Avançar nesse caso.

#### Scenario: A seção lista as alternativas
- GIVEN "Supino Reto" tem "Supino Máquina" e "Crucifixo" como alternativas
- WHEN o usuário abre o detalhe de "Supino Reto"
- THEN uma seção "Alternativas" lista os dois, com miniatura e nome

#### Scenario: Abrir a alternativa
- GIVEN o usuário abriu "Supino Reto" a partir de "Dia 1"
- WHEN toca "Supino Máquina" na seção Alternativas
- THEN o detalhe de "Supino Máquina" abre, ainda no contexto de "Dia 1"

#### Scenario: Cada alternativa mostra o próprio peso
- GIVEN "Supino Reto" (60 KG em "A") e "Supino Máquina" (45 KG em "A") são
  alternativas
- WHEN o usuário vai do detalhe de um para o do outro
- THEN o editor "Peso alvo" mostra 60 KG no primeiro e 45 KG no segundo

#### Scenario: Sem alternativas, sem seção
- GIVEN "Rosca Direta" não tem alternativas
- WHEN o usuário abre seu detalhe
- THEN nenhuma seção "Alternativas" é exibida

#### Scenario: A alternativa mostra o caminho de volta
- GIVEN "Supino Máquina" tem apenas "Supino Reto" como alternativa
- WHEN o usuário abre o detalhe de "Supino Máquina"
- THEN a seção Alternativas lista "Supino Reto"
- AND não lista "Crucifixo", que é alternativa do reto e não da máquina

---

## MODIFIED

### Requirement: Register an Exercise

The user MUST be able to create an exercise with a name (e.g. "Rosca Direta"), a
**media URL**, **zero or more categories**, and **zero or more alternative
exercises** (see *Alternative Exercises*). A compound exercise (e.g. a bench
press training Peito **and** Tríceps) MAY carry several categories; an exercise
MAY also carry **none** — an exercise with no categories is **uncategorized** and
is shown with the label "Sem categoria". There is **no reserved "Sem categoria"
category**: uncategorized simply means an empty category list. The media MAY be a
**static image** (PNG/JPG/JPEG/WebP) or an **animated GIF** — a single URL field
accepts either. Exercises are global (not tied to a gym) and MAY be reused across
multiple training days and categories.

The category picker MUST let the user select **multiple** categories (e.g.
tap-to-toggle), and selecting none MUST be valid. O seletor de **alternativas**
segue a mesma forma — ver *Choose Alternatives in the Exercise Form*.

While the user fills the form, the media given MUST be previewed at large size —
see *Large Media Preview in the Exercise Form*. Listing thumbnails are unchanged.

#### Scenario: Create an exercise with a static image
- GIVEN category "Bíceps" exists
- WHEN the user creates exercise "Rosca Direta" with media URL "https://…/rosca.png" and category "Bíceps"
- THEN the exercise is persisted with its media URL and category
- AND it becomes available for selection when building training days

#### Scenario: Create an exercise with no alternatives
- GIVEN the exercise form is open
- WHEN the user creates "Rosca Direta" without selecting any alternative
- THEN the exercise is persisted with no alternatives and behaves exactly as
  exercises did before this change

### Requirement: Edit and Delete Exercises

The user MUST be able to edit an exercise (name, media URL, categories,
**alternatives**) and delete it. Deleting an exercise removes it from days,
removes its weight records, removes its **per-gym notes**, e **remove o vínculo
de alternativa nos exercícios que o apontavam**, de modo que nenhum vínculo
pendente sobreviva à exclusão.

#### Scenario: Delete an exercise in use
- GIVEN exercise "Rosca Direta" is used by "Dia 1" and has weights in gym "A"
- WHEN the user deletes it
- THEN it is removed from "Dia 1"
- AND its weight records across all gyms are removed

#### Scenario: Deleting an exercise removes its notes
- GIVEN exercise "Rosca Direta" has notes in gyms "A" and "B"
- WHEN the user deletes it
- THEN its note records across all gyms are removed

#### Scenario: Excluir uma alternativa
- GIVEN "Supino Reto" tem "Supino Máquina" e "Crucifixo" como alternativas
- WHEN o usuário exclui "Crucifixo"
- THEN "Supino Reto" mantém "Supino Máquina" e não lista mais o excluído

#### Scenario: Excluir um dos dois lados
- GIVEN "Supino Reto" e "Supino Máquina" são alternativas entre si
- WHEN o usuário exclui "Supino Máquina"
- THEN "Supino Reto" fica sem alternativas

---

## REMOVED

(None)
