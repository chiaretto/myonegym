# Delta: warmups

**Change ID:** `add-official-catalog-drop-warmups`
**Affects:** a capability inteira — tabela, tela de Configurações, formulário,
vínculo com exercícios, botão e visualizador

---

## REMOVED

### Requirement: Warmup as a Reusable Record

**Motivo:** os **vídeos de execução** já resolvem o problema que o aquecimento
resolvia, e resolvem com menos peças. O aquecimento exigia um cadastro à parte
(um nome, uma URL, uma tela em Configurações) para depois ser **vinculado** ao
exercício num seletor; o vídeo é escrito dentro do próprio exercício, na mesma
edição, e ainda aceita rótulo e recorte de tempo. Manter os dois é manter duas
formas de guardar "mídia de apoio a este exercício", com duas telas, dois
seletores, dois visualizadores a manter e a mesma pergunta feita ao usuário
duas vezes.

O registro, a tabela `warmups`, a tela **Configurações → Aquecimentos**, o
formulário e a contagem na linha do menu deixam de existir.

### Requirement: Warmup Media Is Classified From Its URL

**Motivo:** o requisito não some — ele **muda de casa**. A classificação de
mídia pela URL é a especificação de código que continua vivo e em uso pelos
vídeos (`lib/embedMedia`), então ela é reescrita sem a palavra "aquecimento" e
passa a viver na capability `exercise-videos`, onde está o seu único cliente
restante.

Apagar este requisito junto com a capability deixaria sem especificação um
comportamento que o app continua tendo — o pior dos dois resultados possíveis.

### Requirement: A Warmup Belongs to Many Exercises

**Motivo:** não há mais registro para pertencer a nada. O campo
`Exercise.warmupIds`, o índice `*warmupIds` e a manutenção do vínculo na
exclusão de um aquecimento saem junto.

O vídeo não herda esse problema: ele vive **dentro** do exercício, como valor,
então não há vínculo a manter nem órfão possível — é a mesma razão pela qual os
vídeos nunca precisaram de tabela.

### Requirement: Full-Screen Warmup Viewer

**Motivo:** como a classificação de mídia, o paginador **muda de casa** em vez
de morrer: o componente continua existindo e é o que apresenta os vídeos. O
requisito é reescrito neutro em `exercise-videos`.

O que de fato é **removido** é a apresentação em **sobreposição** — diálogo
modal, botão de fechar no topo, trava de rolagem e atalhos de teclado —, que
existia para o aquecimento alcançado por um botão. Sem esse cliente, ela é
código sem chamador, e o paginador fica só com a apresentação **na página**, que
é a que a aba "Vídeos" usa.

---

## Nota de arquivamento

Ao arquivar esta mudança, `openspec/specs/warmups/` MUST ser **excluída**: a
capability deixa de existir. As referências a ela em `exercises`,
`workout-sessions`, `exercise-videos`, `data-portability` e `project.md` são
tratadas nos deltas correspondentes — nenhuma pode continuar apontando para uma
capability que não existe mais.
