# Proposal: Catálogo oficial ao lado do catálogo do usuário, e fim dos aquecimentos

**Change ID:** `add-official-catalog-drop-warmups`
**Created:** 2026-09-04
**Status:** Implementation Complete
**Completed:** 2026-09-04

---

## Problem Statement

Hoje o app nasce **vazio**. Quem instala encontra zero categorias e zero
exercícios, e a única ajuda é o "Gerar exemplo" — uma amostra pequena, pensada
para mostrar como o app funciona, não para ser o catálogo de ninguém. Na
prática o usuário digita do zero um conjunto de exercícios que é essencialmente
o mesmo para todo mundo: supino, remada, agachamento, com a mesma mídia, nas
mesmas categorias.

Existe um catálogo curado pronto — `data/myonegym-exercicios-oficial.json`, 12
categorias e 52 exercícios com mídia, tipo (Força/Cardio), alternativas já
declaradas e alguns vídeos de execução. Ele só não tem como chegar ao app: não
há nenhum conceito de "conteúdo que veio com o app" e todo exercício que a tela
consegue mostrar é uma linha do IndexedDB que o próprio usuário criou.

E há um detalhe que muda tudo: esse arquivo **saiu** do banco. É um export
(`kind: "exerciseLibrary"`), então os ids dele são os ids que os aparelhos em uso
já carregam hoje. O catálogo oficial não é um conjunto novo a acomodar ao lado do
que existe — é o que existe, precisando mudar de lugar.

Deixar essas linhas **no banco**, como estão hoje, é o que cria três problemas:

- **o backup incha** com dados que não são do usuário, e um backup restaurado
  numa versão mais nova do app traz de volta um catálogo velho por cima do que a
  versão traz;
- **corrigir o catálogo é impossível**: uma URL de mídia quebrada fica quebrada
  para sempre em cada aparelho, porque a linha é do usuário e nenhuma
  atualização do app pode reescrevê-la sem arriscar sobrescrever uma edição dele;
- **atualizar o catálogo vira migração de dados** — acrescentar dez exercícios
  numa versão nova exigiria um upgrade que sabe o que já semeou e o que o usuário
  mexeu.

**Afetados:** todo usuário novo (a primeira hora de uso é digitação) e todo
usuário existente, que passa a ter um catálogo de referência sem perder nada do
que já cadastrou.

### E um segundo problema, no mesmo território: há duas formas de guardar a mesma coisa

O app tem **aquecimentos** e **vídeos de execução**, e os dois respondem à mesma
pergunta: "que mídia me ajuda a fazer este exercício?".

O aquecimento é o caminho caro. Ele exige um **cadastro à parte** — nome, URL,
uma tela inteira em Configurações — para só depois ser **vinculado** ao
exercício num seletor, e traz atrás de si uma tabela, um índice `*warmupIds`,
uma relação a manter na exclusão, um campo no formulário de exercício, um botão
no detalhe do catálogo, o mesmo botão na entrada de sessão, uma seção no backup
com regra de órfão, e um segundo modo do visualizador de mídia só para ele.

O vídeo é o caminho barato, e chegou depois: mora **dentro** do exercício, é
escrito na mesma edição, aceita rótulo e recorte de tempo, e tem a sua própria
aba no detalhe — inclusive dentro da sessão, que é onde a pessoa está quando
precisa ver como se faz o movimento.

Com os dois no app, a mesma decisão é pedida ao usuário duas vezes, por dois
caminhos de custos muito diferentes, e o time mantém duas implementações de
"mídia de apoio ao exercício".

## Proposed Solution

O app passa a ter **duas fontes** de categorias e exercícios, e uma única
listagem.

### 1. A fonte oficial é código, não dado

O JSON entra no bundle (`src/data/officialCatalog.json`, movido de
`data/myonegym-exercicios-oficial.json`, ao lado do `example-data.json` que já
mora lá) e é lido por um módulo novo, `src/data/officialCatalog.ts`. **Nenhuma
linha oficial é escrita no IndexedDB, nunca.** Isso é o que faz cair, de uma vez,
os três problemas acima: o catálogo oficial é substituído por inteiro a cada
deploy, não tem migração, não entra no backup e não pode ser corrompido por
edição — porque não há o que editar.

Consequência boa e deliberada: **nenhuma tabela nova, nenhum índice novo,
nenhum campo novo**. A versão v13 do Dexie que esta mudança traz serve só para
**apagar** — as linhas de `exercises` e `categories`, que passam a vir do
arquivo, e os aquecimentos, que deixam de existir.

### 2. Os ids oficiais são os que já estão nos aparelhos

O arquivo não é uma lista escrita à mão: é um **export do banco**
(`kind: "exerciseLibrary"`, com `exportedAt`), e a prova está nele — 52
exercícios ocupando a faixa 1–53, **sem o id 10**, que é a assinatura de um
banco real onde um exercício foi excluído. Os ids do arquivo **são** os ids que
os aparelhos em uso já carregam.

Isso muda a natureza do problema. Não é preciso arranjar um espaço para o
catálogo oficial ao lado do que existe: o catálogo oficial **é** o que existe.
O que muda é apenas **de onde ele é lido** — sai do IndexedDB, entra no bundle.

Então:

- **Oficial** ocupa a faixa **baixa**, `id ≤ 9999`, com exatamente os ids do
  arquivo. O exercício `7` continua sendo o `7`.
- **O que o usuário cadastrar daqui em diante** recebe id a partir de **10001**
  (`USER_ID_BASE = 10000`). A faixa reservada dá espaço para o catálogo oficial
  crescer de 53 para milhares sem nunca esbarrar em ninguém.
- **A migração (v13) esvazia `exercises` e `categories`.** Não é perda de dado:
  é a troca da fonte, com a identidade constante. A linha do banco some e o
  catálogo oficial passa a responder pelo mesmo número.

E é por isso que **nada mais precisa ser tocado**. `Day.exerciseIds`,
`Weight.exerciseId`, `WeightHistory.exerciseId`, `ExerciseNote.exerciseId`,
`ExercisePhoto.exerciseId`, `SessionEntry.exerciseId` e
`Exercise.alternativeIds` continuam com os mesmos números, e esses números
continuam significando os mesmos movimentos. O dia 1 continua com os mesmos
exercícios, o peso de 60 kg continua sendo do supino, e o histórico de carga
continua inteiro — só que agora resolvidos contra o arquivo em vez de contra uma
linha do banco.

Nenhuma referência é reescrita, e é justamente aí que mora a segurança da
migração: uma renumeração em massa é uma operação com muitas formas de sair pela
metade; **não renumerar nada** não tem nenhuma.

**A identidade nunca é guardada.** "É oficial?" é `id ≤ 9999`, uma pergunta
sobre o id — não existe campo `official` em lugar nenhum, pelo mesmo motivo que
o tipo de mídia de um vídeo é lido da URL: um segundo lugar dizendo a mesma
coisa é um lugar livre para discordar.

**O contador do `++id` precisa ser empurrado, e não dá para confiar no
IndexedDB para isso.** Limpar uma object store **não** zera o gerador de chaves,
mas também não o levanta: num aparelho atualizado o próximo id seria 54, e numa
instalação nova seria 1 — os dois dentro da faixa oficial. Por isso
`createExercise` e `createCategory` passam a **atribuir o id explicitamente**,
como `max(10000, maior id existente) + 1`, dentro da própria transação de
escrita. É determinístico, é igual em aparelho novo e atualizado, e não depende
de truque de contador.

**O contrato duro continua, e agora vale mais:** os ids do arquivo oficial são
**permanentes**. Uma versão nova do catálogo pode acrescentar, renomear, trocar
mídia ou aposentar um exercício; **não pode renumerar**, porque o número é o que
liga o peso que o usuário já registrou ao movimento que ele fez. O id 10, que o
arquivo não traz, MUST continuar vago para sempre.

**O caso residual, dito com todas as letras:** um exercício que o usuário tenha
criado **além** do catálogo — um id na faixa baixa sem correspondente no arquivo
— é apagado pela migração, e o que apontava para ele (peso, histórico, nota,
foto, entrada de sessão) fica sem resolver. Esses registros **não são
excluídos**: a tela os trata como já trata a entrada de sessão cujo exercício foi
excluído. Apagar dado do usuário por causa de um id que não casou é a única
coisa aqui que não teria volta.

### 3. Uma listagem só, oficial marcado, oficial imutável

`listCategories` e `listExercises` passam a devolver as duas fontes
concatenadas e ordenadas por nome — e como toda tela lê por elas (via os hooks
de `lib/hooks.ts`), a listagem, a busca, os filtros, o seletor de exercícios do
dia, o seletor de alternativas e a aba Cardio ficam unificados sem tocar em cada
tela. Os poucos pontos que leem um registro direto do Dexie
(`db.exercises.get`, `db.categories.get`) passam por um resolvedor que atende
os dois lados.

Um item oficial é exibido com um selo **"Oficial"** e **não oferece editar nem
excluir**. A recusa também é do repositório, não só da tela: `updateExercise`,
`deleteExercise`, `renameCategory`, `deleteCategory` e `setAlternatives`
rejeitam um id oficial com erro de validação. Um botão escondido é
apresentação; a regra tem que valer para quem chamar a função.

### 4. Alternativa do usuário → oficial: assimétrica no disco, simétrica na tela

O pedido inclui: um exercício do usuário pode declarar um oficial como
alternativa. Isso colide com a invariante hoje mantida por `setAlternatives` —
a relação é simétrica **porque os dois lados são escritos**. O lado oficial não
pode ser escrito.

A saída é guardar o vínculo **só no registro do usuário** e devolver a simetria
na **leitura**: `alternativesOf` passa a unir os vínculos declarados pelo
exercício com os exercícios que o apontam. As duas telas que chamam essa função
(a lista de Exercícios e a seção "Alternativas" do detalhe) já recebem o mapa
completo de exercícios, então isso não custa consulta nenhuma e **não exige
índice** — a decisão de não indexar `alternativeIds`, tomada quando a relação
era simétrica no disco, continua de pé por outro motivo: quem pergunta "quem
aponta para mim" já tem a lista inteira na mão.

Entre exercícios do usuário nada muda: `setAlternatives` continua espelhando os
dois lados, e a união na leitura é idempotente para eles.

### 5. O backup carrega o que é do usuário, e só

Como as linhas oficiais deixam de existir no banco, **o export não precisa
filtrar nada**: ele já não as tem. A **importação**, essa sim, aprende duas
coisas — e a primeira vale para **todo backup já gerado até hoje**.

**Um documento antigo carrega o catálogo oficial dentro dele.** Ele foi exportado
quando essas linhas ainda eram do banco, então traz os exercícios 1 a 53 e as
categorias 1 a 12. Restaurá-los como estão recriaria no banco exatamente as
linhas que a migração acabou de tirar de lá, e um catálogo velho voltaria a
sombrear o do app. A regra é: **todo registro de exercício ou categoria na faixa
oficial é descartado na importação**, e o catálogo do app responde por aquele id.

É a mesma troca de fonte da migração, aplicada ao arquivo — e ela funciona pelo
mesmo motivo: a identidade não muda. Os dias, os pesos, o histórico, as notas, as
fotos e as sessões do documento continuam apontando para os mesmos números, e os
números continuam significando os mesmos movimentos.

**Descartar o registro não é descartar a referência.** `normalizeAlternatives`
hoje joga fora todo id de alternativa que não corresponda a um exercício do
próprio documento — regra correta contra vínculo pendente, que sem ajuste
apagaria justamente os vínculos com o catálogo oficial em toda restauração. É a
mesma exceção que o peso global já tem: um id que não aponta para nada dentro do
documento pode ser a **forma normal** de uma referência, não corrupção.

### 6. O aquecimento sai inteiro, e os vídeos ficam com o trabalho

Some do app: a tabela `warmups`, o campo `Exercise.warmupIds` e o índice
`*warmupIds`, a tela **Configurações → Aquecimentos** e o seu formulário, o
seletor no formulário de exercício, o botão no detalhe do catálogo e na entrada
de sessão, a seção do backup, e as funções de repositório que serviam a tudo
isso.

**Os dados existentes são apagados na migração** (Dexie v13), sem conversão e
sem aviso prévio — decisão do dono do produto, tomada nesta proposta. Vale
enunciar a consequência uma vez, com todas as letras: quem tiver aquecimentos
cadastrados os perde ao atualizar, incluindo as URLs que digitou, e **não há
como recuperá-los** depois — um backup gerado pela versão nova já não os carrega.
Quem quiser guardá-los precisa exportar um backup **antes** de atualizar, e
mesmo assim eles só serão legíveis fora do app.

Duas coisas que **não** saem, e é importante que não saiam:

- **A classificação de mídia pela URL** (`lib/embedMedia`) — imagem, vídeo,
  provedor com player, quadro vertical para um Short. É código vivo, usado pelos
  vídeos, pelo visualizador e pela validação de URL. Só que a **especificação**
  dela mora hoje na capability `warmups`, então ela **muda de casa** para
  `exercise-videos`, reescrita sem a palavra "aquecimento". Apagar a capability
  sem mudar esse requisito de lugar deixaria sem spec um comportamento que o app
  continua tendo.
- **O paginador de mídia** (`ui/MediaViewer`) — mesma história, mesmo destino.

E uma que sai junto, por consequência: o **modo sobreposição** do paginador
(diálogo modal, fechar no topo, trava de rolagem, teclado) existia para o botão
de aquecimento. Sem esse cliente, ele é código sem chamador, e fica só o modo
**na página**, que é o que a aba "Vídeos" usa.

## Scope

### In Scope

- Módulo do catálogo oficial (`src/data/officialCatalog.ts`) e o JSON no bundle.
- Faixa reservada: oficial em `id ≤ 9999` (os ids do próprio arquivo), usuário a
  partir de `10001`, com helper (`isOfficialId`) e o contrato de permanência dos
  ids do arquivo.
- Migração **v13** que esvazia `exercises` e `categories` **sem reescrever
  nenhuma referência**.
- Atribuição explícita de id em `createExercise`/`createCategory`, igual em
  aparelho novo e atualizado.
- Listagens unificadas: categorias, exercícios, aba Cardio, seletores de dia e
  de alternativas, busca e filtros.
- Leitura de um registro por id atendendo as duas fontes.
- Oficial é somente leitura: selo na UI, ausência de editar/excluir, e recusa no
  repositório.
- Nome de categoria único **entre as duas fontes**.
- Alternativa usuário→oficial, com simetria restaurada na leitura.
- Peso, histórico, observação, foto e sessão de exercício oficial funcionando
  como hoje.
- Backup: oficiais fora do arquivo, referências a eles preservadas na
  restauração, e tolerância a um id oficial que a versão atual não conhece.
- Assistente (IA): enxerga o catálogo oficial, mas nenhuma proposta sua o altera.
- **Remoção completa dos aquecimentos**: tabela, campo, índice, telas, botões,
  seletor, funções de repositório, seção do backup e testes.
- Migração Dexie v13 que **apaga** os aquecimentos e o campo de vínculo.
- Mudança de casa dos dois requisitos que sobrevivem à remoção (classificação de
  mídia pela URL e paginador), de `warmups` para `exercise-videos`.
- Remoção do modo **sobreposição** do paginador, que fica sem chamador.
- Aviso na tela de Backup de que aquecimentos de um arquivo antigo não voltam.

### Out of Scope

- **Ocultar ou desativar** itens oficiais. Toda a lista aparece para todo mundo;
  busca e filtros são a saída para uma lista longa. (Decidido nesta proposta.)
- **"Duplicar como meu"** — criar uma cópia editável de um oficial. Quem quiser
  algo diferente cadastra o seu. (Decidido nesta proposta.)
- **Deduplicar** o que o usuário já cadastrou com nome igual a um oficial. Os
  dois convivem, distinguidos pelo selo; nenhum dado existente é tocado.
  (Decidido nesta proposta.)
- Alterar as categorias ou os vídeos de um exercício oficial — seria escrever no
  registro oficial.
- **Preservar** um exercício criado além do catálogo, remapeando-o para a faixa
  10001+ junto com suas referências. É a alternativa se algum aparelho tiver
  divergido do arquivo; hoje a premissa é que não divergiu.
- **Converter** aquecimentos em vídeos na migração. Foi considerado (o formato
  encaixa: nome → título, URL → URL) e **recusado** pelo dono do produto: os
  dados são apagados.
- Uma tela de "o que aconteceu com os meus aquecimentos" além do aviso no
  Backup.
- Reescrever o "Gerar exemplo" para reaproveitar exercícios oficiais. A amostra
  continua criando os próprios registros.
- Uma tela de "atualizações do catálogo" ou changelog do arquivo oficial.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | **Sim (v13)** | Só para **apagar**: esvazia `exercises` e `categories` (passam a vir do arquivo) e some a tabela `warmups`, o campo `Exercise.warmupIds` e o índice `*warmupIds`. **Nenhuma referência é reescrita.** |
| Bundle | Sim | `src/data/officialCatalog.json` (~19 KB) entra no build, como o `example-data.json`. |
| Repos | Sim | `createExercise`/`createCategory` atribuem id explícito (≥ 10001); `listCategories`, `listExercises`, `listCardioExercises` concatenam; resolvedor por id; recusa de escrita em oficial em `updateExercise`, `deleteExercise`, `renameCategory`, `deleteCategory`, `setAlternatives`; `hasAnyData` **continua contando só o banco**. |
| State/hooks | Não | `useExercises`/`useCategories` seguem iguais — a fonte muda dentro do repo. |
| UI | Sim | Selo "Oficial"; sem editar/excluir em oficial; detalhe de exercício e formulários lendo pelo resolvedor. |
| Portabilidade | Sim | Referências a ids oficiais sobrevivem à importação; oficiais nunca no arquivo. |
| Assistente (IA) | Sim | Snapshot inclui os oficiais marcados; o reparo descarta qualquer alteração proposta neles. |
| Sessões / Pesos / Dias / Notas / Fotos | **Não** | Guardam os mesmos números de antes, e os números continuam significando os mesmos movimentos. Nada é migrado. |
| Rotas / Configurações | Sim | Somem `/settings/warmups*` e a linha "Aquecimentos" do menu. |
| Componentes | Sim | Somem `features/warmup/`, `WarmupsPage`, `lib/warmups.ts` e o modo **sobreposição** de `ui/MediaViewer`. |
| Specs | Sim | A capability `warmups` é **excluída**; dois requisitos dela mudam de casa para `exercise-videos`. |

## Architecture Considerations

**Precedente direto: o `GLOBAL_GYM_ID`.** O projeto já reserva uma faixa de id
para dar a uma linha um significado que o esquema sozinho não expressa, e já
convive com a consequência — uma referência que não resolve dentro do documento
não é, por si, um erro. Esta mudança usa o mesmo mecanismo numa faixa maior, e
pelo mesmo motivo: manter as chaves compostas e as consultas existentes
funcionando sem exceção alguma.

**A migração mais segura é a que não reescreve nada.** Havia duas formas de
resolver a colisão entre os ids do usuário e os do arquivo: **renumerar** os
registros existentes para a faixa alta, reescrevendo as seis tabelas que os
referenciam, ou **deixar os números onde estão** e trocar quem responde por eles.
A segunda venceu porque o arquivo já traz os ids certos — e porque uma
renumeração em massa tem muitas formas de sair pela metade, enquanto não
renumerar não tem nenhuma. A migração toca duas tabelas e não escreve uma única
referência.

**Nada derivável é guardado.** "É oficial?" é uma pergunta sobre o id, como "que
mídia é essa URL?" é uma pergunta sobre a URL. Um campo `official` no registro
seria uma segunda fonte de verdade sobre a mesma coisa — e, pior, um campo que
teria de ser mantido em linhas que sequer existem.

**A ordenação passa a ser feita em memória.** `listExercises` usa hoje
`orderBy('name')`, que é a ordem de chave do IndexedDB — sensível a acento e a
caixa. Concatenar duas fontes obriga a ordenar em JS de qualquer jeito, então
as duas listagens passam a usar `localeCompare('pt-BR')`, que é o que
`listCardioExercises` já fazia. Efeito colateral desejável: "Agachamento" e
"Abdução" finalmente ficam na ordem que o usuário espera.

**Apagar uma capability não pode apagar a spec do que sobrevive.** Dois
requisitos que hoje moram em `warmups` descrevem código compartilhado que
continua vivo: a classificação de mídia pela URL e o paginador. Eles **mudam de
casa** para `exercise-videos`, reescritos neutros. É a diferença entre remover
um conceito e remover a documentação de um componente — a segunda seria uma
perda silenciosa, do tipo que só se descobre quando alguém pergunta "por que uma
URL sem extensão vira imagem?" e não há resposta escrita em lugar nenhum.

**Um id pode ficar sem dono, e isso não pode custar dado.** Duas situações
produzem o mesmo estado: um exercício que o usuário criou além do catálogo (id na
faixa baixa sem correspondente no arquivo) e um oficial que uma versão futura
aposente. O peso, o histórico, a observação e a foto dele
**não são apagados** — a referência simplesmente não resolve, e a tela trata
como já trata a entrada de sessão cujo exercício foi excluído. Apagar dado do
usuário porque o app mudou de catálogo é o pior desfecho possível, e o mais
irreversível.

## Success Criteria

- [ ] Um aparelho recém-instalado mostra 12 categorias e 52 exercícios, sem ter
      nada no banco — e o convite de dados de exemplo continua aparecendo.
- [ ] Um item oficial não pode ser renomeado, editado nem excluído por nenhum
      caminho (tela ou repositório).
- [ ] Uma listagem só: busca, filtros, aba Cardio, seletor de dia e seletor de
      alternativas mostram as duas fontes juntas.
- [ ] Um exercício do usuário declara um oficial como alternativa, e o detalhe
      do oficial mostra o do usuário de volta.
- [ ] Peso, histórico, observação, foto e sessão funcionam num exercício oficial
      como funcionam num do usuário.
- [ ] O backup exportado não contém nenhuma categoria ou exercício oficial, e a
      restauração preserva dias, pesos, sessões e alternativas que apontam para
      eles.
- [ ] Um aparelho em uso, atualizado: as tabelas `exercises` e `categories`
      ficam vazias, e mesmo assim os dias, os pesos, o histórico, as notas, as
      fotos e as sessões continuam mostrando os mesmos exercícios de antes.
- [ ] Nenhuma referência foi reescrita pela migração.
- [ ] Um exercício criado depois da atualização recebe id ≥ 10001, tanto num
      aparelho atualizado quanto numa instalação nova.
- [ ] Um backup gerado **antes** desta mudança restaura sem recriar o catálogo
      oficial no banco, e com dias, pesos e histórico intactos.
- [ ] Nenhuma tela, rota, função ou tipo do app menciona aquecimento; a busca por
      `warmup` no `src/` não retorna nada.
- [ ] O banco atualizado não tem a tabela `warmups` nem o campo `warmupIds`.
- [ ] A aba "Vídeos" continua funcionando igual — percorrer, dar a volta, tocar
      embutido, estado de falha — com o paginador em modo único.
- [ ] Um backup gerado antes da mudança, com aquecimentos, importa limpo.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Uma futura edição do arquivo renumera os ids e os pesos do usuário passam a apontar para outro movimento | Média | **Alto** | Contrato explícito na spec e um teste que trava os ids conhecidos hoje (o id 10 incluído, que MUST continuar vago): acrescentar é livre, renumerar quebra o teste. |
| O banco de um usuário divergiu do arquivo, e um id passa a significar outro movimento | Baixa | **Alto** | A premissa é que os aparelhos descendem deste mesmo catálogo. Teste de migração com um dump real; se algum aparelho tiver divergido, a alternativa é preservar os extras remapeando-os para 10001+ (ver Out of Scope). |
| Um exercício criado além do catálogo é apagado e deixa peso/histórico sem dono | Média | Médio | Os registros **não** são excluídos e a tela os trata como exercício ausente — o estado que a entrada de sessão já sabe exibir. |
| O contador do `++id` entrega um id na faixa oficial | Média | **Alto** | O id é atribuído explicitamente no repositório, dentro da transação — não se depende do gerador de chaves do IndexedDB, que `clear()` não zera e instalação nova começa em 1. |
| Um `db.exercises.get` esquecido faz um exercício oficial "não existir" numa tela | Média | Médio | Todo acesso por id passa pelo resolvedor; teste que abre o detalhe, o formulário e a sessão de um oficial. |
| A listagem fica longa demais (52 + os do usuário) | Alta | Baixo | Busca e filtros já existem e cobrem o caso; ocultar ficou explicitamente fora de escopo. |
| Nomes repetidos (o "Supino Reto" do usuário e o oficial) confundem | Alta | Baixo | O selo "Oficial" distingue os dois na lista e no detalhe. |
| A importação de um backup antigo perde o vínculo com um oficial | Média | Médio | `normalizeAlternatives` passa a aceitar id oficial como referência resolvível; cenário de round-trip na spec de portabilidade. |
| `hasAnyData` passa a contar os oficiais e o convite de exemplo nunca aparece | Média | Médio | A função continua olhando **só** o banco; cenário explícito na spec. |
| O usuário perde aquecimentos que ainda usava, sem volta | Alta | **Alto** | Decisão consciente do dono do produto (conversão foi oferecida e recusada). Aviso na tela de Backup, e a aba "Vídeos" como caminho de substituição. |
| Remover o modo sobreposição quebra a aba "Vídeos" | Média | Médio | A aba já usa o modo `inline`; os testes de integração de vídeos rodam antes e depois da remoção. |
| A spec da classificação de mídia se perde junto com a capability | Média | Médio | Os dois requisitos migram para `exercise-videos` **nesta** mudança, não depois. |
| Duas mudanças grandes num só PR dificultam a revisão | Alta | Baixo | Fases separadas em `tasks.md` — 1 a 4 catálogo, 5 aquecimentos —, com suíte verde no fim de cada uma. |

---

## Archive Information

**Archived:** 2026-09-05
**Duration:** 2 dias (criada em 2026-09-04)
**Outcome:** Implementada, com escopo ampliado durante a execução

### Specs Updated

| Capability | O que mudou |
|---|---|
| `exercises` | +8 requisitos (duas fontes, faixa de ids, troca de fonte na atualização, imagens servidas pelo app, somente-leitura, tela de visualização, marca de nota), 4 modificados, botão de aquecimento removido |
| `data-portability` | Backup só do catálogo do usuário; amostra referencia o catálogo; importação descarta registros da faixa oficial; aquecimentos fora do documento |
| `exercise-videos` | Herdou a classificação de mídia pela URL e o paginador da capability removida; estado vazio enxuto; modal a partir de uma lista |
| `weights` | Histórico alcança as outras academias; editar virou popup no topo |
| `workout-sessions` | Cronômetro segura a tela; sem controle de aquecimento |
| `app-foundation` | Arte de abertura escolhível; catálogo oficial não conta como dado cadastrado |
| `categories` | Categorias oficiais somente leitura; unicidade entre as duas fontes |
| `consistency` | Aba e tela renomeadas para "Histórico" |
| `ai-assistant` | Assistente enxerga o catálogo oficial e nunca o altera |
| `warmups` | **Capability excluída** — requisitos sobreviventes migrados para `exercise-videos` |

### Files Modified

Principais: `src/data/officialCatalog.{ts,json,test.ts}`, `src/data/exampleRoutine.ts`,
`src/db/{db,repos,types}.ts`, `src/data/{portability,catalogProposal,proposalRepair,catalogPayload}.ts`,
`src/state/{settings,splashes}.ts`, `src/lib/{wakeLock,alternatives,exerciseFilters,hooks}.ts`,
`src/ui/{Sheet,Tabs,MediaViewer}.tsx`, `src/features/**`, `scripts/gen-exercise-media.mjs`,
`scripts/gen-splash.mjs`, `index.html`, `vite.config.ts`.

Removidos: `src/features/settings/WarmupsPage.tsx`, `src/features/warmup/`,
`src/lib/warmups.ts`, `src/data/example-data.json`.

### Verification

- `npm run typecheck` limpo
- `npm test` — 85 arquivos, 1092 testes
- `npm run build` sem erro; precache 2,1 MB
