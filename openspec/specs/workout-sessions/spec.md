# workout-sessions Specification

## Purpose
Record and review **workout sessions** — a single training visit, scoped to a
gym like weights. A session lists a training day's exercises, lets the user run
through them (mark done, and adjust each exercise's **target weight** via
the same editor as the catalog), complete the session, and review, **share**, or
delete past sessions per gym. A completed session can be shared to other apps as
an **image**, with or without weights and duration. The session stores **no
independent weight** — the weight shown and edited is always the exercise's
target weight resolved for that gym.

## Requirements

### Requirement: Start a Workout Session

The user MUST be able to **start a workout session** from a training day. The
session is created in the **active gym** and captures that day's active exercises
as **session entries**, one per exercise, each snapshotting the exercise **name**
(for durability if the source exercise is later renamed/deleted). Entries do
**NOT** store a weight — the weight shown and edited for an entry is always the
exercise's **target weight** resolved for the session's gym (see the `weights`
capability). A session starts **in-progress** and records its **start time**.
Starting a session MUST require an active gym.

#### Scenario: Start a session from a day
- GIVEN gym "A" is active and "Dia 1" contains "Rosca Direta" (target 20 KG) and "Supino" (target 40 KG)
- WHEN the user starts a workout for "Dia 1"
- THEN an in-progress session is created in gym "A" with a start time
- AND it has two entries, "Rosca Direta" and "Supino", each showing the exercise's current target (20 KG and 40 KG)

#### Scenario: Entry shows "definir" when no target weight exists
- GIVEN gym "A" is active and "Dia 1" contains "Agachamento" with no target weight in "A"
- WHEN the user starts a workout for "Dia 1"
- THEN the "Agachamento" entry shows a "definir" hint (no weight is stored on the entry)

#### Scenario: The session reflects later target changes (no snapshot)
- GIVEN an in-progress session lists "Rosca Direta" showing 20 KG
- WHEN the user changes the target weight of "Rosca Direta" to 25 KG in gym "A"
- THEN the session entry now shows 25 KG (the session holds no independent weight)

#### Scenario: Cannot start without an active gym
- GIVEN no gym exists (or none is active)
- WHEN the user attempts to start a workout
- THEN starting is blocked and the user is prompted to create/select a gym first

### Requirement: Single Active Session Per Gym

A gym MUST have at most **one in-progress session** at a time, **de
qualquer tipo**. While a session is active for the gym, starting another MUST be
prevented — seja um dia de treino, seja um cardio; the user resumes the existing
session instead.

A regra é deliberadamente única para os dois tipos: o app já comunica "há um
treino em andamento" na Home, e um segundo invariante só para cardio faria a
mesma tela responder duas perguntas diferentes.

#### Scenario: Prevent a second active session
- GIVEN gym "A" has an in-progress session for "Dia 1"
- WHEN the user tries to start a workout for "Dia 2" in gym "A"
- THEN a new session is NOT created
- AND the user is directed to resume or complete the active "Dia 1" session

#### Scenario: Um cardio não começa durante um treino
- GIVEN a academia "A" tem um treino de musculação em andamento
- WHEN o usuário tenta iniciar um cardio na aba Cardio
- THEN nenhuma sessão nova é criada
- AND a tela explica que já há um **treino** em andamento, sem levá-lo até ele

#### Scenario: Toda sessão em andamento tem um caminho visível de volta
- GIVEN existe uma sessão em andamento, de qualquer tipo
- WHEN o usuário percorre as telas de onde se inicia um treino
- THEN exatamente uma affordance — a **dona** daquela sessão — se apresenta como
  "Continuar" e a abre
- AND as demais recusam o início explicando, e nomeiam o **tipo** em andamento,
  que é o que diz em qual tela está o "Continuar"

#### Scenario: Um treino não começa durante um cardio
- GIVEN a academia "A" tem um cardio em andamento
- WHEN o usuário tenta iniciar o "Dia 1" na Home
- THEN nenhuma sessão nova é criada

#### Scenario: Active session is per gym
- GIVEN gym "A" has an in-progress session
- WHEN the user switches the active gym to "B"
- THEN gym "B" has no in-progress session and the user may start one in "B"

### Requirement: A Cardio Session Carries No Gym Tag

O cabeçalho de uma sessão de **cardio** MUST NOT exibir o rótulo com o nome da
academia. Onde a pessoa correu não é uma propriedade da corrida, e o chip era a
única coisa naquela tela sugerindo que o exercício pertencia a um lugar.

A sessão continua **armazenada por academia** — o que muda é só o que a tela
afirma. A lista da Consistência, que mistura academias no mesmo mês, MUST
continuar identificando de qual academia foi cada treino, inclusive os de
cardio: ali a informação distingue itens, em vez de decorar um.

Uma sessão de **musculação** MUST continuar exibindo o rótulo.

#### Scenario: Cardio sem rótulo de academia
- GIVEN uma sessão de cardio em andamento na academia "A"
- WHEN o usuário a abre
- THEN o cabeçalho mostra o nome do exercício e quando começou
- AND nenhum rótulo de academia é exibido

#### Scenario: Musculação mantém o rótulo
- GIVEN uma sessão de musculação na academia "A"
- WHEN o usuário a abre
- THEN o cabeçalho exibe o rótulo "A"

*(o início e a conclusão de um cardio estão na capability `cardio`.)*

### Requirement: A Running Session Shows Its Duration

Enquanto a sessão está **em andamento**, a tela da sessão MUST exibir, junto de
quando ela começou, há **quanto tempo** ela dura, no formato `HH:MM:SS`,
atualizado a cada segundo. Um contador que só se mexesse a cada minuto pareceria
parado.

A duração MUST ser contada a partir do **início gravado na sessão**, nunca do
momento em que a tela foi montada: recarregar o app, fechá-lo ou abri-lo em outro
aparelho MUST NOT reiniciar a contagem. Nenhum "tempo decorrido" MUST ser
gravado — o início já é o fato, e um segundo valor guardado divergiria dele assim
que o app fosse fechado.

Os segundos MUST ser **truncados**, nunca arredondados: o contador nunca mostra
um segundo que ainda não passou. As horas MUST crescer além de duas casas em vez
de dar a volta — uma sessão esquecida aberta a noite inteira deve parecer
absurda, não parecer recém-começada.

Numa sessão **concluída** o contador MUST dar lugar à duração fixa do resumo,
arredondada ao minuto (ver *Complete a Session*): uma duração por tela, nunca
duas.

Numa sessão de **cardio**, a tela do exercício MUST exibir o mesmo contador,
**acima das abas** — um cardio é um exercício só, então é ali que a corrida
inteira é passada, e é onde os olhos estão. A tela do exercício num treino de
**musculação** MUST NOT exibi-lo: ali o usuário está de passagem para o próximo,
e o runner — um toque acima, e a tela para a qual ele volta sempre — já conta.

#### Scenario: O contador anda enquanto o treino corre
- GIVEN uma sessão em andamento
- WHEN o usuário observa a tela da sessão
- THEN ao lado de quando ela começou aparece a duração em `HH:MM:SS`
- AND ela avança a cada segundo

#### Scenario: Recarregar não reinicia a contagem
- GIVEN uma sessão iniciada há 12 minutos e 34 segundos
- WHEN o usuário abre (ou reabre) a tela da sessão
- THEN a duração exibida é `00:12:34`, e não `00:00:00`

#### Scenario: A sessão concluída mostra a duração fixa
- GIVEN uma sessão que durou 12 minutos e 34 segundos foi concluída
- WHEN o usuário a abre
- THEN o contador em andamento não é mais exibido
- AND o resumo informa a duração arredondada ao minuto

#### Scenario: O cardio conta na tela do exercício
- GIVEN uma sessão de cardio em andamento, com o detalhe do exercício aberto
- WHEN o usuário observa a tela
- THEN a duração aparece acima das abas
- AND continua visível ao trocar de aba

#### Scenario: A musculação não repete o contador no exercício
- GIVEN um treino de musculação em andamento, com o detalhe de uma entrada aberto
- WHEN o usuário observa a tela
- THEN nenhuma duração é exibida ali

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

### Requirement: Complete a Session

The user MUST be able to **complete** an in-progress session, which records a
**completion time** and moves the session to a **completed** state. A completed
session is immutable except for deletion, and the gym is then free to start a
new session. Completing MUST be allowed when **at least one** entry is marked
done (even if not all are). The **"Concluir treino"** action MUST be **disabled
when no entry is marked done**, so a session cannot be completed empty; an empty
session is instead abandoned via delete.

Concluir MUST levar o usuário ao **resumo daquela sessão** — a própria tela da
sessão, que ao ser concluída passa a oferecer o **compartilhamento da imagem** —
e não à lista do histórico. Compartilhar o treino recém-terminado é o que a
maioria quer fazer em seguida, e mandá-la para a lista enterrava exatamente
isso. Vale para **os dois tipos** de treino e para as duas telas de onde se
conclui (a da sessão e a do exercício). O histórico continua a um toque, pelo
voltar.

#### Scenario: Complete a session
- GIVEN gym "A" has an in-progress session with some entries done
- WHEN the user completes the session
- THEN the session is stamped with a completion time and marked completed
- AND gym "A" has no in-progress session afterward

#### Scenario: Concluir leva ao resumo, com o compartilhamento à mão
- GIVEN uma sessão em andamento com ao menos uma entrada concluída
- WHEN o usuário conclui o treino
- THEN a tela daquela sessão é exibida, já em modo somente-leitura
- AND as ações de compartilhar a imagem estão disponíveis ali
- AND o histórico continua acessível pelo voltar

#### Scenario: O mesmo destino a partir do detalhe do exercício
- GIVEN o usuário concluiu o último exercício e aceitou encerrar o treino
- WHEN a sessão é concluída
- THEN ele chega ao mesmo resumo, com as mesmas ações de compartilhar

#### Scenario: Complete with unfinished entries
- GIVEN an in-progress session where only one of three entries is done
- WHEN the user completes it
- THEN the session is completed and retains the done/not-done state of each entry

#### Scenario: Cannot complete with nothing done
- GIVEN an in-progress session where no entry is marked done
- WHEN the user views the runner
- THEN the "Concluir treino" action is disabled
- AND becomes enabled once at least one entry is marked done

### Requirement: Session History Across Gyms

O histórico de sessões concluídas MUST ser apresentado **dentro da tela de
Consistência** (capability `consistency`), como a **lista dos treinos do mês
exibido** pelo calendário.

A lista MUST incluir as sessões de **cardio** junto das de musculação, ordenadas
pela mesma regra, e cada item MUST deixar claro **qual dos dois** foi — o item
de cardio resume o **nome do exercício** feito, no lugar do nome do dia.

Todo o resto permanece: mais recentes primeiro, recolhida nos 3 mais recentes do
mês com "Ver mais N treinos", abrangendo **todas as academias** com a academia
identificada em cada item, sessões de academia excluída ainda visíveis, chevron
icon-only ao fim de cada card, e o toque abrindo o detalhe da sessão.

#### Scenario: Um cardio aparece no histórico do mês
- GIVEN o usuário concluiu um cardio de "Esteira" no dia 12
- WHEN abre a Consistência no mês do dia 12
- THEN a lista do mês inclui aquele item, resumindo "Esteira"
- AND ele é distinguível de um treino de musculação

#### Scenario: A lista mistura os dois tipos
- GIVEN no mês houve dois dias de musculação e três cardios
- WHEN o usuário expande a lista do mês
- THEN os cinco aparecem juntos, em ordem cronológica inversa

### Requirement: View Session Detail

Opening a session from history MUST show its entries: each exercise's **name**
(from the entry snapshot) and the exercise's **current target weight** resolved for
the session's gym (live — or a "definir"/empty indicator when unset or the source
was deleted), plus its done state. The recap does **not** store or show a frozen
per-session weight.

#### Scenario: Open a completed session
- GIVEN a completed session for "Dia 1" with "Rosca Direta" (done) and "Supino" (not done), and current targets 22.5 KG and 40 KG in the session's gym
- WHEN the user opens it from history
- THEN the detail lists both entries with the current target weights (22.5 KG, 40 KG) and their done states

#### Scenario: Recap reflects the current target, not a frozen value
- GIVEN a completed session referenced "Rosca Direta" while its target was 20 KG
- WHEN the target for "Rosca Direta" is later changed to 25 KG in that gym
- THEN reopening the completed session shows 25 KG (the recap reads the live target)

#### Scenario: Recap survives source deletion
- GIVEN a completed session referencing "Rosca Direta"
- WHEN "Rosca Direta" is later deleted from the app
- THEN the session detail still shows the "Rosca Direta" name (from the snapshot) with an empty/"definir" weight

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

### Requirement: Delete a Session

The user MUST be able to **delete** a session (in-progress or completed).
Deletion removes the session and all of its entries and MUST be confirmed before
it takes effect. Deleting a session MUST NOT affect exercises, days, target
weights, or the weight change history.

#### Scenario: Delete a completed session
- GIVEN a completed session exists in gym "A"
- WHEN the user deletes it and confirms
- THEN the session and its entries are removed from history
- AND the referenced exercises, days, and target weights are unaffected

#### Scenario: Confirmation required
- GIVEN a session is queued for deletion
- WHEN the user taps delete
- THEN a confirmation is presented before removal
- AND declining leaves the session unchanged

#### Scenario: Delete the active session
- GIVEN gym "A" has an in-progress session
- WHEN the user deletes it and confirms
- THEN gym "A" has no in-progress session and may start a new one

### Requirement: Share a Completed Session as an Image

The **completed** session detail MUST offer **two share actions**, each
generating a **PNG image** of the session and handing it to the device's share
mechanism:

- **"Compartilhar"** (detailed) — includes each exercise's **weight** and the
  session's **training duration**.
- **"Compartilhar sem pesos"** (simplified) — includes **neither weights nor
  duration**, so a user can show the workout without revealing how much they
  lift or how long they took.

Both images MUST resemble the session detail screen and MUST contain: the
session's **day name**, its **gym**, the **date**, the **exercise list** (media
thumbnail, name, category, done state) taken from the entry's **name snapshot**,
and the **done count**. The detailed variant additionally shows a **weight badge**
per entry — the exercise's **current target weight** resolved for the session's
gym, read **live** (consistent with View Session Detail — the session stores no
weight of its own) — and the **duration** (`completedAt − startedAt`).

The image MUST be rendered at a **fixed size**, independent of the user's
**font-scale** setting (see the `app-foundation` typography spec) — a shared
image is a fixed design, not a responsive screen.

The image MUST emphasise **done** entries over **skipped** ones — the opposite of
the runner, which dims and strikes through what is done because crossing an item
off a checklist reads as progress *there*. On a shared image that would invert the
meaning: the work the user did would look cancelled while the exercises they
skipped would look like the highlight.

The date on the image MUST be **absolute** (e.g. "16 jul 2026"), not the
**relative** label the screen uses ("Hoje"), because a shared image outlives the
day it was created.

An entry with **no target weight** MUST render **no weight badge** in the detailed
variant — the screen's **"definir"** hint is a call-to-action for the owner and
MUST NOT appear on a shared image.

Share actions MUST NOT be offered for an **in-progress** session.

#### Scenario: Two share actions on a completed session
- GIVEN a completed session for "Dia 1" is open from history
- WHEN the user views it
- THEN a "Compartilhar" action and a "Compartilhar sem pesos" action are shown

#### Scenario: No sharing while a session is in progress
- GIVEN gym "A" has an in-progress session
- WHEN the user views the runner
- THEN no share action is shown

#### Scenario: Detailed image includes weights and duration
- GIVEN a completed session for "Dia 1" in gym "A" lasting 48 minutes, with "Rosca Direta" (done, current target 22,5 KG) and "Supino" (not done, current target 40 KG)
- WHEN the user taps "Compartilhar"
- THEN a PNG is generated showing "Dia 1", gym "A", the date, both exercises with their names, categories, thumbnails and done states
- AND it shows "22,5 KG" and "40 KG"
- AND it shows the duration "48 min"

#### Scenario: Simplified image omits weights and duration
- GIVEN the same completed session
- WHEN the user taps "Compartilhar sem pesos"
- THEN a PNG is generated showing "Dia 1", gym "A", the date, both exercises with their names, categories, thumbnails and done states
- AND it shows **no** weight for any exercise
- AND it shows **no** training duration

#### Scenario: The image shows the live target weight
- GIVEN a completed session referenced "Rosca Direta" while its target was 20 KG
- WHEN the target is later changed to 25 KG in that gym and the user shares the session with details
- THEN the image shows 25 KG (the card reads the live target, like the recap)

#### Scenario: An entry with no target shows no badge
- GIVEN a completed session entry "Agachamento" with no target weight in the session's gym
- WHEN the user taps "Compartilhar"
- THEN the image shows the "Agachamento" row with **no** weight badge
- AND the word "definir" does **not** appear on the image

#### Scenario: Done exercises are emphasised over skipped ones
- GIVEN a completed session where "Supino" is done and "Agachamento" was skipped
- WHEN the user shares it
- THEN "Supino" is rendered at full strength (not dimmed, not struck through)
- AND "Agachamento" recedes visually

#### Scenario: The image uses an absolute date
- GIVEN a session completed on 16 July 2026
- WHEN the user shares it on that same day
- THEN the image shows an absolute date ("16 jul 2026")
- AND it does **not** show the relative label "Hoje"

#### Scenario: The image ignores the font-scale setting
- GIVEN the user set the Aparência font scale to its maximum
- WHEN the user shares a completed session
- THEN the generated image is identical to the one produced at the default scale

#### Scenario: Image survives source exercise deletion
- GIVEN a completed session referencing "Rosca Direta"
- WHEN "Rosca Direta" is later deleted and the user shares the session
- THEN the image still shows the "Rosca Direta" name (from the entry snapshot)
- AND its thumbnail falls back to a placeholder and no weight badge is drawn

### Requirement: Deliver the Session Image

Generating a session image MUST hand it to the platform's **share sheet** when
the device supports sharing files, so the user can send it to any other app. When
file sharing is **unavailable**, the app MUST fall back to **downloading** the
PNG and confirm with a message — sharing MUST NOT simply fail.

Image generation MUST be **resilient to unreachable exercise media**: an
exercise's media URL is arbitrary and remote, and MUST NOT be able to prevent the
image from being produced. Any media that cannot be loaded (unreachable,
cross-origin-restricted, or missing) MUST fall back to the **placeholder** used
elsewhere for missing media.

**Cancelling** the share sheet MUST be treated as a non-event — no error is
reported. A genuine failure MUST report an error and leave the session unchanged.
Sharing MUST NOT modify any data: the session, its entries, the target weights,
and the weight history are untouched.

#### Scenario: Share via the platform share sheet
- GIVEN a device that supports sharing files
- WHEN the user taps a share action on a completed session
- THEN the platform share sheet opens with the PNG attached, ready to send to another app

#### Scenario: Fall back to a download
- GIVEN a device that does **not** support sharing files
- WHEN the user taps a share action
- THEN the PNG is downloaded to the device
- AND a message confirms the image was saved

#### Scenario: Unreachable media falls back to the placeholder
- GIVEN a completed session whose exercise media URL cannot be loaded (offline, missing, or cross-origin-restricted)
- WHEN the user shares the session
- THEN the image is still produced, with a placeholder in that exercise's thumbnail
- AND no error is reported

#### Scenario: Cancelling the share sheet is silent
- GIVEN the share sheet is open with the generated image
- WHEN the user dismisses it without choosing an app
- THEN no error is reported and the session detail is unchanged

#### Scenario: Sharing changes no data
- GIVEN a completed session in gym "A"
- WHEN the user shares it with details
- THEN the session, its entries, the target weights, and the weight history are unchanged

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
