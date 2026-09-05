# Delta: ai-assistant

**Change ID:** `add-official-catalog-drop-warmups`
**Affects:** snapshot do catálogo enviado ao modelo, reparo e aplicação da
proposta

---

## ADDED Requirements

### Requirement: The Assistant Sees the Official Catalog but Never Edits It

O snapshot enviado ao assistente MUST incluir as categorias e os exercícios
**oficiais**, junto dos do usuário. Sem eles o modelo enxergaria um catálogo
menor do que o que existe na tela e proporia criar exercícios que já estão
lá — duplicando "Supino Reto" a cada conversa.

O snapshot MUST marcar cada entidade como **somente leitura** quando ela for
oficial, e a instrução ao modelo MUST dizer que ele pode **usar** essas
entidades (num dia de treino, como categoria de um exercício do usuário, como
alternativa) mas não pode renomeá-las, recategorizá-las nem excluí-las.

O **reparo da proposta** MUST descartar qualquer alteração proposta a uma
entidade oficial, mantendo o resto da proposta válido — a mesma política já
aplicada às outras propostas ilegais: reparar e seguir, nunca rejeitar tudo.
Descartar é a única saída correta, porque nenhuma escrita em entidade oficial é
possível: ela não existe no banco.

A aplicação MUST continuar preservando as referências: um dia proposto MAY
listar exercícios oficiais, e um exercício do usuário MAY declarar um oficial
como alternativa ou usar uma categoria oficial. Nada disso escreve no registro
oficial.

Omitir uma entidade oficial de uma seção proposta MUST NOT excluí-la — não há o
que excluir.

#### Scenario: O modelo enxerga o catálogo inteiro
- GIVEN um app com catálogo oficial e três exercícios do usuário
- WHEN o usuário conversa com o assistente sobre o catálogo
- THEN o snapshot enviado contém as duas fontes
- AND as entidades oficiais estão marcadas como somente leitura

#### Scenario: Uma proposta que renomeia um oficial é reparada
- GIVEN o modelo devolve uma proposta que renomeia uma categoria oficial e cria
  duas categorias novas
- WHEN a proposta é reparada antes de ser exibida
- THEN a renomeação da oficial é descartada
- AND as duas categorias novas continuam na proposta

#### Scenario: Um dia proposto pode usar exercícios oficiais
- GIVEN o modelo propõe um "Dia 1" com dois exercícios oficiais e um do usuário
- WHEN o usuário aceita a seção de dias
- THEN o dia é criado com os três exercícios
- AND nada é gravado nos registros oficiais

#### Scenario: Omitir um oficial não o apaga
- GIVEN o modelo devolve a seção de exercícios sem os oficiais
- WHEN o usuário aceita essa seção
- THEN os exercícios oficiais continuam na lista
- AND apenas os exercícios do usuário são reescritos, como já acontecia

---

## REMOVED

(None)
