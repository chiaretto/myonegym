# Proposal: A proposta do assistente não pode falhar por ruído do modelo

**Change ID:** `fix-assistant-proposal-apply`
**Created:** 2026-08-03
**Status:** Implementation Complete
**Completed:** 2026-08-03

---

## Problem Statement

O assistente de IA conversa, gera a proposta, mostra o card — e ao aceitar o
usuário recebe **"Não consegui aplicar a proposta."** e nada mais. A proposta
fica pendente, sem nenhuma pista do que corrigir, e a única saída é recusar e
recomeçar a conversa.

A payload real anexada ao chamado permite reproduzir a falha inteira. Ela expõe
três problemas distintos, em camadas.

### 1. O erro genérico é um bug de tratamento, não de conteúdo

No retorno do Gemini, o exercício id 10 ("HIIT (Esteira ou Bike)") volta com:

```json
{"mediaUrl": "null", "id": 10, "categoryRefs": ["7"], "ref": "10", ...}
```

`"null"` é a **string** `null`, não o literal JSON. O catálogo enviado tinha
`"mediaUrl": null` corretamente; o modelo o devolveu como texto.

Ao aceitar, `validateProposal` chama `validateMediaUrl` (`src/db/repos.ts:157`),
que lança **`ValidationError`** — não `ProposalError`. O `catch` de
`accept` (`src/state/assistantChat.ts:190-198`) só reconhece `ProposalError`, e
qualquer outra coisa vira o texto genérico. Ou seja: existe uma mensagem exata
disponível ("URL inválida (use http:// ou https://)") e ela é jogada fora no
caminho.

Isso vale para **qualquer** erro que não seja `ProposalError` — inclusive falhas
do Dexie —, e é o que transforma um problema pequeno em beco sem saída.

### 2. Depois de corrigir a mensagem, a proposta continua irrecuperável

Na mesma payload, o modelo **omitiu** a categoria 7 (Cardio) da lista de
categorias, mas manteve o exercício 10 apontando para `categoryRefs: ["7"]`.
Com a causa 1 resolvida, o próximo passo de `validateProposal` lançaria
`ProposalError: referência a categoria desconhecida ("7")` — mensagem clara,
resultado idêntico: a proposta inteira é recusada por um vínculo pendurado.

Recusar tudo está certo quando a inconsistência é ambígua. Mas estes dois casos
não são ambíguos:

- uma `mediaUrl` que não é URL é **ruído de serialização** do modelo; o app já
  sabe qual é a URL guardada daquele exercício;
- um `ref` que não aponta para nada dentro da proposta é um **vínculo** que não
  pode existir; descartar o vínculo não apaga entidade nenhuma, e é exatamente o
  que a exclusão de categoria já faz hoje (o exercício fica sem categoria, nunca
  órfão) e o que o import de backup já faz com alternativas penduradas.

Hoje o app tem `mirrorSymmetric` para alternativas e nada equivalente para o
resto.

### 3. O que o modelo removeu não bate com o que ele disse ter removido

O `summary` afirma: *"removi os dias excedentes (Dias 4, 5 e 6) e os exercícios
de Trapézio (id 21, 22)"*. A lista de exercícios da proposta, porém, deixa de
fora **nove**: 5, 17, 21, 22, 23, 24, 25, 26, 27 — e duas categorias (Cardio,
Trapézio), apesar de manter um exercício apontando para Cardio.

Isso não é bug de código: é precisamente o risco que o gate aceitar/recusar
existe para conter, e o card já lista os nomes do que sumiria. O que este change
faz a respeito é garantir que essa lista seja **fiel ao que será aplicado** —
inclusive aos reparos — e que ela não fique escondida atrás de um número.

### 4. A conversa morre depois de uma recusa (reportado durante a implementação)

Recusar uma proposta e mandar a mensagem seguinte devolve **400**:

> Function call is missing a thought_signature in functionCall parts. This is
> required for tools to work correctly […] position 4.

A partir do Gemini 3, a part que traz a `functionCall` traz também um
`thoughtSignature` — um token opaco do raciocínio por trás da chamada — e a API
o exige de volta em todo turno seguinte. Ele estava lá na primeira payload deste
chamado (`"thoughtSignature": "EjQKMgER…"`), ao lado da `functionCall`, na mesma
part.

`runTurn` lia a chamada por `chunk.functionCalls[0]`, um atalho que entrega a
chamada e descarta a part em volta; `assistantChat` então remontava a part como
`{ functionCall: { name, args } }`. A assinatura nunca chegava à história.

Só aparece depois de uma proposta porque é o único caso em que a história tem
uma `functionCall` — enquanto a conversa é só texto, não há part assinada para
devolver.

## Proposed Solution

Três camadas, da mais externa para a mais interna:

**a) Nenhuma falha ao aplicar sem causa.** `applyCatalogProposal` embrulha
qualquer erro que não seja `ProposalError` num `ProposalError` que carrega a
mensagem original e diz em qual entidade aconteceu. O fallback em `accept`
deixa de ser um texto fixo e passa a incluir a mensagem do erro.

**b) Reparo conservador antes do card** — módulo novo `src/data/proposalRepair.ts`,
seguindo o padrão do `alternativesRepair.ts` já existente. Roda em
`assistantChat.send`, logo que a proposta chega, contra o catálogo atual, e
devolve `{ proposal, repairs }`:

| Ruído | Reparo |
|-------|--------|
| `mediaUrl` = `"null"`, `"undefined"`, `""`, só espaços | vira `null` |
| `mediaUrl` que não passa em `validateMediaUrl` | exercício existente: mantém a URL guardada; exercício novo: `null` |
| `categoryRef` que não existe na proposta | vínculo descartado (exercício fica sem aquela categoria) |
| `alternativeRef` que não existe na proposta, ou aponta para si mesmo | vínculo descartado |
| `exerciseRef` num dia que não existe na proposta | vínculo descartado (o exercício sai daquele dia) |
| `ref` duplicado, `id` duplicado, nome vazio, `id` que não existe mais | **não é reparado** — segue para a validação e recusa a proposta |

A regra que separa as duas colunas: **o reparo só descarta vínculo, nunca
entidade.** Nada que o reparo faz pode apagar exercício, categoria ou dia, nem
mudar o que o card promete remover.

**c) O card mostra o que foi reparado.** Uma linha por reparo, em português, na
proposta, antes de decidir — para que ninguém descubra depois que a foto de um
exercício sumiu. O `impact` continua sendo medido sobre a proposta **reparada**,
que é a que será aplicada.

**d) A história devolve a part do modelo intacta.** `runTurn` passa a ler a part
inteira (`candidates[0].content.parts`, não o atalho `functionCalls`) e a
entregá-la em `TurnResult.callPart`; `assistantChat` a ecoa em `contents` sem
tocar em nada.

Isso **reverte uma decisão desta proposta**: a versão aprovada mandava a proposta
*reparada* para a história. Como a assinatura é opaca, a única suposição segura é
que ela vale para a part inteira — argumentos inclusive —, então a part volta
verbatim. Nada se perde: o card e o apply continuam usando a proposta reparada, e
o que de fato aconteceu chega ao modelo pela resposta da função (`catalogo_atual`,
com os ids reais). Se o modelo repetir o mesmo ruído na próxima proposta, ele é
reparado de novo.

## Scope

### In Scope
- Envolver erros não-`ProposalError` no apply e propagar a causa até a conversa.
- `proposalRepair.ts`: reparo conservador de `mediaUrl` e de refs pendurados.
- Reparar antes de medir o impacto, montar o card e gravar em `contents`.
- Card do assistente lista os reparos aplicados.
- Testes com a payload real deste chamado como fixture.
- Preservar o `thoughtSignature` da chamada na história enviada ao Gemini.

### Out of Scope
- Mudar o schema da ferramenta ou o prompt para o modelo errar menos. É um
  caminho válido e complementar, mas o app precisa ser robusto ao retorno de um
  modelo qualquer — a correção fica no lado que temos controle.
- Reconciliar `summary` com as remoções de fato (problema 3): o card já lista os
  nomes removidos e o gate já existe. Detectar mentira no texto livre não é
  confiável.
- Retentar a chamada automaticamente pedindo correção ao modelo.
- Qualquer mudança em banco, migração ou no formato de export.

## Impact Analysis

| Component | Change Required | Details |
|-----------|-----------------|---------|
| Database | Não | Nenhuma tabela, índice ou migração muda |
| API | Não | Schema da ferramenta e prompt permanecem iguais |
| State | Sim | `assistantChat.send` repara antes de criar a entrada; `accept` propaga a causa real |
| UI | Sim | `AssistantPage` mostra a lista de reparos no card da proposta |

Arquivos previstos:

- `src/data/proposalRepair.ts` *(novo)* + `proposalRepair.test.ts` *(novo)*
- `src/data/catalogProposal.ts` — embrulhar erros no `applyCatalogProposal`
- `src/state/assistantChat.ts` — reparar em `send`, propagar causa em `accept`
- `src/features/settings/AssistantPage.tsx` — reparos no card
- `src/lib/geminiClient.ts` — ler a part inteira e devolvê-la em `callPart`
  + `geminiClient.test.ts` *(novo)*
- `src/styles/` — estilo da linha de reparo, junto do `.as-impact` existente

## Architecture Considerations

O reparo entra como uma camada nova entre "o que o modelo disse" e "o que o
usuário decide", com o mesmo formato do que já existe: `alternativesRepair.ts`
resolve a simetria de alternativas ao aplicar, e o import de backup já descarta
referências que não resolvem. `proposalRepair.ts` é a generalização disso para
o payload do assistente.

A ordem passa a ser: **resposta → reparo → impacto → card → decisão → validação
→ apply**. `validateProposal` continua sendo o portão real e não afrouxa em
nada: o reparo apenas garante que ela não seja acionada por ruído. Como
`applyCatalogProposal` relê o catálogo dentro da transação e revalida, uma
proposta reparada contra um catálogo que mudou desde então ainda é recusada —
o reparo não é atalho para pular a validação.

O reparo é uma função pura sobre `(snapshot, proposal)`, sem banco e sem React,
testável direto com a payload do chamado.

## Success Criteria

- [x] A payload real deste chamado aplica sem erro, com os reparos listados no card
- [x] Nenhum caminho de falha do `accept` produz mensagem sem causa
- [x] `mediaUrl` inválida de um exercício existente não sobrescreve a URL guardada
- [x] Um ref pendurado descarta o vínculo e **não** remove entidade nenhuma
- [x] Ref duplicado, nome vazio ou id inexistente continuam recusando a proposta inteira
- [x] O que o card promete remover é exatamente o que o apply remove
- [x] `npx tsc --noEmit` limpo e suíte de testes passando

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Reparo silencioso esconde perda de dado do usuário | Média | Alto | O reparo nunca remove entidade, só vínculo; e cada reparo aparece no card antes de decidir |
| Reparo mascara um retorno realmente quebrado, que deveria ser recusado | Baixa | Médio | A tabela de reparos é fechada e restrita a ruído inequívoco; tudo o mais segue para `validateProposal` |
| A proposta reparada divergir do que o modelo tem na história | Média | Baixo | A resposta da função devolve `catalogo_atual` com os ids reais depois de aplicar; é ela, não a chamada, que corrige a visão do modelo |
| A assinatura ser validada contra os argumentos, e não só exigida | Baixa | Alto | Por isso a part volta verbatim: nada nela é editado. Só uma chamada real à API confirma |
| Reparar `mediaUrl` para a URL guardada confundir quem pediu para trocar a foto | Baixa | Baixo | Só acontece quando a URL proposta é inválida — não havia troca válida a fazer; e o card diz que manteve a anterior |

---

## Archive Information

**Archived:** 2026-08-03
**Duration:** mesmo dia (proposta, implementação e arquivo)
**Outcome:** Implementado — com uma verificação pendente, registrada abaixo

### Verificação que ficou pendente

A tarefa **5.4** (rodar o app e aceitar uma proposta de verdade) **não foi
executada**: ela exige uma chave real do Gemini, que só existe no navegador do
usuário. Arquivado assim por decisão dele, com a ressalva explícita.

Duas coisas, portanto, estão descritas na spec com base em testes e não em uso
real contra a API:

1. **A suposição sobre o `thoughtSignature`.** A part do modelo volta verbatim
   porque a assinatura é opaca e o mais seguro é supor que ela cobre a part
   inteira. Se a API validar a assinatura *contra o conteúdo* — e não apenas
   exigir a presença dela —, a correção do 400 não funciona e vira um change
   novo a partir da `main`. A sequência que reproduz: recusar uma proposta e
   mandar outra mensagem.
2. **O aceite ponta a ponta contra o Gemini real.** Coberto pela tela em
   `assistant.integration.test.tsx` com a API mockada, com a conversa e a
   payload reais do chamado como fixture.

### Files Modified

- `src/data/proposalRepair.ts` *(novo)* — reparo conservador da proposta
- `src/data/catalogProposal.ts` — erros com causa; contexto da entidade na imagem
- `src/lib/geminiClient.ts` — lê a part inteira do stream e a devolve em `callPart`
- `src/state/assistantChat.ts` — repara antes do card; ecoa a part do modelo;
  propaga a causa real do erro
- `src/features/settings/AssistantPage.tsx`, `assistant.css` — reparos no card
- Testes: `proposalRepair.test.ts` *(novo)*, `geminiClient.test.ts` *(novo)*,
  `catalogProposal.test.ts`, `assistantChat.test.ts`,
  `assistant.integration.test.tsx`
- `src/data/__fixtures__/noisyProposal.ts` *(novo)* — catálogo e proposta reais
  do chamado, com os refs derivados dos ids que o banco atribui

### Specs Updated

- `openspec/specs/ai-assistant/spec.md` — 2 requisitos novos ("A Proposal Is
  Repaired Before It Is Shown", "The History Returns the Model's Call
  Untouched"), 2 modificados (card lista os reparos; falha ao aplicar sempre tem
  causa). De 8 para 10 requisitos, de 44 para 58 cenários.
