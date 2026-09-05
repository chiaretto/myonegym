# Delta: exercises

**Change ID:** `add-official-catalog-drop-warmups`
**Affects:** listagem de exercícios, detalhe, formulário, alternativas, aba
Cardio, seletores de dia, remoção do botão de aquecimento

---

## ADDED Requirements

### Requirement: Two Sources, One Listing

O catálogo de exercícios MUST ser composto por **duas fontes**: o catálogo
**oficial**, que vem com o app, e o catálogo **do usuário**, que ele cadastra e
edita. Toda listagem de exercícios MUST apresentar as duas **concatenadas**, na
mesma lista e ordenadas por nome — a lista de Exercícios, a busca, os filtros, a
aba Cardio, o seletor de exercícios de um dia de treino e o seletor de
alternativas.

O catálogo oficial MUST viver **apenas no app**, como um arquivo JSON no bundle.
Nenhum registro oficial MUST ser gravado no banco de dados — nem na primeira
execução, nem em migração alguma. É isso que permite corrigir uma mídia
quebrada ou acrescentar exercícios apenas publicando uma versão nova, sem
migração e sem risco de sobrescrever o que é do usuário.

Um exercício oficial MUST ser distinguível de um do usuário por um selo
**"Oficial"** onde os dois aparecem **lado a lado**: na listagem de exercícios,
na de categorias e em todo seletor — o de exercícios de um dia de treino, o de
alternativas e o da troca dentro da sessão.

O selo no **seletor** não é decoração. Quem já usava o app tem exercícios com o
mesmo nome dos oficiais, e é montando um dia novo que se escolhe entre os dois —
pegar o oficial por engano no lugar do seu não perde nada, mas começa sem o peso
e sem o histórico que o outro tem.

O **detalhe do exercício** (`/exercise/:id`) MUST NOT exibir o selo nem explicar
de onde o exercício veio. Ali não há nenhum par para desempatar: a tela mostra um
movimento só, e quem chegou nela quer ver a execução e registrar o próprio peso.
A origem é resposta para uma pergunta que só a lista faz, e o selo lá já a
responde. Nenhuma tela MUST gastar um parágrafo explicando por que um exercício
oficial não é editável: os controles ausentes dizem isso, em toda visita, sem
cobrar uma linha de leitura.

Um exercício do usuário com o **mesmo nome** de um oficial MUST continuar
existindo separado dele. Nomes de exercício nunca foram únicos, os dois são
registros diferentes, e apagar o do usuário levaria junto o peso, o histórico, a
observação e as fotos dele.

#### Scenario: Um app recém-instalado já tem catálogo
- GIVEN um aparelho onde o app nunca foi usado
- WHEN o usuário abre a lista de exercícios
- THEN os exercícios do catálogo oficial aparecem
- AND o banco de dados não contém nenhum exercício

#### Scenario: As duas fontes numa lista só
- GIVEN o usuário cadastrou "Rosca Martelo Cabo"
- WHEN ele abre a lista de exercícios
- THEN "Rosca Martelo Cabo" aparece junto dos exercícios oficiais, em ordem de nome
- AND os oficiais exibem o selo "Oficial" e o dele não

#### Scenario: A busca e os filtros valem para as duas fontes
- GIVEN existem oficiais e exercícios do usuário com "rosca" no nome
- WHEN o usuário busca "rosca" ou filtra por uma categoria
- THEN o resultado inclui os das duas fontes que casam

#### Scenario: O detalhe não anuncia a origem
- GIVEN um exercício oficial aberto em `/exercise/:id`
- WHEN o usuário olha a tela
- THEN não há selo "Oficial" nem texto explicando que ele vem do catálogo do app
- AND o peso, as observações e as fotos funcionam normalmente

#### Scenario: O seletor do dia distingue as duas fontes
- GIVEN o usuário tem um "Supino Reto" seu e existe um oficial de nome parecido
- WHEN ele adiciona exercícios a um dia de treino
- THEN os dois aparecem no seletor, e só o oficial tem o selo

#### Scenario: Nome repetido convive
- GIVEN existe o oficial "Supino Reto com Barra" e o usuário já cadastrou um
  "Supino Reto com Barra" seu
- WHEN ele abre a lista
- THEN os dois aparecem, distinguidos pelo selo
- AND o peso e o histórico do exercício dele continuam intactos

#### Scenario: A aba Cardio também é unificada
- GIVEN o catálogo oficial traz exercícios de Cardio
- WHEN o usuário abre a aba Cardio
- THEN eles aparecem junto dos cardios que ele cadastrou

### Requirement: Official Ids Are the File's Ids, User Ids Live Above 10000

A origem de um exercício MUST ser lida do seu **id**, numa faixa reservada:

- **oficial** — `id ≤ 9999`, e o id MUST ser exatamente o do arquivo (o
  exercício `7` do arquivo é o `7` no app);
- **do usuário** — `id ≥ 10001`, atribuído no cadastro.

A origem MUST NOT ser guardada em campo algum. É uma propriedade do id, como o
tipo de mídia de um vídeo é uma propriedade da URL — um segundo lugar dizendo a
mesma coisa poderia discordar dela.

A faixa é a **baixa** porque os ids do arquivo já são os ids que os aparelhos em
uso carregam: o arquivo é um export do próprio banco. Preservá-los é o que faz a
migração custar nada (ver *Updating Swaps the Source, Not the Identity*), e
`10000` dá ao catálogo oficial espaço para crescer de 53 para milhares sem nunca
esbarrar num registro do usuário.

O id de um exercício ou categoria criado pelo usuário MUST ser atribuído
**explicitamente** pelo repositório, como `max(10000, maior id existente) + 1`,
dentro da mesma transação da escrita. MUST NOT depender do gerador de chaves do
IndexedDB: esvaziar uma object store **não** zera o contador, e numa instalação
nova ele começa em 1 — os dois entregariam um id dentro da faixa oficial. A
atribuição explícita MUST valer igual em aparelho novo e atualizado, e duas
criações concorrentes MUST NOT receber o mesmo id.

Toda referência a exercício MUST aceitar um id oficial sem tratamento especial:
os exercícios de um dia, o peso e seu histórico, a observação e a foto por
academia, a entrada de sessão e a lista de alternativas.

Os ids do arquivo oficial MUST ser **permanentes**. Uma versão nova do catálogo
MAY acrescentar, renomear, trocar a mídia ou aposentar um exercício; MUST NOT
renumerar os existentes — o número é o que liga o peso que o usuário registrou
ao movimento que ele fez. Um id que o arquivo não traz (hoje, o **10**) MUST
continuar vago: reaproveitá-lo daria a um movimento novo o histórico de um
movimento antigo.

#### Scenario: Um oficial recebe peso como qualquer outro
- GIVEN o usuário abre um exercício oficial na academia "A"
- WHEN ele define o peso alvo em 60 KG
- THEN o peso é gravado para aquele exercício
- AND o histórico registra a alteração como registra a de qualquer exercício

#### Scenario: Um oficial entra num dia de treino e numa sessão
- GIVEN o usuário adiciona um exercício oficial ao "Dia 1"
- WHEN ele inicia o treino desse dia
- THEN a sessão tem uma entrada para esse exercício, com o nome dele

#### Scenario: Observação e foto de um oficial
- GIVEN o usuário está na academia "A" com um exercício oficial aberto
- WHEN ele escreve uma observação e anexa uma foto
- THEN as duas são gravadas para aquele par (academia, exercício)
- AND aparecem quando ele volta ao mesmo exercício na mesma academia

#### Scenario: Um exercício novo nasce acima da faixa oficial
- GIVEN um aparelho recém-atualizado, cujas tabelas de exercícios e categorias
  foram esvaziadas
- WHEN o usuário cadastra um exercício
- THEN ele recebe um id maior que 10000

#### Scenario: Instalação nova também nasce acima da faixa
- GIVEN um aparelho onde o app nunca foi usado
- WHEN o usuário cadastra o primeiro exercício dele
- THEN ele recebe um id maior que 10000, e não 1

#### Scenario: Renumerar o arquivo é proibido
- GIVEN uma versão nova do catálogo oficial
- WHEN ela é publicada
- THEN todo exercício que continua existindo mantém o id que já tinha
- AND acrescentar exercícios novos usa ids ainda não usados
- AND o id 10, ausente do arquivo, continua sem ser usado

### Requirement: Updating Swaps the Source, Not the Identity

A atualização para esta versão MUST **esvaziar** as tabelas de exercícios e de
categorias do banco, e MUST NOT reescrever **nenhuma** referência a elas.

Isso não é perda de dado, e a razão é a premissa desta mudança: o arquivo oficial
é um **export do próprio banco**, então os ids que ele traz são os ids que os
aparelhos em uso já carregam. A linha sai do IndexedDB e o catálogo do app passa
a responder pelo mesmo número — a fonte muda, a identidade não.

Portanto, depois de atualizar:

- os **dias de treino** MUST continuar com os mesmos exercícios, na mesma ordem;
- o **peso** de cada exercício, global e por academia, e todo o seu **histórico**
  MUST continuar valendo para o mesmo movimento;
- as **observações**, as **fotos** e as **entradas de sessão** MUST continuar
  ligadas ao mesmo movimento;
- as **academias** e as **sessões** MUST ficar intactas.

Não renumerar é uma decisão de segurança, não de economia: reescrever seis
tabelas de referências é uma operação com muitas formas de sair pela metade, e
não reescrever nenhuma não tem nenhuma.

Um id na faixa oficial **sem correspondente** no arquivo — um exercício que o
usuário tenha criado além do catálogo — deixa de resolver. Os registros que
apontam para ele (peso, histórico, nota, foto, entrada de sessão) MUST NOT ser
excluídos: a tela MUST tratá-los como já trata a entrada de sessão cujo exercício
foi excluído. Apagar dado do usuário por causa de um id que não casou é o único
desfecho aqui que não teria volta.

#### Scenario: Atualizar troca a fonte e preserva o treino
- GIVEN um aparelho em uso, com dias de treino, pesos, histórico, notas, fotos e
  sessões concluídas
- WHEN o app é atualizado para esta versão
- THEN as tabelas de exercícios e categorias ficam vazias
- AND os dias continuam com os mesmos exercícios, na mesma ordem
- AND os pesos, os históricos, as notas, as fotos e as sessões continuam
  mostrando os mesmos exercícios de antes, agora vindos do catálogo oficial

#### Scenario: A migração não reescreve referência alguma
- GIVEN um aparelho em uso, antes da atualização
- WHEN a migração roda
- THEN nenhum registro de dia, peso, histórico, nota, foto ou entrada de sessão
  é alterado

#### Scenario: Um exercício criado além do catálogo não leva o histórico junto
- GIVEN o usuário tinha um exercício próprio, com um id que o arquivo oficial
  não traz, com peso e histórico
- WHEN o app é atualizado
- THEN o exercício deixa de aparecer na lista
- AND os registros de peso e histórico dele continuam no banco
- AND nenhuma tela quebra ao encontrá-los

### Requirement: The Official Catalog's Pictures Are Served by the App

A imagem de um exercício **oficial** MUST ser servida pelo **próprio app**, sob a
URL dele, e MUST NOT ser buscada no site de onde veio.

Elas nasceram como links para uma dúzia de sites de fitness. Cada um deles é uma
forma de o catálogo quebrar sem ninguém tocar no projeto — uma página que muda de
lugar, um host que passa a recusar hotlink, um domínio que expira — e nenhum
funciona na academia sem sinal, que é justamente onde o app é usado.

O arquivo MUST ser nomeado pelo **exercício** (`supino-reto-com-barra.webp`), e
não por um número nem pelo nome remoto: assim ele se lê na pasta, na aba de rede
e num relato de erro. O nome MUST ser seguro para URL — sem acento e sem
pontuação —, porque é numa URL que ele viaja.

O catálogo MUST NOT carregar endereço remoto algum. Ele viaja para **todo
aparelho instalado**, e uma dúzia de URLs de terceiros dentro dele não serve a
nenhum: as imagens foram baixadas **uma vez** e o que a partir daí importa é o
arquivo. A **procedência** — de onde cada figura veio — MUST ser preservada
junto dos masters, fora do que é publicado, porque ela interessa a quem mantém o
projeto e a mais ninguém.

Um exercício **sem** imagem MUST simplesmente não ter uma. É um estado válido do
catálogo, que as telas já sabem exibir; o que MUST NOT acontecer é o catálogo
nomear um arquivo que não existe.

A URL local MUST ser resolvida contra a **base do app**, que difere entre o
servidor de desenvolvimento e o site publicado.

As imagens MUST ficar **fora do precache** e ser guardadas em cache **no uso**.
São 51 e pesam alguns megabytes, quase tudo demonstração animada; ninguém usa 51
exercícios, então pré-carregar cobraria de toda instalação um catálogo que ela
nunca vai abrir. Uma passada pela própria rotina deixa offline os exercícios que
a pessoa de fato faz — que é o offline que importa.

Uma imagem em `public/` que o catálogo **não nomeia mais** MUST ser removida: um
exercício renomeado deixaria o arquivo antigo sendo publicado para sempre, sem
ninguém apontar para ele.

Isto vale para o catálogo **oficial**. A imagem de um exercício do **usuário**
continua sendo a URL que ele informou — é dele, e o app não baixa nem hospeda o
que o usuário aponta.

#### Scenario: A imagem vem do app
- GIVEN um exercício oficial com imagem
- WHEN a tela o exibe
- THEN a imagem é buscada na URL do próprio app
- AND nenhuma requisição vai para o site original

#### Scenario: O arquivo se chama como o exercício
- GIVEN o exercício oficial "Supino Reto com Barra"
- WHEN se olha o arquivo servido
- THEN ele se chama `supino-reto-com-barra.webp`

#### Scenario: O catálogo não leva endereço de terceiro
- GIVEN o catálogo publicado no app
- WHEN se inspeciona qualquer exercício
- THEN não há URL de site algum nele

#### Scenario: A procedência não se perde
- GIVEN uma imagem que veio de um site
- WHEN se procura de onde ela veio
- THEN o endereço está registrado junto do master, fora do que é publicado

#### Scenario: Um exercício sem imagem
- GIVEN um exercício oficial para o qual não há master
- WHEN a tela o exibe
- THEN ele aparece sem imagem, e nenhum arquivo inexistente é requisitado

#### Scenario: A instalação não paga pelo catálogo inteiro
- GIVEN o app recém-instalado
- WHEN o service worker termina de pré-carregar
- THEN as imagens dos exercícios não estão entre os arquivos pré-carregados

#### Scenario: O que a pessoa usa fica offline
- GIVEN o usuário abriu um exercício com imagem uma vez
- WHEN volta a ele sem rede
- THEN a imagem aparece

### Requirement: An Official Exercise Is Read-Only

Um exercício oficial MUST NOT poder ser editado nem excluído. A lista e o
detalhe MUST NOT oferecer as ações de editar e excluir para ele, e o
**repositório** MUST recusar a operação com erro de validação — um botão
escondido é apresentação, e a regra tem que valer para quem chamar a função.

Isso inclui as partes do exercício: nome, mídia, tipo, categorias e vídeos são
o que o arquivo diz, e nada na tela os altera. O que a lista oferece no lugar de
editar é **ver** (ver *A Read-Only View for an Exercise With No Form*).

O que é **do usuário** continua editável no exercício oficial: peso, histórico,
observação, foto e a presença dele nos dias de treino. Esses dados não são o
exercício; são o que o usuário registrou sobre ele.

#### Scenario: A lista não oferece editar nem excluir um oficial
- GIVEN a lista de exercícios com oficiais e exercícios do usuário
- WHEN o usuário olha as ações de cada linha
- THEN as linhas oficiais não têm editar nem excluir
- AND as dele têm as duas

#### Scenario: O repositório recusa alterar um oficial
- GIVEN um exercício oficial
- WHEN uma atualização ou exclusão é solicitada para ele
- THEN a operação é rejeitada com uma mensagem de validação
- AND nada é alterado

#### Scenario: O que é do usuário continua editável
- GIVEN um exercício oficial com peso e observação na academia "A"
- WHEN o usuário altera o peso e edita a observação
- THEN as duas alterações são gravadas normalmente

### Requirement: A Read-Only View for an Exercise With No Form

A lista de exercícios em Configurações MUST oferecer, para um exercício
**oficial**, um caminho para **visualizá-lo** — uma tela somente leitura
(`/settings/exercises/:id/view`) que mostra o que o formulário mostraria: mídia,
tipo, categorias, alternativas e vídeos.

Ela existe porque o oficial não tem formulário: não há registro para editar, e
sem essa tela a lista não oferecia **nenhuma** forma de ver com que categorias
ele veio, quais alternativas o arquivo declarou ou que vídeos ele carrega. O
detalhe de acompanhamento (`/exercise/:id`) é outra coisa, para outro momento —
é onde se registra peso, observação e foto.

A tela MUST NOT oferecer nenhum campo editável, nenhum "Salvar" e nenhum
"Excluir". Ela MUST NOT explicar de onde o exercício veio nem por que não é
editável: a ausência dos controles já diz, e um parágrafo repetindo isso em toda
visita cobra do leitor uma linha que ele só precisaria da primeira vez.

A rota MUST aceitar **qualquer** exercício, oficial ou não. Um exercício do
usuário chega ao formulário pela lista, que já mostra tudo isso e mais — mas uma
rota que recusasse metade dos ids seria uma armadilha para um link
compartilhado.

A tela é para **olhar**, e só. Ela MUST NOT oferecer atalho para o detalhe de
acompanhamento: o usuário veio de Configurações, e devolvê-lo à tela de treino a
partir daqui trocaria o contexto em que ele estava.

A lista de **vídeos** MUST mostrar, por vídeo, o **nome** (o rótulo, ou o
provedor quando não houver) e a **URL**, e MUST oferecer **copiar o endereço**.
Esta tela não edita nada, então o endereço é a única coisa que um leitor pode
querer levar para outro lugar. A cópia MUST relatar o que aconteceu — inclusive
a falha: a área de transferência não existe em todo contexto, e um botão que não
faz nada visível é pior do que um que diz que não conseguiu.

Tocar um vídeo da lista MUST abri-lo **em sobreposição**, no item tocado e com a
lista inteira atrás dele (ver *Media Pager*, em `exercise-videos`). Fechar MUST
devolver esta tela como estava: assistir a um vídeo não é sair dela.

#### Scenario: Ver um oficial a partir da lista
- GIVEN a lista de exercícios em Configurações
- WHEN o usuário aciona "Ver" numa linha oficial
- THEN abre uma tela com a mídia, o tipo, as categorias, as alternativas e os
  vídeos daquele exercício
- AND não há campo, "Salvar" nem "Excluir"
- AND não há atalho para o detalhe de acompanhamento

#### Scenario: O vídeo abre sobre a tela, no que foi tocado
- GIVEN um exercício com dois vídeos na tela de visualização
- WHEN o usuário toca o segundo
- THEN ele abre em sobreposição, mostrando "2 de 2"
- AND fechar devolve a tela de visualização como estava

#### Scenario: Copiar o endereço de um vídeo
- GIVEN a lista de vídeos na tela de visualização
- WHEN o usuário aciona copiar numa linha
- THEN a URL daquele vídeo vai para a área de transferência
- AND a tela confirma que copiou

#### Scenario: A cópia que não dá certo diz isso
- GIVEN um contexto em que a área de transferência recusa a escrita
- WHEN o usuário aciona copiar
- THEN a tela informa que não conseguiu copiar
- AND nada além disso muda

#### Scenario: Nada de aviso sobre a origem
- GIVEN a tela de visualização de um exercício oficial
- WHEN o usuário a lê
- THEN não há texto explicando de onde o exercício veio nem por que não é editável
- AND a ausência de campos, de "Salvar" e de "Excluir" é o que diz isso

#### Scenario: Um id que ninguém carrega
- GIVEN a rota de visualização com um id que não existe em nenhuma das fontes
- WHEN a tela abre
- THEN ela informa que o exercício não foi encontrado

### Requirement: An Official Exercise That the App No Longer Carries

Uma versão nova do app MAY aposentar um exercício oficial que o usuário usa.
Nesse caso os dados **dele** — peso, histórico, observação, foto, entradas de
sessão e a presença em dias de treino — MUST NOT ser apagados. A referência
simplesmente deixa de resolver, e a tela MUST tratá-la como já trata a entrada
de sessão cujo exercício foi excluído.

Apagar dado do usuário porque o app trocou de catálogo é o pior desfecho
possível, e o único irreversível.

#### Scenario: Um oficial aposentado não leva o histórico junto
- GIVEN o usuário tem peso e histórico num exercício oficial
- WHEN uma versão do app deixa de trazer esse exercício
- THEN os registros de peso e histórico dele continuam no banco
- AND nenhuma tela quebra ao encontrá-los

#### Scenario: Uma sessão antiga continua legível
- GIVEN uma sessão concluída com uma entrada de um exercício oficial aposentado
- WHEN o usuário abre essa sessão no histórico
- THEN a entrada aparece com o nome que foi guardado nela

---

## MODIFIED Requirements

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
  para ele;
- **Válida entre as duas fontes** — um exercício do usuário MUST poder declarar
  um **oficial** como alternativa, e um oficial MAY trazer alternativas entre
  oficiais já declaradas no arquivo.

A simetria vale para o usuário **como comportamento observável**, mas o vínculo
usuário→oficial MUST ser gravado **somente no registro do usuário**: o oficial
não existe no banco e não pode receber o vínculo de volta. A simetria MUST,
então, ser restabelecida na **leitura** — as alternativas de um exercício são as
que ele declara **mais** os exercícios que o declaram. Para dois exercícios do
usuário isso não muda nada, porque os dois lados já estão gravados.

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

#### Scenario: Declarar um oficial como alternativa de um exercício meu
- GIVEN o usuário cadastrou "Supino Caseiro" e existe o oficial "Supino Reto com Barra"
- WHEN ele declara o oficial como alternativa do seu exercício
- THEN "Supino Caseiro" lista o oficial
- AND o detalhe do oficial lista "Supino Caseiro" de volta
- AND nada foi gravado no registro oficial

#### Scenario: Desfazer o vínculo com um oficial
- GIVEN "Supino Caseiro" tem o oficial "Supino Reto com Barra" como alternativa
- WHEN o usuário remove o oficial das alternativas dele
- THEN nenhum dos dois lista o outro

#### Scenario: Excluir o exercício do usuário desfaz o vínculo
- GIVEN "Supino Caseiro" aponta para um oficial
- WHEN o usuário exclui "Supino Caseiro"
- THEN o detalhe do oficial não lista mais nada dele

#### Scenario: As alternativas entre oficiais vêm do arquivo
- GIVEN o arquivo oficial declara dois exercícios como alternativas um do outro
- WHEN o usuário abre qualquer um dos dois
- THEN o outro aparece na seção de alternativas
- AND nenhuma das duas pode ser removida pelo usuário

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

### Requirement: Edit and Delete Exercises

The user MUST be able to edit an exercise (name, media URL, categories,
**alternatives**) and delete it — **desde que seja um exercício dele**. Um
exercício **oficial** MUST NOT ser editável nem excluível (ver *An Official
Exercise Is Read-Only*).

Deleting an exercise removes it from days, removes its weight records, removes
its **per-gym notes**, e **remove o vínculo de alternativa nos exercícios que o
apontavam**, de modo que nenhum vínculo pendente sobreviva à exclusão. Um
vínculo com um **oficial** não exige remoção alguma: ele só existia no registro
que está sendo excluído.

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

#### Scenario: Um oficial não é excluível
- GIVEN um exercício oficial que o usuário não quer ver
- WHEN ele procura a ação de excluir
- THEN ela não é oferecida, e uma exclusão solicitada ao repositório é recusada

### Requirement: Register an Exercise

O usuário MUST poder cadastrar um exercício com **nome**, **mídia** opcional
(imagem ou GIF), **categorias** (zero ou mais), **tipo** (**Força** ou
**Cardio**, ver *Exercise Kind*) e **vídeos de execução** (zero ou mais, ver a
capability `exercise-videos`). O nome MUST ser obrigatório; o tipo MUST vir
preenchido como **Força**.

O formulário MUST NOT oferecer seletor de **aquecimentos**: o conceito deixou de
existir (ver *REMOVED*).

#### Scenario: Criar com tipo
- GIVEN o formulário de exercício aberto
- WHEN o usuário informa nome, escolhe o tipo e salva
- THEN o exercício é persistido com o tipo escolhido

#### Scenario: Nome continua obrigatório
- GIVEN o formulário de exercício aberto
- WHEN o usuário salva sem nome
- THEN o cadastro é bloqueado com uma mensagem de validação

#### Scenario: Não há campo de aquecimento
- GIVEN o formulário de exercício aberto
- WHEN o usuário percorre os campos
- THEN não há seletor nem seção de aquecimentos

### Requirement: Filter and Search the Exercises List

The exercises list (Settings → Exercícios) MUST provide a **name search field**
and **filters by category, by training day and by kind**, combinable, that
narrow the displayed exercises without changing any underlying data.

- The **search field** MUST match exercises whose name contains the typed text
  (case-insensitive and accent-insensitive).
- The **category filter** MUST support "all categories" (no filtering), a
  specific category (matching exercises that **include** that category among
  their categories), and "no category" (matching exercises with **no**
  categories).
- The **day filter** MUST support "all days" (no filtering), a specific
  training day (matching exercises registered in that day), and "no day"
  (matching exercises registered in no training day).
- The **kind filter** MUST support "Todos" (no filtering), **Força** and
  **Cardio**. There is no "sem tipo": every exercise has one, and a record
  without the field is **Força** — the same default the form and the v10 upgrade
  use, so the filter cannot disagree with them about a partial row.
- All active filters MUST combine with AND logic.
- When the combination of filters matches **no exercise**, the list MUST show a
  distinct "no matches" message (different from the message shown when there
  are no exercises at all) with a way to clear the filters — which MUST reset
  the kind along with the rest.
- The filtered list MUST update live as filters change and as the underlying
  exercises/categories/days change.

O filtro por tipo MUST ser apresentado como um **controle segmentado** com as
três opções visíveis, e não como um terceiro seletor. São três opções, cabem no
mesmo controle que o formulário já usa para a mesma palavra, e um toque é menos
do que tocar-rolar-tocar. Ele MUST ficar **acima** dos seletores de categoria e
dia: é o corte mais grosso da lista, e a lista agora é longa (o catálogo oficial
sozinho já traz dezenas).

#### Scenario: Narrow to Cardio
- GIVEN a lista com exercícios de Força e de Cardio, das duas fontes
- WHEN o usuário escolhe "Cardio" no filtro de tipo
- THEN só exercícios de Cardio são exibidos, oficiais e do usuário
- AND nenhum de Força aparece

#### Scenario: Narrow to Força
- GIVEN a mesma lista
- WHEN o usuário escolhe "Força"
- THEN nenhum exercício de Cardio aparece

#### Scenario: The kind combines with the search
- GIVEN nenhum exercício de Cardio se chama "rosca"
- WHEN o usuário escolhe "Cardio" e busca "rosca"
- THEN a lista mostra a mensagem de "nenhum exercício encontrado"

#### Scenario: Clearing the filters resets the kind too
- GIVEN o filtro de tipo em "Cardio" e uma busca digitada
- WHEN o usuário toca "Limpar filtros"
- THEN o tipo volta para "Todos"
- AND os exercícios de Força voltam à lista

### Requirement: The Notas Tab Says Whether There Is a Note

A aba **"Notas"** MUST indicar, **antes do toque**, que existe uma anotação para
aquele `(academia, exercício)` — um `(*)` ao lado do rótulo. Sem anotação, a aba
MUST ficar exatamente como está hoje.

É a mesma pergunta que a contagem responde para "Vídeos" e "Foto" — vale a pena
abrir? —, mas a nota **não é contável**: existe no máximo uma por par, então um
"(1)" seria um número que nunca varia e diz menos do que uma marca. Por isso a
aba carrega uma **marca**, não uma contagem.

A marca MUST seguir a regra das contagens no que importa: enquanto a leitura não
respondeu, a aba MUST NOT afirmar nada — nem que há nota, nem que não há. Uma
nota **em branco** MUST NOT ser marcada: espaços não são uma anotação, e a aba
tem de dizer o que o usuário veria dentro dela.

A marca MUST valer nas **duas** telas que têm a aba: o detalhe do catálogo e o
detalhe da entrada de sessão. Na sessão ela MUST refletir o exercício
**exibido** — enquanto uma alternativa está sendo vista, é a nota daquele
movimento que interessa, como já vale para a contagem de vídeos.

#### Scenario: A nota aparece na aba
- GIVEN um exercício sem anotação na academia ativa
- WHEN o usuário escreve e salva uma anotação
- THEN a aba "Notas" passa a exibir `(*)`

#### Scenario: Apagar a anotação tira a marca
- GIVEN um exercício com anotação
- WHEN o usuário apaga o texto e salva
- THEN a aba "Notas" volta a não exibir marca alguma

#### Scenario: A marca é daquele exercício, naquela academia
- GIVEN "Supino" tem anotação na academia "A" e "Rosca" não tem
- WHEN o usuário abre "Rosca"
- THEN a aba "Notas" não exibe marca

#### Scenario: Nada é afirmado antes da resposta
- GIVEN a tela do exercício acabou de montar
- WHEN o primeiro quadro é pintado
- THEN a aba "Notas" não exibe marca até a leitura responder

---

## REMOVED

### Requirement: Warmup Button on the Exercise Detail

**Motivo:** o conceito de aquecimento sai do app inteiro. Os **vídeos de
execução** já cobrem o que o botão entregava — mídia de apoio ao exercício,
alcançada de dentro do detalhe dele — e cobrem melhor, porque vivem numa aba
própria, aceitam recorte de tempo e não exigem um cadastro à parte para depois
serem vinculados.

O botão, o visualizador que ele abria e a aba de onde ele saía deixam de existir.
O que fica no lugar é a aba **"Vídeos"**, que já está lá.
