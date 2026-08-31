# Delta: workout-sessions

**Change ID:** `improve-session-entry-screen`
**Affects:** a tela do exercício em sessão — barra de progresso no topo, barra fixa embaixo

---

## ADDED Requirements

### Requirement: Segmented Progress on the Session Exercise Detail

O detalhe da entrada de sessão MUST exibir uma **barra de progresso segmentada**
com **um segmento por exercício da sessão**, na mesma ordem do runner. É a tela
onde o treino inteiro é passado, uma entrada por vez, e sem ela a única forma de
saber quantos exercícios faltam é sair para o runner.

Ela MUST viver na **barra flutuante inferior**, **abaixo** das setas e do
Concluir. Aquele bloco já é fixo e já é para onde o polegar volta entre as
séries, então o progresso viaja junto dos controles que andam por ele em vez de
abrir uma segunda faixa de chrome no topo da tela. Os controles MUST ficar com
a borda mais próxima do polegar, e a barra MUST NOT rolar com o conteúdo: ela é
chrome, e MUST permanecer visível em todas as abas.

Cada segmento MUST estar num de três estados, visualmente distinguíveis:
**concluído** (a entrada está marcada como feita), **atual** (é a entrada sendo
vista) e **pendente**. Uma entrada pode ser ao mesmo tempo atual e concluída; o
segmento MUST então dizer as duas coisas.

A barra MUST ser um **indicador**, não um controle: nenhum segmento é tocável, e
tocá-la MUST NOT navegar nem marcar nada. Durante o treino o polegar já mora
nessa faixa da tela, e um alvo de toque a mais ali produziria navegação
acidental; pular para outro exercício continua sendo o papel das setas e do
runner. A barra MUST carregar um **rótulo acessível** dizendo posição e
progresso (por exemplo "Exercício 2 de 5, 1 concluído"), com os segmentos em si
ocultos à tecnologia assistiva — eles são um desenho da mesma frase.

Com **uma única entrada** na sessão (o caso do cardio) a barra MUST NOT ser
exibida: um segmento de largura total não informa nada, pela mesma razão que já
esconde Voltar/Avançar nesse caso.

Enquanto uma **alternativa** está sendo vista, a barra MUST continuar refletindo
as entradas da sessão, com a entrada de origem como a atual — a prévia está ao
lado daquela entrada, não é outra.

O estado da barra MUST acompanhar imediatamente a marcação e a **desmarcação**
de uma entrada, sem recarregar a tela.

#### Scenario: Um segmento por exercício do dia
- GIVEN uma sessão em andamento de um dia com cinco exercícios
- WHEN o usuário abre o detalhe do segundo
- THEN a barra no topo mostra cinco segmentos
- AND o segundo está marcado como o atual

#### Scenario: A barra fica sob os controles, na barra flutuante
- GIVEN o detalhe de uma entrada de sessão
- WHEN o usuário olha a barra fixa embaixo
- THEN a barra de progresso está ali, abaixo da linha `< Concluir >`

#### Scenario: A barra não rola com o conteúdo
- GIVEN o detalhe de uma entrada cujo conteúdo excede a altura da tela
- WHEN o usuário rola até o histórico de peso
- THEN a barra de progresso continua visível na barra flutuante

#### Scenario: A barra sobrevive à troca de aba
- GIVEN o detalhe de uma entrada na aba "Execução"
- WHEN o usuário abre "Notas" e depois "Foto"
- THEN a barra de progresso continua exibida, inalterada

#### Scenario: Os concluídos se distinguem dos pendentes
- GIVEN uma sessão de cinco exercícios com os dois primeiros concluídos
- WHEN o usuário abre o detalhe do terceiro
- THEN os dois primeiros segmentos aparecem como concluídos
- AND o terceiro aparece como o atual e os dois últimos como pendentes

#### Scenario: A barra é indicador, não navegação
- GIVEN o detalhe de uma entrada com a barra visível
- WHEN o usuário toca sobre um segmento de outro exercício
- THEN nada acontece — a tela não muda e nenhuma entrada é marcada
- AND nenhum segmento é exposto como botão ou link

#### Scenario: Marcar repinta a barra na hora
- GIVEN o usuário está no terceiro de cinco exercícios, ainda não concluído
- WHEN o marca como concluído
- THEN o terceiro segmento passa a aparecer como concluído

#### Scenario: Cardio não mostra a barra
- GIVEN uma sessão de cardio, que tem uma única entrada
- WHEN o usuário abre o detalhe dela
- THEN nenhuma barra de progresso segmentada é exibida

#### Scenario: A alternativa não muda o progresso
- GIVEN o usuário está vendo uma alternativa da segunda entrada de cinco
- WHEN observa o topo da tela
- THEN a barra segue com cinco segmentos e a segunda entrada como a atual

### Requirement: One-Line Stepper With a Toggleable Done Control

A barra fixa do detalhe da entrada MUST dispor seus controles em **uma única
linha**: a seta para o exercício **anterior**, a **ação** ao centro ocupando o
espaço restante, e a seta para o **próximo**. Ela ocupava duas linhas porque
"Voltar", "Concluído" e "Avançar" não cabiam lado a lado; sem os rótulos das
setas eles cabem, e a tela mais rolada do app devolve uma linha de chrome fixo
ao conteúdo.

As setas MUST ser **só o chevron**, sem rótulo visível, e MUST conservar os
nomes acessíveis que já têm ("Exercício anterior", "Próximo exercício") — a
mudança é de pixels, não de semântica. As regras de quando elas existem ficam
como estão: ausentes quando não há para onde ir (sessão de uma entrada só) e
ausentes na prévia de uma alternativa, onde a ação ocupa a linha inteira.

A mesma barra serve o detalhe do catálogo aberto a partir de um dia, que a usa
**sem ação central**; ali as duas setas MUST dividir a linha.

Numa sessão **em andamento**, a ação central MUST ser um **alternador** com a
aparência de caixa de seleção, expondo seu estado marcado/desmarcado à
tecnologia assistiva do mesmo modo que a caixa do runner — as duas passam a ser
o mesmo controle em dois lugares. Seus rótulos seguem "Concluir" (não feito) e
"Concluído" (feito).

Os dois sentidos do toque MUST se comportar de forma diferente, porque só um
deles é "seguir em frente":

- **Marcar** MUST manter o fluxo de um toque do treino: registra a entrada como
  feita **e avança** para o próximo exercício; sendo a última pendente, MUST
  continuar oferecendo encerrar o treino, com o mesmo destino de sempre (ver
  *Complete a Session*).
- **Desmarcar** MUST desfazer e **permanecer na mesma entrada**, sem navegar.
  Desfazer que troca de tela não é desfazer. É isto que resolve o toque acidental
  sem obrigar o usuário a voltar ao runner.

Numa sessão **concluída** o slot central MUST continuar mostrando o estado
estático ("Concluído" / "Não feito"), agora entre as duas setas, e MUST NOT ser
alternável.

#### Scenario: Três controles numa linha
- GIVEN uma sessão em andamento com vários exercícios
- WHEN o usuário abre o detalhe de uma entrada do meio
- THEN a barra fixa mostra, numa linha só, a seta anterior, a ação e a seta seguinte
- AND as setas não exibem rótulo de texto

#### Scenario: As setas continuam nomeadas
- GIVEN o detalhe de uma entrada do meio da sessão
- WHEN a tecnologia assistiva percorre a barra fixa
- THEN as setas se anunciam como "Exercício anterior" e "Próximo exercício"

#### Scenario: Marcar avança, como antes
- GIVEN o usuário está na segunda de cinco entradas, não concluída
- WHEN toca na ação central
- THEN a entrada é registrada como concluída
- AND a tela avança para a terceira entrada

#### Scenario: Desmarcar desfaz sem sair da tela
- GIVEN o usuário marcou uma entrada sem querer e voltou para ela pela seta anterior
- WHEN toca na ação central, que está marcada
- THEN a entrada deixa de estar concluída
- AND a tela permanece na mesma entrada

#### Scenario: A última pendente ainda oferece encerrar
- GIVEN todas as outras entradas estão concluídas
- WHEN o usuário marca a última
- THEN o convite para concluir o treino é exibido, como antes

#### Scenario: O controle diz seu estado
- GIVEN uma entrada concluída
- WHEN a tecnologia assistiva alcança a ação central
- THEN ela se anuncia como marcada, com o rótulo "Concluído"

#### Scenario: Sessão concluída não alterna
- GIVEN uma sessão já concluída
- WHEN o usuário abre o detalhe de uma entrada
- THEN o centro da barra mostra "Concluído" ou "Não feito" como texto
- AND tocá-lo não muda nada

#### Scenario: Sem ação, as setas dividem a linha
- GIVEN o detalhe de um exercício do catálogo aberto a partir de um dia
- WHEN o usuário vê a barra fixa
- THEN as duas setas ocupam a linha, sem ação central

---

## MODIFIED Requirements

### Requirement: Session Exercise Detail

O detalhe da entrada de sessão MUST manter o arranjo que já tem — o rótulo
"Alternativa de X" como primeiro elemento do corpo rolável, as abas como
primeiro **controle** abaixo dele, a mídia dentro de "Execução", as categorias e
a nota na aba de notas, as fotos em "Foto", e embaixo a barra fixa com os
controles e, sob eles, a barra de progresso segmentada.

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

### Requirement: Run a Session

While a session is in progress, the user MUST be able to **mark each entry as
done** (and toggle it back). Each entry MUST be presented as a **Home-style row**
— a **media thumbnail**, the exercise **name** and **category**, a **done
checkbox**, and a compact **read-only weight badge** showing the exercise's
**current target weight** resolved for the session's gym (or a "definir" hint when
unset). Each row MUST end with an **icon-only navigation indicator** (a chevron,
no label), so that "tapping opens the detail" is visible rather than something
the user has to discover. Tapping the row (outside the checkbox) MUST open that
entry's **detail** (see Session Exercise Detail). Marking an entry done MUST be
possible from the list checkbox **or** from the detail, and the session's
progress MUST reflect either. **Desmarcar** MUST ser igualmente possível dos
dois lugares — um toque sem querer no meio do treino tem de ser desfeito onde
foi dado. **Adjusting the weight** for an entry happens on
the detail screen and updates the **exercise's target weight** in the saved scope (and its
history) — there is no separate per-session weight. Changes to the done state
persist immediately and are local.

#### Scenario: Entry rows look like Home rows
- GIVEN an in-progress session for a day with "Rosca Direta" (Bíceps, target 20 KG in the session's gym)
- WHEN the user views the runner
- THEN the "Rosca Direta" row shows a media thumbnail, its name and category, a done checkbox, and a "20 KG" badge (the current target)

#### Scenario: Rows show a visible navigation affordance
- GIVEN an in-progress session listing "Rosca Direta"
- WHEN the user views the runner
- THEN the row ends with an icon-only chevron indicating it opens the detail
- AND the chevron carries no text label

#### Scenario: Mark an exercise done from the list
- GIVEN an in-progress session with entry "Rosca Direta" not done
- WHEN the user taps its done checkbox in the list
- THEN the entry is recorded as done
- AND the session progress count reflects it

#### Scenario: Tapping a row opens the detail
- GIVEN an in-progress session listing "Rosca Direta"
- WHEN the user taps the row (not the checkbox)
- THEN the session exercise detail for "Rosca Direta" opens

#### Scenario: Un-mark a done exercise
- GIVEN entry "Supino" is marked done
- WHEN the user toggles it off (from the list or the detail)
- THEN the entry is no longer marked done

### Requirement: Do an Alternative Instead

Durante uma sessão **em andamento**, o usuário MUST poder registrar que fez uma
**alternativa** do exercício da linha, no lugar dele — a máquina estava ocupada,
a academia da vez não tem aquele aparelho, o ombro reclamou.

O caminho MUST ser o mesmo de consultar: na seção **"Alternativas"** do detalhe
da entrada (ver a capability `exercises`), tocar uma alternativa abre o detalhe
dela **dentro da sessão**, mostrando a **mídia**, o **peso alvo**, as
**observações** e as **fotos** daquele exercício naquela academia — é com isso
que o usuário decide. A partir daí, uma ação **"Fiz este no lugar"** MUST
substituir o exercício da linha.

A troca MUST:

- reescrever o **exercício** da entrada e o **snapshot do nome**;
- **preservar o estado de concluído** — a troca diz *qual* foi feito, não desfaz
  o que foi feito;
- **não criar nem remover entradas**: o treino continua com exatamente as linhas
  que o dia tinha, e o progresso não se mexe;
- valer apenas entre **alternativas do exercício atual** da entrada.

Enquanto o usuário está vendo a alternativa, a tela MUST deixar claro que está
**um nível abaixo** da entrada: o rótulo **"Alternativa de X"** MUST ser exibido,
o estado concluído da entrada MUST NOT ser reivindicado pela alternativa — a
barra flutuante ali oferece a troca, não o controle de concluir —, Voltar MUST
retornar à entrada (não ao runner), e a navegação Voltar/Avançar entre
exercícios da sessão MUST NOT ser oferecida ali.

Com a sessão **concluída**, a seção "Alternativas" MUST continuar navegável — é
referência —, mas a ação **"Fiz este no lugar" MUST NOT ser oferecida**: um
histórico registra o que aconteceu.

#### Scenario: Fazer a alternativa no lugar
- GIVEN uma sessão em andamento na entrada "Supino Reto", que tem "Supino
  Máquina" como alternativa
- WHEN o usuário abre "Supino Máquina" na seção Alternativas e toca "Fiz este no
  lugar"
- THEN a entrada passa a ser "Supino Máquina"
- AND o peso alvo, as observações e as fotos exibidos passam a ser os dela

#### Scenario: A decisão é informada pelo peso da alternativa
- GIVEN "Supino Reto" está em 60 KG e "Supino Máquina" em 45 KG na academia da
  sessão
- WHEN o usuário abre "Supino Máquina" a partir da entrada
- THEN o card "Peso alvo" mostra 45 KG antes de qualquer troca

#### Scenario: A troca preserva o concluído
- GIVEN a entrada "Supino Reto" está marcada como concluída
- WHEN o usuário troca por "Crucifixo"
- THEN a entrada continua concluída, agora registrando "Crucifixo"

#### Scenario: A troca não muda o tamanho do treino
- GIVEN uma sessão em andamento com 2 entradas
- WHEN o usuário troca o exercício de uma delas
- THEN a sessão continua com 2 entradas e o progresso não muda

#### Scenario: A alternativa não herda o concluído da entrada
- GIVEN a entrada "Supino Reto" está concluída
- WHEN o usuário abre "Supino Máquina" na seção Alternativas
- THEN nada na tela diz "Concluído" — nem rótulo, nem controle marcado
- AND a tela indica que aquilo é uma alternativa de "Supino Reto"

#### Scenario: Voltar da alternativa devolve à entrada
- GIVEN o usuário está vendo "Supino Máquina" a partir da entrada "Supino Reto"
- WHEN toca Voltar
- THEN o detalhe da entrada "Supino Reto" é exibido (não o runner)

#### Scenario: Trocar é possível nos dois sentidos
- GIVEN o usuário trocou "Supino Reto" por "Supino Máquina"
- WHEN abre a seção Alternativas da entrada
- THEN "Supino Reto" está listado e pode ser escolhido de volta

#### Scenario: Sessão concluída não permite trocar
- GIVEN uma sessão concluída cuja entrada tem alternativas
- WHEN o usuário abre uma delas a partir do recap
- THEN o detalhe é exibido
- AND nenhuma ação "Fiz este no lugar" é oferecida

#### Scenario: Entrada sem alternativas
- GIVEN uma entrada cujo exercício não tem alternativas
- WHEN o usuário abre seu detalhe
- THEN nenhuma seção "Alternativas" é exibida

---

## REMOVED

(None)
