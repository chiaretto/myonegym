# Delta: workout-sessions

**Change ID:** `add-exercise-videos`
**Affects:** as abas do detalhe da entrada de sessão

---

## MODIFIED Requirements

### Requirement: Session Exercise Detail

O detalhe da entrada de sessão MUST manter o arranjo que já tem — abas como
primeiro controle abaixo da barra de título, a mídia dentro de "Execução", as
categorias e a nota na aba de notas, as fotos em "Foto", os rótulos de status
acima das abas e a barra fixa embaixo.

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
