# Delta: app-foundation

**Change ID:** `improve-session-entry-screen`
**Affects:** a barra de título (appbar), em todas as telas

---

## ADDED Requirements

### Requirement: The App Bar Sits Flush With the Screen

A **barra de título** MUST encostar no conteúdo abaixo dela: **sem folga
inferior** e **sem linha divisória**. Ela desenhava as duas coisas, e as duas
repetem uma separação que o conteúdo já faz sozinho — cada tela abre com o
próprio respiro superior, e a barra é opaca sobre o fundo do app, então a
distinção sobrevive por contraste enquanto a página rola por baixo dela.

A regra vale para **todas** as telas, não para uma: a barra é chrome
compartilhado, e duas barras de título diferentes no mesmo app seriam um
detalhe que só se explica pela história de quem as escreveu. Na tela do
exercício em sessão é a barra de progresso segmentada que passa a marcar o fim
do cabeçalho (ver `workout-sessions`).

O restante do comportamento da barra MUST ficar como está: ela continua
**grudada no topo** enquanto a página rola, mantém seu preenchimento superior e
lateral, e continua a ser o lugar do botão de voltar e do título. Rolar
conteúdo para uma posição alinhada ao topo MUST levar em conta que a barra
grudada ocupa aquele espaço, para que nada pare por baixo dela.

#### Scenario: Nenhuma linha sob o título
- GIVEN qualquer tela com barra de título
- WHEN o usuário a observa
- THEN não há linha divisória sob a barra
- AND não há folga entre a barra e o começo do conteúdo

#### Scenario: A barra segue grudada
- GIVEN uma tela cujo conteúdo excede a altura da viewport
- WHEN o usuário rola
- THEN a barra de título permanece no topo, com o conteúdo passando por baixo dela
- AND o conteúdo não se confunde com o título, porque a barra é opaca

#### Scenario: Vale em todo o app
- GIVEN o usuário percorre a Home, a Consistência, as Configurações, o detalhe de um exercício e uma sessão
- WHEN observa o topo de cada tela
- THEN todas apresentam a mesma barra rente, sem linha e sem folga inferior

#### Scenario: A barra grudada não encobre o que sobe
- GIVEN um elemento rolado deliberadamente para o topo da tela (por exemplo o cartão de peso ao entrar em edição)
- WHEN a rolagem termina
- THEN o elemento fica logo abaixo da barra, inteiramente visível
- AND não fica parcialmente escondido atrás dela

---

## MODIFIED

(None)

---

## REMOVED

(None)
