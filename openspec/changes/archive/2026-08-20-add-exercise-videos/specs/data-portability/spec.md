# Delta: data-portability

**Change ID:** `add-exercise-videos`
**Affects:** o documento de backup, que passa a carregar os vídeos do exercício

---

## ADDED Requirements

### Requirement: Backups Carry Exercise Videos

O documento de backup MUST carregar os **vídeos** de cada exercício — URL,
rótulo e recorte —, para que uma restauração devolva o catálogo inteiro, e não
exercícios que perderam suas referências de execução.

Como os vídeos vivem **dentro** do exercício e não numa lista própria (ver
*Videos Belong to the Exercise, Not to a Record of Their Own*), não há vínculo a
validar nem órfão possível: o vídeo chega e parte junto do seu exercício. É uma
consequência direta de não haver entidade forte, e a diferença em relação aos
**aquecimentos**, cujos vínculos podem apontar para um registro ausente do
documento.

A importação MUST aceitar um documento **anterior** a esta mudança, sem o campo
de vídeos, tratando-o como **vazio**. Um backup antigo é exatamente um app sem
vídeos, e rejeitá-lo por campo ausente inutilizaria todo arquivo gerado até aqui
— o mesmo tratamento que os aquecimentos e o tipo do exercício já receberam.

A **ordem** dos vídeos MUST sobreviver à ida e volta: ela é a ordem de
apresentação, não um detalhe de armazenamento.

#### Scenario: Round-trip preserva os vídeos
- GIVEN um exercício com três vídeos, um deles com rótulo e recorte
- WHEN o usuário exporta o backup e o restaura num dispositivo limpo
- THEN os três voltam no mesmo exercício, na mesma ordem
- AND o rótulo e o recorte daquele vídeo continuam lá

#### Scenario: Backup antigo importa sem vídeos
- GIVEN um backup gerado antes desta mudança
- WHEN o usuário o restaura
- THEN todo exercício fica com a lista de vídeos vazia
- AND nada é rejeitado nem perdido

#### Scenario: Vídeo não sobrevive ao seu exercício
- GIVEN um documento em que um exercício com vídeos é restaurado e depois excluído
- WHEN o usuário inspeciona o banco
- THEN nenhum vídeo daquele exercício permanece
