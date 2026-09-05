# Delta: admin

**Change ID:** `admin-official-catalog`
**Affects:** capability nova — ferramenta de manutenção do catálogo oficial

---

## ADDED Requirements

### Requirement: A Development-Only Screen for Editing the Official Catalog

O projeto MUST oferecer uma tela em `/admin` para **editar o catálogo oficial** —
as categorias e os exercícios de `src/data/officialCatalog.json`.

Ela existe porque a alternativa é editar um JSON à mão, e o que se erra ali se
erra em silêncio: um `categoryIds` com um número inexistente não quebra nada, o
exercício apenas aparece sem aquela categoria; um slug com um acento a mais
deixa o exercício sem imagem, e o gerador só o lista entre os "sem master".

A tela MUST existir **apenas em desenvolvimento** e MUST NOT fazer parte do
build de produção. Publicada, ela só poderia ser uma tela que falha em tudo que
tenta — não há servidor do outro lado — e uma URL "oculta" no ar convida quem a
descobrir.

Ela é uma **ferramenta de manutenção**, não um recurso do app. É o que autoriza
tudo o que ela faz diferente: layout de tela grande num app mobile-first, sem
estado offline, fora do backup, fora do bundle.

Ela MUST NOT enxergar os exercícios do **usuário**. O arquivo não os contém, e
eles já têm formulário próprio no app.

#### Scenario: Existe em desenvolvimento
- GIVEN o dev server rodando
- WHEN o usuário abre `/admin`
- THEN a tela abre, listando as categorias e os exercícios oficiais

#### Scenario: Não existe no que é publicado
- GIVEN o build de produção
- WHEN o resultado é inspecionado
- THEN não há rota `/admin` nem a tela dela

#### Scenario: Só o catálogo oficial
- GIVEN o usuário do app tem exercícios próprios
- WHEN a tela de admin é aberta
- THEN nenhum deles aparece

### Requirement: The Admin API Answers Only the Machine It Runs On

A API que a tela usa MUST recusar toda requisição que não venha de
**localhost**, antes de qualquer outra verificação.

Não é precaução genérica: o dev server roda com `host: true`, exposto na rede
para abrir o PWA no celular, e esta API **grava arquivos no repositório** e
**baixa URLs**. Sem a restrição, qualquer aparelho na mesma rede — e qualquer
página aberta nele — alcança as duas coisas.

A API MUST existir apenas enquanto o servidor de desenvolvimento estiver no ar.

#### Scenario: De fora, não
- GIVEN uma requisição à API vinda de outro endereço da rede
- WHEN ela chega
- THEN é recusada, e nada é lido, gravado ou baixado

#### Scenario: Do próprio computador, sim
- GIVEN uma requisição vinda de localhost
- WHEN ela chega
- THEN é atendida normalmente

### Requirement: Saving an Exercise Also Produces Its Image

Cada exercício MUST ter um **Salvar** próprio, e salvar MUST produzir o mesmo
resultado que `npm run exercise-media` produziria: a imagem baixada da URL
informada, convertida para webp, nomeada pelo **slug do exercício** e gravada
onde o app a serve, com o `mediaFile` correspondente no catálogo.

Salvar em dois lugares — o registro aqui, a imagem por um comando ali — é
justamente o passo que se esquece, e o esquecimento é invisível: o exercício
fica sem imagem e nada reclama.

A conversão MUST ser **a mesma** que o gerador usa — mesmo limite de largura,
mesma qualidade, mesma preservação de animação, mesmo slug —, e MUST vir de uma
implementação só. Duas divergiriam na primeira vez que uma fosse ajustada.

Renomear um exercício MUST renomear a imagem e **remover a antiga**: deixada
para trás, ela seria publicada para sempre sem ninguém apontar para ela.

Um download que **falha** MUST NOT perder o resto da gravação. O exercício é
salvo sem `mediaFile` — um estado que o catálogo já admite e que as telas já
exibem — e a falha MUST ser relatada.

#### Scenario: Salvar traz a imagem junto
- GIVEN um exercício com uma URL de imagem informada
- WHEN o usuário aciona Salvar
- THEN a imagem é baixada, convertida e gravada com o nome do exercício
- AND o catálogo passa a apontar para ela

#### Scenario: Renomear leva a imagem junto
- GIVEN um exercício com imagem
- WHEN o usuário muda o nome dele e salva
- THEN a imagem passa a ter o nome novo
- AND o arquivo antigo não fica para trás

#### Scenario: Um download que não vai
- GIVEN uma URL de imagem que não responde
- WHEN o usuário salva
- THEN o exercício é gravado sem imagem
- AND a tela informa que o download falhou

### Requirement: The Tool Cannot Break the Catalog's Invariants

A gravação MUST respeitar o que o catálogo já garante, porque é justamente isso
que a ferramenta existe para cuidar:

- **ids permanentes.** Um exercício novo MUST receber o próximo id livre, e um
  id já usado MUST NOT ser reaproveitado — nem depois de o exercício ser
  excluído. É o número que liga o peso que alguém já registrou ao movimento que
  fez. Apagar o registro apaga o único vestígio de que aquele número foi usado,
  então o catálogo MUST guardar os ids gastos (`retiredCategoryIds` /
  `retiredExerciseIds`) — sem isso, excluir o maior id o devolveria ao próximo
  cadastro;
- **faixa oficial.** Todo id MUST ficar dentro dela (ver *Official Ids Are the
  File's Ids*, em `exercises`);
- **alternativas simétricas** entre oficiais: declarar de um lado MUST deixar os
  dois coerentes, como `setAlternatives` já faz no app;
- **sem endereço remoto** no arquivo: a URL informada serve para baixar, e o que
  fica gravado é o `mediaFile`. A procedência MUST ser registrada ao lado dos
  masters (`data/assets/exercises/sources.json`), no único momento em que ela é
  conhecida — um master sem entrada ali é um que ninguém consegue rastrear.

O arquivo resultante MUST continuar passando por `officialCatalog.test.ts` —
esses testes são a rede que impede a ferramenta de estragar o que ela cuida.

#### Scenario: Um exercício novo não herda um id
- GIVEN um exercício oficial foi excluído no passado
- WHEN o usuário cria um exercício novo
- THEN ele recebe um id que nunca foi usado
- AND o id do excluído continua vago

#### Scenario: A alternativa vale dos dois lados
- GIVEN dois exercícios oficiais sem alternativas
- WHEN o usuário declara um como alternativa do outro e salva
- THEN os dois passam a listar um ao outro

#### Scenario: O arquivo continua válido
- GIVEN qualquer edição feita pela tela
- WHEN os testes do catálogo rodam
- THEN eles passam

### Requirement: Deleting Says What Deleting Means

Excluir uma categoria ou um exercício oficial MUST exigir confirmação, e a
confirmação MUST dizer o que acontece:

- o **id fica vago para sempre** e não volta a ser usado;
- aparelhos que já registraram **peso, histórico, observação ou foto** naquele
  exercício ficam com registros que deixam de resolver. Eles não são apagados —
  o app já sabe exibir esse estado (ver *An Official Exercise That the App No
  Longer Carries*, em `exercises`) —, mas também não voltam a fazer sentido.

Dizer isso é o que separa excluir do catálogo de excluir um rascunho.

#### Scenario: A exclusão avisa antes
- GIVEN um exercício oficial que já está publicado
- WHEN o usuário aciona excluir
- THEN a confirmação informa que o id não será reaproveitado e que registros em
  aparelhos existentes deixarão de resolver
- AND só então a exclusão acontece

#### Scenario: Desistir não muda nada
- GIVEN a confirmação de exclusão exibida
- WHEN o usuário desiste
- THEN nada é removido do catálogo nem do disco

---

## REMOVED

(None)
