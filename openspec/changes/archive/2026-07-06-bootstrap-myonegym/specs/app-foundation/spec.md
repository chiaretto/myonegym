# Delta: App Foundation (PWA + Local Storage)

**Change ID:** `bootstrap-myonegym`
**Affects:** Build/tooling, Service worker, IndexedDB storage

## ADDED Requirements

### Requirement: Installable, Offline PWA

The application MUST be a Progressive Web App: installable to the home screen,
mobile-first, and fully usable **offline** with **no login and no backend**.

#### Scenario: Install to home screen
- GIVEN the app is served over HTTPS (or localhost)
- WHEN the user chooses "Add to Home Screen"
- THEN the app installs with a name and icon and launches standalone

#### Scenario: Works offline
- GIVEN the app has been opened once (assets cached)
- WHEN the device is offline
- THEN the user can open the app and access all previously stored data

### Requirement: Local Browser Persistence

All application data MUST be stored locally in the browser (IndexedDB) and
persist across sessions. No data leaves the device except via explicit JSON
export.

#### Scenario: Data survives reload
- GIVEN the user created a gym, exercises, and a day
- WHEN the user closes and reopens the app
- THEN all previously created data is still present

#### Scenario: No network dependency for data
- GIVEN the device is offline
- WHEN the user creates and edits gyms/exercises/days/weights
- THEN all changes are saved locally without any network request
