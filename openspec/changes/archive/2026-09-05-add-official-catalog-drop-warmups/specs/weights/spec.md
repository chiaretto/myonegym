# Delta: weights

**Change ID:** `add-official-catalog-drop-warmups`
**Affects:** modal do histórico de peso

---

## ADDED Requirements

### Requirement: The History Modal Reaches the Other Gyms

O modal do histórico MUST permitir **olhar outra academia** sem sair da que o
usuário está: um controle na **linha do título** troca de qual academia o peso
e o histórico estão sendo lidos.

A pergunta que isso responde é real e não tinha resposta: "quanto eu levanto
disso na outra academia?". Sem o controle, a única forma de saber era trocar a
academia ativa, ver, e trocar de volta — mexendo no estado do app inteiro para
ler um número.

O controle MUST ser **discreto** e MUST ter a mesma forma do seletor de academia
da Home, que é o gesto que o usuário já conhece para essa pergunta. Ele MUST
ficar **na linha do título**, à direita, e MUST NOT ocupar espaço acima do
gráfico: o conteúdo do modal é o histórico.

O controle MUST NOT ser exibido quando existe **uma única academia** — não há
para onde ir, e um controle que visivelmente não faz nada é pior do que nenhum.

A lista de academias MUST começar **fechada** e abrir a partir do controle,
dentro do próprio modal. Ela MUST NOT ser um segundo diálogo sobre o primeiro:
duas camadas modais responderiam ambas ao Esc e escureceriam a tela duas vezes,
por uma lista de poucos nomes.

O modal MUST dizer **de qual peso** aquela linha do tempo é: o **global**, que
vale em todas as academias, ou a **exceção daquela academia**. Isso não é
rótulo: uma academia sem exceção resolve para o peso global, então duas
academias podem mostrar exatamente os mesmos registros — e sem essa linha a
repetição se lê como defeito em vez de como o ponto. O valor em vigor MUST
aparecer junto.

Trocar a academia vista MUST ser um **consulta**, não uma mudança de contexto:
a academia ativa, o card, o editor e o salvar MUST continuar sendo os da
academia em que o usuário está. Fechar o modal MUST devolver a leitura à
academia ativa, e reabrir MUST começar nela — não na última consultada.

A ação de **excluir registro** MUST estar disponível apenas na academia ativa.
Um excluir alcançável a partir de uma consulta é um excluir que ninguém quis
fazer.

Como o título do modal passa a valer para qualquer academia, ele MUST NOT mais
qualificar uma delas — a informação de escopo mora na linha descrita acima, onde
também cabe o valor.

#### Scenario: Ver o peso de outra academia
- GIVEN o usuário está na academia "A" e o exercício tem uma exceção na "B"
- WHEN abre o histórico e escolhe "B" no controle do título
- THEN vê o peso e o histórico da exceção da "B"
- AND o modal informa que aquele peso é só daquela academia

#### Scenario: Uma academia sem exceção mostra o global, e diz isso
- GIVEN a academia "A" não tem exceção para o exercício
- WHEN o usuário abre o histórico
- THEN vê a linha do tempo do peso **global**
- AND o modal informa que aquele peso vale em todas as academias

#### Scenario: Consultar não muda a academia ativa
- GIVEN o usuário está na academia "A"
- WHEN olha a "B" no modal e fecha
- THEN o card continua mostrando o peso da "A"
- AND a academia ativa não mudou

#### Scenario: Reabrir começa na academia ativa
- GIVEN o usuário consultou a "B" e fechou o modal
- WHEN abre o histórico de novo
- THEN o controle mostra a academia ativa, não a última consultada

#### Scenario: Não dá para excluir o registro de outra academia
- GIVEN o modal aberto na academia ativa, com a ação de excluir disponível
- WHEN o usuário passa a olhar outra academia
- THEN nenhum registro oferece a ação de excluir

#### Scenario: Uma academia só, nenhum controle
- GIVEN o aparelho tem uma única academia
- WHEN o usuário abre o histórico
- THEN não há controle de troca de academia

## MODIFIED Requirements

### Requirement: Edit and Save Weight

O peso alvo MUST continuar exigindo **editar → salvar** explícito, com o
**mesmo editor** disponível no detalhe do exercício no catálogo e no detalhe do
exercício em sessão (aba Execução) enquanto a sessão está **em andamento**.
Ambos editam o peso que vale para a academia da sessão/ativa — global ou
exceção, conforme a flag "Só nessa academia" — e, ao salvar, anexam um registro
de histórico **na mesma chave em que o peso foi gravado**. Não existe peso de
sessão. Numa sessão **concluída** o editor é exibido **somente-leitura**.

O editor MUST abrir num **popup ancorado ao topo da tela**, e não crescendo o
cartão no lugar.

CHANGED: o cartão crescia ao abrir — stepper, unidades, "Só nessa academia",
Cancelar/Salvar — e vive abaixo da mídia, então as ações terminavam sob a barra
fixa: o usuário digitava o peso e não via onde salvar. Aquilo foi remendado com
uma **rolagem até o topo**, que disputava com o foco automático do campo e ainda
assim fazia a página saltar. O popup **remove o problema** em vez de persegui-lo:
o formulário não divide layout com nada, e por isso não há mais rolagem a fazer,
a proteger, nem a desfazer.

**Ao topo, e não ao rodapé**, porque o campo é digitado: o teclado virtual ocupa
a metade de baixo da tela, e um painel ancorado embaixo abriria com o próprio
Salvar debaixo dele — exatamente a falha que a rolagem existia para evitar.

O cartão MUST continuar legível atrás do popup, e fechar — por Cancelar, por
Salvar ou por Esc — MUST devolver a tela como estava, com o valor atualizado no
cartão quando houve gravação.

O comportamento MUST NOT depender de qual das duas telas abriu o editor: o
editor é um componente só.

O botão do **histórico** MUST continuar alcançável durante a edição (ver *Weight
History Opens in a Modal*). Como o popup cobre o cartão em que ele mora, o
próprio popup MUST oferecê-lo, na sua linha de título.

Abrir o histórico **de dentro** do editor MUST empilhar os dois sem que um
gesto feche o outro por acidente: `Esc` MUST fechar **apenas o de cima**. Jogar
fora um peso meio digitado para dispensar uma lista seria uma troca ruim.

#### Scenario: Edit then save
- GIVEN "Rosca Direta" resolve para 20 KG na academia ativa
- WHEN o usuário toca em editar, muda para 22,5 e salva com a flag desmarcada
- THEN o peso global passa a 22,5 KG

#### Scenario: Change the unit
- GIVEN "Rosca Direta" é 20 KG globalmente
- WHEN o usuário edita a unidade para "LB" e salva com a flag desmarcada
- THEN o registro global passa a ter unidade "LB"

#### Scenario: Edit from the in-session detail updates the same weight
- GIVEN uma sessão em andamento na academia "A" e "Rosca Direta" resolvendo para 20 KG
- WHEN o usuário edita para 25 KG no detalhe do exercício da sessão e salva com a flag desmarcada
- THEN o peso global passa a 25 KG e um registro de histórico global é anexado
- AND o detalhe do exercício no catálogo mostra 25 KG

#### Scenario: In-session exception
- GIVEN uma sessão em andamento na academia "A" e peso global 25 KG
- WHEN o usuário salva 20 KG com a flag **marcada**
- THEN a academia "A" passa a ter exceção de 20 KG
- AND o restante do app segue com 25 KG fora de "A"

#### Scenario: Editar abre um popup no topo
- GIVEN o detalhe de um exercício, com o cartão de peso abaixo da mídia
- WHEN o usuário toca em "Editar"
- THEN o formulário abre num popup ancorado ao topo da tela
- AND Cancelar e Salvar estão visíveis sem que o usuário role
- AND a página atrás não é rolada

#### Scenario: O mesmo popup no catálogo e na sessão
- GIVEN o detalhe do mesmo exercício aberto pelo catálogo e depois em sessão
- WHEN o usuário toca em "Definir"/"Editar"
- THEN o popup abre igual nos dois

#### Scenario: Fechar devolve a tela
- GIVEN o popup de edição aberto
- WHEN o usuário cancela, ou pressiona Esc
- THEN o popup fecha, nada é gravado e a tela volta como estava

#### Scenario: Salvar atualiza o cartão atrás
- GIVEN o popup aberto com um valor novo digitado
- WHEN o usuário salva
- THEN o popup fecha e o cartão mostra o valor novo

#### Scenario: O histórico continua ao alcance durante a edição
- GIVEN o popup de edição aberto num exercício com histórico
- WHEN o usuário procura o histórico
- THEN o botão está na linha de título do próprio popup
- AND abri-lo mostra a linha do tempo sobre o editor

#### Scenario: Esc fecha só o de cima
- GIVEN o histórico aberto a partir do popup de edição
- WHEN o usuário pressiona Esc
- THEN o histórico fecha
- AND o popup de edição continua aberto, com o que já foi digitado

---

---

## REMOVED

(None)
