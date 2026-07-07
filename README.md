# n8n-nodes-zena

Official n8n community nodes for **Zena**, the WhatsApp AI CRM by Fictora Labs.

Use these nodes to send WhatsApp messages, sync contacts, read leads and conversations, receive Zena webhooks, and automate event-reminder workflows from n8n.

## Nodes Included

| Node | Type | Description |
| ---- | ---- | ----------- |
| Zena | Action | Calls the Zena REST API from workflows |
| Zena Trigger | Polling Trigger | Polls the Zena REST API for new or updated records |
| Zena Webhook Trigger | Webhook Trigger | Receives signed outbound webhook events from Zena |

## Requirements

- n8n with community nodes enabled
- A Zena API key from **Zena Dashboard -> Integrations -> API Keys**
- API scopes matching the operations you use

Default API base URL:

```text
https://zena.fictoralabs.ae/api/v1
```

## Installation

### n8n UI

1. Open **Settings -> Community Nodes**
2. Click **Install**
3. Enter `n8n-nodes-zena`
4. Restart n8n if prompted

### npm

```bash
npm install n8n-nodes-zena
```

## Credentials

Create a **Zena API** credential with:

| Field | Description |
| ----- | ----------- |
| API Key | A key beginning with `zena_live_` |
| Base URL | Keep the default unless you self-host Zena |

The credential test calls:

```text
GET /api/v1/me
```

## Action Node

### Account

| Operation | Endpoint | Scope |
| --------- | -------- | ----- |
| Verify API Key | `GET /me` | Any valid key |

### Contacts

| Operation | Endpoint | Scope |
| --------- | -------- | ----- |
| List | `GET /contacts` | `contacts:read` |
| Get | `GET /contacts/:id` | `contacts:read` |
| Update | `PATCH /contacts/:id` | `contacts:write` |
| Add Note | `POST /contacts/:id/notes` | `contacts:write` |
| Sync Contacts | `POST /contacts/sync` | `contacts:write` |

`Sync Contacts` upserts contacts by `wa_id` and merges tags. It accepts up to 500 contacts per request.

### Conversations

| Operation | Endpoint | Scope |
| --------- | -------- | ----- |
| List | `GET /conversations` | `conversations:read` |
| Get Messages | `GET /conversations/:id/messages` | `conversations:read` |
| Update | `PATCH /conversations/:id` | `conversations:write` |

### Leads

| Operation | Endpoint | Scope |
| --------- | -------- | ----- |
| List | `GET /leads` | `leads:read` |
| Update Status | `PATCH /leads/:id` | `leads:write` |

Lead list supports `status`, `updated_since`, `limit`, and `offset`.

### Messages

| Operation | Endpoint | Scope |
| --------- | -------- | ----- |
| Send Text | `POST /messages` | `messages:send` |
| Send Image | `POST /messages` | `messages:send` |
| Send Video | `POST /messages` | `messages:send` |
| Send Audio | `POST /messages` | `messages:send` |
| Send Document | `POST /messages` | `messages:send` |
| Send Template | `POST /messages` | `messages:send` |
| Send Raw WhatsApp Message | `POST /messages` | `messages:send` |

`Send Raw WhatsApp Message` lets you pass any supported WhatsApp Cloud API message object. The node adds `to` through Zena.

### Broadcasts

| Operation | Endpoint | Scope |
| --------- | -------- | ----- |
| List | `GET /broadcasts` | `broadcasts:read` |
| Send Now | `POST /broadcasts/send-now` | `broadcasts:send` |

`Send Now` creates and launches a document-template broadcast for tags or contact IDs.

### Events

| Operation | Endpoint | Scope |
| --------- | -------- | ----- |
| List Registrations | `GET /events/:eventKey/registrations` | `events:read` |
| Update Registration Reminders | `PATCH /events/:eventKey/registrations/:id` | `events:write` |

Use these operations for event reminder workflows that send WhatsApp templates and mark reminder flags as sent.

### Owner

| Operation | Endpoint | Scope |
| --------- | -------- | ----- |
| Submit Dump | `POST /owner/dump` | `owner:dump` |
| Submit Idea Session | `POST /owner/session` | `owner:session` |

## Polling Trigger

The **Zena Trigger** node polls the REST API. It now:

- Updates its cursor only after successful API calls
- Uses pagination instead of a fixed first page
- Keeps a dedupe cache of recently emitted IDs
- Emits actual inbound messages by fetching conversation messages for updated conversations

Available events:

| Event | Notes |
| ----- | ----- |
| New Inbound Message | Polls updated conversations, then emits new inbound messages |
| New Lead | Emits leads created after the cursor |
| Lead Status Changed | Emits updated lead rows after creation |
| New Contact | Emits contacts created after the cursor |
| Conversation Updated | Emits updated conversation rows after creation |

For reliable real-time automation, prefer the webhook trigger.

## Webhook Trigger

The **Zena Webhook Trigger** receives outbound webhooks configured in Zena Integrations.

Supported events:

- `lead.captured`
- `lead.status_changed`
- `conversation.created`
- `message.received`
- `contact.created`
- `event.registered`
- `owner.message`
- `owner.quickdump`
- `owner.session_done`

Setup:

1. Add a **Zena Webhook Trigger** node in n8n
2. Copy its production webhook URL
3. In Zena, open **Integrations -> Webhooks**
4. Create a webhook with the copied URL and select events
5. Copy the Zena webhook signing secret into the node

The node verifies `X-Zena-Signature` before emitting workflow data.

## Example Workflows

### New Lead to CRM

```text
Zena Webhook Trigger (lead.captured)
  -> HubSpot: Create or update contact
  -> Slack: Notify sales
```

### Event Reminder

```text
Schedule Trigger
  -> Zena: List Event Registrations (pending_reminder=24h)
  -> Zena: Send Template
  -> Zena: Update Registration Reminders
```

### Contact Sync From Sheet

```text
Google Sheets Trigger
  -> Zena: Sync Contacts
```

### Send WhatsApp Template

```text
Typeform Trigger
  -> Zena: Send Template
```

## Development

```bash
npm ci
npm run build
npm run lint
npm run pack:dry-run
```

## Release Notes

See `CHANGELOG.md`.

## Support

- Zena: https://zena.fictoralabs.ae
- Fictora Labs: https://fictoralabs.ae
- Support: admin@fictoralabs.ae

## License

MIT
