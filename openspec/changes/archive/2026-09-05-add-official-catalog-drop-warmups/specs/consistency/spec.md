# Delta: consistency

**Change ID:** `add-official-catalog-drop-warmups`
**Affects:** rótulo da aba na barra inferior e título da tela

---

## MODIFIED Requirements

### Requirement: Tela de Consistência no Lugar de Sessões

O app MUST apresentar na rota `/sessions` a tela que reúne o histórico de
treinos, **rotulada "Histórico"** — tanto na aba da barra inferior quanto no
título da própria tela. A tela compõe, nesta ordem: os **cards de estatística**,
o **calendário mensal**, a **lista dos treinos do mês exibido**, os blocos das
**últimas 12 semanas** e o gráfico dos **últimos 12 meses**.

O rótulo MUST ser o **mesmo** nos dois lugares. "Consistência" nomeava a ideia
que a tela defende; "Histórico" nomeia o que ela mostra, que é o que alguém
procura ao percorrer quatro abas — e é o que o ícone da aba (`pi-history`) já
dizia. A capability continua se chamando `consistency`: o nome interno descreve
o propósito, e não precisa acompanhar o rótulo.

Todos os agregados MUST considerar as sessões concluídas em **todas as
academias** (sessões de academia excluída contam), MUST NOT ser recortados pela
academia ativa, e a tela MUST NOT oferecer seletor de academia.

Os agregados MUST contar **os dois tipos de sessão**: um dia só de cardio conta
como dia treinado na sequência, no "treinos no mês", nos blocos de 12 semanas e
nas barras de 12 meses. Cardio é treino; o que distingue os tipos no calendário
é a **estrela**, não a exclusão da contagem.

Todos os valores MUST ser **derivados** do histórico existente
(`Session.completedAt`); nenhum estado persistido novo é introduzido para esta
tela e nenhuma migração é necessária **por causa dela**.

Enquanto o histórico não foi lido, a tela MUST NOT exibir contagens. Sem nenhuma
sessão concluída, a tela MUST exibir um estado vazio válido que convida ao
primeiro treino.

#### Scenario: Cardio mantém a sequência viva
- GIVEN o usuário treinou musculação na segunda e fez só cardio na terça
- WHEN abre o Histórico na quarta
- THEN a sequência conta os dois dias

#### Scenario: Cardio conta no mês e nos gráficos
- GIVEN no mês houve 4 treinos de musculação e 3 cardios
- WHEN o usuário vê os cards e os gráficos
- THEN o "treinos no mês" conta 7
- AND os blocos de 12 semanas e as barras de 12 meses incluem os cardios

#### Scenario: A aba abre a tela
- GIVEN o app aberto na Home
- WHEN o usuário toca a aba rotulada "Histórico"
- THEN a rota `/sessions` mostra a tela (estatísticas, calendário, lista do mês,
  12 semanas, 12 meses), com "Histórico" no título

#### Scenario: Nenhum nome antigo sobrevive na aba
- GIVEN a barra inferior
- WHEN o usuário a percorre
- THEN nenhuma aba se chama "Consistência" nem "Sessões"

#### Scenario: Sem seletor de academia
- GIVEN o usuário está na tela de Histórico
- WHEN ele observa o cabeçalho
- THEN não há seletor de academia, e trocar a academia ativa em outra tela não
  altera nenhum número da tela

#### Scenario: Histórico vazio
- GIVEN não há sessões concluídas em nenhuma academia
- WHEN o usuário abre a tela
- THEN um estado vazio convida ao primeiro treino, sem calendário quebrado nem
  contagens falsas

---

## REMOVED

(None)
