# Delta: workout-sessions

**Change ID:** `add-official-catalog-drop-warmups`
**Affects:** detalhe da entrada de sessão (aba "Execução"), cronômetro de
descanso

---

## ADDED Requirements

### Requirement: The Rest Timer Keeps the Screen Awake

Enquanto o **cronômetro de descanso está correndo**, o app MUST pedir ao sistema
que **mantenha a tela ligada**, e MUST liberar esse pedido assim que ele for
parado, a tela sair ou o usuário deixar a entrada.

O motivo é a situação real: o celular fica no banco, contando, e o usuário olha
para ele de dois metros — exatamente o que o sistema lê como "ocioso" e responde
apagando a tela. Um cronômetro que exige acordar o telefone para ser lido não é
um cronômetro.

O pedido MUST valer **apenas para o cronômetro de descanso**, e MUST NOT ser
feito pelo relógio do treino. Aquele corre a sessão inteira, e segurar a tela por
uma hora seria uma conta de bateria que o usuário não pediu; o descanso dura
alguns minutos, passados olhando para o número.

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
mesma vista em dois contextos e só o rótulo da primeira difere.

A aba "Notas" MUST exibir a marca `(*)` quando o exercício **exibido** tem
anotação naquela academia (ver *The Notas Tab Says Whether There Is a Note*, em
`exercises`) — como a contagem de "Vídeos", ela é do movimento que está na tela,
não do que abriu a entrada.

Quando o exercício da entrada é de **Cardio**, a aba "Execução" MUST NOT exibir
o cartão "Peso alvo", o editor nem a linha do tempo do histórico — ela mostra a
mídia (e as alternativas, se houver). "Notas", "Vídeos" e "Foto" MUST continuar
funcionando exatamente como para um exercício de Força: nota e fotos são por
`(academia, exercício)` e são justamente o que ajuda num cardio (a tela da
esteira, o ajuste do banco da bike).

A aba "Execução" MUST NOT exibir controle de **aquecimento**: o conceito deixou
de existir no app (ver a remoção da capability `warmups`). O que se assiste
durante o treino é a aba **"Vídeos"**, que continua exatamente onde está — e é
justamente ela que torna o aquecimento dispensável, porque a mídia de apoio ao
movimento já está a um toque de distância, dentro da própria entrada, sem sair
da sessão.

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

#### Scenario: Não há controle de aquecimento na sessão
- GIVEN uma sessão em andamento
- WHEN o usuário abre o detalhe de uma entrada e percorre a aba "Execução"
- THEN nenhum controle de aquecimento é exibido
- AND a aba "Vídeos" continua disponível na mesma tela

---

## REMOVED

(None — o controle de aquecimento era um parágrafo dentro do requisito acima,
não um requisito próprio, e sai com a modificação dele.)
