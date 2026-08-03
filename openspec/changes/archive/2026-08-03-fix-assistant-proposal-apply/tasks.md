# Implementation Tasks: A proposta do assistente não pode falhar por ruído do modelo

**Change ID:** `fix-assistant-proposal-apply`

---

## Phase 0: Reproduzir

- [x] 0.1 Guardar a payload real do chamado como fixture
      (`src/data/__fixtures__/noisyProposal.ts`): catálogo enviado + proposta
      recebida, exatamente como vieram
- [x] 0.2 Teste que falha hoje: aceitar essa proposta lança algo que **não** é
      `ProposalError` (a `ValidationError` de `mediaUrl: "null"`)
- [x] 0.3 Teste que falha hoje: com a `mediaUrl` corrigida à mão, a mesma
      proposta ainda é recusada pelo `categoryRefs: ["7"]` pendurado

**Quality Gate:** PASSED — `applyCatalogProposal` lançou
`Error: URL inválida (use http:// ou https://)`, um tipo que o `catch` de
`accept` não reconhece: exatamente a mensagem genérica do chamado.

---

## Phase 1: Nenhuma falha sem causa

- [x] 1.1 `applyCatalogProposal` embrulha erro não-`ProposalError` num
      `ProposalError` com a mensagem original e a entidade em que ocorreu
- [x] 1.2 `accept` (`assistantChat.ts`) passa a incluir a mensagem do erro no
      fallback, em vez do texto fixo
- [x] 1.3 Testes: `ValidationError` do `validateMediaUrl` e falha genérica do
      Dexie chegam à conversa com causa legível; a transação continua atômica

**Quality Gate:** PASSED — typecheck limpo; um erro de banco agora chega como
`Não consegui aplicar a proposta: DatabaseClosedError Database has been closed`.

---

## Phase 2: Reparo conservador (`proposalRepair.ts`)

- [x] 2.1 `repairProposal(snapshot, proposal): { proposal, repairs }` — função
      pura, sem banco e sem React
- [x] 2.2 `mediaUrl`: sentinela de texto (`"null"`, `"undefined"`, vazio, só
      espaços) vira `null`
- [x] 2.3 `mediaUrl` que não passa em `validateMediaUrl`: exercício existente
      mantém a URL guardada; exercício novo vira `null`
- [x] 2.4 Refs pendurados descartados: `categoryRefs`, `alternativeRefs`
      (inclusive auto-referência) e `exerciseRefs` dos dias
- [x] 2.5 Garantir que o reparo **nunca** remove entidade nem altera nome, id ou
      ordem — só vínculo e `mediaUrl`
- [x] 2.6 Deixar passar para `validateProposal`, sem reparar: ref duplicado, id
      duplicado, nome vazio, id que não existe mais
- [x] 2.7 Cada reparo devolve texto em português, pronto para o card
- [x] 2.8 Testes unitários por regra + a fixture da Phase 0 ponta a ponta

**Quality Gate:** PASSED — 19 testes em `proposalRepair.test.ts`, um por linha da
tabela, mais o bloco "what the repair must never do" (contagens, identidade de
id/nome/ordem/summary, e o objeto de entrada intocado).

---

## Phase 3: Ligar ao fluxo da conversa

- [x] 3.1 `assistantChat.send` repara a proposta assim que ela chega, contra o
      catálogo atual
- [x] 3.2 `impact` medido sobre a proposta **reparada**
- [x] 3.3 A entrada `proposal` guarda a proposta reparada e os reparos
- [x] 3.4 `contents` grava o `functionCall` com a proposta reparada
- [x] 3.5 Testes de estado: proposta ruidosa vira entrada aceitável, e aceitar
      aplica o que o card prometeu

**Quality Gate:** PASSED — o teste "applies it, and the catalog ends up as the
card promised" compara o `impact` do card com o catálogo depois do apply.

---

## Phase 4: O card conta o que foi reparado

- [x] 4.1 `ProposalCard` lista os reparos, antes dos botões de decisão
- [x] 4.2 Estilo junto do `.as-impact` existente; tom de aviso, não de erro
- [x] 4.3 Sem reparo, nada aparece — o card fica idêntico ao de hoje
- [x] 4.4 Teste de tela: para a fixture do chamado o card mostra os dois reparos
      que ela de fato produz — "fica sem imagem" e "ficou sem a categoria Cardio"
      — com os botões de decisão ainda disponíveis

**Quality Gate:** PASSED — testes de tela em `assistant.integration.test.tsx`.
O bloco usa os mesmos tokens do card (`--bg-danger`/`--border-danger`) e
`overflow-wrap: anywhere` nas linhas, que é o que quebra URL longa no celular.

---

## Phase 5: Integração e fechamento

- [x] 5.1 Teste de integração em `assistant.integration.test.tsx`: a conversa do
      chamado, do envio ao catálogo aplicado
- [x] 5.2 Verificar que uma proposta sem ruído passa pelo reparo sem alteração
      alguma (identidade)
- [x] 5.3 Delta spec pronto para merge (a fusão em
      `openspec/specs/ai-assistant/spec.md` acontece no `/openspec-archive`);
      inclui a regra que só apareceu ao implementar: reparo que não muda o
      resultado não vira aviso no card
- [ ] 5.4 Rodar o app e aceitar uma proposta de verdade — **pendente com você**:
      exige uma chave real do Gemini, que só existe no seu navegador. Feito no
      lugar: `npm run build` limpo e a conversa do chamado coberta ponta a ponta
      pela tela em `assistant.integration.test.tsx`.

**Quality Gate:** PASSED — 508 testes passando (59 arquivos), `tsc -b --noEmit`
limpo, `npm run build` limpo com o SDK ainda em chunk separado.

---

## Phase 6: A assinatura de raciocínio na história (bug reportado durante a implementação)

- [x] 6.1 `runTurn` lê a part inteira do stream, não o atalho `functionCalls`,
      e a entrega em `TurnResult.callPart`
- [x] 6.2 `assistantChat.send` ecoa essa part em `contents` sem editar nada —
      reverte a decisão de mandar a proposta reparada para a história
- [x] 6.3 `geminiClient.test.ts` (novo): o mock expõe as **duas** formas de
      acesso do chunk real, senão o teste passa por não alcançar o bug
- [x] 6.4 Teste do cenário reportado: recusar uma proposta e mandar outra
      mensagem mantém a assinatura na história
- [x] 6.5 Ausência de assinatura continua funcionando

**Quality Gate:** PASSED — com a leitura antiga restaurada, o teste 6.3 falha; com
a correção, passa. 514 testes verdes, typecheck limpo.

---

## Completion Checklist

- [x] Todas as fases concluídas, menos a 5.4 — arquivado com a ressalva
      registrada em `proposal.md` → Archive Information
- [x] Todos os quality gates aprovados
- [x] Documentação sincronizada
- [x] Pronto para `/openspec-archive`
