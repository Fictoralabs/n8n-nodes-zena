# Changelog

All notable changes to `n8n-nodes-zena` are documented here.

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
