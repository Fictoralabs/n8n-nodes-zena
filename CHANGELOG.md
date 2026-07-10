# Changelog

All notable changes to `n8n-nodes-zena` are documented here.

## [0.8.2] - 2026-07-10

### Fixed

- Updated `peerDependencies.n8n-workflow` to `*` to satisfy the official n8n community package scanner.
- Included source files in the npm package so n8n Creator Portal can validate the credential file referenced by the compiled package metadata.

## [0.8.1] - 2026-07-08

### Changed

- Updated package author email to `admin@fictoralabs.ae` so n8n Creator Portal verification reaches the active Fictora Labs inbox.

## [0.8.0] - 2026-07-06

### Added

- Added the Zena Webhook Trigger node for signed outbound webhook events.
- Added Account -> Verify API Key using `GET /me`.
- Added Contact -> Sync Contacts using `POST /contacts/sync`.
- Added Broadcast -> Send Now using `POST /broadcasts/send-now`.
- Added Event registration list and reminder-flag update operations.
- Added Message -> Send Raw WhatsApp Message for pass-through WhatsApp message objects.
- Added lead status filtering to Lead -> List.
- Added credential test support.

### Changed

- Reworked polling trigger cursor handling so the cursor updates only after successful API calls.
- Added pagination and stable ID dedupe to polling triggers.
- Updated New Inbound Message polling to fetch conversation messages instead of emitting conversation rows as messages.
- Updated README endpoint, scope, trigger, and workflow documentation.
- Pinned the tested `n8n-workflow` dependency range.

### Fixed

- Fixed invalid template component and owner brief JSON handling so workflow authors see a clear node error.
- Fixed the broken lint script by adding ESLint flat config.
- Fixed package-lock version drift from older releases.

## [0.7.2] - 2026-07-06

### Changed

- Bumped package metadata for npm provenance publishing.

## [0.7.1] - 2026-07-06

### Changed

- Added npm provenance publishing configuration.

## [0.7.0] - 2026-07-06

### Changed

- Replaced WhatsApp-style icon usage with Zena brand SVG icons.
