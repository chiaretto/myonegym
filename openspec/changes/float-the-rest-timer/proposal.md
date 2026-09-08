# Proposal: O cronômetro de descanso solta da mídia e acompanha o treino

**Change ID:** `float-the-rest-timer`
**Created:** 2026-09-07
**Status:** Draft

---

## Problem Statement

O cronômetro de descanso existe e funciona, mas foi desenhado como **um enfeite
de uma tela**: um botão redondo preso ao canto da mídia, dentro da aba
"Execução" do detalhe da entrada de sessão. Três consequências, todas sentidas
no meio do treino:

- **ele morre quando o usuário anda.** O descanso não termina onde a série
  terminou: acaba a série, começa o descanso, e aí se vai para a máquina
  seguinte — e é justamente aí que o app troca de exercício e **zera a
  contagem**. O intervalo que o usuário estava medindo desaparece no momento em
  que ele se move, que é o momento em que ele mais quer saber quanto falta;
- **ele morre quando o usuário sai do app.** Atender uma mensagem, olhar a
  playlist, o celular bloquear e o PWA ser descartado pelo sistema — qualquer
  um leva o descanso junto. Voltar mostra `00:00`, sem dizer que houve uma
  contagem;
- **ele não se anuncia.** Parado e correndo têm exatamente a mesma cor e o mesmo
  tamanho; só um ícone de relógio os separa. De relance, do outro lado do
  aparelho, não dá para dizer se está contando.

**Afetado:** quem usa o app treinando — que é o único uso dele.

O ponto comum aos três é que o cronômetro está preso a uma **tela**, quando o
que ele mede é um intervalo do **treino**. Um descanso não pertence à aba
"Execução"; pertence à pessoa que está descansando.

## Proposed Solution

Tirar o cronômetro de dentro da mídia e fazer dele um elemento do **app**:

- **cor diz o estado.** Parado: cinza com fonte preta — um convite discreto.
  Correndo: vermelho com fonte branca — visível de relance;
- **a contagem é do treino, não da tela.** Uma vez iniciada, corre até o usuário
  parar ou até **99 minutos**, atravessando troca de aba, troca de exercício,
  troca de tela e o app ser fechado e reaberto;
- **enquanto corre, ele flutua** sobre qualquer tela do app, sempre visível;
- **enquanto corre, pode ser arrastado** para onde não atrapalhe, sem que
  segurá-lo o desligue;
- **ao parar, ele volta para casa** — o canto da mídia, se o usuário estiver na
  tela do exercício; e simplesmente some, se não estiver.

Um só elemento nos dois casos, nunca dois: parado ele é o botão na mídia,
correndo ele é o flutuante. É o que garante que o usuário nunca veja dois
cronômetros nem se pergunte qual deles é o dele.

### Quatro regras do spec atual que isto reverte

Nenhuma delas foi escrita à toa, e nenhuma é revertida por esquecimento:

**1. "A cor MUST ser exatamente a mesma parado e correndo."** O argumento era
que, num círculo do tamanho de uma digital sobre uma fotografia, uma cor que
muda é uma segunda coisa a decodificar, e que a cor da marca é o que o faz ler
como controle e não como parte da imagem. O argumento era bom **para um controle
que só existia numa tela**. Quando o cronômetro pode aparecer em qualquer lugar
do app, a pergunta que ele precisa responder deixa de ser "isto é um botão?" e
passa a ser **"ele está contando?"** — e cor é a resposta mais rápida que
existe. O fundo continua **opaco**, que é o que preserva o número sobre uma foto
clara.

**2. "Trocar de exercício MUST zerar e parar."** O argumento era que o descanso
é daquela série, e carregá-lo para a próxima mediria um intervalo que ninguém
pediu. Só que a premissa — a de que o descanso cabe dentro de um exercício — é
falsa na prática: caminhar até a próxima máquina **é** parte do descanso. O
custo real da inversão é o cronômetro esquecido correndo sozinho, e é
exatamente para isso que existe o limite de 99 minutos.

**3. "Nada disto MUST ser gravado... MUST NOT sobreviver a um recarregamento."**
Aqui há **duas** regras que estavam escritas como uma só, e só uma cai. O que
não pode acontecer, e continua não podendo, é o descanso virar **histórico**: o
que fica registrado de um treino é o que foi feito, não quanto se descansou.
Guardar o **instante de início** de uma contagem em andamento é outra coisa — é
o mesmo que `Session.startedAt` já faz pelo relógio do treino, e é o que permite
que o número esteja certo ao voltar em vez de zerado.

**4. "Os minutos MUST crescer além de dois dígitos."** A regra existia para que
um cronômetro esquecido lesse como absurdo (`100:00`) em vez de recém-iniciado
(`40:00`). Com o limite em 99 minutos ela perde o objeto: não há mais como
passar de dois dígitos, porque não há mais como chegar lá.

## Scope

### In Scope
- Cor por estado: cinza/preto parado, vermelho/branco correndo.
- A contagem sobrevive a troca de aba, de exercício, de tela e ao app ser
  fechado e reaberto.
- Limite de 99 minutos, que para o cronômetro sozinho.
- Apresentação flutuante sobre qualquer tela enquanto corre.
- Arrastar enquanto corre, sem desligar; a posição volta ao normal ao parar.
- Ao parar: volta ao canto da mídia na tela do exercício, ou some.

### Out of Scope
- **Contagem regressiva** e descanso-alvo configurável. É outro recurso, com
  outras perguntas (quanto? por exercício? alarme?).
- **Aviso sonoro ou vibração** ao atingir um tempo.
- **Registrar o descanso** na sessão ou no histórico. Continua explicitamente
  proibido.
- **Posição lembrada entre descansos.** Ao parar, a posição volta ao lugar de
  origem, como pedido — não há posição persistida.
- Mudar o **relógio da sessão** (o do treino inteiro), que é outro número, com
  outro formato e outro dono.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | Não | Nada disto vira registro; o descanso continua fora do histórico |
| API | Não | — |
| State | **Sim** | Store novo em `src/state/`, com `persist` — mesmo padrão de `activeGym`. O instante de início sai da `useState` da página |
| UI | **Sim** | `RestTimer` ganha estado visual e arraste; passa a ser montado na casca do app, não só na aba "Execução" |

## Architecture Considerations

**O instante de início sai da página e vira estado do app.** Hoje ele é um
`useState` em `SessionEntryPage`, com um `useEffect` que o zera a cada troca de
exercício. Vira um store zustand com `persist` em `localStorage`, exatamente o
padrão de `activeGym`, `settings` e `onboarding`. É o que faz a contagem
atravessar navegação e reinício do app sem inventar mecanismo novo.

**O que se guarda continua sendo só o instante de início.** `useElapsed` já
deriva o tempo do relógio a cada tique, e o comentário dele diz por quê: um
"elapsed" gravado seria uma segunda fonte de verdade que envelhece sozinha. Um
`startedAt` guardado é um fato que não envelhece — voltar ao app depois de meia
hora mostra meia hora, sem ter contado nada nesse meio-tempo.

**O flutuante mora na casca, junto com o toast e as sheets.** `App.tsx` já é
onde vivem as coisas que se sobrepõem a qualquer rota. Ele precisa respeitar o
que já está lá: ficar acima do conteúdo e abaixo de uma sheet aberta, e não
pousar em cima da barra de ação fixa nem do toast.

**Arrastar e tocar no mesmo elemento** exige um limiar: abaixo de alguns pixels
é toque (liga/desliga), acima é arraste (move, e o toque final não conta).
Pointer events cobrem dedo e mouse com um caminho só.

**O wake lock passa a valer em qualquer tela.** Isto é uma consequência real e
não confortável: `useWakeLock` foi escrito para o descanso, e o próprio
comentário dele justifica não usá-lo no relógio do treino porque "segurar a tela
acesa por uma hora seria uma conta de bateria que o usuário não pediu" — sendo
que agora o descanso pode durar 99 minutos. **Decisão:** manter o wake lock
enquanto o cronômetro corre, porque foi exatamente isso que foi pedido antes
("quando estiver ativo não deixar o celular entrar em modo de descanso"), com o
limite de 99 minutos como o teto que a regra antiga não tinha. Se o custo de
bateria incomodar, o recuo natural é segurar a tela só enquanto o cronômetro
estiver **visível na tela do exercício**, que é a situação para a qual ele foi
escrito.

## Success Criteria

- [ ] Parado é cinza com fonte preta; correndo é vermelho com fonte branca
- [ ] A contagem sobrevive a trocar de aba, de exercício, de tela, e a fechar e
      reabrir o app
- [ ] Aos 99 minutos o cronômetro para sozinho
- [ ] Enquanto corre, ele é visível em qualquer tela do app
- [ ] Arrastar move sem desligar; um toque ainda liga e desliga
- [ ] Ao parar, ele volta ao canto da mídia — ou some, fora da tela do exercício
- [ ] O descanso continua fora do histórico da sessão

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| O arraste engolir o toque (ou o contrário), deixando o botão que não liga | Média | Alto | Limiar de movimento explícito, com teste para as duas beiras |
| O flutuante cobrir um controle — barra de ação, toast, sheet | Média | Médio | Posição inicial fora dessas faixas, `z-index` abaixo da sheet, e limites que impedem arrastar para fora da tela |
| 99 min de wake lock custarem bateria | Média | Médio | O limite é o teto; o recuo está descrito acima e é uma linha |
| Um cronômetro esquecido do treino de ontem aparecer flutuando hoje | Baixa | Médio | O limite de 99 minutos vale sobre o relógio, não sobre o tempo de app aberto: ao voltar, uma contagem já vencida chega parada |
| A contagem persistida virar histórico por acidente | Baixa | Alto | Ela mora em `localStorage`, fora do IndexedDB e fora do backup — a mesma fronteira que já separa preferência de dado |
