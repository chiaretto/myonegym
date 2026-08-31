# Delta: workout-sessions

**Change ID:** `add-exercise-timer`
**Affects:** a aba "Execução" do detalhe do exercício em sessão

---

## ADDED Requirements

### Requirement: Rest Timer on the Session Exercise Detail

A aba **"Execução"** do detalhe da entrada de sessão MUST oferecer um
**cronômetro crescente**, apresentado como um botão redondo **sobreposto ao
canto superior direito da mídia** do exercício.

O descanso entre séries é parte do treino e o app não o media: para respeitar 90
segundos entre as séries, o usuário tinha de sair do app, abrir o cronômetro do
sistema e voltar — a cada série. Esta é a tela onde ele passa o treino inteiro e
a única que fica olhando entre uma série e a próxima.

**Sobre a mídia, e não abaixo dela:** o cronômetro não é conteúdo do exercício,
é uma ferramenta usada enquanto se olha para ele. Abaixo, empurraria o peso alvo
para fora da dobra numa tela que já é a mais rolada do app; sobreposto, não custa
altura nenhuma. Ele MUST caber inteiro dentro das bordas da mídia.

Ele MUST usar a **cor de destaque do app**, e MUST usar **exatamente a mesma**
parado e correndo: é o único controle do app posto sobre uma fotografia, e é a
cor da marca que o faz ler como controle e não como parte da imagem. O fundo
MUST ser **opaco** — sobre uma foto clara, um fundo translúcido perde o número,
que é a única coisa que ele desenha.

O botão MUST ter exatamente **dois estados**, alternados por um toque:

- **Parado** — um ícone de relógio acima de **`00s`**. O ícone é o convite: diz
  o que a bolinha faz antes de ela ter feito qualquer coisa.
- **Correndo** — o ícone MUST desaparecer e o botão MUST mostrar **só o tempo**,
  crescendo a cada segundo: `01s`, `02s`, `03s`…

O **ícone é a única diferença visual** entre os dois estados. Trocar de estado
MUST NOT mudar a cor nem o tamanho do botão: a cor seria uma segunda coisa a
decodificar num círculo do tamanho de uma digital, e o tamanho o faria saltar sob
o dedo que acabou de tocá-lo.

O tempo MUST mostrar **apenas o campo que carrega informação**: **só os
segundos, com a unidade** enquanto não passa um minuto (`00s`, `07s`, `59s`) e
**mm:ss** a partir de um minuto (`01:00`, `01:30`, `12:05`). Um campo de minutos
que só sabe dizer `00` é um campo sem informação, e os dígitos que importam
ganham o espaço dele — num círculo do tamanho de uma digital, lido de braço
estendido no meio da série, esse espaço é o que decide se dá para ler.

A unidade MUST acompanhar os segundos **enquanto eles estão sozinhos**, porque
sozinhos são ambíguos: um `45` ao lado de um ícone de relógio poderia ser
minutos. A partir de um minuto os dois-pontos já dizem quais são os campos, e a
unidade MUST sair — ali ela seria ruído.

O campo de minutos MUST aparecer exatamente **aos 60 segundos**, nem um instante
antes. A partir daí os **minutos** MUST crescer além de dois dígitos em vez de
dar a volta, pela mesma razão que as horas do relógio da sessão crescem: um
cronômetro esquecido deve ler como absurdo (`100:00`), não como recém-iniciado
(`40:00`). O tempo exibido MUST NOT adiantar um segundo que ainda não passou.

Um segundo toque MUST **parar e zerar**: o ícone volta e o tempo volta a
`00:00`. Não existe pausa que preserve o valor — um cronômetro de descanso ou
está contando este descanso, ou não está contando nada.

A contagem MUST ser um fato sobre o **relógio**, não uma soma de tiques: um
aparelho que suspende os temporizadores com a tela apagada — o celular no bolso
durante o descanso — MUST voltar exibindo o tempo real decorrido, e não o tempo
de antes de bloquear.

O cronômetro MUST **sobreviver à troca de abas**. Consultar a nota do aparelho
ou a foto no meio do descanso não pode matar a contagem; fora da "Execução" não
há mídia, então o botão simplesmente não é exibido, e voltar MUST mostrar a
contagem onde ela chegou.

Trocar de **exercício** MUST zerar e parar o cronômetro: o descanso é daquela
série, e carregá-lo para a entrada seguinte mediria um intervalo que ninguém
pediu.

O cronômetro MUST funcionar igual num exercício **sem mídia**, onde a área da
imagem é um espaço reservado: a contagem não depende da foto.

O botão MUST se anunciar à tecnologia assistiva como um **cronômetro**, com o
tempo que marca, e MUST expor se está **correndo ou parado**.

Nada disto MUST ser **gravado**: a contagem vive na tela e morre com ela. Ela
MUST NOT aparecer no histórico da sessão nem sobreviver a um recarregamento — o
que fica registrado de um treino é o que foi feito, não quanto se descansou.

#### Scenario: Parado, o botão convida
- GIVEN uma sessão em andamento e o detalhe de uma entrada, na aba "Execução"
- WHEN o usuário olha o canto superior direito da imagem
- THEN vê um botão redondo com um ícone de relógio acima de "00s"
- AND ele é exibido na cor de destaque do app, sobre fundo opaco

#### Scenario: Um toque começa a contar
- GIVEN o cronômetro parado em "00:00"
- WHEN o usuário toca nele
- THEN o ícone de relógio deixa de ser exibido
- AND o tempo passa a subir a cada segundo: "01s", "02s", "03s"

#### Scenario: Só o ícone muda entre parado e correndo
- GIVEN o cronômetro parado
- WHEN o usuário o inicia
- THEN a cor e o tamanho do botão permanecem os mesmos
- AND a única diferença é o ícone de relógio, que sumiu

#### Scenario: O campo de minutos aparece no minuto, e não antes
- GIVEN o cronômetro correndo
- WHEN passam 59 segundos desde o toque
- THEN o botão mostra "59s", sem campo de minutos
- AND WHEN passa mais um segundo
- THEN o botão mostra "01:00"

#### Scenario: Um cronômetro esquecido não dá a volta
- GIVEN o cronômetro foi iniciado e ficou correndo
- WHEN passam 100 minutos
- THEN o botão mostra "100:00", e não "40:00"

#### Scenario: O segundo toque zera
- GIVEN o cronômetro correndo em "01:12"
- WHEN o usuário toca nele de novo
- THEN o ícone de relógio volta a ser exibido
- AND o tempo volta a "00s"

#### Scenario: A nota no meio do descanso não mata a contagem
- GIVEN o cronômetro correndo em "00:40"
- WHEN o usuário abre a aba "Notas" e volta para "Execução"
- THEN o cronômetro continua correndo, do ponto a que a contagem chegou

#### Scenario: Fora da Execução não há botão
- GIVEN o detalhe de uma entrada de sessão
- WHEN o usuário abre "Notas", "Vídeos" ou "Foto"
- THEN nenhum botão de cronômetro é exibido

#### Scenario: O próximo exercício começa do zero
- GIVEN o cronômetro correndo numa entrada
- WHEN o usuário avança para o exercício seguinte
- THEN o cronômetro daquela tela está parado, em "00s"

#### Scenario: O celular no bolso não atrasa o relógio
- GIVEN o cronômetro correndo e a tela do aparelho apagada por dois minutos
- WHEN o usuário volta ao app
- THEN o tempo exibido reflete os dois minutos decorridos

#### Scenario: Sem foto, o cronômetro segue de pé
- GIVEN uma entrada cujo exercício não tem mídia cadastrada
- WHEN o usuário abre a aba "Execução"
- THEN o cronômetro é exibido e funciona igual

#### Scenario: A tecnologia assistiva sabe o que é e como está
- GIVEN o cronômetro correndo
- WHEN a tecnologia assistiva alcança o botão
- THEN ele se anuncia como um cronômetro, com o tempo que marca
- AND anuncia que está correndo

#### Scenario: O descanso não vira histórico
- GIVEN o usuário usou o cronômetro várias vezes durante um treino
- WHEN conclui a sessão e abre o resumo
- THEN nada sobre descanso é exibido ali
- AND nada foi gravado a respeito

---

## MODIFIED Requirements

### Requirement: Session Exercise Detail

O detalhe da entrada de sessão MUST manter o arranjo que já tem — o rótulo
"Alternativa de X" como primeiro elemento do corpo rolável, as abas como
primeiro **controle** abaixo dele, a mídia dentro de "Execução" com o
**cronômetro sobreposto** a ela (ver *Rest Timer on the Session Exercise
Detail*), as categorias e a nota na aba de notas, as fotos em "Foto", e embaixo
a barra fixa com os controles e, sob eles, a barra de progresso segmentada.

O indicador **"Concluído"** MUST NOT mais ser exibido acima das abas. A tela diz
o mesmo de três outras formas — a caixa marcada e o rótulo do próprio controle
na barra flutuante, a tinta calma daquele botão, e o segmento preenchido na
barra de progresso —, e um quarto distintivo para o mesmo fato era só mais uma
linha a atravessar com os olhos no meio do treino. O que sobra acima das abas é
o rótulo **"Alternativa de X"**, que não repete nada.

As abas MUST ser **quatro**: "Execução", **"Notas"**, **"Vídeos"** e "Foto" — o
mesmo conjunto do detalhe do catálogo, na mesma ordem, porque as duas telas são a
mesma vista em dois contextos e só o rótulo da primeira difere. A aba de notas
chamava-se "Notas"; a de vídeos é nova (ver a capability
`exercise-videos`).

Quando o exercício da entrada é de **Cardio**, a aba "Execução" MUST NOT exibir
o cartão "Peso alvo", o editor nem a linha do tempo do histórico — ela mostra a
mídia (e as alternativas, se houver). "Notas", "Vídeos" e "Foto" MUST continuar
funcionando exatamente como para um exercício de Força: nota e fotos são por
`(academia, exercício)` e são justamente o que ajuda num cardio (a tela da
esteira, o ajuste do banco da bike).

A aba **"Execução"** MUST oferecer, quando o exercício tem aquecimentos
vinculados, o mesmo controle de **aquecimento** do detalhe do catálogo (ver a
capability `warmups` e *Warmup Button on the Exercise Detail*, em `exercises`).
É durante o treino que se aquece: obrigar a sair da sessão para consultar
derrotaria o propósito.

Fechar o visualizador MUST devolver o usuário **à mesma entrada e à mesma aba**,
com a sessão inalterada — abrir um aquecimento MUST NOT marcar nada como feito,
nem avançar o stepper.

Enquanto uma **alternativa** está sendo vista, o controle MUST refletir o
exercício **exibido**, como as três abas já fazem: é o aquecimento daquele
movimento que interessa a quem está decidindo fazê-lo.

#### Scenario: Aquecimento a partir da sessão
- GIVEN uma sessão em andamento e "Supino", que tem dois aquecimentos
- WHEN o usuário abre o detalhe da entrada e toca o controle de aquecimento
- THEN o visualizador abre com os aquecimentos do "Supino"

#### Scenario: Fechar não mexe na sessão
- GIVEN o visualizador aberto a partir de uma entrada de sessão
- WHEN o usuário fecha
- THEN volta à mesma entrada, na aba "Execução"
- AND nada foi marcado como concluído e o stepper não avançou

#### Scenario: A alternativa traz o próprio aquecimento
- GIVEN o usuário está vendo uma alternativa dentro da sessão
- WHEN observa a aba "Execução"
- THEN o controle de aquecimento reflete o exercício **exibido**, não o da
  entrada

#### Scenario: Sem aquecimento, sem controle
- GIVEN a entrada é de um exercício sem aquecimentos
- WHEN o usuário abre o detalhe
- THEN nenhum controle de aquecimento é exibido

#### Scenario: Nada de distintivo "Concluído" acima das abas
- GIVEN uma entrada já marcada como concluída
- WHEN o usuário abre o detalhe dela
- THEN nenhum rótulo "Concluído" é exibido acima das abas
- AND o controle na barra flutuante se anuncia como marcado, com o rótulo "Concluído"

#### Scenario: Cardio sem peso na aba Execução
- GIVEN uma sessão de cardio da "Esteira" em andamento
- WHEN o usuário abre o detalhe da entrada
- THEN a aba "Execução" mostra a mídia e nenhum cartão de peso
- AND as abas "Notas", "Vídeos" e "Foto" continuam disponíveis

#### Scenario: A nota do cardio é durável e por academia
- GIVEN o usuário escreveu "nível 8, 25 min" na Esteira da academia "A"
- WHEN abre a Esteira de novo em "A", num cardio futuro ou pelo catálogo
- THEN a nota está lá
- AND ela não aparece na Esteira da academia "B"

---

## REMOVED

(None)
