# Delta: weights

**Change ID:** `step-through-the-exercise-list`
**Affects:** seletor de academias dentro do modal do histórico de peso

---

## MODIFIED Requirements

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

Cada academia da lista MUST exibir, ao lado do nome, **o peso que vale nela**
para aquele exercício. A lista existe para ser **comparada**, e uma comparação
que custa um toque por academia — perdendo o número anterior no caminho — não é
uma comparação. Com o peso na linha, a pergunta "onde eu levanto quanto" se
responde de uma olhada, e trocar de academia passa a ser o gesto de quem quer o
**histórico**, não o número.

O peso exibido MUST ser o que **vale** naquela academia: a exceção dela quando
existe, e o peso global quando não. Uma academia sem peso algum MUST exibir uma
marca de ausência, e MUST NOT exibir zero — zero é um peso, e nenhum peso não é.

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

#### Scenario: Cada academia mostra o próprio peso na lista
- GIVEN o exercício tem peso global 22,5 KG e uma exceção de 60 KG na "B"
- WHEN o usuário abre a lista de academias no modal
- THEN a "B" aparece com 60 KG
- AND as demais aparecem com 22,5 KG, que é o peso que vale nelas

#### Scenario: Sem peso algum, nenhum zero
- GIVEN um exercício sem peso global e sem exceção
- WHEN o usuário abre a lista de academias
- THEN as academias aparecem com uma marca de ausência, e não com zero

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

---

## REMOVED

(None)
