# data-portability Specification

## Purpose
TBD - created by archiving change bootstrap-myonegym. Update Purpose after archive.
## Requirements

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

### Requirement: Export Full Backup JSON

From Settings, the user MUST be able to export **the entire database** as a single
versioned JSON file, so that the export can serve as a true **backup** against the
loss of the PWA's local storage. The export MUST include **all** persistent user
data:

- gyms, categories, exercises (com suas **categorias** e suas **alternativas**),
  training days;
- o **peso global** de cada exercício e as **exceções por academia**, mais o
  **histórico de alterações** de cada um desses escopos;
- the per-gym exercise **notes**;
- every **workout session** and its **entries** (with their done states and the
  exercise each one ended up recording, swap included);
- every per-gym exercise **photo**, with its image bytes.

Because a JSON document cannot carry binary directly, photo image bytes MUST be
**base64-encoded** into the document. The file is therefore self-contained and
restorable with no special tool, at the cost of size — a backup with many photos
may be several megabytes, which is acceptable for a safety-net backup.

Photo bytes now live in a **file** rather than in the photo record (see the
`exercise-photos` spec), so the export MUST **read each photo's image** before
encoding it. Where the image lives MUST NOT change the document: the exported
JSON MUST have the **same shape as before** — each photo carrying its bytes
base64-encoded and its mime type — so that a backup taken by this version imports
into an older one, and a backup taken by an older version imports into this one.
The backup's schema version MUST NOT be bumped for this change.

A photo whose image file cannot be read MUST NOT abort the export: the rest of
the backup is far more valuable than one unreadable image, and the user MUST be
told how many photos could not be included.

Device-local **UI preferences** — the font-size setting, the **accent colour**
and the first-launch "already asked" flag — are NOT user data and MUST remain
outside the backup. They describe how this device paints the app, not what the
user recorded in it; carrying them in the file would make a restore repaint a
device that was already set up the way its owner wanted.

#### Scenario: Export the whole database
- GIVEN the user has gyms, exercises, days, weights, weight history, notes, workout sessions, and photos
- WHEN the user taps "Exportar backup"
- THEN a single versioned JSON document is produced containing all of them

#### Scenario: Weight history IS exported
- GIVEN "Rosca Direta" in gym "A" has 5 weight-history entries and a current weight of 25 KG
- WHEN the user exports the backup
- THEN the JSON contains the current weight AND all 5 history entries

#### Scenario: Sessions ARE exported
- GIVEN gym "A" has a completed workout session with entries and their done states
- WHEN the user exports the backup
- THEN the JSON contains the session and its entries, done states preserved

#### Scenario: Photos ARE exported, as base64
- GIVEN an exercise in gym "A" has a photo attached
- WHEN the user exports the backup
- THEN the JSON contains the photo record with its image bytes base64-encoded and its mime type

#### Scenario: Alternativas SÃO exportadas
- GIVEN "Supino Reto" e "Supino Máquina" são alternativas entre si
- WHEN o usuário exporta o backup
- THEN o JSON registra a relação nos dois exercícios

#### Scenario: A troca feita na sessão É exportada
- GIVEN uma sessão concluída em que a linha começou como "Supino Reto" e o
  usuário registrou que fez "Supino Máquina" no lugar
- WHEN o usuário exporta o backup
- THEN o JSON contém a entrada registrando "Supino Máquina"

#### Scenario: The Backup screen states the backup is complete
- GIVEN the user opens Configurações → Backup
- WHEN they read the export section
- THEN it states the backup includes everything (weights, notes, sessions, history, and photos)
- AND it no longer claims photos are excluded

#### Scenario: The document does not reveal where the image was stored
- GIVEN one photo whose image is a file and another whose bytes are in its record
- WHEN the user exports the backup
- THEN both appear identically in the JSON, each with base64 bytes and a mime type
- AND the document's schema version is unchanged from the previous release

#### Scenario: An unreadable photo does not abort the export
- GIVEN a photo whose image file is missing
- WHEN the user exports the backup
- THEN the backup is produced with all the other data and photos
- AND the user is told that one photo could not be included

#### Scenario: Export includes both scopes
- GIVEN o app tem pesos globais e exceções
- WHEN o usuário exporta o backup
- THEN o arquivo contém as linhas de peso e de histórico dos dois escopos
- AND a versão do documento indica que ele já usa o modelo global

#### Scenario: The accent colour is not exported
- GIVEN o usuário escolheu uma cor de destaque diferente do padrão
- WHEN exporta o backup completo
- THEN o documento não contém a cor escolhida

#### Scenario: Restoring does not repaint the device
- GIVEN o dispositivo A está em "Verde" e o dispositivo B em "Roxo"
- WHEN um backup de A é restaurado em B
- THEN B continua em "Roxo"
- AND todos os dados do usuário foram substituídos normalmente

### Requirement: Backups Carry the Exercise Kind

O documento de backup MUST carregar o **tipo** de cada exercício e o **tipo** de
cada sessão, junto do resto do registro.

A importação MUST aceitar um documento **anterior** a esta mudança, em que o
campo não existe, assumindo **Força** para todo exercício e toda sessão — que é
exatamente o que eles eram. Rejeitar por campo ausente inutilizaria todo backup
gerado antes desta versão.

#### Scenario: Round-trip preserva os tipos
- GIVEN o app tem exercícios de Força e de Cardio e sessões dos dois tipos
- WHEN o usuário exporta o backup e o restaura num dispositivo limpo
- THEN cada exercício e cada sessão voltam com o mesmo tipo

#### Scenario: Backup antigo importa como Força
- GIVEN um backup gerado antes desta mudança, sem o campo de tipo
- WHEN o usuário o restaura
- THEN todos os exercícios e sessões ficam como Força
- AND nada é rejeitado nem perdido

#### Scenario: A aba Cardio reflete o que foi restaurado
- GIVEN um backup com dois exercícios de Cardio é restaurado
- WHEN o usuário abre a aba Cardio
- THEN os dois aparecem na lista


### Requirement: Backups Carry Global Weights

O documento de backup MUST carregar as linhas de peso e de histórico
**globais** junto das linhas por academia, na mesma lista — elas se distinguem
apenas pelo id de academia reservado. A validação de importação MUST aceitar um
peso (ou registro de histórico) cujo id de academia **não corresponde a
nenhuma academia do documento**: essa é exatamente a forma de uma linha global,
e rejeitá-la inutilizaria todo backup gerado a partir desta versão.

#### Scenario: Round-trip preserves scopes
- GIVEN o app tem 10 pesos globais e 3 exceções em duas academias
- WHEN o usuário exporta o backup e o restaura em um dispositivo limpo
- THEN os 10 pesos continuam globais e as 3 exceções continuam ligadas às mesmas academias
- AND os históricos global e de cada exceção são restaurados separados, como estavam

#### Scenario: A global row is not treated as a dangling reference
- GIVEN um backup contendo pesos globais
- WHEN o documento é validado na importação
- THEN nenhuma linha global é rejeitada por não apontar para uma academia existente

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

### Requirement: Restoring a Pre-Global Backup Promotes Weights

A restauração de um backup **anterior** a esta mudança MUST aplicar, ao final,
a mesma promoção da migração do banco — trata-se de um arquivo em que todo peso
é de uma academia e nenhuma linha global existe. Para cada exercício, o peso e o
histórico da academia mais antiga que o tenha viram **globais**, e os demais
permanecem como exceções.

Assim um arquivo antigo não reintroduz o modelo só-por-academia num app já
migrado.

#### Scenario: Old backup restores into the new model
- GIVEN um backup gerado antes desta mudança, com pesos em duas academias
- WHEN o usuário o restaura
- THEN cada exercício fica com um peso global (o da academia mais antiga que o tinha)
- AND os pesos da outra academia permanecem como exceções
- AND nenhum registro é perdido

#### Scenario: A current backup is restored as-is
- GIVEN um backup gerado por esta versão, que já contém linhas globais
- WHEN o usuário o restaura
- THEN nenhuma promoção adicional acontece — os escopos são restaurados exatamente como no arquivo

### Requirement: Reset App (Erase All Data)

From Settings, the user MUST be able to **reset the app**, erasing **all
registered data** from the device: gyms, categories, exercises, training
days, weights, weight history, **exercise notes**, workout sessions/entries, and
the photos **together with their image files** — the same full set already
cleared as the first step of "Importar backup". The action MUST
require an explicit confirmation, and the confirmation MUST clearly state
that the action **cannot be undone** before anything is erased. On confirm,
all local data is erased immediately; declining or dismissing the
confirmation MUST leave all existing data unchanged. After a reset, the app
MUST behave like a fresh install — including re-arming the first-launch
sample-data prompt (see app-foundation) so the user may choose to reload the
sample data again. Device-local **presentation** preferences (the font-size
setting and the accent colour) are unaffected by a reset.

#### Scenario: Reset requires confirmation and warns it is irreversible
- GIVEN the user has gyms, exercises, days, and weights registered
- WHEN the user taps "Resetar app" in Settings → Backup
- THEN a confirmation is shown stating that all data will be erased and the action cannot be undone

#### Scenario: Confirming erases all registered data
- GIVEN the user has gyms, exercises, days, weights, notes, sessions and photos
- WHEN the user confirms the reset
- THEN all of it is erased, including the photos' image files
- AND the app behaves like a fresh install


#### Scenario: Declining keeps data intact
- GIVEN the reset confirmation is shown
- WHEN the user cancels/dismisses it
- THEN no data is erased and the app is unchanged

#### Scenario: Reset re-arms the first-launch prompt
- GIVEN the user has already been asked about the sample data on this device (see app-foundation)
- WHEN the user resets the app
- THEN the first-launch sample-data prompt is shown again the next time the app loads

#### Scenario: Reset does not affect presentation preferences
- GIVEN the user has set a custom font size
- WHEN the user resets the app
- THEN the font-size preference is unchanged after the reset

### Requirement: Backups Carry Exercise Videos

O documento de backup MUST carregar os **vídeos** de cada exercício — URL,
rótulo e recorte —, para que uma restauração devolva o catálogo inteiro, e não
exercícios que perderam suas referências de execução.

Como os vídeos vivem **dentro** do exercício e não numa lista própria (ver
*Videos Belong to the Exercise, Not to a Record of Their Own*), não há vínculo a
validar nem órfão possível: o vídeo chega e parte junto do seu exercício. É uma
consequência direta de não haver entidade forte.

A importação MUST aceitar um documento **anterior** a esta mudança, sem o campo
de vídeos, tratando-o como **vazio**. Um backup antigo é exatamente um app sem
vídeos, e rejeitá-lo por campo ausente inutilizaria todo arquivo gerado até aqui
— o mesmo tratamento que o tipo do exercício já recebeu.

A **ordem** dos vídeos MUST sobreviver à ida e volta: ela é a ordem de
apresentação, não um detalhe de armazenamento.

#### Scenario: Round-trip preserva os vídeos
- GIVEN um exercício com três vídeos, um deles com rótulo e recorte
- WHEN o usuário exporta o backup e o restaura num dispositivo limpo
- THEN os três voltam no mesmo exercício, na mesma ordem
- AND o rótulo e o recorte daquele vídeo continuam lá

#### Scenario: Backup antigo importa sem vídeos
- GIVEN um backup gerado antes desta mudança
- WHEN o usuário o restaura
- THEN todo exercício fica com a lista de vídeos vazia
- AND nada é rejeitado nem perdido

#### Scenario: Vídeo não sobrevive ao seu exercício
- GIVEN um documento em que um exercício com vídeos é restaurado e depois excluído
- WHEN o usuário inspeciona o banco
- THEN nenhum vídeo daquele exercício permanece

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
vínculo de cada exercício: o conceito deixou de existir (a capability foi
removida — ver *Deprecated*, em `exercises`).

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

## Deprecated

### Backups Carry Warmups and Their Links (Removido: 2026-09-05)

Não há mais aquecimento a carregar. O requisito descrevia como
exportar a lista, como restaurar os vínculos e como descartar um vínculo órfão —
três regras sobre uma entidade que deixa de existir.

O que **sobrevive** dele é a lição, já aplicada em *Backups No Longer Carry
Warmups*: um campo que sumiu do app não pode fazer um arquivo antigo ser
rejeitado.
