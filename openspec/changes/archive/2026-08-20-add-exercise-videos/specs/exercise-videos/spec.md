# Delta: exercise-videos

**Change ID:** `add-exercise-videos`
**Affects:** capability nova — os vídeos de execução de um exercício

---

## ADDED Requirements

### Requirement: Videos Belong to the Exercise, Not to a Record of Their Own

Um exercício MUST poder carregar **vários vídeos** de execução, guardados **no
próprio exercício** — sem tabela, sem identificador e sem cadastro em
Configurações. Cada vídeo MUST ter uma **URL** e MAY ter um **rótulo** curto, um
**segundo inicial** e um **segundo final**.

A ordem da lista **É** a ordem de apresentação, como já vale para os exercícios
de um dia e para os aquecimentos de um exercício.

Um vídeo MUST NOT ser compartilhado entre exercícios. É a diferença que separa
esta lista dos **aquecimentos**: "Rotação de ombro" serve a dez exercícios e por
isso é um registro reutilizável; "Supino — pegada fechada, 2:10 a 2:45" serve a
um e não tem vida fora dele. Dar-lhe registro próprio criaria um CRUD que
ninguém pediria e uma integridade referencial a manter na exclusão.

Excluir o exercício MUST levar seus vídeos junto, sem deixar órfão — consequência
direta de estarem dentro dele.

Um vídeo MUST NOT pertencer a uma academia: como as alternativas e os
aquecimentos, ele é propriedade do exercício, não do lugar.

Um exercício **anterior** a esta mudança MUST ser lido como tendo **nenhum**
vídeo, e não como um registro inválido.

#### Scenario: Vários vídeos num exercício
- GIVEN o exercício "Supino Reto"
- WHEN o usuário cadastra três vídeos nele
- THEN os três são persistidos no exercício, na ordem em que foram informados

#### Scenario: A ordem é a da lista
- GIVEN um exercício com três vídeos
- WHEN o usuário reordena o segundo para primeiro
- THEN a apresentação passa a começar por ele

#### Scenario: Excluir o exercício leva os vídeos
- GIVEN um exercício com dois vídeos
- WHEN o exercício é excluído
- THEN nenhum vídeo daquele exercício permanece no banco

#### Scenario: Exercício antigo não tem vídeo
- GIVEN um exercício gravado antes desta mudança
- WHEN ele é lido
- THEN sua lista de vídeos é vazia
- AND nada é rejeitado

---

### Requirement: A Video Is Registered Inside the Exercise Form

O cadastro de vídeos MUST acontecer dentro do **formulário de criação/edição do
exercício**, junto de onde já se escolhem alternativas e aquecimentos. Ele MUST
permitir **adicionar**, **editar**, **remover** e **reordenar**, e MUST NOT
existir como tela própria em Configurações — não há o que administrar fora do
exercício.

A **URL** MUST ser obrigatória e MUST ser um endereço http(s). O **rótulo** MUST
ser opcional: um exercício com um vídeo só não precisa nomeá-lo, e exigir nome
seria cobrar por uma identificação que a lista de um item já dá — ao contrário do
aquecimento, que é procurado num seletor entre todos os outros e por isso precisa
de nome.

Quando **início e fim** forem ambos informados, o fim MUST ser maior que o
início, e o cadastro MUST ser bloqueado com mensagem quando não for. Cada um
MUST poder ser informado sozinho: só início significa "a partir daqui", só fim
significa "até aqui".

#### Scenario: Cadastrar um vídeo
- GIVEN o formulário de edição de "Supino Reto"
- WHEN o usuário informa uma URL do YouTube e salva
- THEN o vídeo passa a constar no exercício

#### Scenario: URL é obrigatória
- GIVEN a seção de vídeos do formulário
- WHEN o usuário tenta adicionar um vídeo sem URL
- THEN a adição é bloqueada com uma mensagem

#### Scenario: Rótulo é opcional
- GIVEN o usuário informou apenas a URL
- WHEN salva
- THEN o vídeo é aceito sem rótulo

#### Scenario: Fim antes do início é recusado
- GIVEN o usuário informou início 120 e fim 60
- WHEN tenta salvar
- THEN o cadastro é bloqueado com uma mensagem de validação

#### Scenario: Só o início
- GIVEN o usuário informou início 90 e deixou o fim vazio
- WHEN salva
- THEN o vídeo é aceito e será exibido a partir de 1:30 até o fim

#### Scenario: Não há cadastro de vídeo em Configurações
- GIVEN o usuário abre Configurações
- WHEN percorre as opções
- THEN não há tela de vídeos — eles vivem dentro do exercício

---

### Requirement: The Time Range Is Applied Where the Provider Supports It

O **recorte** de tempo MUST ser aplicado ao player quando o provedor o aceita —
hoje, o **YouTube**, cujo embed responde a início e fim.

O **Instagram** MUST NOT receber recorte: seu embed não expõe parâmetro algum de
tempo, e não há como pedir um trecho. Como a tela não pode cumprir, ela MUST NOT
pedir: numa URL do Instagram o formulário MUST **ocultar** os campos de início e
fim, e MUST dizer por quê. Um campo cujo valor o player vai ignorar mente para
quem o preenche.

O app MUST usar **uma única** função para decidir onde o recorte vale, consultada
tanto pelo formulário quanto pelo player, para que os dois nunca discordem —
o mesmo princípio que já faz a validação e a exibição de mídia lerem a mesma
classificação de URL.

Um vídeo que **já tinha** recorte gravado e cuja URL é trocada por uma que não o
suporta MUST **manter** os números gravados, apenas não aplicá-los. Apagá-los
seria destruir o que o usuário digitou por causa de uma edição de endereço, e a
troca de volta devolve o comportamento.

#### Scenario: Recorte no YouTube
- GIVEN um vídeo do YouTube com início 130 e fim 165
- WHEN ele é exibido
- THEN o player começa em 2:10 e para em 2:45

#### Scenario: O Instagram não oferece os campos
- GIVEN o usuário informou uma URL de reel do Instagram
- WHEN observa o formulário
- THEN os campos de início e fim não são exibidos
- AND uma linha explica que o Instagram não permite recortar o trecho

#### Scenario: Trocar a URL não apaga o recorte
- GIVEN um vídeo do YouTube com início e fim gravados
- WHEN o usuário troca a URL por uma do Instagram e salva
- THEN os números continuam gravados
- AND não são aplicados enquanto a URL for do Instagram

---

### Requirement: YouTube and Instagram Play Inside the App

O app MUST exibir **embutidos**, sem tirar o usuário dele, os vídeos de
**YouTube** (`watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`) e de **Instagram**
(`/reel/`, `/p/`, `/tv/`). Qualquer outro endereço MUST continuar tratado como a
capability `warmups` já trata o que não reconhece.

A classificação MUST continuar **derivada da URL**, nunca gravada junto dela: a
URL é o fato, a classificação é uma leitura dela, e uma coluna `kind` seria uma
segunda fonte de verdade livre para divergir. O **recorte**, ao contrário, MUST
ser gravado — ele é dado do usuário, não está na URL e não pode ser derivado
dela.

Um **reel** do Instagram MUST ser exibido em **retrato**, como um Short do
YouTube já é: é vertical por definição do formato, e apresentá-lo em paisagem o
espremeria numa tira.

Um vídeo de exercício MUST **começar a tocar sozinho** ao ser exibido, e MUST
começar **mudo**. A regra que os aquecimentos seguem — não tocar nem baixar antes
de ser pedido — não tem o que proteger aqui: a aba **é** o carrossel, então
abri-la já é o pedido. O mudo não é preferência e sim o preço: navegador algum
concede autoplay com áudio, e pedi-lo audível deixaria o vídeo simplesmente
parado.

O **aquecimento** MUST continuar sem tocar sozinho: ele é alcançado por um botão,
e quem tocou o botão pediu para *ver*, não necessariamente para gastar dados
naquele instante.

#### Scenario: YouTube embutido
- GIVEN um vídeo com a URL de um `watch?v=`
- WHEN o usuário o abre
- THEN ele toca dentro do app

#### Scenario: Reel do Instagram embutido e vertical
- GIVEN um vídeo com a URL de um reel
- WHEN o usuário o abre
- THEN ele toca dentro do app, em retrato

#### Scenario: Endereço não reconhecido
- GIVEN um vídeo cuja URL não é de nenhum provedor conhecido
- WHEN o usuário o abre
- THEN o estado de falha é exibido, com a opção de abrir o endereço fora do app

#### Scenario: O vídeo começa sozinho, mudo
- GIVEN um exercício com vídeos
- WHEN o usuário abre a aba "Vídeos"
- THEN o primeiro vídeo começa a tocar sem outra ação
- AND começa mudo

#### Scenario: O aquecimento não começa sozinho
- GIVEN um exercício com um aquecimento em vídeo
- WHEN o usuário abre o visualizador de aquecimentos
- THEN a reprodução só começa quando ele pedir

---

### Requirement: The Videos Tab on Both Exercise Details

O detalhe do exercício MUST apresentar uma aba **"Vídeos"**, tanto no **catálogo**
(`/exercise/:id`) quanto **dentro de uma sessão**. Os vídeos são do exercício —
não da academia —, e as duas telas são a mesma vista em dois contextos (ver
*Exercise Note and Photos on the Catalog Detail*, em `exercises`). É durante o
treino que se confere a execução, e obrigar a sair da sessão para isso derrotaria
o propósito, pelo mesmo argumento que já trouxe o aquecimento para dentro dela.

A aba **É** o carrossel: abri-la MUST já exibir o **primeiro vídeo**, sem
listagem intermediária. Abrir a aba já é o ato de pedir os vídeos, e uma lista
poria um segundo toque entre a pergunta e a resposta. O que a lista diria — qual
vídeo é este — o próprio paginador já diz, com o **nome** (rótulo, ou provedor
quando não houver) e o **trecho**, ao lado da posição "N de M".

O vídeo exibido MUST começar a tocar **sozinho** e MUST **repetir** ao chegar ao
fim. Havendo recorte, a repetição MUST voltar ao **início do trecho**, e MUST NOT
voltar ao início do vídeo: quem marcou 2:10 a 2:45 pediu aquele trecho, e uma
segunda passagem que começa no segundo zero devolve exatamente o que o recorte
existia para evitar. Um vídeo de execução é visto muitas vezes seguidas para ler
o movimento; tanto o primeiro toque quanto o reinício de cada passagem são atrito
que não paga nada.

Sem vídeo algum, a aba MUST exibir um **estado vazio** que explica o que ela
guarda e leva à edição do exercício. Enquanto o exercício não foi lido, ela MUST
NOT afirmar que está vazia (ver *Estados Vazios Só Depois da Resposta*).

Enquanto uma **alternativa** está sendo vista dentro de uma sessão, a aba MUST
refletir o exercício **exibido**, como as demais abas e o controle de aquecimento
já fazem.

Dentro de uma sessão, ver um vídeo MUST NOT marcar nada como feito nem avançar o
stepper: assistir não é executar. Como a aba não abre nada por cima da tela, não
há o que fechar — a faixa de abas MUST continuar alcançável acima do carrossel,
que é o que o mantém uma aba e não uma tomada de tela.

A aba MUST exibir, ao lado do seu rótulo, **quantos vídeos** há — assim o usuário
sabe se vale o toque antes de gastá-lo. A aba **Foto** MUST fazer o mesmo. Um
número **zero** MUST NOT ser exibido: "Vídeos (0)" gasta largura para dizer que a
aba está vazia, o que abri-la diz melhor — a mesma decisão que já esconde o botão
de aquecimento e a seção Alternativas. Enquanto a contagem não é **conhecida**,
nada MUST ser exibido, e não um zero (ver *Estados Vazios Só Depois da
Resposta*).

#### Scenario: A aba abre já no vídeo
- GIVEN "Supino Reto" tem dois vídeos, o primeiro rotulado "pegada fechada"
- WHEN o usuário abre o detalhe e vai em "Vídeos"
- THEN o primeiro vídeo já está sendo exibido, com "1 de 2" e o seu nome
- AND nenhuma lista de vídeos é exibida antes dele

#### Scenario: Nada é aberto por cima da tela
- GIVEN o usuário está na aba "Vídeos"
- WHEN observa a tela
- THEN não há controle de fechar
- AND a faixa de abas continua visível acima do carrossel

#### Scenario: A repetição volta ao início do TRECHO
- GIVEN um vídeo com trecho de 2:10 a 2:45
- WHEN ele chega ao fim do trecho
- THEN volta a **2:10** e toca de novo, sem intervenção
- AND não volta ao início do vídeo

#### Scenario: Sem recorte, a repetição volta ao começo
- GIVEN um vídeo sem início marcado
- WHEN ele termina
- THEN volta ao segundo zero e toca de novo

#### Scenario: A aba existe na sessão
- GIVEN uma sessão em andamento com "Supino Reto"
- WHEN o usuário abre o detalhe da entrada
- THEN a aba "Vídeos" está lá, com os mesmos vídeos do catálogo

#### Scenario: Ver um vídeo não mexe na sessão
- GIVEN a aba "Vídeos" aberta a partir de uma entrada de sessão
- WHEN o usuário passa para o próximo vídeo
- THEN nada foi marcado como concluído e o stepper não avançou

#### Scenario: A aba diz quantos vídeos tem
- GIVEN "Supino Reto" tem dois vídeos e uma foto na academia ativa
- WHEN o usuário abre o detalhe
- THEN a aba de vídeos aparece como "Vídeos (2)"
- AND a aba de fotos aparece como "Foto (1)"

#### Scenario: Aba vazia não mostra zero
- GIVEN um exercício sem vídeo e sem foto
- WHEN o usuário abre o detalhe
- THEN as abas aparecem como "Vídeos" e "Foto", sem número

#### Scenario: A alternativa traz os próprios vídeos
- GIVEN o usuário está vendo uma alternativa dentro da sessão
- WHEN abre a aba "Vídeos"
- THEN vê os vídeos do exercício **exibido**, não os da entrada

#### Scenario: Sem vídeo, um estado vazio
- GIVEN um exercício sem vídeo algum
- WHEN o usuário abre a aba "Vídeos"
- THEN um estado vazio explica a aba e oferece o caminho para cadastrar

---

### Requirement: Videos Are Viewed in the Same Full-Screen Viewer as Warmups

Os vídeos MUST ser apresentados pelo **mesmo paginador** dos aquecimentos (ver
*Full-Screen Warmup Viewer*, em `warmups`), e não por uma cópia dele: um item por
vez, `<` e `>` **flutuando sobre a mídia** nas bordas laterais, circulação
infinita, posição "N de M", o nome do item, e o estado de falha que oferece abrir
o endereço fora do app.

O que difere é a **apresentação**, e apenas ela. O aquecimento, alcançado por um
botão, MUST continuar em **sobreposição**: diálogo modal, fechar no topo, rolagem
de trás travada, teclado. Os vídeos, cuja aba já **é** o paginador, MUST ser
apresentados **na página**: sem diálogo, sem fechar, sem travar rolagem alguma, e
sem capturar as setas do teclado — elas pertencem à tela que ele divide.

Com um **único** vídeo os controles MUST NOT ser exibidos, como já vale para um
aquecimento só.

O comportamento do visualizador de **aquecimentos** MUST permanecer exatamente
como está: ele passa a ser um dos dois clientes de um paginador comum, e não o
objeto de uma mudança.

#### Scenario: Percorrer os vídeos
- GIVEN um exercício com três vídeos e a aba "Vídeos" aberta
- WHEN o usuário toca `>` duas vezes
- THEN vê o terceiro, com "3 de 3"

#### Scenario: A navegação dá a volta
- GIVEN o carrossel mostrando o último vídeo
- WHEN o usuário toca `>`
- THEN volta ao primeiro

#### Scenario: O aquecimento continua em sobreposição
- GIVEN um exercício com aquecimentos
- WHEN o usuário toca o controle de aquecimento
- THEN o visualizador abre **sobre** a tela, como diálogo, com fechar no topo

#### Scenario: Um único vídeo
- GIVEN um exercício com apenas um vídeo
- WHEN o usuário o abre
- THEN vê "1 de 1" e nenhuma seta

#### Scenario: O aquecimento não regride
- GIVEN um exercício com três aquecimentos
- WHEN o usuário abre o visualizador de aquecimentos
- THEN ele se comporta exatamente como antes desta mudança
