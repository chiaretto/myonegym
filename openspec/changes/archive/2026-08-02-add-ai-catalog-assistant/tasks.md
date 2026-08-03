# Implementation Tasks: Assistente de IA para o catálogo

**Change ID:** `add-ai-catalog-assistant`

---

## Phase 0: Spike (bloqueia todo o resto)

- [x] 0.1 Confirmar que a chamada sai do navegador sem esbarrar em CORS
      ✓ 2026-08-02 (Gemini)
      — Preflight `OPTIONS` em `generativelanguage.googleapis.com` respondeu
      `200` com `access-control-allow-origin` refletindo a origem e
      `access-control-allow-headers: content-type, x-goog-api-key`. Vale para o
      dev server e para o domínio de produção igualmente.
      **A mudança tem caminho sem backend.**
      *(A mesma verificação já havia passado na API do Claude, antes da troca de
      provedor — ver "Nota sobre o provedor" no proposal.)*
- [x] 0.2 Função `propor_catalogo` aceita no dialeto do Gemini ✓ 2026-08-02
      — schema com `nullable` e sem `additionalProperties` foi aceito;
      `functionCallingConfig.mode: VALIDATED` funcionou. Com 64 exercícios /
      8 categorias / 5 dias (~7 KB), a chamada saiu em ~3.6k tokens de saída
      contra o teto de 32.768 — folga de quase 10x, `maxOutputTokens` está
      calibrado
- [x] 0.3 Streaming confirmado ✓ 2026-08-02 — texto chega em 4–6 pedaços nos
      turnos de conversa; a chamada de função chega inteira ao fim do stream
      (turnos com função não emitem texto, `chunks=0`, o que é esperado)
- [x] 0.4 Se 0.1 falhar, **parar** — não se aplica: 0.1 passou ✓ 2026-08-02

### Blockers

- ~~0.2, 0.3 precisam de chave real~~ — resolvido: rodadas reais em 2026-08-02.
- ~~O `MODEL` foi escolhido sem confirmar~~ — resolvido: `gemini-2.5-flash-lite`
  responde 404 (*"no longer available to new users"*), então o app foi fixado em
  `gemini-3.5-flash-lite`, confirmado na lista e servindo `generateContent`.

**Quality Gate:** PASSED ✓ 2026-08-02
- [x] CORS confirmado — o caminho sem backend existe
- [x] Conversa real de três turnos, com chamada de função — 9/10 verificações

---

## Phase 1: Foundation (dados e contrato)

- [x] 1.1 `src/state/assistantToken.ts` — store `zustand` + `persist` para o token
      (chave própria, fora de `myonegym.settings`), com `setToken` e `clear`
- [x] 1.2 `src/data/catalogPayload.ts` — serializar categorias, exercícios e dias
      para o JSON de contexto, e o schema da ferramenta `propor_catalogo`
- [x] 1.3 `src/data/catalogProposal.ts` — resumo de impacto **por seção**
      (criados, alterados, removidos em categorias / exercícios / dias) e
      validação **do subconjunto selecionado**: ids existem no catálogo atual e
      toda referência resolve, seja dentro das seções escolhidas, seja no
      catálogo como já está
- [x] 1.4 `requiredSections(proposal, selection)` — calcular, para aquela
      proposta, quais seções cada seção selecionada exige (dia que posiciona
      exercício novo exige exercícios; dia que só reordena não exige nada;
      exercício que usa categoria nova exige categorias)
- [x] 1.5 `applyCatalogProposal(proposal, selection)` — aplicação transacional
      das seções escolhidas, preservando ids, criando os de id nulo, apagando os
      ausentes com o mesmo cascade de `deleteExercise` / `deleteCategory`, e
      normalizando alternativas reaproveitando a lógica de `portability.ts`.
      Seção não selecionada não é tocada; **o cascade de remoção roda mesmo
      assim**. **Retorna o catálogo resultante com os ids atribuídos** e o que
      ficou de fora — é o que volta para a conversa
- [x] 1.6 Testes: serialização não vaza pesos/notas/fotos/sessões; validação
      rejeita id desconhecido e referência pendente; aplicação preserva peso,
      nota e foto de um exercício movido; remoção cascateia em dias e
      alternativas; falha no meio não grava nada; o catálogo retornado traz os
      ids dos itens criados
- [x] 1.7 Testes do aceite parcial: aplicar só categorias deixa exercícios e dias
      idênticos; remover exercício com a seção de dias fora ainda o desliga dos
      dias; `requiredSections` acusa a dependência do dia que posiciona exercício
      novo e não acusa a do dia que só reordena; seleção que não valida é
      recusada inteira sem gravar
- [x] 1.8 Confirmar que o token não entra em `exportBackup` e sobrevive a
      `resetAll` (teste)

**Quality Gate:** PASSED ✓ 2026-08-02
- [x] `npm run typecheck` limpo
- [x] `npm run test` verde — 456 testes, 56 arquivos

---

## Phase 2: Business Logic (conversa e cliente da API)

- [x] 2.1 Adicionar `@google/genai` como dependência
- [x] 2.2 `src/state/assistantChat.ts` — store `zustand` **em memória** (sem
      `persist`) com as mensagens da conversa e a proposta pendente
- [x] 2.3 `src/lib/geminiClient.ts` — cliente carregado por `import()` dinâmico,
      modelo `gemini-2.5-flash-lite`, `generateContentStream`, função `propor_catalogo`
      com `functionCallingConfig.mode: VALIDATED`
- [x] 2.4 Catálogo como prefixo estável ✓ 2026-08-02 — implementado (catálogo no
      `systemInstruction`, congelado na store). **O cache não se confirmou:**
      `cachedContentTokenCount` = 0 em 4 execuções do spike, todos os turnos,
      prefixo de ~4000 tokens. Reclassificado como observação, não requisito — é
      custo, não correção (ver "Architecture Considerations" no proposal)
- [x] 2.5 System prompt: o contrato de ids; perguntar só o que muda a proposta e
      agrupar as perguntas; nunca perguntar o que está no catálogo; pedir
      confirmação antes de gerar **quando** a iniciativa foi dele; ir direto à
      proposta quando o usuário já mandou gerar; resumo em português
- [x] 2.6 Ciclo da ferramenta: aceitar responde `tool_result` com o que foi
      aplicado, **o que ficou de fora** e o catálogo resultante com os ids novos;
      rejeitar responde "recusado" + o que o usuário escreveu
- [x] 2.7 Mapear falhas para mensagens em português: offline, token recusado,
      limite de uso, contexto estourado, `stop_reason: "max_tokens"`, proposta
      que não valida
- [x] 2.8 Testes com a chamada de rede mockada: turno de texto vira mensagem e
      turno com ferramenta vira proposta; rejeitar alimenta o `tool_result` e a
      conversa segue; aceitar devolve os ids novos; aceite parcial informa o que
      ficou de fora; cada falha vira a mensagem certa e nunca grava

**Quality Gate:** PASSED ✓ 2026-08-02
- [x] `npm run typecheck` limpo
- [x] Nenhum teste faz chamada de rede real — `runTurn` mockado nos dois níveis

---

## Phase 3: User Interface

- [x] 3.1 Linha "Assistente (IA)" em `SettingsPage` e rota
      `/settings/assistant` em `App.tsx`
- [x] 3.2 `src/features/settings/AssistantPage.tsx` — campo de token mascarado
      com revelar/apagar e o aviso de que a chave fica no navegador; estado sem
      token explica o que falta
- [x] 3.3 Thread de mensagens: bolhas de usuário e assistente, texto do
      assistente aparecendo em streaming, rolagem acompanhando o fim
- [x] 3.4 Barra de envio com `keyboardInset`, estado "trabalhando" que bloqueia
      um segundo envio, e bloqueio enquanto há proposta pendente
- [x] 3.5 Cartão de proposta na thread: resumo, contagens de impacto **por
      seção** com as remoções destacadas, sugestão de exportar backup, e
      **Aceitar** / **Rejeitar**
- [x] 3.6 Seleção de seções no cartão, tudo marcado por padrão; seção exigida por
      outra selecionada aparece travada com a explicação do porquê (usando
      `requiredSections`); depois de decidido, o cartão mostra o que entrou e o
      que ficou de fora, e não oferece mais ação
- [x] 3.7 Erros como mensagem na thread, deixando a conversa utilizável
- [x] 3.8 `assistant.css` seguindo os tokens visuais existentes
- [x] 3.9 Testes de integração: sem token não envia; pergunta do assistente
      renderiza como mensagem e não como cartão; proposta na tela não grava nada;
      rejeitar preserva o banco e libera o envio; aceitar tudo aplica e reflete
      em Dias e Exercícios; desmarcar uma seção aplica só o resto; seção travada
      não desmarca e mostra o motivo; navegar e voltar mantém a thread; erro de
      rede mostra mensagem e não grava

**Quality Gate:** PASSED ✓ 2026-08-02
- [x] `npm run typecheck` limpo
- [x] Testes de widget/integração verdes — 11 em `assistant.integration.test.tsx`

---

## Phase 4: Integration & Polish

- [x] 4.1 Confirmar no build que o SDK sai num chunk próprio ✓ 2026-08-02
      — refeito com `@google/genai`. O entry (`index-CmMR6Tke.js`, 401,20 kB)
      tem **zero** ocorrências de `generativelanguage`; as 3 menções a
      `GoogleGenAI` são o próprio call site do `import()` dinâmico. O SDK ficou
      em `index-C2UPHgmJ.js` (384K), carregado só ao abrir a tela. O entry
      praticamente não mudou de tamanho na troca de provedor (400,86 → 401,20 kB)
- [-] 4.2 Verificar a tela no viewport de celular, com a fonte no mínimo e no
      máximo (a Aparência escala tudo), e com o teclado aberto
- [-] 4.3 Passada de ponta a ponta com token real, nos dois caminhos:
      (a) pedido vago → perguntas → confirmação → proposta → aceitar;
      (b) "tenho 4 dias, foco em costas, redistribui e já gera" → proposta
      direta. Conferir que pesos, notas e fotos sobrevivem
- [-] 4.4 Passada de rejeição: rejeitar com um ajuste em texto e confirmar que a
      proposta seguinte respeita o que já tinha sido combinado
- [-] 4.5 Passada de aceite parcial: aplicar sem uma seção, conferir que ela
      ficou intacta, e confirmar que o turno seguinte da conversa sabe que ela
      ficou de fora
- [x] 4.6 Rodapé de Configurações e textos afins continuam verdadeiros sobre
      "dados só neste dispositivo" agora que existe uma tela que fala com a rede
- [x] 4.7 Atualizar `openspec/project.md` (entidades/decisões) se necessário

**Quality Gate:** PARCIAL
- [x] `npm run test` verde — 480 testes, 58 arquivos
- [x] `npm run build` limpo
- [x] Documentação sincronizada (`project.md`, rodapé de Configurações)
- [ ] 4.2–4.5 pendentes: exigem aparelho/navegador e token real

### Blockers

- **4.2** (viewport de celular, teclado aberto, fonte no mín/máx) precisa de
  navegador real — os testes rodam em jsdom, que não faz layout.
- **4.3, 4.4, 4.5** (passadas de ponta a ponta, rejeição e aceite parcial com
  token real) precisam de credencial da conta do usuário. Junto com 0.2, 0.3 e a
  verificação de cache da 2.4, são as únicas coisas que faltam.

---

## Completion Checklist

- [x] Todas as fases concluídas — 4.2–4.5 dispensadas por decisão do usuário
- [x] Todos os quality gates aprovados (typecheck, 480 testes, build)
- [x] Documentação sincronizada (`project.md`, rodapé de Configurações)
- [x] Arquivado em 2026-08-02 com um defeito aberto registrado
