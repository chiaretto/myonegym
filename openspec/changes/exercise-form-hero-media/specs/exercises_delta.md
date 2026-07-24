# Delta: exercises

**Change ID:** `exercise-form-hero-media`
**Affects:** formulário de cadastro/edição de exercício (`ExerciseForm`),
estilos de mídia compartilhados (`hero` / `hero-media`)

---

## ADDED

### Requirement: Large Media Preview in the Exercise Form

O formulário de cadastro/edição de exercício MUST mostrar a mídia informada em
uma **pré-visualização grande**, com o mesmo tratamento visual da mídia na tela
de detalhe do exercício: largura total do conteúdo, **proporção natural
preservada** (sem corte) e altura limitada à viewport.

A pré-visualização MUST aparecer **imediatamente abaixo** do campo de URL da
mídia e MUST estar sempre presente: quando não há URL, ou quando a URL falha ao
carregar, o mesmo espaço MUST exibir o placeholder de mídia, de modo que o
layout não salte ao digitar.

#### Scenario: Pré-visualização em tamanho grande
- GIVEN o formulário de novo exercício está aberto
- WHEN o usuário informa uma URL de imagem válida
- THEN a imagem é exibida ocupando a largura do conteúdo, na sua proporção
  natural, sem recorte

#### Scenario: Paridade com a tela de detalhe
- GIVEN um exercício com uma mídia retrato
- WHEN o usuário compara a pré-visualização no formulário de edição com a mídia
  na tela de detalhe do mesmo exercício
- THEN o enquadramento e o tamanho são equivalentes (nenhuma das duas corta a
  imagem)

#### Scenario: Placeholder sem mídia
- GIVEN o formulário de novo exercício está aberto
- WHEN o campo de URL está vazio
- THEN o espaço da pré-visualização exibe o placeholder de mídia
- AND ao digitar uma URL válida a imagem substitui o placeholder sem deslocar os
  demais campos

#### Scenario: URL quebrada
- GIVEN o usuário informou uma URL que falha ao carregar
- WHEN a pré-visualização tenta renderizar
- THEN o placeholder de mídia é exibido no lugar da imagem

#### Scenario: GIF animado na pré-visualização
- GIVEN o usuário informou a URL de um GIF animado
- WHEN a pré-visualização renderiza
- THEN o GIF é exibido e anima (não um quadro congelado)

---

## MODIFIED

### Requirement: Register an Exercise

Mantém-se tudo o que já é exigido (nome obrigatório, URL de mídia opcional
aceitando imagem estática ou GIF, zero ou mais categorias). Acrescenta-se que,
**enquanto o usuário preenche o formulário**, a mídia informada MUST ser
pré-visualizada em tamanho grande — ver *Large Media Preview in the Exercise
Form*. Miniaturas de listagem permanecem inalteradas.

#### Scenario: Conferir a mídia antes de salvar
- GIVEN o usuário está criando "Rosca Direta"
- WHEN cola a URL "https://…/rosca.gif" no campo de mídia
- THEN vê a mídia em tamanho grande antes de salvar
- AND pode corrigir a URL caso não seja o exercício esperado

---

## REMOVED

(None)
