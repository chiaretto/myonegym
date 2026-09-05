# Delta: exercises

**Change ID:** `step-through-the-exercise-list`
**Affects:** tela de visualização do exercício, lista de Configurações →
Exercícios, serialização dos filtros

---

## MODIFIED Requirements

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

---

## ADDED Requirements

### Requirement: Stepping Through the Exercise List From the View

A tela de visualização MUST oferecer **Voltar** e **Avançar**, que levam ao
exercício **anterior** e ao **seguinte** da lista de onde o usuário veio, sem
passar por ela.

Sem isso a tela é um beco: andar uma posição custa voltar à lista, reencontrar
onde se estava e tocar de novo. E a lista é longa — o catálogo oficial sozinho
traz dezenas —, de modo que percorrer é exatamente o que se está fazendo ali.

Os controles MUST ser os **mesmos** que o detalhe do exercício já usa para
percorrer um dia de treino: mesma barra, mesmo lugar, mesmos nomes acessíveis. O
gesto já é conhecido; o que muda é o que ele percorre.

#### Scenario: Andar para o próximo e para o anterior
- GIVEN a tela de visualização de um exercício que está no meio da lista
- WHEN o usuário aciona "Avançar"
- THEN a tela mostra o exercício seguinte da lista
- WHEN aciona "Voltar"
- THEN volta ao exercício de onde saiu

### Requirement: The Walk Follows the List the User Came From

O percurso MUST ser a lista **como ela estava na tela**: os mesmos exercícios, na
mesma ordem, com **os filtros que estavam ativos** (busca, categoria, dia e
tipo).

Quem filtrou por "Cardio" e avançou não pode cair num exercício de Força que
acabou de filtrar fora — seria o app desfazendo, no gesto seguinte, o que o
usuário pediu no anterior.

Os filtros MUST viajar **no endereço** da tela, e não em estado de navegação. É a
mesma decisão que o detalhe do exercício já toma com o dia de origem, pela mesma
razão: o percurso tem de sobreviver a um recarregamento e a um link
compartilhado, e o histórico do navegador não sobrevive a nenhum dos dois.

Um parâmetro **ausente** MUST significar "sem esse filtro". Uma rota nua, sem
query alguma, MUST continuar abrindo a tela — percorrendo, então, a lista
inteira. Um valor que não dá para ler MUST ser tratado como ausente, e MUST NOT
impedir a tela de abrir.

A lista percorrida MUST ser obtida pelo **mesmo** filtro que a lista de
Configurações usa. Duas implementações da pergunta "quais exercícios são estes"
divergiriam na primeira mudança de filtro.

Navegar dentro da tela — avançar, voltar, ou abrir uma **alternativa** — MUST
preservar os mesmos filtros no endereço.

#### Scenario: O percurso respeita o filtro
- GIVEN a lista filtrada por tipo "Cardio"
- WHEN o usuário abre um resultado e aciona "Avançar"
- THEN o próximo é outro exercício de Cardio
- AND nenhum exercício de Força aparece no percurso

#### Scenario: O percurso respeita a busca
- GIVEN a lista com "rosca" digitado na busca
- WHEN o usuário percorre a partir de um resultado
- THEN só exercícios cujo nome casa com "rosca" aparecem

#### Scenario: Recarregar mantém o percurso
- GIVEN a tela aberta a partir de uma lista filtrada
- WHEN a página é recarregada
- THEN o percurso continua o mesmo, porque os filtros estão no endereço

#### Scenario: Uma rota sem filtros percorre tudo
- GIVEN a rota de visualização sem nenhum parâmetro
- WHEN a tela abre
- THEN ela funciona, e o percurso é a lista inteira

#### Scenario: Um parâmetro ilegível não impede a tela de abrir
- GIVEN um endereço com um filtro que não dá para interpretar
- WHEN a tela abre
- THEN o exercício é exibido normalmente
- AND aquele filtro é tratado como ausente

### Requirement: The Walk Stops at the Ends, and Is Absent Without a Place in It

No **primeiro** exercício da lista percorrida, "Voltar" MUST estar
desabilitado; no **último**, "Avançar". "Não há próximo" é informação real, e é o
que o detalhe do exercício já faz ao percorrer um dia. A lista MUST NOT dar a
volta: diferente de uma pilha de vídeos, uma lista ordenada tem começo e fim.

Quando o exercício aberto **não está** na lista percorrida, os controles MUST
estar **ausentes**, e não presentes com os dois lados mortos. Isso acontece de
formas normais: um link compartilhado que carregava outros filtros, uma
alternativa alcançada de dentro da própria tela, um exercício que deixou de casar
com a busca. Uma barra que visivelmente não faz nada é pior do que nenhuma — a
mesma decisão que o detalhe já toma quando o exercício não está no dia.

#### Scenario: Nas pontas
- GIVEN a tela aberta no **primeiro** exercício da lista
- WHEN o usuário olha os controles
- THEN "Voltar" está desabilitado e "Avançar" não
- AND no último exercício vale o inverso

#### Scenario: Fora da lista, sem controles
- GIVEN um exercício que não pertence à lista percorrida
- WHEN a tela abre
- THEN nenhum controle de percurso é exibido
- AND o resto da tela funciona normalmente

#### Scenario: A alternativa não finge um percurso
- GIVEN o usuário abre, de dentro da tela, uma alternativa que não está na lista
  filtrada
- WHEN a tela dela aparece
- THEN não há controles de percurso

---

## REMOVED

(None)
