# Delta: data-portability

**Change ID:** `add-official-catalog-drop-warmups`
**Affects:** exportação de backup, importação/restauração, reset, dados de
exemplo, remoção dos aquecimentos do documento

---

## ADDED Requirements

### Requirement: Backups Carry the User's Catalog Only

O documento de backup MUST conter **apenas** as categorias e os exercícios do
**usuário**. Nenhuma categoria ou exercício **oficial** MUST aparecer no
arquivo.

Isso não exige filtro: registros oficiais nunca são gravados no banco, e o
backup é uma cópia do banco. A regra existe para ser verificada — um backup que
carregasse o catálogo oficial ficaria maior sem motivo e, restaurado numa versão
mais nova do app, reintroduziria um catálogo velho por cima do que a versão
traz.

As referências **a** exercícios e categorias oficiais, por outro lado, MUST ser
exportadas e restauradas: elas são dados do usuário. Isso inclui os exercícios
de um **dia de treino**, o **peso** e seu **histórico**, a **observação**, a
**foto**, a **entrada de sessão** e a **alternativa** declarada por um exercício
do usuário.

A importação MUST tratar um id **oficial** como referência **resolvível**, e não
como vínculo pendente. Um id que não corresponde a nenhum registro dentro do
documento pode ser a forma normal de uma referência — é exatamente o que o
`GLOBAL_GYM_ID` já faz do lado dos pesos — e descartá-lo apagaria, em toda
restauração, justamente o vínculo com o catálogo oficial.

A recíproca MUST valer com o mesmo rigor, e ela alcança **todo backup já gerado
até hoje**: um **registro** de categoria ou de exercício cujo `id` caia na faixa
reservada aos oficiais MUST ser **descartado** na importação, e MUST NOT ser
gravado no banco.

Não é um caso de borda — é o caso normal de um arquivo antigo. Um backup
exportado antes desta mudança foi feito quando o catálogo ainda era do banco,
então ele carrega os exercícios da faixa oficial e as categorias oficiais dentro
de si. Restaurá-los como estão recriaria exatamente as linhas que a migração
acabou de tirar do banco, e um catálogo velho voltaria a sombrear o do app: duas
coisas diferentes com a mesma identidade, e nenhuma tela sabendo qual das duas é
a certa.

Descartar esses registros é a **mesma troca de fonte** que a migração faz,
aplicada ao arquivo — e funciona pelo mesmo motivo: a identidade não muda. O
catálogo do app responde por aquele id, e o documento continua restaurando tudo
o que aponta para ele.

Descartar o **registro** MUST NOT descartar as **referências** a ele: os dias, os
pesos, o histórico, as notas, as fotos e as entradas de sessão do documento
continuam apontando para os mesmos números, e continuam sendo restaurados.

Um id oficial que a **versão atual do app não conhece** (o arquivo mudou entre
versões) MUST ser restaurado assim mesmo. Nada MUST ser apagado por isso: a
referência apenas não resolve, como a de um exercício excluído.

#### Scenario: O arquivo não contém o catálogo oficial
- GIVEN um app com o catálogo oficial e três exercícios cadastrados pelo usuário
- WHEN o usuário exporta o backup
- THEN o documento contém os três exercícios dele
- AND não contém nenhum exercício ou categoria oficial

#### Scenario: Um dia com exercício oficial sobrevive à restauração
- GIVEN "Dia 1" contém dois exercícios oficiais e um do usuário
- WHEN o usuário exporta o backup e o restaura num aparelho limpo
- THEN "Dia 1" volta com os três, na mesma ordem
- AND os oficiais são os mesmos exercícios do catálogo do app

#### Scenario: Peso e histórico de um oficial voltam
- GIVEN o usuário tem peso global e histórico num exercício oficial
- WHEN ele exporta e restaura o backup
- THEN o peso e todas as entradas de histórico voltam ligados ao mesmo exercício oficial

#### Scenario: A alternativa com um oficial não é descartada
- GIVEN "Supino Caseiro" declara um exercício oficial como alternativa
- WHEN o usuário exporta o backup e o restaura num aparelho limpo
- THEN "Supino Caseiro" volta apontando para o mesmo oficial
- AND o detalhe do oficial volta a listá-lo

#### Scenario: Uma categoria oficial referenciada por um exercício meu
- GIVEN "Rosca Martelo Cabo" está classificado numa categoria oficial
- WHEN o usuário exporta e restaura o backup
- THEN o exercício volta classificado na mesma categoria oficial

#### Scenario: Um backup anterior à mudança restaura sem recriar o catálogo
- GIVEN um backup exportado antes desta mudança, contendo os exercícios e as
  categorias que na época eram do banco, mais dias, pesos, histórico e sessões
- WHEN o usuário o restaura
- THEN nenhum desses exercícios ou categorias é gravado no banco
- AND eles continuam aparecendo, vindos do catálogo oficial, com os mesmos ids
- AND os dias, os pesos, o histórico, as notas, as fotos e as sessões são
  restaurados e continuam apontando para os mesmos exercícios

#### Scenario: Um registro na faixa oficial é descartado
- GIVEN um documento que contém um exercício cujo id está na faixa reservada aos oficiais
- WHEN o usuário o importa
- THEN esse registro não é gravado no banco
- AND a importação não é rejeitada
- AND o exercício oficial daquele id continua sendo o do catálogo do app

#### Scenario: Um id oficial desconhecido não invalida o arquivo
- GIVEN um backup que referencia um exercício oficial que esta versão do app não traz mais
- WHEN o usuário o restaura
- THEN a importação é concluída normalmente
- AND os registros que o referenciam são restaurados, sem apagar nada

#### Scenario: O reset não apaga o catálogo oficial
- GIVEN o usuário confirma "Resetar app"
- WHEN o reset termina
- THEN todos os dados dele foram apagados
- AND as categorias e os exercícios oficiais continuam lá, porque nunca estiveram no banco

### Requirement: Backups No Longer Carry Warmups

O documento de backup MUST NOT conter a lista de **aquecimentos** nem o campo de
vínculo de cada exercício: o conceito deixou de existir (ver a remoção da
capability `warmups`).

Um backup gerado por uma versão **anterior** MUST importar limpo, **ignorando**
o que ele traz de aquecimento — a lista e os vínculos são descartados em
silêncio, e todo o resto é restaurado normalmente. Rejeitar um arquivo por
carregar um campo que o app não usa mais inutilizaria todo backup já gerado, que
é exatamente o que um backup não pode ser.

A **versão do documento** MUST NOT ser incrementada por esta remoção. O critério
do projeto é se uma versão diferente **leria errado** o arquivo, e nenhuma das
duas direções lê: um arquivo novo, sem a chave, é lido por uma versão antiga
como "nenhum aquecimento" (é o tratamento que ela já dá a um backup anterior aos
aquecimentos); um arquivo antigo, com a chave, é ignorado pela versão nova.

O usuário MUST ser avisado, na tela de Backup, de que os aquecimentos deixaram
de existir — um backup antigo restaurado não os traz de volta, e descobrir isso
depois de restaurar seria a pior hora.

#### Scenario: O arquivo novo não tem aquecimentos
- GIVEN um app atualizado
- WHEN o usuário exporta o backup
- THEN o documento não contém lista de aquecimentos
- AND nenhum exercício carrega campo de vínculo com aquecimento

#### Scenario: Um backup antigo importa limpo
- GIVEN um backup gerado antes desta mudança, com aquecimentos e vínculos
- WHEN o usuário o restaura
- THEN a importação é concluída normalmente
- AND os aquecimentos e seus vínculos são descartados
- AND todo o resto — academias, exercícios, dias, pesos, histórico, notas,
  sessões e fotos — é restaurado

#### Scenario: A versão do documento não muda
- GIVEN um backup gerado por esta versão
- WHEN o número de versão do documento é lido
- THEN ele é o mesmo da versão anterior do app

---

---

## MODIFIED Requirements

### Requirement: Generate Example Data

A rotina de exemplo MUST **referenciar o catálogo oficial** em vez de criar um
catálogo próprio. Ela cria apenas o que é genuinamente do usuário: os **dias de
treino**, a **academia** e alguns **pesos**.

CHANGED: ela trazia 8 categorias e 29 exercícios seus. Depois que o app passou a
**vir com** um catálogo, isso criava um segundo "Supino Reto" ao lado do que já
estava na tela — um ponto de partida que começava duplicando o app.

Os dias MUST ser **quatro**. Quatro é a divisão que as pessoas de fato mantêm, e
uma amostra com seis dias ensina uma rotina que quase ninguém cumpre.

A geração MUST ser **aditiva e segura**: nada existente é sobrescrito, e as
referências permanecem íntegras. As categorias de cada dia são **derivadas dos
exercícios do dia**. A **academia** de exemplo MUST ser criada **apenas quando
nenhuma academia existe** — e, com ela, os pesos, que vêm juntos.

Os pesos MUST ser semeados como **pesos globais** dos exercícios, e não como
pesos da academia de exemplo, de modo que uma academia criada depois já os tenha.
Eles MUST cobrir **parte** dos exercícios da rotina, não todos: os espaços em
branco são o que mostra ao usuário que o peso é dele para definir.

A amostra MUST NOT criar exercícios de **Cardio**. A garantia de que a aba Cardio
não abre vazia continua valendo — ela é do **catálogo**, que traz cardio —, e
criar mais só duplicaria o que já está lá.

Um id que o catálogo **não carrega mais** MUST ser descartado, e não escrito como
referência pendente.

#### Scenario: Gerar a amostra
- GIVEN o app tem pouco ou nenhum dado
- WHEN o usuário toca "Gerar exemplo"
- THEN quatro dias de treino são criados, com exercícios do catálogo oficial
- AND uma academia e alguns pesos globais são criados
- AND nenhum exercício e nenhuma categoria são criados no banco

#### Scenario: A amostra não duplica o catálogo
- GIVEN o catálogo oficial já traz "Supino Reto com Barra"
- WHEN o usuário gera a amostra
- THEN nenhum segundo "Supino Reto com Barra" passa a existir

#### Scenario: A aba Cardio segue povoada
- GIVEN a amostra recém-gerada
- WHEN o usuário abre a aba Cardio
- THEN há exercícios de cardio, vindos do catálogo
- AND nenhum deles está num dia de treino nem tem peso

#### Scenario: Additive and safe with existing data
- GIVEN o usuário já tem uma academia
- WHEN ele toca "Gerar exemplo"
- THEN os dias são criados normalmente
- AND nenhuma segunda academia é adicionada
- AND as referências permanecem válidas

#### Scenario: Os pesos são globais
- GIVEN a amostra recém-gerada
- WHEN o usuário cria uma segunda academia
- THEN ela já mostra os mesmos pesos, sem nada ter sido copiado

### Requirement: Import JSON (Replace All)

From Settings, the user MUST be able to import a previously exported backup JSON,
performing a full **restore**. Import **replaces all existing local data** with
the document's contents — after a successful import, the device holds **exactly**
what the backup contained and nothing else. Import MUST validate the document
first and MUST NOT corrupt existing data on failure. The user MUST be warned,
with a destructive-action confirmation, that **all** current data — **including
photos** — will be overwritten.

"Todos os dados locais" são os dados **do usuário**. O catálogo **oficial** não é
substituído nem apagado por uma importação: ele vem com o app, não com o
documento.

Replacing "all existing local data" MUST include the **image files** of the
photos being replaced: clearing the records alone would leave the previous
device's images occupying storage with nothing pointing at them.

The restore MUST reproduce the source faithfully: gyms, categories, exercises,
days, weights, **weight history**, **workout sessions and entries**, notes, and
**photos** are all restored, with their **original identifiers preserved** so that
every cross-reference (a session's entries, a photo's exercise, a weight's gym)
remains valid. Base64 photo bytes MUST be decoded back to their original binary
form, **byte-for-byte**, and written to the app's photo **file** storage, so that
an imported photo is indistinguishable from one attached on this device. On a
device without writable file storage, imported photos MUST fall back to the same
in-record storage used when attaching (see `exercise-photos`).

A restauração MUST deixar as **alternativas em estado íntegro**, porque a relação
é simétrica e uma importação não pode produzir um banco que o app não saberia
manter. A importação MUST NOT, porém, **fechar transitivamente** o que o arquivo
traz: unir A–B e A–C num trio inventaria um tipo de variação que o usuário nunca
declarou. As reparações são apenas:

- um exercício **sem** o campo (backup anterior às alternativas) MUST ser
  restaurado **sem alternativas**;
- uma referência **pendente** — apontando para um exercício que não está no
  backup **e não é oficial** — MUST ser descartada;
- uma referência a um exercício **oficial** MUST ser **preservada**, e MUST NOT
  ser espelhada de volta: o registro oficial não existe no banco e o vínculo
  vive só no lado do usuário (ver a capability `exercises`);
- uma **auto-referência** MUST ser ignorada;
- um vínculo **de um lado só** entre dois exercícios **do usuário** MUST ser
  restaurado nos **dois** sentidos.

Nenhum desses casos MUST rejeitar o arquivo: a importação corrige e segue.

A backup produced by an **older version** that lacks some arrays (e.g. no
`sessions`, `exercisePhotos`, or `weightHistory`) MUST import cleanly, restoring
**zero** rows for the missing tables and everything else normally. Only genuine
backup documents MUST be accepted — any other file (malformed, or not a MyOneGym
backup) MUST be rejected with a clear message **before** any data is touched.

#### Scenario: Full round-trip restore
- GIVEN the user exported a complete backup and then cleared local storage
- WHEN the user imports that backup
- THEN all gyms, categories, exercises, days, weights, weight history, notes, sessions and entries, and photos are restored identically
- AND a restored photo displays correctly (its bytes and mime type are intact)

#### Scenario: Restore replaces existing data, including photos
- GIVEN the device currently has gym "A" with its own exercises and photos
- WHEN the user imports a backup containing only gym "B"
- THEN local data contains only the imported content (gym "B" and its photos)
- AND gym "A", its data, and its photos are gone
- AND gym "A"'s image files are gone from storage as well
- AND o catálogo oficial continua disponível, intacto

#### Scenario: References survive the restore
- GIVEN a backup with a completed session whose entries reference exercises, and photos attached to those exercises
- WHEN the user imports it
- THEN opening the restored session shows its entries
- AND opening the restored exercises shows their photos (ids line up)

#### Scenario: Referência pendente é descartada
- GIVEN um backup em que "Supino Reto" lista como alternativa um exercício que
  não existe no documento e não é oficial
- WHEN o usuário o importa
- THEN "Supino Reto" é restaurado sem essa referência
- AND a importação não é rejeitada

#### Scenario: Referência a um oficial é preservada
- GIVEN um backup em que "Supino Caseiro" lista um exercício **oficial** como
  alternativa
- WHEN o usuário o importa
- THEN "Supino Caseiro" volta com essa referência
- AND nenhum registro oficial é criado no banco

#### Scenario: Vínculo de um lado só é corrigido
- GIVEN um backup em que "Supino Reto" lista "Supino Máquina", mas "Supino
  Máquina" não lista ninguém
- WHEN o usuário o importa
- THEN os dois ficam alternativas entre si

#### Scenario: A backup with single-category exercises imports
- GIVEN a backup produced before exercises had multiple categories (each exercise has a singular `categoryId`)
- WHEN the user imports it
- THEN each exercise is restored with that category as a one-element category list
- AND if the backup contains a reserved "Sem categoria" category, it is dropped and its references become uncategorized

#### Scenario: Older backup without the new tables imports cleanly
- GIVEN a backup JSON produced before sessions/history/photos were exported (those keys absent)
- WHEN the user imports it
- THEN the import succeeds, those tables are empty, and gyms/exercises/days/weights/notes are restored

#### Scenario: Reject a non-backup file
- GIVEN a file that is not a MyOneGym backup (malformed, or some other document)
- WHEN the user imports it
- THEN import is rejected with a clear error before any replacement occurs
- AND existing local data is left unchanged

---

## REMOVED

### Requirement: Backups Carry Warmups and Their Links

**Motivo:** não há mais aquecimento a carregar. O requisito descrevia como
exportar a lista, como restaurar os vínculos e como descartar um vínculo órfão —
três regras sobre uma entidade que deixa de existir.

O que **sobrevive** dele é a lição, já aplicada em *Backups No Longer Carry
Warmups*: um campo que sumiu do app não pode fazer um arquivo antigo ser
rejeitado.
