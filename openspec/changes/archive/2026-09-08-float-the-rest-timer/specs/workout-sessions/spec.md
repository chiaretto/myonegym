# Delta: workout-sessions

**Change ID:** `float-the-rest-timer`
**Affects:** o cronômetro de descanso — cor, duração, alcance e arraste

---

## MODIFIED Requirements

### Requirement: Rest Timer on the Session Exercise Detail

A aba **"Execução"** do detalhe da entrada de sessão MUST oferecer um
**cronômetro crescente**, apresentado como um botão redondo **sobreposto ao
canto superior direito da mídia** do exercício **enquanto ele está parado**.
Correndo, ele deixa a mídia e passa a flutuar sobre o app (ver *A Running Rest
Timer Follows the User Through the App*).

O descanso entre séries é parte do treino e o app não o media: para respeitar 90
segundos entre as séries, o usuário tinha de sair do app, abrir o cronômetro do
sistema e voltar — a cada série. Esta é a tela onde ele passa o treino inteiro e
a única que fica olhando entre uma série e a próxima.

**Sobre a mídia, e não abaixo dela:** o cronômetro não é conteúdo do exercício,
é uma ferramenta usada enquanto se olha para ele. Abaixo, empurraria o peso alvo
para fora da dobra numa tela que já é a mais rolada do app; sobreposto, não custa
altura nenhuma. Ele MUST caber inteiro dentro das bordas da mídia.

O botão MUST ter exatamente **dois estados**, alternados por um toque, e a
**cor** MUST dizer qual é:

- **Parado** — fundo **cinza** com fonte **preta**, e um ícone de relógio acima
  de **`00s`**. O ícone é o convite: diz o que a bolinha faz antes de ela ter
  feito qualquer coisa. O cinza é o de quem espera ser chamado;
- **Correndo** — fundo **vermelho** (a cor de destaque do app) com fonte
  **branca**, sem o ícone, mostrando só o tempo, crescendo a cada segundo:
  `01s`, `02s`, `03s`…

O fundo MUST ser **opaco** nos dois estados — sobre uma foto clara, um fundo
translúcido perde o número, que é a única coisa que ele desenha.

**CHANGED — a cor agora muda com o estado.** A regra anterior era o oposto: cor
idêntica parada e correndo, com o ícone como única diferença, para não dar a
quem lê um círculo do tamanho de uma digital uma segunda coisa a decodificar. O
argumento valia **para um controle que só existia numa tela**. Um cronômetro que
pode aparecer sobre qualquer tela do app responde a outra pergunta — não "isto é
um botão?", mas **"ele está contando?"** —, e a cor é a resposta mais rápida que
existe: legível de relance, do outro lado do aparelho, sem ler número nenhum.

Trocar de estado MUST NOT mudar o **tamanho** nem **onde o botão está**: ao
iniciar, o cronômetro passa a ser um elemento flutuante, e ele MUST aparecer
exatamente **no ponto da tela onde estava** ao ser tocado. Só o arraste o move
depois disso. Aparecer noutro canto seria ele saltar de sob o dedo que acabou de
tocá-lo — que é o mesmo motivo pelo qual o tamanho também não muda.

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
antes. O tempo exibido MUST NOT adiantar um segundo que ainda não passou.

**CHANGED — os minutos não crescem mais além de dois dígitos.** A regra existia
para que um cronômetro esquecido lesse como absurdo (`100:00`) em vez de
recém-iniciado (`40:00`). Com o limite de 99 minutos ela perdeu o objeto: não há
mais como chegar a três dígitos.

Um segundo toque MUST **parar e zerar**: o ícone volta, a cor volta ao cinza e o
tempo volta a `00:00`. Não existe pausa que preserve o valor — um cronômetro de
descanso ou está contando este descanso, ou não está contando nada.

A contagem MUST ser um fato sobre o **relógio**, não uma soma de tiques: um
aparelho que suspende os temporizadores com a tela apagada — o celular no bolso
durante o descanso — MUST voltar exibindo o tempo real decorrido, e não o tempo
de antes de bloquear.

O cronômetro MUST funcionar igual num exercício **sem mídia**, onde a área da
imagem é um espaço reservado: a contagem não depende da foto.

O botão MUST se anunciar à tecnologia assistiva como um **cronômetro**, com o
tempo que marca, e MUST expor se está **correndo ou parado**.

O descanso MUST NOT ser **gravado como histórico**: ele MUST NOT aparecer no
histórico da sessão nem no backup. O que fica registrado de um treino é o que
foi feito, não quanto se descansou.

**CHANGED — "morre com a tela" deixou de fazer parte dessa regra.** Eram duas
regras escritas como uma. A que fica é a de cima: descanso não vira histórico. A
que cai é a de que a contagem não pode sobreviver a um recarregamento — ver *A
Running Rest Timer Outlives the Screen That Started It*.

#### Scenario: Parado, o botão convida
- GIVEN uma sessão em andamento e o detalhe de uma entrada, na aba "Execução"
- WHEN o usuário olha o canto superior direito da imagem
- THEN vê um botão redondo cinza, com fonte preta, com um ícone de relógio
  acima de "00s"
- AND o fundo dele é opaco

#### Scenario: Um toque começa a contar
- GIVEN o cronômetro parado em "00:00"
- WHEN o usuário toca nele
- THEN o ícone de relógio deixa de ser exibido
- AND o botão passa a ser vermelho com fonte branca
- AND o tempo passa a subir a cada segundo: "01s", "02s", "03s"

#### Scenario: Nem o tamanho nem o lugar mudam entre parado e correndo
- GIVEN o cronômetro parado, no canto da mídia
- WHEN o usuário o inicia
- THEN o tamanho do botão permanece o mesmo
- AND ele continua exatamente no mesmo ponto da tela
- AND só a cor e o ícone mudam

#### Scenario: Um segundo toque para e zera
- GIVEN o cronômetro correndo
- WHEN o usuário toca nele de novo
- THEN ele volta a cinza com fonte preta, com o ícone, marcando "00:00"

### Requirement: The Rest Timer Keeps the Screen Awake

Enquanto o **cronômetro de descanso está correndo**, o app MUST pedir ao sistema
que **mantenha a tela ligada**, e MUST liberar esse pedido assim que ele for
parado ou a tela sair.

**CHANGED — sair da entrada não libera mais.** Não podia continuar valendo: o
cronômetro agora corre em qualquer tela, e soltar a tela ao sair da entrada
apagaria o celular no meio do descanso que ele está medindo. O que libera é
parar, e nada mais.

O motivo é a situação real: o celular fica no banco, contando, e o usuário olha
para ele de dois metros — exatamente o que o sistema lê como "ocioso" e responde
apagando a tela. Um cronômetro que exige acordar o telefone para ser lido não é
um cronômetro.

O pedido MUST valer **apenas para o cronômetro de descanso**, e MUST NOT ser
feito pelo relógio do treino. Aquele corre a sessão inteira sem teto nenhum.

**CHANGED — o teto do descanso agora é o limite de 99 minutos, e não "alguns
minutos".** A justificativa anterior — que o descanso dura poucos minutos e por
isso o custo é pequeno — deixou de ser verdade no momento em que a contagem
passou a atravessar telas. O limite é o que a substitui: é ele que impede a tela
de ficar acesa indefinidamente. Se o custo de bateria se mostrar alto na
prática, o recuo é segurar a tela apenas enquanto o cronômetro estiver **visível
na tela do exercício**, que é a situação para a qual esta regra foi escrita.

O pedido MUST ser **refeito ao voltar para o app**: o navegador retoma a
permissão quando a página é escondida e não a devolve sozinho.

A falta do recurso MUST ser **silenciosa**. Um navegador que nunca o implementou,
um contexto inseguro, o modo de economia de bateria — em todos, o cronômetro
MUST continuar contando normalmente e a tela MUST apenas se comportar como se
comportaria de qualquer forma. Nada MUST ser exibido ao usuário a respeito.

#### Scenario: A tela fica acesa durante o descanso
- GIVEN o detalhe de uma entrada de sessão
- WHEN o usuário inicia o cronômetro
- THEN o app pede ao sistema para manter a tela ligada

#### Scenario: Parar devolve a tela ao sistema
- GIVEN o cronômetro correndo
- WHEN o usuário o para
- THEN o pedido é liberado

#### Scenario: Sair da entrada não devolve
- GIVEN o cronômetro correndo
- WHEN o usuário vai para outra tela do app
- THEN o pedido continua valendo, porque a contagem continua

#### Scenario: O relógio do treino não segura a tela
- GIVEN uma sessão em andamento com o cronômetro parado
- WHEN o usuário apenas observa a tela
- THEN nenhum pedido para manter a tela ligada é feito

#### Scenario: Voltar ao app pede de novo
- GIVEN o cronômetro correndo e o app foi para segundo plano
- WHEN o usuário volta para o app
- THEN o pedido é refeito

#### Scenario: Sem o recurso, nada quebra
- GIVEN um navegador sem a API de manter a tela ligada
- WHEN o usuário inicia o cronômetro
- THEN ele conta normalmente
- AND nada é exibido sobre a tela poder apagar

---

## ADDED Requirements

### Requirement: A Running Rest Timer Outlives the Screen That Started It

Uma vez iniciado, o cronômetro MUST continuar contando até **o usuário pará-lo**
ou até **99 minutos**, o que vier primeiro. Nada mais o interrompe:

- trocar de **aba** dentro do exercício;
- trocar de **exercício**;
- ir para **qualquer outra tela** do app;
- **sair do app e voltar**, inclusive depois de o sistema descartar o PWA ou de
  o app recarregar por uma versão nova.

Um descanso não termina onde a série terminou. Acaba a série, começa o descanso,
e é caminhando até a próxima máquina que ele passa — que é exatamente quando o
app trocava de exercício e zerava a conta, tirando o número da tela no momento
em que ele mais interessava.

**CHANGED — trocar de exercício não zera mais.** A regra anterior dizia que o
descanso é daquela série e que carregá-lo adiante mediria um intervalo que
ninguém pediu. A premissa era que o descanso cabe dentro de um exercício, e ela
é falsa na prática.

Para sobreviver, o **instante de início** MUST ser guardado fora da tela, junto
das outras preferências do app — e MUST ser a **única** coisa guardada. O tempo
decorrido MUST continuar sendo derivado do relógio: um "decorrido" gravado seria
uma segunda fonte de verdade, que envelheceria sozinha enquanto o app estivesse
fechado.

Isto MUST NOT ser confundido com gravar o descanso: o instante vive onde vivem
as preferências, não no banco, e MUST NOT entrar no backup nem no histórico.

O limite de 99 minutos MUST ser medido **sobre o relógio**, não sobre o tempo de
app aberto. Um cronômetro deixado correndo ontem MUST chegar **parado** ao ser
reaberto hoje, e não recomeçar a contar 99 minutos a partir da volta.

Ao atingir o limite, o cronômetro MUST parar **exatamente como um segundo toque
o pararia** — zerado, cinza, com o ícone de volta. Um cronômetro que trava
exibindo `99:00` seria um alarme que ninguém pode desligar sem tocar nele.

#### Scenario: Andar até a próxima máquina não zera
- GIVEN o cronômetro correndo no detalhe de uma entrada
- WHEN o usuário avança para o exercício seguinte
- THEN a contagem continua de onde estava

#### Scenario: Sair do app e voltar
- GIVEN o cronômetro correndo há dois minutos
- WHEN o usuário sai do app, faz outra coisa por três minutos e volta
- THEN o cronômetro marca cinco minutos

#### Scenario: O limite chega sozinho
- GIVEN o cronômetro correndo há 99 minutos
- WHEN o minuto se completa
- THEN o cronômetro para e volta a "00:00", cinza, com o ícone

#### Scenario: Um cronômetro de ontem chega parado
- GIVEN o cronômetro foi deixado correndo e o app ficou fechado por horas
- WHEN o usuário reabre o app
- THEN não há cronômetro correndo
- AND nada aparece flutuando

#### Scenario: O descanso continua fora do que se guarda
- GIVEN um descanso foi cronometrado durante uma sessão
- WHEN o usuário abre o histórico da sessão, ou exporta um backup
- THEN não há registro nenhum daquele descanso

### Requirement: A Running Rest Timer Follows the User Through the App

Enquanto corre, o cronômetro MUST ser exibido **flutuando sobre a tela**, seja
qual for a tela aberta — Home, Configurações, a lista de exercícios, qualquer
uma.

De nada serve uma contagem que sobrevive à navegação se ela fica invisível
enquanto o usuário navega: ele voltaria à tela do exercício só para ler o
número, que é a viagem que este cronômetro existe para poupar.

MUST existir **um só** cronômetro na tela, nunca dois. Correndo, ele é o
flutuante — inclusive na própria tela do exercício, onde o canto da mídia fica
vago. Parado, ele é o botão na mídia, e existe apenas na aba "Execução".

O flutuante MUST NOT cobrir os controles que já ocupam as beiras da tela: a
barra de ação fixa, o toast e a barra superior. E MUST ficar **abaixo** de uma
sheet aberta — uma sheet é uma pergunta que espera resposta, e um cronômetro por
cima dela seria um enfeite obstruindo uma decisão.

Ao **parar**, o flutuante MUST:

- voltar a ser o botão no canto da mídia, se o usuário estiver na aba "Execução"
  do detalhe da entrada;
- **desaparecer**, se ele não estiver. Parado e fora daquela tela, o cronômetro
  não tem nada a dizer, e um botão cinza flutuando sobre a Home seria só um
  estorvo.

#### Scenario: Ele acompanha
- GIVEN o cronômetro correndo no detalhe de uma entrada
- WHEN o usuário vai para a Home e depois para Configurações
- THEN o cronômetro continua visível, flutuando, contando

#### Scenario: Um só, nunca dois
- GIVEN o cronômetro correndo, e o usuário na aba "Execução"
- WHEN ele olha a tela
- THEN vê exatamente um cronômetro

#### Scenario: Parar na tela do exercício devolve o botão
- GIVEN o cronômetro correndo, e o usuário na aba "Execução"
- WHEN ele para o cronômetro
- THEN o botão volta ao canto superior direito da mídia, cinza, em "00:00"

#### Scenario: Parar fora dela faz sumir
- GIVEN o cronômetro correndo, e o usuário na Home
- WHEN ele para o cronômetro
- THEN nada fica na tela

#### Scenario: Ele não fica na frente de uma decisão
- GIVEN o cronômetro correndo
- WHEN uma sheet é aberta
- THEN a sheet fica por cima do cronômetro

### Requirement: A Running Rest Timer Can Be Moved Out of the Way

Enquanto corre, o cronômetro MUST poder ser **arrastado** para outro ponto da
tela, e segurá-lo e movê-lo MUST NOT pará-lo.

Ele flutua por cima do app inteiro, e a tela do app é pequena: mais cedo ou mais
tarde ele vai estar exatamente em cima do que a pessoa quer ler ou tocar. Poder
empurrá-lo para o canto é o que evita ter de escolher entre a contagem e a tela.

Um **toque** MUST continuar ligando e desligando. A diferença entre tocar e
arrastar MUST ser o **movimento**: abaixo de um limiar curto, é toque; acima
dele, é arraste, e o soltar MUST NOT ser lido como um toque. Sem isso, o dedo
que treme desliga o cronômetro que a pessoa só queria mover.

O arraste MUST funcionar com **dedo e com mouse**.

O cronômetro MUST permanecer **inteiramente dentro da tela**: não é possível
arrastá-lo para fora nem para debaixo das barras fixas.

**Parado, ele não se arrasta.** Parado ele é o botão na mídia, que tem um lugar
na composição daquela tela.

Ao parar, a posição MUST voltar à origem. A posição arrastada MUST NOT ser
lembrada de um descanso para o outro: cada descanso começa onde o cronômetro
mora, e não onde o descanso anterior o deixou.

#### Scenario: Arrastar move, e não desliga
- GIVEN o cronômetro correndo
- WHEN o usuário o segura e o arrasta para outro ponto da tela
- THEN ele passa a ser exibido ali
- AND continua correndo

#### Scenario: Um toque ainda desliga
- GIVEN o cronômetro correndo
- WHEN o usuário toca nele sem arrastar
- THEN ele para e zera

#### Scenario: O dedo que treme não desliga
- GIVEN o cronômetro correndo
- WHEN o usuário o arrasta, mesmo que poucos pixels além do limiar, e solta
- THEN ele continua correndo

#### Scenario: Ele não sai da tela
- GIVEN o cronômetro correndo
- WHEN o usuário tenta arrastá-lo para além da borda
- THEN ele para na borda, inteiro e visível

#### Scenario: Parar devolve o lugar
- GIVEN o cronômetro correndo e arrastado para outro canto
- WHEN o usuário o para e inicia um novo descanso
- THEN ele começa no lugar de origem, e não onde foi deixado

---

## REMOVED

(None — as regras que mudam estão em MODIFIED, com o que caiu dito ali.)
