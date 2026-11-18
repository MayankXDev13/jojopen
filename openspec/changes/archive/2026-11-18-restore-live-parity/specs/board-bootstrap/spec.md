# Spec Delta

## Purpose

Defines what a visitor sees on their very first run and how existing data saved by the live site
is carried into the port, so the default experience matches jojopen.com.

## ADDED Requirements

### Requirement: First run seeds the demo board
On a first run with no saved board, the app SHALL open a board named "Scratch board" containing
the live demo: a User → CDN → API Gateway → Backend system diagram with Postgres, Redis and Kafka
nodes, an analytics worker and the "301s are cacheable" sticky note. The demo SHALL be saved so
a reload keeps it.

#### Scenario: Fresh browser profile
- **WHEN** the app opens with no board in storage
- **THEN** the canvas shows the demo system diagram and sticky note instead of an empty board

#### Scenario: Demo survives reload
- **WHEN** the user reloads after the first run
- **THEN** the demo board is restored unchanged

#### Scenario: Emptying the board is respected
- **WHEN** the user deletes all elements or starts a new blank board
- **THEN** the start card is shown and the demo is not seeded again

### Requirement: Live-site board is imported
When the live site's `jojopen:scratch:v2` record exists and the port has no board of its own, the
port SHALL import that board on boot, including its elements, settings and name. The import SHALL
be read-only for the live key and SHALL NOT overwrite an existing port board.

#### Scenario: Live data present, port empty
- **WHEN** `jojopen:scratch:v2` contains a board and no port board exists
- **THEN** the port opens that board and keeps the source key untouched

#### Scenario: Port data already exists
- **WHEN** the port already has a saved board
- **THEN** boot uses the port board and ignores the live record

#### Scenario: Malformed live data
- **WHEN** `jojopen:scratch:v2` cannot be parsed or has no elements
- **THEN** boot continues without an error and falls back to the normal first-run path

### Requirement: Imported boards keep saving
Edits to an imported board SHALL persist through the port's existing storage path, so the next
reload shows the edited board without re-importing.

#### Scenario: Edit and reload
- **WHEN** the user edits an imported board and reloads
- **THEN** the edited board is restored from port storage
