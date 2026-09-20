# Delta: app-foundation

**Change ID:** `google-drive-backup`
**Affects:** a regra de que nenhum dado sai do aparelho; o grupo "Conta" nas
Configurações

---

## MODIFIED Requirements

### Requirement: Local Browser Persistence

All application data MUST be stored locally in the browser (IndexedDB) and
persist across sessions. No data leaves the device except by an **explicit
action of the user**: the JSON export, or a backup to the user's own Google
Drive that the user taps to make (see `cloud-backup`). Nothing is uploaded on
its own, and the app MUST keep working with no account and no connection.

#### Scenario: Data survives reload
- GIVEN the user created a gym, exercises, and a day
- WHEN the user closes and reopens the app
- THEN all previously created data is still present

#### Scenario: No network dependency for data
- GIVEN the device is offline
- WHEN the user creates and edits gyms/exercises/days/weights
- THEN all changes are saved locally without any network request

#### Scenario: Nothing leaves the device unasked
- GIVEN a Google account is connected
- WHEN the user creates and edits data and opens every screen of the app
- THEN no request carrying user data is made until they tap a backup action
