# Delta: warmups

**Change ID:** `add-exercise-videos`
**Affects:** o visualizador de tela cheia, que passa a servir também os vídeos

---

## MODIFIED Requirements

### Requirement: Full-Screen Warmup Viewer

Os aquecimentos de um exercício MUST ser apresentados num **visualizador em tela
cheia**, com um item por vez. Ele MUST oferecer:

- **fechar**, no **topo**, devolvendo o usuário à tela do exercício de onde veio,
  na mesma aba;
- **avançar e voltar**, em controles `<` e `>` que **flutuam sobre a mídia**,
  nas bordas laterais, para que a mídia use a largura inteira da tela — o que
  mais importa para um vídeo vertical;
- **circulação infinita**: depois do último vem o primeiro, e antes do primeiro
  vem o último. Diferente do Voltar/Avançar do detalhe do exercício, que para
  nas pontas porque "não há próximo exercício" é informação real, uma pilha de
  aquecimentos não tem posição numa rotina — dar a volta é o caminho mais curto
  de volta ao que se quer rever. Os controles MUST NOT aparecer desabilitados;
- a **posição atual** ("N de M"), porque uma pilha sem contador não diz quanto
  falta;
- o **nome** do aquecimento exibido, já que a mídia sozinha pode não identificar
  o que é.

Com **um único** aquecimento os controles MUST NOT ser exibidos: um ciclo de um
seria dois botões que visivelmente não fazem nada.

O visualizador MUST ser um diálogo modal (`role="dialog"`, `aria-modal`): a
rolagem da tela de trás MUST ficar travada enquanto ele está aberto. Ele MUST
responder ao **teclado** — setas para navegar, `Esc` para fechar.

Este paginador MUST ser o **mesmo** que apresenta os **vídeos de execução** de um
exercício (ver a capability `exercise-videos`), e não um par de telas gêmeas: as
duas fazem exatamente a mesma coisa, e uma cópia divergiria na primeira correção.

O que os dois clientes escolhem é a **apresentação**. O aquecimento MUST continuar
em **sobreposição** — diálogo modal, fechar no topo, rolagem de trás travada,
teclado —, exatamente como descrito acima; a aba de vídeos, que já **é** o
paginador, o apresenta na própria página. O aquecimento MUST NOT mudar de
comportamento: ele passa a ser um dos dois clientes, e não o objeto da mudança.

Uma mídia que **falhe ao carregar** MUST degradar para um estado legível, com o
nome do aquecimento visível, em vez de uma tela quebrada ou vazia. Esse estado
MUST oferecer **abrir o endereço fora do app**: ele atende dois casos — mídia
remota inalcançável, normal num app offline-first, e uma URL que nunca foi uma
imagem, já que é assim que o app trata o que não reconhece.

#### Scenario: Abrir, percorrer e fechar
- GIVEN um exercício com três aquecimentos
- WHEN o usuário abre o visualizador
- THEN vê o primeiro, com "1 de 3" e o nome dele
- WHEN toca `>` duas vezes
- THEN vê o terceiro, com "3 de 3"
- WHEN toca fechar
- THEN volta ao detalhe do exercício, na aba de onde saiu

#### Scenario: A navegação dá a volta
- GIVEN o visualizador mostrando o **último** de três
- WHEN o usuário toca `>`
- THEN volta ao primeiro
- WHEN toca `<` a partir do primeiro
- THEN vai ao último
- AND em nenhum momento um controle aparece desabilitado

#### Scenario: As setas ficam sobre a mídia
- GIVEN o visualizador aberto numa tela de celular
- WHEN o usuário observa a tela
- THEN os controles aparecem **sobre** a mídia, junto às bordas laterais
- AND a mídia ocupa a largura da tela, sem espaço reservado para eles

#### Scenario: Teclado
- GIVEN o visualizador aberto
- WHEN o usuário pressiona a seta direita
- THEN avança um item
- WHEN pressiona `Esc`
- THEN o visualizador fecha

#### Scenario: Um único aquecimento
- GIVEN um exercício com apenas um aquecimento
- WHEN o usuário abre o visualizador
- THEN vê "1 de 1"
- AND nenhuma seta é exibida

#### Scenario: Mídia que não carrega
- GIVEN um aquecimento cuja URL não responde
- WHEN ele é exibido no visualizador
- THEN um estado de falha é mostrado, com o nome do aquecimento legível
- AND a navegação e o fechar continuam funcionando

#### Scenario: O visualizador é um só
- GIVEN um exercício com aquecimentos e com vídeos
- WHEN o usuário abre um e depois o outro
- THEN os dois são apresentados pelo mesmo visualizador, com os mesmos controles

#### Scenario: O aquecimento continua em sobreposição
- GIVEN um exercício com três aquecimentos
- WHEN o usuário toca o controle de aquecimento
- THEN o visualizador abre **sobre** a tela, no primeiro, com "1 de 3"
- AND o fechar, o `Esc` e a trava de rolagem seguem valendo
