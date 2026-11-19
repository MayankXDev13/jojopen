# Spec Delta

## Purpose

Provides a searchable library of architecture and brand icons, with instant search, keyword and alias resolution, and efficient on-demand loading for board rendering and export.

## ADDED Requirements

### Requirement: Icon search and filtering

The system SHALL allow searching icons by name, keyword, and alias with relevance scoring, returning matching sketch and brand icons.

#### Scenario: Query matches keywords and aliases

- **WHEN** the user types a query such as "postgres" or "database" in the icon palette
- **THEN** matching icons appear ranked by relevance

#### Scenario: Empty query shows default suggestions

- **WHEN** the user opens the icon search palette with no query
- **THEN** common default architecture icons are presented

### Requirement: On-demand icon resolution and loading

The system SHALL load the full icon vector dataset on demand rather than blocking initial canvas bundle execution, while resolving and caching icons for canvas nodes and export.

#### Scenario: Icon palette loads vector dataset

- **WHEN** the user opens the icon palette with `/` or the toolbar button
- **THEN** the icon dataset loads dynamically without blocking canvas interactions

#### Scenario: Canvas node renders resolved icon

- **WHEN** a board node specifies an icon identifier
- **THEN** the icon is resolved and rendered with appropriate dimensions and colors
