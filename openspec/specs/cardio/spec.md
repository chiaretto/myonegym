# cardio Specification

## Purpose
A aba **Cardio**: a metade avulsa do treino. Musculação é rotina e vive em dias;
cardio não — começa a partir do próprio exercício, não tem peso, e conta como
treino em toda a Consistência (ver a estrela do calendário, na capability
`consistency`).

## Requirements
### Requirement: Cardio Tab

A barra de abas MUST oferecer uma aba **Cardio**, posicionada **ao lado de
Treinos**, apontando para a rota `/cardio`. As demais abas MUST manter rótulo,
ícone e ordem relativa.

Com quatro abas, a barra MUST continuar legível na **tela mais estreita
suportada** e no **maior tamanho de fonte** oferecido em Aparência: sem
**transbordo horizontal**, sem corte e sem sobreposição. Um rótulo que não caiba
em uma linha MUST **quebrar** — a tela tem folga vertical e nenhuma horizontal,
então empurrar a barra para fora é o único desfecho inaceitável.

#### Scenario: A aba abre a tela de cardio
- GIVEN o app aberto na Home
- WHEN o usuário toca a aba "Cardio"
- THEN a rota `/cardio` é exibida
- AND a aba Cardio aparece como ativa

#### Scenario: Quatro abas cabem
- GIVEN um aparelho estreito e a fonte no tamanho máximo
- WHEN o usuário observa a barra de abas
- THEN os quatro rótulos aparecem inteiros, sem corte
- AND a barra não transborda para os lados — um rótulo longo quebra em duas
  linhas em vez de empurrar a barra

### Requirement: Cardio Screen

A tela de Cardio MUST listar **os exercícios de Cardio do catálogo** e nada
mais. Ela MUST NOT ter dias de treino, acordeão ou agrupamento: cardio é avulso.

Cada linha MUST mostrar a **mídia**, o **nome** e as **categorias** do
exercício, e MUST oferecer um **"Iniciar" próprio**. Tocar a linha (fora do
Iniciar) MUST abrir o detalhe do exercício.

A tela MUST exibir, acima da lista, o mesmo **resumo da semana** da tela de
Treinos — a contagem "N / 7 treinos", a sequência e a trilha dos sete dias. Ele
MUST contar **as mesmas sessões** que conta na Home: a semana é a mesma, olhada
de outra aba, e um número só-de-cardio aqui seria o único lugar do app em
desacordo com os demais agregados.

A tela MUST NOT exibir peso em lugar algum — exercícios de cardio não têm peso.

Sem nenhum exercício de Cardio cadastrado, a tela MUST exibir um **estado
vazio** que explica o que é a aba e leva ao cadastro. Enquanto a lista não foi
lida, a tela MUST NOT afirmar que está vazia (ver *Estados Vazios Só Depois da
Resposta*).

Enquanto existe uma **sessão em andamento** na academia ativa, os controles
"Iniciar" MUST ser apresentados **indisponíveis**, pelo mesmo motivo e com o
mesmo tratamento visual que a Home já aplica aos dias.

#### Scenario: A lista mostra só cardio
- GIVEN o catálogo tem "Supino" (Força) e "Esteira" e "Bicicleta" (Cardio)
- WHEN o usuário abre a aba Cardio
- THEN a lista mostra "Esteira" e "Bicicleta"
- AND "Supino" não aparece

#### Scenario: Cada exercício tem seu Iniciar
- GIVEN a aba Cardio lista três exercícios
- WHEN o usuário observa a tela
- THEN cada linha traz o seu próprio "Iniciar"
- AND não há um botão único que inicie a lista inteira

#### Scenario: O resumo da semana está na aba
- GIVEN houve um treino concluído nesta semana
- WHEN o usuário abre a aba Cardio
- THEN o resumo da semana aparece acima da lista, com a mesma contagem da Home
- AND a trilha dos sete dias marca o dia treinado

#### Scenario: Nenhum peso na tela
- GIVEN a aba Cardio lista exercícios
- WHEN o usuário observa as linhas
- THEN nenhuma exibe peso nem o convite "definir"

#### Scenario: Estado vazio
- GIVEN não há exercício de Cardio cadastrado
- WHEN o usuário abre a aba
- THEN um estado vazio explica a aba e oferece o caminho para cadastrar

#### Scenario: Iniciar indisponível durante um treino
- GIVEN existe uma sessão em andamento na academia ativa
- WHEN o usuário abre a aba Cardio
- THEN os controles "Iniciar" aparecem indisponíveis

#### Scenario: O cardio em andamento é alcançável a partir da sua linha
- GIVEN existe um **cardio** em andamento na academia ativa
- WHEN o usuário abre a aba Cardio
- THEN a linha daquele exercício oferece **"Continuar"**, disponível
- AND tocá-la abre a sessão em andamento
- AND as demais linhas seguem indisponíveis

### Requirement: Start and Complete a Cardio

Tocar **Iniciar** em um exercício de cardio MUST criar uma **sessão de cardio**
na academia ativa contendo **aquele exercício apenas**, e abrir essa sessão.
A sessão MUST guardar o próprio **tipo** e o **nome do exercício**, para que o
histórico continue correto se o exercício mudar de tipo, for renomeado ou for
excluído.

Iniciar MUST exigir academia ativa e MUST respeitar **uma sessão ativa por
academia** — a mesma regra dos dias de treino, valendo entre os dois tipos.

**Concluir** MUST encerrar a sessão de cardio diretamente, sem exigir que a
única entrada seja marcada antes: com um item só, pedir a marcação e depois a
conclusão seria pedir a mesma informação duas vezes. A sessão concluída MUST
entrar no histórico como qualquer outra.

#### Scenario: Iniciar um cardio
- GIVEN "Esteira" é um exercício de Cardio e há academia ativa
- WHEN o usuário toca "Iniciar" na linha da Esteira
- THEN uma sessão de cardio é criada na academia ativa, com a Esteira como
  único item
- AND a sessão é aberta

#### Scenario: Concluir encerra direto
- GIVEN uma sessão de cardio da Esteira está em andamento
- WHEN o usuário toca "Concluir"
- THEN a sessão é encerrada e registrada no histórico
- AND não foi preciso marcar o item antes

#### Scenario: Um cardio em andamento nunca fica sem caminho de volta
- GIVEN existe um cardio em andamento
- WHEN o usuário tenta iniciar um treino a partir de um dia na Home
- THEN ele é levado à sessão em andamento
- AND o app MUST NOT recusar sem oferecer caminho: um cardio não tem dia, então
  não existe card próprio para retomá-lo

#### Scenario: Uma sessão ativa por academia vale entre os tipos
- GIVEN há um treino de musculação em andamento na academia ativa
- WHEN o usuário tenta iniciar um cardio
- THEN o início é bloqueado
- AND o usuário é direcionado a retomar ou concluir a sessão em andamento

#### Scenario: Sem academia não se inicia
- GIVEN nenhuma academia existe (ou nenhuma está ativa)
- WHEN o usuário tenta iniciar um cardio
- THEN o início é bloqueado e ele é convidado a criar/selecionar uma academia

#### Scenario: O histórico sobrevive a mudanças no exercício
- GIVEN uma sessão de cardio da "Esteira" foi concluída
- WHEN a "Esteira" é renomeada, vira Força ou é excluída
- THEN a sessão concluída continua registrada como cardio, com o nome que tinha

