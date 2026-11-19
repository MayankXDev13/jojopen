# Spec Delta

## Purpose

Guarantees that locally persisted board state always hydrates into a usable document, falling back safely when stored data is corrupt or outdated.

## ADDED Requirements

### Requirement: Current document loads only when valid

The system SHALL validate the `jojopen.doc.v1` payload on boot and SHALL use it only when it parses into a complete board document; otherwise it SHALL fall back to seeding or a blank board without throwing.

#### Scenario: Valid saved doc is restored

- **WHEN** `jojopen.doc.v1` contains a well-formed board document
- **THEN** the app opens that document with its name, settings, elements, and files intact

#### Scenario: Corrupt saved doc falls back safely

- **WHEN** `jojopen.doc.v1` is missing, unparseable JSON, or fails document validation
- **THEN** the app boots to the first-run/demo flow or a blank board and boot does not throw

### Requirement: Hash-linked board copies load only when valid

The system SHALL validate the `jojopen.board.<id>` payload when opening a `#/b/<id>` link and SHALL ignore invalid copies and fall back to the current doc path.

#### Scenario: Valid board copy opens from link

- **WHEN** the URL contains `#/b/<id>` and a well-formed copy exists for that id
- **THEN** the app opens that board copy

#### Scenario: Invalid board copy is ignored

- **WHEN** the URL contains `#/b/<id>` but the copy is missing, unparseable, or fails validation
- **THEN** the app falls back to the current-doc load path without throwing

### Requirement: Boards list degrades gracefully

The system SHALL treat the `jojopen.boards.v1` payload as a list of entries with id, name, and timestamp, SHALL drop entries that fail entry validation, and SHALL behave as an empty list when the payload is unparseable.

#### Scenario: Malformed entries are dropped

- **WHEN** the boards list contains some entries missing required fields
- **THEN** the app shows only the valid entries and boot continues

#### Scenario: Corrupt boards list behaves as empty

- **WHEN** the boards list payload is unparseable JSON or not a list
- **THEN** the app behaves as if no board history exists and boot continues

### Requirement: AI config degrades gracefully

The system SHALL accept partial AI config payloads, SHALL apply only recognized provider, model, baseUrl, and keys fields, and SHALL fall back to defaults when the payload is unparseable.

#### Scenario: Partial AI config is accepted

- **WHEN** the stored AI config contains a known provider with optional model overrides
- **THEN** the assistant uses that provider and model while ignoring unknown fields

#### Scenario: Corrupt AI config uses defaults

- **WHEN** the stored AI config is unparseable or fails validation
- **THEN** the assistant boots with default provider and model and boot does not throw

### Requirement: Invalid persisted data never blocks boot or overwrites good state

The system SHALL complete boot whenever any persisted payload is invalid and SHALL NOT persist invalid in-memory state over existing stored data during that boot.

#### Scenario: Boot completes with all storage corrupt

- **WHEN** every persisted key contains corrupt data
- **THEN** the app still renders an interactive board and reports no uncaught exception

#### Scenario: Failed validation does not clobber storage with empty doc

- **WHEN** load falls back due to invalid stored data
- **THEN** the next write persists the valid fallback document through the normal save path only
