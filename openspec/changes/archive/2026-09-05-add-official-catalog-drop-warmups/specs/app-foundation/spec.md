# Delta: app-foundation

**Change ID:** `add-official-catalog-drop-warmups`
**Affects:** convite de dados de exemplo na primeira execução, estados vazios,
escolha da arte de abertura em Aparência

---

## ADDED Requirements

### Requirement: User-Selectable Boot Splash

As Configurações MUST oferecer, em **Aparência**, a escolha da **arte de
abertura** entre um conjunto **curado** — hoje "Vazio", "Homem" e "Mulher". A
escolha MUST ser **local do aparelho**, como o tamanho da fonte e a cor de
destaque, e MUST NOT entrar no backup: ela descreve como este aparelho se abre,
não o que o usuário registrou nele.

O seletor MUST mostrar **a própria arte**, e não uma lista de nomes: o que se
escolhe é uma imagem, e escolher às cegas entre três nomes não é escolher.

A lista MUST ser **governada**, como a das cores: cada opção vem de um master
versionado e é gerada por `npm run splash`. O app MUST NOT aceitar uma URL
arbitrária — a abertura precisa pintar **offline, no primeiro quadro**, e uma
imagem que possa faltar deixaria o app abrindo em preto.

A arte **padrão** MUST ser a que **não traz pessoa alguma**: uma instalação nova
não deve atribuir uma figura ao seu dono antes que ele diga qualquer coisa.

A escolha MUST valer **a partir da próxima abertura**, e a tela MUST dizer isso.
Não é limitação a corrigir: a abertura existe justamente para cobrir o intervalo
antes de o pacote carregar, então nada que o React renderize pode alcançá-la a
tempo. Ela MUST, portanto, ser lida de forma **síncrona, antes do primeiro
quadro**, do mesmo armazenamento onde as preferências já estão — e um valor
ausente, ilegível ou desconhecido MUST cair na arte padrão, nunca em nenhuma.

As **imagens de lançamento do iOS** MUST continuar vindo da arte **padrão**
apenas. O iOS as resolve na instalação, a partir de `<link>` estáticos, e não há
como trocá-las em execução; gerar as vinte por arte custaria ~9 MB cada por uma
imagem que o sistema mostra num instante. A consequência MUST ser aceita: num
iPhone com outra arte escolhida, o sistema mostra a padrão no instante que é
dele e o app mostra a escolhida no instante que é seu. No Android, onde não
existe imagem de lançamento do sistema, só a escolhida aparece.

O **restaurar padrão** de Aparência MUST devolver também a arte de abertura.

#### Scenario: Escolher a arte de abertura
- GIVEN o usuário abre Configurações → Aparência
- WHEN olha a seção da tela de abertura
- THEN vê as artes disponíveis como imagens, com a atual marcada
- AND pode escolher outra

#### Scenario: A escolha vale na próxima abertura
- GIVEN o usuário escolhe outra arte
- WHEN fecha e abre o app de novo
- THEN a abertura mostra a arte escolhida
- AND a tela avisou, antes, que valeria a partir da próxima vez

#### Scenario: Padrão sem pessoa
- GIVEN um aparelho onde a escolha nunca foi feita
- WHEN o app abre
- THEN a arte exibida é a que não traz pessoa alguma

#### Scenario: Um valor que não dá para ler não deixa o app sem abertura
- GIVEN o armazenamento local está bloqueado, vazio ou com um valor desconhecido
- WHEN o app abre
- THEN a arte padrão é exibida
- AND nada na abertura falha por causa disso

#### Scenario: A escolha não viaja no backup
- GIVEN o usuário escolheu uma arte diferente da padrão
- WHEN exporta o backup completo
- THEN o documento não contém a escolha
- AND restaurar esse backup em outro aparelho não muda a abertura dele

---

## MODIFIED Requirements

### Requirement: First-Launch Example Data Prompt

The app MUST ask the user, the **first time it is opened on a device**,
whether to load the bundled sample routine (see "Generate Example Data" in
the data-portability spec). Whether the user accepts or declines, the app
MUST remember locally on the device that the user has been asked, so the
prompt is shown **at most once** per device. This "already asked" flag is
**device-local** (like the font-size preference) and MUST NOT be part of the
exported/imported data backup. Accepting MUST run the same sample-data
generation used by "Gerar exemplo" in Settings. Declining MUST leave the app
without any generated data; the user can still generate the sample later from
Settings. A device that **already has registered data** the first time this
capability runs (e.g. an existing installation upgrading to a build that
includes this feature) MUST be treated as already-asked and MUST NOT be
prompted retroactively.

"Dados cadastrados" significa dados **do usuário**, no banco. O catálogo
**oficial** MUST NOT contar: ele vem com o app e existe em toda instalação, então
contá-lo faria todo aparelho novo parecer já usado e o convite **nunca** seria
exibido para ninguém.

#### Scenario: First open offers the sample data
- GIVEN the app is opened for the first time on a device (no registered data, never asked before)
- WHEN the app finishes loading
- THEN the user is asked whether to load the sample exercises and training days

#### Scenario: O catálogo oficial não conta como dado cadastrado
- GIVEN um aparelho onde o app nunca foi usado, com o catálogo oficial visível na lista de exercícios
- WHEN o app termina de carregar
- THEN o convite de dados de exemplo é exibido normalmente

#### Scenario: Accepting loads the sample routine
- GIVEN the first-launch prompt is shown
- WHEN the user accepts
- THEN the bundled example routine is generated (the same result as tapping "Gerar exemplo" in Settings)
- AND the generated categories, exercises, days, gym, and weights are visible on Home

#### Scenario: Declining starts empty
- GIVEN the first-launch prompt is shown
- WHEN the user declines (or dismisses the prompt)
- THEN no data is created
- AND o usuário segue vendo o catálogo oficial na lista de exercícios
- AND the user can still generate the sample later from Settings → Backup → "Gerar exemplo"

#### Scenario: Prompt shown only once per device
- GIVEN the user has already been asked (accepted or declined) on this device
- WHEN the app is opened again
- THEN the first-launch prompt does not reappear

#### Scenario: Existing installs are not retroactively prompted
- GIVEN a device already has registered data (e.g. gyms or exercises) from before this capability existed
- WHEN the app is opened on a build that includes this capability for the first time
- THEN the device is treated as already-asked and the first-launch prompt is not shown

---

## REMOVED

(None)
