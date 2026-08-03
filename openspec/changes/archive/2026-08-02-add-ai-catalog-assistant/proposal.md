# Proposal: Assistente de IA para o catálogo (categorias, exercícios e dias)

**Change ID:** `add-ai-catalog-assistant`
**Created:** 2026-08-02
**Status:** Implementado — falta a verificação com token real (ver `tasks.md`)

---

## Nota sobre o provedor

Esta proposta nasceu apontando para a API do Claude (o pedido original falava em
"API do Claude Code" — Claude Code é um CLI, não uma API). Durante a
implementação ficou claro que a assinatura do Claude Code **não dá acesso à API
de chat**: o token de sessão autentica, mas não carrega quota da Messages API,
e a única saída seria uma API key paga à parte.

A integração passou então para a **API do Gemini, do Google**, que é a que o
usuário vai efetivamente usar. O que muda é a camada de transporte; o desenho da
feature — conversa, proposta como chamada de função, aceite por seção, aplicação
transacional preservando ids — sobreviveu inteiro à troca, o que é um bom sinal
de que a fronteira estava no lugar certo.

Duas coisas mudaram de forma **não** cosmética e estão detalhadas em
"Architecture Considerations": como o catálogo é cacheado, e o que garante o
formato da proposta.

## Problem Statement

Reorganizar o catálogo hoje é trabalho manual, tela por tela. Redistribuir os
exercícios entre os dias, arrumar categorias mal atribuídas ou preencher as
imagens que faltam significa abrir **Configurações → Dias**, editar um dia de
cada vez, depois **Exercícios**, um de cada vez. Para um catálogo com dezenas de
exercícios isso é dezenas de toques e nenhuma visão do todo.

Quem é afetado: o próprio dono do aparelho — o app é local e sem login, então
não há treinador do outro lado para fazer esse rearranjo.

O que dói:

- **Rearranjo em massa não existe.** Não há como pedir "equilibra o volume entre
  os 4 dias" — só mover exercício por exercício.
- **Nenhuma visão do conjunto.** As telas mostram um dia ou um exercício; nada
  mostra "peito aparece em 3 dias e costas em nenhum".
- **Trabalho chato e repetitivo.** Categorizar 60 exercícios ou caçar uma
  imagem para cada um é exatamente o tipo de tarefa que ninguém faz até o fim.
- **Um pedido de uma frase raramente basta.** "Monta um treino melhor" depende
  de quantos dias por semana, de quanto tempo por treino, de lesão, de foco. Uma
  caixa de texto de tiro único ou recebe um pedido incompleto e chuta, ou obriga
  o usuário a escrever um parágrafo antes de ver qualquer coisa.

## Proposed Solution

Uma tela nova em **Configurações → Assistente (IA)** que é uma **conversa**. O
usuário escreve o que quer; o Gemini responde. Quando falta informação para
decidir bem, ele **pergunta** ("quantos dias por semana você treina?", "quer
manter o dia de pernas separado?"). Quando julga que já tem o suficiente, ele
**pergunta se pode gerar** — e só gera quando o usuário confirma. Se o primeiro
recado já vier completo ("tenho 4 dias, foco em costas, redistribui e já gera"),
ele **não pergunta nada** e vai direto à proposta.

A proposta chega **dentro da conversa**, como um cartão com o resumo do que foi
feito, separado por seção — **categorias**, **exercícios**, **dias** — cada uma
podendo ser aplicada ou deixada de fora. Por padrão vem tudo marcado, então
aceitar inteiro continua sendo um toque. Rejeitar não grava nada e a conversa
**continua do ponto em que estava** — o usuário diz "quase isso, mas mantém o
dia 1" e o Gemini ajusta, sem recomeçar.

Componentes:

- **Chave.** Campo em Configurações que guarda a chave da API no aparelho
  (`localStorage`, como a preferência de fonte). Sem chave, a tela explica o que
  é preciso e não deixa conversar.
- **Catálogo como contexto da conversa.** Categorias, exercícios e dias vão
  como JSON no início da conversa — **não** academias, pesos, notas, fotos,
  histórico nem treinos. O modelo enxerga o catálogo o tempo todo, sem que o app
  precise reenviá-lo a cada turno.
- **Proposta como chamada de função.** O catálogo alterado não é o formato de
  toda resposta — é uma **função** (`propor_catalogo`) que o Gemini chama quando
  decide que está pronto. Turno de texto é conversa; chamada de função é
  proposta. O schema da função orienta o formato, mas quem **garante** é a
  validação do app antes de gravar (ver Architecture); a decisão do usuário
  (aceitou, aceitou em parte, recusou) volta como a **resposta** dessa função —
  que é o que faz a conversa seguir natural depois de uma recusa.
- **Chamada à API.** SDK oficial `@google/genai` rodando no navegador,
  carregado sob demanda (`import()` dinâmico). Modelo `gemini-2.5-flash-lite`
  (o mais barato da família 2.5), com a
  resposta em streaming para o texto aparecer conforme sai.
- **Aplicação transacional.** Aceitar substitui categorias, exercícios e dias
  numa única transação Dexie, **preservando os ids existentes** para que pesos,
  notas, fotos e treinos continuem apontando para o exercício certo.

Resultado esperado: quem sabe o que quer resolve em uma frase; quem não sabe
chega lá conversando — e ninguém grava nada sem ver antes.

## Scope

### In Scope

- Campo da chave da API em Configurações, salvo no aparelho, com opção de apagar.
- Tela de conversa: histórico de mensagens, campo de texto, envio, streaming da
  resposta.
- Catálogo (categorias + exercícios + dias) como contexto da conversa.
- O assistente pergunta quando falta informação, e **não** pergunta quando o
  pedido já basta.
- Confirmação antes de gerar, quando foi o assistente que tomou a iniciativa.
- Proposta como cartão na conversa, com resumo por seção e **Aceitar** /
  **Rejeitar**.
- **Aceite parcial por seção** (categorias / exercícios / dias), com as
  dependências entre seções calculadas e respeitadas.
- Rejeitar continua a conversa; o assistente sabe o que foi recusado — e, no
  aceite parcial, o que ficou de fora.
- Aplicação transacional preservando ids e as referências cruzadas.
- Conversa sobrevive à navegação dentro do app (memória), some ao recarregar.
- Tratamento de erro (sem internet, chave inválida, resposta fora do formato,
  limite de uso) sem tocar nos dados.

### Out of Scope

- **Pesos, notas, fotos, histórico e sessões** — nem enviados, nem alterados.
- **Academias** — fora do catálogo compartilhado; permanecem intocadas.
- **Persistir a conversa entre execuções do app.** Recarregar começa do zero.
- Editar a proposta na mão antes de aceitar — é aceitar, rejeitar, ou pedir
  ajuste conversando.
- **Aceite parcial mais fino que a seção** — não dá para escolher exercício por
  exercício, nem para aplicar "metade dos dias".
- **Aplicar depois o que ficou de fora**, a partir do mesmo cartão. O catálogo
  mudou; o resto da proposta antiga foi calculado contra um estado que já não
  existe. Pede-se de novo, conversando.
- Backend, proxy ou qualquer servidor. O app continua sem servidor.
- Escolha de modelo pelo usuário ou qualquer painel de configuração avançada da
  API.
- Verificação de que uma URL de imagem sugerida pelo Gemini realmente carrega —
  vale a mesma validação de formato que o formulário de exercício já faz.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | Não | Nenhuma tabela ou índice novo. O assistente escreve nas tabelas `categories`, `exercises` e `days` que já existem. |
| API | Sim | Primeira chamada de rede do app: `generateContentStream` do Gemini, com function calling e streaming, via `@google/genai` no navegador. |
| State | Sim | Store persistido (`zustand` + `persist`) para o token; store **em memória** para a conversa, para ela sobreviver à navegação sem virar dado gravado. |
| UI | Sim | Nova linha em `SettingsPage`, nova rota `/settings/assistant`, nova página de conversa com bolhas de mensagem, cartão de proposta e barra de envio. |
| Build | Sim | Nova dependência `@google/genai`, isolada num chunk carregado sob demanda. |
| Backup | Não | O token é preferência do aparelho, não dado do usuário — fica **fora** do backup, como o tamanho da fonte. A conversa também não é exportada. |

## Architecture Considerations

**Encaixa no padrão existente de Configurações.** A página segue `BackBar` +
`.screen`, como `DataPage` e `AppearancePage`, com a barra de envio usando o
mesmo tratamento de teclado (`keyboardInset`) que os formulários já usam. O token
segue `src/state/settings.ts`: store `zustand` com `persist`.

**Chamada de função é o que separa conversar de propor.** Se toda resposta fosse
um JSON de catálogo, o assistente não teria como fazer uma pergunta. Declarando
a proposta como função, um turno de texto é conversa e uma chamada de função é
proposta — sem heurística e sem parsing de markdown.

**O que garante o formato mudou de lugar.** O desenho original contava com o
`strict: true` da API anterior, que rejeitava argumentos fora do schema. O
dialeto de schema do Gemini é um subconjunto do OpenAPI: não tem
`additionalProperties`, então não há como proibir uma chave extra, e o análogo
mais próximo é `functionCallingConfig.mode: VALIDATED`. Na prática isso
**move a garantia para o app**: `validateProposal` já checava ids, referências,
nomes e URLs de mídia antes de gravar qualquer coisa, e agora é ela — não a API
— o portão. É uma perda menor do que parece, porque nada nunca foi aplicado sem
passar por ela.

**A decisão do usuário é o resultado da ferramenta.** Aceitar responde
"aplicado" mais o catálogo já com os ids reais que foram atribuídos aos itens
novos; rejeitar responde "recusado" mais o que o usuário escreveu junto. Isso
resolve duas coisas de uma vez: a conversa continua no formato que a API já
espera, e depois de aceitar o Gemini sabe os ids novos — sem o que um segundo
pedido na mesma conversa proporia em cima de um catálogo desatualizado.

**Aplicar a proposta é o mesmo problema que importar um backup.** O código de
`src/data/portability.ts` já sabe substituir tabelas dentro de uma transação e
já sabe consertar alternativas assimétricas (`normalizeAlternatives`). A
aplicação reaproveita essa normalização em vez de reescrevê-la — e por isso o
modelo não precisa acertar a simetria das alternativas.

**Ids são o contrato.** O JSON enviado carrega os ids reais. O modelo devolve o
mesmo id para o que já existia, `null` para o que é novo, e omite o que deve ser
apagado. Preservar os ids é o que mantém pesos por academia, notas, fotos e
sessões apontando para o exercício certo — a mesma razão pela qual
`importBackupReplaceAll` restaura com os ids originais.

**Aceite parcial é uma questão de dependência, não de preferência.** As três
seções não são independentes: um dia aponta para exercícios, um exercício aponta
para categorias, e nada aponta para dias — `categorias ← exercícios ← dias`.
Aplicar "dias" sem "exercícios" pode deixar um dia referenciando exercício que
nunca foi criado. Mas só *pode*: se a proposta de dias apenas reordena
exercícios que já existem, não há dependência alguma. Por isso a regra não é
fixa — o app **calcula**, para aquela proposta, quais seções cada seção
selecionada realmente exige, e uma seção exigida não pode ser desmarcada
enquanto quem depende dela estiver marcado. A tela diz por quê, em vez de
desmarcar coisas sozinha.

**O cascade de remoção não é opcional.** Se a proposta apaga um exercício e o
usuário aplica "exercícios" sem aplicar "dias", o exercício ainda tem que sumir
dos dias que já existiam — senão fica um dia apontando para um id morto. Esse
desligamento é integridade do banco, não conteúdo da seção "dias": roda sempre
que a remoção é aplicada, marcada ou não a seção que a acompanha.

**A conversa cresce; o catálogo não.** O catálogo entra uma vez, no
`systemInstruction`, e vira prefixo estável de todos os turnos seguintes. Isso
mantém o payload pequeno e é o que permitiria cache — mas **o cache não foi
observado**: `cachedContentTokenCount` deu zero em quatro execuções do spike, em
todos os turnos, com prefixo de ~4000 tokens. O Gemini faz cache implícito sem
marcador para posicionar, então não há o que ajustar do nosso lado; a hipótese
mais provável é que ele não considere o `systemInstruction` parte do prefixo
cacheável, o que só se resolveria movendo o catálogo para a primeira mensagem
de `contents` — mudança de desenho que não vale a pena sem evidência.

**Isso é custo, não correção.** Um catálogo de ~3000 tokens reenviado a cada
turno de uma conversa curta é uma conta modesta, e nada no app depende do cache
para funcionar. Ficou registrado como observação em vez de virar promessa não
cumprida no spec.

**Padrão novo: chamada de rede.** É a primeira vez que o app fala com um
servidor. Isso é contido de propósito — a chamada existe só nesta tela, o SDK só
é baixado quando a tela abre, e nenhuma outra parte do app passa a depender de
internet. O compromisso "offline-first" continua valendo para tudo que não seja
esta tela.

**A chave fica no navegador, e isso é inerente.** Sem backend não há onde
esconder a chave: ela mora no `localStorage` e a chamada sai do navegador. A
tela precisa dizer isso ao usuário em vez de esconder. **CORS confirmado:** o
preflight para `generativelanguage.googleapis.com` devolve a origem refletida e
permite `x-goog-api-key`, então vale para o dev server e para o domínio de
produção igualmente.

**Streaming não é enfeite num chat.** Sem ele, o turno inteiro aparece de uma
vez depois de uma pausa longa — e no `gemini-2.5-flash-lite` o pensamento é ligado por
padrão e vem sem conteúdo visível, o que alonga a pausa. A tela usa `stream()` +
`finalMessage()`: o texto aparece conforme sai, e o `finalMessage()` entrega a
chamada de ferramenta quando ela existe.

## Success Criteria

- [ ] "Quero treinar 4 dias por semana" leva a uma ou mais perguntas do
      assistente, e não a uma proposta chutada.
- [ ] "Tenho 4 dias, foco em costas, redistribui e já gera" leva direto à
      proposta, sem pergunta nenhuma.
- [ ] Quando o assistente toma a iniciativa, ele pergunta antes de gerar e só
      gera após o "pode".
- [ ] Nada é gravado no IndexedDB antes de **Aceitar** — rejeitar deixa o banco
      byte a byte igual.
- [ ] Rejeitar com "mantém o dia 1 como está" produz uma proposta nova que
      respeita isso, sem o usuário reexplicar o resto.
- [ ] Aplicar só "categorias" de uma proposta deixa exercícios e dias como
      estavam, e o catálogo continua íntegro.
- [ ] Uma seção da qual outra selecionada depende não pode ser desmarcada
      sozinha, e a tela explica por quê.
- [ ] Depois de aceitar — inteiro ou em parte — um pedido seguinte na mesma
      conversa parte do catálogo já aplicado, com os ids novos, e o assistente
      sabe o que ficou de fora.
- [ ] Depois de aceitar uma redistribuição, os pesos por academia, notas e fotos
      dos exercícios afetados continuam aparecendo (ids preservados).
- [ ] Sem internet, sem token ou com token inválido, a tela dá uma mensagem
      clara e o catálogo fica intacto.
- [ ] Navegar para outra tela de Configurações e voltar mantém a conversa.
- [ ] O bundle inicial do app não cresce com o SDK (chunk separado, carregado só
      ao abrir a tela).
- [ ] O token não aparece no backup exportado.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Chave da API exposta no navegador (qualquer script na página lê o `localStorage`) | Alta | Alto | Inerente a um app sem backend — não dá para eliminar, só declarar. A tela avisa em texto; recomenda uma chave dedicada, com limite de gasto, e oferece apagar o token. |
| Assistente pergunta demais e o usuário desiste antes de ver qualquer coisa | Média | Médio | O prompt manda perguntar só o que muda a proposta, agrupar perguntas num turno só, e nunca perguntar o que dá para inferir do catálogo. O caminho de tiro único ("já gera") é testado explicitamente. |
| Assistente gera sem confirmar, ou fica esperando confirmação que já veio | Média | Médio | Regra explícita no prompt e cenários de spec dos dois lados: confirmação obrigatória quando a iniciativa é dele, proibida quando o usuário já disse "gera". |
| O modelo propõe um catálogo que apaga exercícios sem o usuário perceber | Média | Alto | O cartão de proposta destaca remoções com contagem própria e em cor de alerta; a tela sugere exportar um backup antes de aceitar. Aceitar é sempre um toque explícito. |
| CORS bloqueia a chamada direta do navegador | Baixa | Alto | Verificar logo na primeira tarefa do apply, antes de construir a UI em cima. Sem isso, a mudança não tem caminho sem backend e precisa voltar para revisão. |
| Conversa longa estoura contexto ou fica cara | Baixa | Médio | Catálogo cacheado como prefixo; conversa some ao recarregar; erro de contexto vira mensagem clara ("conversa muito longa, comece outra"), nunca aplicação parcial. |
| Ids inventados ou trocados quebram pesos/fotos/sessões | Média | Alto | Validação antes de aplicar: todo id não-nulo tem que existir no catálogo atual; referência desconhecida rejeita a proposta inteira. Alternativas passam pela normalização que a importação já usa. |
| Catálogo desatualizado depois de aceitar, dentro da mesma conversa | Média | Alto | O resultado da ferramenta devolve o catálogo aplicado, com os ids novos — o Gemini nunca propõe em cima de um estado que já mudou. |
| Aceite parcial deixa o catálogo inconsistente (dia apontando para exercício não criado) | Média | Alto | Dependências calculadas por proposta e travadas na seleção; validação roda sobre o subconjunto escolhido, não sobre a proposta inteira; o cascade de remoção roda independentemente da seleção. |
| Usuário aplica em parte e acha que aplicou tudo | Média | Médio | O cartão decidido mostra o que entrou e o que ficou de fora; o `tool_result` diz as duas coisas, então o assistente também não se engana no turno seguinte. |
| Custo por conversa surpreende o usuário | Média | Baixo | Cada envio é um toque explícito; a tela diz que a conversa consome a cota da conta Google do próprio usuário. |
| O app deixa de ser "offline, local-only" na percepção do usuário | Baixa | Médio | Recurso opt-in, numa tela só, sem token configurado por padrão; o rodapé de Configurações continua verdadeiro para todo o resto. |

---

## Archive Information

**Archived:** 2026-08-02
**Duration:** 1 dia (proposta, implementação e troca de provedor no mesmo dia)
**Outcome:** Implementado e arquivado **com um defeito aberto** (ver abaixo)

### Defeito conhecido, arquivado junto

Em 4 de 4 execuções do spike, o `gemini-3.5-flash-lite` citou num dia um `ref`
que não havia declarado na lista de exercícios. **Nenhum dado corre risco** — a
validação recusa a proposta inteira antes de qualquer escrita —, mas o usuário
perde a rodada quando acontece.

Mitigações aplicadas (levaram de 2 refs pendentes para 1, sem zerar):
- regra explícita no prompt para copiar o `ref`, nunca construí-lo;
- esquema de `ref` mudado de chave inventada para **id em texto** nas entidades
  que já existem, tirando a invenção da jogada.

Caminhos, se voltar a incomodar: subir para `gemini-3.5-flash`; ou um turno de
autocorreção (devolver o erro de validação ao modelo e pedir a correção), que
seria escopo novo.

### Também não verificado

- **Cache do catálogo:** `cachedContentTokenCount` = 0 em todas as execuções.
  Reclassificado de requisito para observação — é custo, não correção.
- **4.2–4.5:** comportamento sob teclado, viewport de celular e fonte no
  extremo, e os fluxos de aceite/rejeição contra o Gemini real. Dispensadas por
  decisão do usuário: a verificação real só é viável em produção, e os testes
  que envolvem a API ficam mockados.

### Files Modified

- `src/data/catalogContract.ts` — contrato de wire (tipos, seções, schema da função)
- `src/data/catalogPayload.ts` — leitura do catálogo do banco
- `src/data/catalogProposal.ts` — impacto, dependências, validação, aplicação transacional
- `src/data/alternativesRepair.ts` — reparo de simetria, compartilhado com a importação de backup
- `src/data/portability.ts` — passou a usar o reparo compartilhado
- `src/lib/geminiClient.ts`, `geminiModel.ts`, `geminiPrompt.ts` — integração
- `src/state/assistantToken.ts`, `assistantChat.ts` — credencial e conversa
- `src/features/settings/AssistantPage.tsx`, `assistant.css`, `SettingsPage.tsx`
- `src/App.tsx` — rota `/settings/assistant`
- `scripts/spike-gemini.mts` — verificação do contrato contra a API real
- Testes: `catalogProposal.test.ts`, `assistantToken.test.ts`,
  `assistantChat.test.ts`, `assistant.integration.test.tsx`
- `vitest.setup.ts` — polyfill de `scrollIntoView` (jsdom não tem layout)

### Specs Updated

- `openspec/specs/ai-assistant/spec.md` — capacidade nova (8 requisitos, 44 cenários)
- `openspec/project.md` — decisão 8: uma tela fala com a rede, e só se pedirem
