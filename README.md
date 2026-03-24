# n8n-nodes-zena

Official n8n community node for **Zena** — WhatsApp Business automation platform for UAE & GCC businesses, built by [Fictora Labs](https://fictoralabs.ae).

Send WhatsApp messages, manage contacts, retrieve leads, trigger workflows on new leads and conversations — all natively inside n8n.

---

## Nodes Included

| Node | Type | Description |
|------|------|-------------|
| **Zena** | Action | Send messages, manage contacts, leads, and conversations |
| **Zena Trigger** | Trigger (Polling) | Fire workflows on new leads, conversations, resolved chats, or new contacts |

---

## Features

### Zena (Action Node)

**Message**
- Send Template — Meta-approved templates with body/header variables (text, image, document, video)
- Send Text — plain text to opted-in contacts
- Send Image — image URL with optional caption
- Send Document — PDF or file URL with optional filename and caption

**Contact**
- Get All — paginated list with search filter
- Upsert — create or update by phone number (name, email, company, tags, notes)

**Lead**
- Get All — paginated list with status filter (new, contacted, qualified, lost)

**Conversation**
- Get All — paginated list with status filter (open, resolved, pending)
- Get Messages — full message history for a conversation

### Zena Trigger (Polling Node)

| Event | Description |
|-------|-------------|
| New Lead Captured | Fires when AI chatbot captures a new lead |
| New Conversation | Fires when a new WhatsApp conversation starts |
| Conversation Resolved | Fires when an agent resolves a conversation |
| New Contact | Fires when a new contact is created |

Poll interval configurable: every minute, 5, 15, 30 minutes, or hourly.

---

## Installation

### Via n8n UI (recommended)

1. Go to **Settings → Community Nodes**
2. Click **Install**
3. Enter `n8n-nodes-zena`
4. Restart n8n when prompted

### Via npm (self-hosted)

```bash
npm install n8n-nodes-zena
```

---

## Setup

1. Go to **Credentials → New Credential**
2. Search for **Zena API**
3. Enter your API Key — starts with `zena_live_...`
4. Find it in Zena Dashboard → **Integrations → API Keys**
5. Save

---

## Usage Examples

### Trigger: New Lead to CRM

```
Zena Trigger (New Lead Captured)
  → HubSpot — Create Contact
  → Slack — Post Message to #sales
```

### Trigger: Resolved Conversation to Google Sheets

```
Zena Trigger (Conversation Resolved)
  → Google Sheets — Append Row
      A: contact_name
      B: wa_id
      C: resolved_at
```

### Action: Send Template After Form Submit

```
Typeform Trigger
  → Zena — Upsert Contact
  → Zena — Send Template (welcome_message)
      wa_id: {{ $json.phone }}
      Body Param 1: {{ $json.first_name }}
```

### Action: Full Lead Nurture Sequence

```
Zena Trigger (New Lead)
  → Wait 5 minutes
  → Zena — Send Template (follow_up_1)
  → Wait 2 hours
  → Zena — Send Template (social_proof)
  → Wait 1 day
  → Zena — Send Document (proposal.pdf)
```

---

## Credential Reference

| Field    | Description |
|----------|-------------|
| API Key  | `zena_live_...` from Zena Dashboard → Integrations → API Keys |
| Base URL | `https://zena.fictoralabs.ae/api/v1` (change only if self-hosting) |

---

## Related Resources

- [Zena Platform](https://zena.fictoralabs.ae)
- [Fictora Labs](https://fictoralabs.ae)
- [npm Package](https://www.npmjs.com/package/n8n-nodes-zena)
- [n8n Community Nodes Docs](https://docs.n8n.io/integrations/community-nodes/)

---

## Contributing

- **GitHub:** [github.com/fictoralabs/n8n-nodes-zena](https://github.com/fictoralabs/n8n-nodes-zena)
- **Support:** [admin@fictoralabs.ae](mailto:admin@fictoralabs.ae)

---

## License

MIT © [Fictora Labs](https://fictoralabs.ae)
