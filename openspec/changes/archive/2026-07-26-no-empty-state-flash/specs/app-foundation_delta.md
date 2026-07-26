# Delta: App Foundation

**Change ID:** `no-empty-state-flash`
**Affects:** camada de leitura de dados (`src/lib/hooks.ts`) e todo estado vazio
do app

---

## ADDED

### Requirement: Estados Vazios Só Depois da Resposta

Nenhuma tela MUST afirmar que não há dados antes de a leitura ter respondido. Um
estado vazio — "Nenhum dia de treino ainda", "Nenhuma sessão ainda", "Nenhuma
academia", contadores em zero, a pílula "Sem academia" — MUST ser exibido
somente quando a consulta ao banco local resolveu **e** veio vazia.

Para isso, a camada de leitura MUST distinguir **carregando** de **vazio**: uma
consulta ainda não resolvida MUST ser observável como tal, e não como uma
coleção vazia. Um valor inicial `[]` MUST NOT ser usado como estado de
carregamento, porque `[]` é uma resposta — a de que nada existe.

Enquanto a resposta não chega, a tela MUST NOT mostrar indicador de carregamento
(spinner ou skeleton): os dados são locais e a espera é de milissegundos, de
modo que um indicador que aparece e some é apenas outro piscar.

Como cada navegação remonta a tela de destino, voltar a uma tela já visitada
MUST NOT passar por um quadro sem conteúdo: o app MUST reaproveitar, dentro da
mesma sessão do navegador, o último resultado conhecido de cada consulta como
primeira renderização, sobrescrevendo-o assim que a consulta viva resolve. Esse
reaproveitamento MUST NOT ser a fonte da verdade nem sobreviver ao fechamento da
aba, e MUST NOT afetar a reatividade: uma escrita continua se propagando às
telas montadas.

#### Scenario: Voltar para uma tela com dados não pisca o estado vazio
- GIVEN existem dias de treino cadastrados
- WHEN o usuário sai da Home e volta para ela
- THEN a Home mostra os dias
- AND em nenhum momento exibe "Nenhum dia de treino ainda"

#### Scenario: O estado vazio continua existindo
- GIVEN o banco local não tem nenhum dia de treino
- WHEN o usuário abre a Home e a leitura responde
- THEN o estado vazio é exibido, com o caminho para Configurações

#### Scenario: Carregando não é vazio
- GIVEN uma tela de lista acabou de ser montada e a consulta ainda não resolveu
- WHEN a tela renderiza
- THEN ela não exibe o estado vazio nem contadores zerados
- AND também não exibe spinner ou skeleton

#### Scenario: Uma escrita continua chegando à tela
- GIVEN a Home está aberta mostrando os dias
- WHEN um dia de treino é criado ou removido em outra parte do app
- THEN a Home reflete a mudança, sem depender de recarregar a tela

---

## MODIFIED

(None)

## REMOVED

(None)
