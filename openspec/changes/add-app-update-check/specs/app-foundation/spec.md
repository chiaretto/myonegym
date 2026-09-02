# Delta: app-foundation

**Change ID:** `add-app-update-check`
**Affects:** Configurações (grupo "App"), registro do service worker, build

---

## ADDED Requirements

### Requirement: Update the App From Settings

As Configurações MUST oferecer um caminho explícito para **atualizar o app**,
numa página dedicada alcançável por uma linha no grupo "App", ao lado de
"Instalar app".

O caminho existe porque o navegador **não é confiável** para isso no modo que o
app recomenda. Uma versão nova só é descoberta quando há uma navegação dentro do
escopo do service worker; o app instalado em `standalone` é aberto, suspenso e
retomado sem navegar, e pode servir a mesma versão por semanas. Sem esta tela, a
única saída conhecida é desinstalar e instalar de novo.

A tela MUST informar a **versão instalada** — identificador da versão e quando o
build foi feito. Sem isso não há como confirmar que a atualização pegou, que é a
primeira pergunta de quem chegou até aqui. Esse dado MUST vir do **build**, e
MUST NOT ser um valor digitado à mão no código da tela: uma versão mantida
manualmente passa a mentir na primeira vez que alguém esquece de atualizá-la, e
mentir é o único defeito que esta tela não pode ter.

A ação de atualizar MUST relatar o que aconteceu, distinguindo pelo menos:

- **já está na versão mais recente** — nada a fazer, e a tela diz isso;
- **há uma versão nova** — ela está sendo aplicada, e a tela avisa que o app vai
  recarregar;
- **não foi possível verificar** — sem rede, ou a verificação falhou.

Os três MUST ser distinguíveis. Sem isso, "nada mudou na tela" cobriria os três
casos e o botão ficaria indistinguível de um botão quebrado.

Enquanto a verificação corre, o botão MUST estar indisponível, para que um
segundo toque não dispare uma segunda verificação sobre a primeira.

Onde **não existe service worker** — contexto não seguro, ou navegador sem
suporte — a tela MUST explicar a limitação e MUST NOT exibir um botão de
atualizar. É a mesma regra da tela de instalação: um botão que não faz nada ao
ser tocado é defeito.

#### Scenario: Trazer a versão nova a pedido
- GIVEN o app instalado está rodando uma versão antiga e há uma versão nova publicada
- WHEN o usuário abre Configurações → "Atualizar app" e toca em procurar atualização
- THEN a versão nova é baixada e aplicada
- AND o app recarrega já na versão nova

#### Scenario: Já está atualizado
- GIVEN o app está rodando a versão mais recente publicada
- WHEN o usuário procura atualização
- THEN a tela informa que já está na versão mais recente
- AND o app não recarrega

#### Scenario: Confirmar qual versão está rodando
- GIVEN o usuário abre a tela de atualização
- WHEN olha o estado do app
- THEN vê o identificador da versão instalada e quando ela foi construída
- AND depois de uma atualização bem-sucedida esse identificador é outro

#### Scenario: Sem rede
- GIVEN o aparelho está offline
- WHEN o usuário procura atualização
- THEN a tela informa que não foi possível verificar
- AND o app continua funcionando normalmente com a versão que já tem

#### Scenario: Navegador sem service worker
- GIVEN o app está aberto onde não há service worker registrado
- WHEN o usuário abre a tela de atualização
- THEN a tela explica que a atualização automática não está disponível ali
- AND nenhum botão de atualizar é exibido

### Requirement: The App Checks for a New Version on Its Own

O app MUST procurar uma versão nova **ao iniciar** e **ao voltar ao primeiro
plano**, sem que o usuário peça.

É a reposição do gatilho que falta. A verificação do service worker acontece na
navegação, e o app instalado não navega: retomar da bandeja não é navegar. O
retorno ao primeiro plano é o momento equivalente — é quando o usuário volta ao
app — e é onde a verificação deve acontecer.

Essa verificação MUST ser **silenciosa**: nenhuma faixa, aviso ou indicador de
progresso na tela. Encontrando uma versão nova, ela é aplicada pelo mesmo
caminho da atualização automática já existente; não encontrando, ou falhando
(offline é o caso comum), nada aparece — uma falha de rede numa verificação que
o usuário não pediu não é notícia dele.

Verificações sucessivas MUST respeitar um **intervalo mínimo**. Sem ele, alternar
entre apps dispararia uma busca de rede a cada troca, gastando bateria e dados de
quem só conferiu uma mensagem.

#### Scenario: Voltar ao app dispara a verificação
- GIVEN o app instalado ficou em segundo plano e há uma versão nova publicada
- WHEN o usuário volta ao app
- THEN a verificação acontece sem que ele peça
- AND a versão nova é aplicada

#### Scenario: Alternar entre apps não vira uma enxurrada de verificações
- GIVEN o usuário sai do app e volta várias vezes em poucos segundos
- WHEN o app volta ao primeiro plano de novo
- THEN uma nova verificação só acontece depois do intervalo mínimo

#### Scenario: Falha silenciosa
- GIVEN o aparelho está offline
- WHEN o app volta ao primeiro plano e a verificação automática falha
- THEN nada é exibido ao usuário
- AND o app continua funcionando normalmente

### Requirement: An Update Never Interrupts a Workout

Aplicar uma versão nova **recarrega a página**, e recarregar durante um treino
custa o que está apenas na tela: o cronômetro de descanso em andamento e a
posição da rolagem. O treino em si sobrevive (está no IndexedDB); a série que
estava sendo contada, não.

Por isso a verificação **automática** MUST NOT acontecer enquanto uma tela de
sessão de treino está em primeiro plano. A verificação é adiada, não cancelada:
ela volta a acontecer no próximo retorno ao primeiro plano fora da sessão.

O **botão** das Configurações MUST continuar funcionando em qualquer momento,
inclusive com um treino aberto. Quem toca nele está pedindo a atualização de
olhos abertos, e a tela avisa que o app vai recarregar.

#### Scenario: Nada recarrega durante o treino
- GIVEN o usuário está numa tela de sessão de treino, com o cronômetro correndo
- WHEN o app volta ao primeiro plano
- THEN nenhuma verificação automática é disparada
- AND o cronômetro continua de onde estava

#### Scenario: A verificação adiada acontece depois
- GIVEN uma verificação automática foi pulada por causa de um treino aberto
- WHEN o usuário encerra o treino e volta ao app mais tarde
- THEN a verificação acontece normalmente

---

## MODIFIED Requirements

### Requirement: Installable, Offline PWA

The application MUST be a Progressive Web App: installable to the home screen,
mobile-first, and fully usable **offline** with **no login and no backend**.

A instalação MUST ser oferecida **dentro do próprio app** (ver "Install the App
From Settings"), e não apenas pelo menu do navegador; e o app instalado MUST se
apresentar com ícone e tela de abertura próprios (ver "App Icon and Launch
Screen").

O mesmo vale para a **atualização**: o app instalado MUST oferecer, dentro dele,
como saber qual versão está rodando e como trazer a mais recente (ver "Update
the App From Settings"), em vez de depender do navegador perceber sozinho que
uma versão nova foi publicada.

O manifesto MUST declarar um **identificador de app estável**, de modo que o app
publicado sob um caminho base (`/myonegym/` no GitHub Pages) seja reconhecido como
a mesma aplicação entre visitas e após atualizações, em vez de aparecer como uma
instalação diferente.

Como o convite de instalação do navegador exige service worker e contexto seguro,
o ambiente de **desenvolvimento** MUST registrar o service worker, para que o
caminho de instalação possa ser exercitado sem depender do deploy. Continua valendo
que a verificação final acontece sobre HTTPS (ou `localhost`).

O service worker MUST ser registrado **uma única vez**. O registro pertence ao
código do app — é o que dá acesso ao registro para verificar atualizações sob
demanda —, e o registrador injetado automaticamente pelo empacotador MUST estar
desligado, sob pena de dois registros concorrentes do mesmo worker.

#### Scenario: Install to home screen
- GIVEN the app is served over HTTPS (or localhost)
- WHEN the user chooses "Add to Home Screen"
- THEN the app installs with a name and icon and launches standalone

#### Scenario: Works offline
- GIVEN the app has been opened once (assets cached)
- WHEN the device is offline
- THEN the user can open the app and access all previously stored data

#### Scenario: Instalar sem sair do app
- GIVEN o app está aberto em um navegador que permite instalar
- WHEN o usuário procura como instalá-lo
- THEN encontra o caminho nas Configurações do próprio app

#### Scenario: Atualizar sem sair do app
- GIVEN o app instalado está rodando uma versão antiga
- WHEN o usuário procura como atualizá-lo
- THEN encontra o caminho nas Configurações do próprio app

#### Scenario: Identidade estável do app instalado
- GIVEN o app publicado sob o caminho base de produção
- WHEN o usuário o instala e, mais tarde, volta ao site já com uma nova versão
- THEN o navegador reconhece a instalação existente em vez de tratá-la como outro app

#### Scenario: Um único registro do service worker
- GIVEN o app foi construído para produção
- WHEN a página carrega
- THEN o service worker é registrado uma vez só, pelo código do app

---

## REMOVED

(None)
