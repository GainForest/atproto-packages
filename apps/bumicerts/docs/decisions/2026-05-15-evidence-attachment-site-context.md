# Decision: Evidence attachment site context

## Status
Accepted

## Context
Tree dataset evidence needs to preserve the certified site boundary context used during validation without reintroducing site records as user-added evidence timeline items. Organizations can have multiple sites, so a bumicert attachment cannot infer site context from the organization alone.

## Decision

- Do not expose site records as an evidence picker option.
- Do not create site records as timeline content.
- For bumicert timeline attachments, `subjects[0]` is the bumicert or activity strong reference.
- For site-scoped tree dataset evidence, `subjects[1]` is the certified location strong reference and is contextual metadata only.
- Attachment `content` remains the actual evidence, such as dataset URI(s), files, audio records, or observation records.
- Tree dataset site context is derived from tree occurrences' `siteRef` values and resolved through certified location records to obtain the site CID.
- When selected tree datasets belong to multiple sites, create one attachment per site group.
- A single dataset that cannot resolve to exactly one site context should not be attached as site-scoped tree evidence until corrected.
- Timeline filtering for a bumicert must match `subjects[0]`, not any subject position.
- A shared Green Globe map may show multiple dataset layers together, including layers from different sites, without changing the one-site-context-per-attachment data model.

## Scope
This applies to bumicert evidence timeline attachment creation, filtering, reference resolution, and Green Globe preview behavior.

## Consequences
Future timeline evidence work must treat site records as silent context unless a separate product decision explicitly reintroduces site evidence content.
