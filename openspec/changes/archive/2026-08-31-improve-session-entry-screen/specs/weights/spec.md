# Delta: weights

**Change ID:** `improve-session-entry-screen`
**Affects:** o editor de peso alvo, nas duas telas que o usam

---

## MODIFIED Requirements

### Requirement: Edit and Save Weight

O peso alvo MUST continuar exigindo **editar → salvar** explícito, com o
**mesmo editor** disponível no detalhe do exercício no catálogo e no detalhe do
exercício em sessão (aba Execução) enquanto a sessão está **em andamento**.
Ambos editam o peso que vale para a academia da sessão/ativa — global ou
exceção, conforme a flag "Só nessa academia" — e, ao salvar, anexam um registro
de histórico **na mesma chave em que o peso foi gravado**. Não existe peso de
sessão. Numa sessão **concluída** o editor é exibido **somente-leitura**.

Ao entrar em edição, a tela MUST **rolar o cartão do peso para o mais próximo do
topo que a extensão de rolagem permitir**, sem ficar encoberto pela barra de
título grudada, de modo que **Cancelar e Salvar fiquem visíveis sem nenhuma
rolagem adicional**. O cartão vive abaixo da mídia e do aquecimento e cresce ao
abrir (stepper, unidades, "Só nessa academia", ações); sem isso o usuário digita
o peso e não vê onde salvar. Quando o cartão está tão no fim da página que o
topo é inalcançável, as ações MUST ainda assim ser trazidas para dentro da
vista — é a garantia que importa; o alinhamento ao topo é o meio.

A rolagem MUST NOT depender de qual das duas telas abriu o editor: o problema é
do editor, não da sessão. Ela MUST NOT ser desfeita pelo foco automático do
campo de peso, e num aparelho com teclado virtual as ações MUST permanecer
alcançáveis com o teclado aberto (ver *Floating Action Bar for Primary Actions*,
em `app-foundation`).

Cancelar ou salvar MUST NOT rolar a tela de volta: o usuário fica onde está,
com o cartão já no campo de visão.

#### Scenario: Edit then save
- GIVEN "Rosca Direta" resolve para 20 KG na academia ativa
- WHEN o usuário toca em editar, muda para 22,5 e salva com a flag desmarcada
- THEN o peso global passa a 22,5 KG

#### Scenario: Change the unit
- GIVEN "Rosca Direta" é 20 KG globalmente
- WHEN o usuário edita a unidade para "LB" e salva com a flag desmarcada
- THEN o registro global passa a ter unidade "LB"

#### Scenario: Edit from the in-session detail updates the same weight
- GIVEN uma sessão em andamento na academia "A" e "Rosca Direta" resolvendo para 20 KG
- WHEN o usuário edita para 25 KG no detalhe do exercício da sessão e salva com a flag desmarcada
- THEN o peso global passa a 25 KG e um registro de histórico global é anexado
- AND o detalhe do exercício no catálogo mostra 25 KG

#### Scenario: In-session exception
- GIVEN uma sessão em andamento na academia "A" e peso global 25 KG
- WHEN o usuário salva 20 KG com a flag **marcada**
- THEN a academia "A" passa a ter exceção de 20 KG
- AND o restante do app segue com 25 KG fora de "A"

#### Scenario: Editar sobe o cartão e mostra as ações
- GIVEN o detalhe de um exercício em sessão, com o cartão de peso abaixo da mídia
- WHEN o usuário toca em "Editar"
- THEN o cartão sobe para o topo alcançável da tela, sem ficar sob a barra de título
- AND Cancelar e Salvar estão visíveis sem que o usuário role

#### Scenario: A mesma subida no catálogo
- GIVEN o detalhe do mesmo exercício aberto pelo catálogo
- WHEN o usuário toca em "Definir"
- THEN o cartão sobe do mesmo jeito e as ações ficam visíveis

#### Scenario: Cartão no fim da página
- GIVEN um exercício cuja página é curta e cujo cartão fica perto do fim
- WHEN o usuário entra em edição
- THEN o cartão sobe o quanto a rolagem permite
- AND Cancelar e Salvar ficam, mesmo assim, dentro da vista

#### Scenario: O foco do campo não desfaz a subida
- GIVEN o campo de peso recebe foco automaticamente ao abrir a edição
- WHEN a edição abre
- THEN o cartão termina no topo alcançável, e não numa posição intermediária

---

## ADDED

(None)

---

## REMOVED

(None)
