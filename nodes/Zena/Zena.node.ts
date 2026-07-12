import {
  IExecuteFunctions,
  IDataObject,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from "n8n-workflow";

import {
  credentialsFrom,
  parseJsonParameter,
  splitCsv,
  unwrapList,
  unwrapOne,
  zenaRequest,
} from "../../shared/ZenaApiClient";

type ReminderFlag =
  | "reminder_24h_sent"
  | "reminder_1h_sent"
  | "reminder_10m_sent"
  | "post_event_sent";

type BinaryResponse = {
  body: Buffer | string;
  headers?: Record<string, string | string[] | undefined>;
};

export class Zena implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Zena AI - Automate WhatsApp",
    name: "zena",
    icon: "file:zena.svg",
    group: ["transform"],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: "Automate WhatsApp with Zena AI - WhatsApp CRM for MENA",
    defaults: { name: "Zena AI" },
    inputs: ["main"],
    outputs: ["main"],
    credentials: [{ name: "zenaApi", required: true }],
    properties: [
      {
        displayName: "Resource",
        name: "resource",
        type: "options",
        noDataExpression: true,
        options: [
          { name: "Account", value: "account" },
          { name: "Broadcast", value: "broadcast" },
          { name: "Contact", value: "contact" },
          { name: "Conversation", value: "conversation" },
          { name: "Event", value: "event" },
          { name: "Lead", value: "lead" },
          { name: "Media", value: "media" },
          { name: "Message", value: "message" },
          { name: "Owner", value: "owner" },
        ],
        default: "contact",
      },

      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: { show: { resource: ["media"] } },
        options: [
          {
            name: "Download by Media ID",
            value: "downloadRaw",
            description: "Download media by WhatsApp media ID as n8n binary data",
            action: "Download media by media ID",
          },
          {
            name: "Download by Message ID",
            value: "download",
            description: "Download message media as n8n binary data",
            action: "Download message media",
          },
          {
            name: "Get Metadata by Media ID",
            value: "metadataRaw",
            description: "Get metadata for a WhatsApp media ID",
            action: "Get media metadata by media ID",
          },
          {
            name: "Get Metadata by Message ID",
            value: "metadata",
            description: "Get metadata for message media",
            action: "Get message media metadata",
          },
        ],
        default: "download",
      },
      {
        displayName: "Message ID",
        name: "mediaMessageId",
        type: "string",
        required: true,
        default: "",
        description: "Zena message ID containing media",
        displayOptions: {
          show: {
            resource: ["media"],
            operation: ["download", "metadata"],
          },
        },
      },
      {
        displayName: "Media ID",
        name: "mediaId",
        type: "string",
        required: true,
        default: "",
        description: "WhatsApp media ID stored on the Zena message",
        displayOptions: {
          show: {
            resource: ["media"],
            operation: ["downloadRaw", "metadataRaw"],
          },
        },
      },
      {
        displayName: "Binary Property",
        name: "binaryPropertyName",
        type: "string",
        required: true,
        default: "data",
        description: "Name of the binary property to write the downloaded file to",
        displayOptions: {
          show: {
            resource: ["media"],
            operation: ["download", "downloadRaw"],
          },
        },
      },

      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: { show: { resource: ["account"] } },
        options: [
          {
            name: "Verify API Key",
            value: "verify",
            description: "Call /me and return the tenant, role, and plan",
            action: "Verify API key",
          },
        ],
        default: "verify",
      },

      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: { show: { resource: ["contact"] } },
        options: [
          {
            name: "Add Note",
            value: "addNote",
            description: "Append a note to a contact",
            action: "Add note to a contact",
          },
          {
            name: "Get",
            value: "get",
            description: "Retrieve a single contact by ID",
            action: "Get a contact",
          },
          {
            name: "List",
            value: "list",
            description: "Return a page of contacts",
            action: "List contacts",
          },
          {
            name: "Sync Contacts",
            value: "sync",
            description: "Upsert contacts by wa_id and merge tags",
            action: "Sync contacts",
          },
          {
            name: "Update",
            value: "update",
            description: "Update contact fields",
            action: "Update a contact",
          },
        ],
        default: "list",
      },
      {
        displayName: "Contact ID",
        name: "contactId",
        type: "string",
        required: true,
        default: "",
        displayOptions: {
          show: {
            resource: ["contact"],
            operation: ["get", "update", "addNote"],
          },
        },
      },
      {
        displayName: "Limit",
        name: "limit",
        type: "number",
        typeOptions: { minValue: 1, maxValue: 500 },
        default: 50,
        displayOptions: {
          show: {
            resource: ["contact", "conversation", "lead", "broadcast"],
            operation: ["list"],
          },
        },
      },
      {
        displayName: "Offset",
        name: "offset",
        type: "number",
        typeOptions: { minValue: 0 },
        default: 0,
        displayOptions: {
          show: {
            resource: ["contact", "conversation", "lead", "broadcast"],
            operation: ["list"],
          },
        },
      },
      {
        displayName: "Updated Since",
        name: "updatedSince",
        type: "string",
        default: "",
        placeholder: "2026-01-01T00:00:00Z",
        description: "Only return records updated after this ISO timestamp",
        displayOptions: {
          show: {
            resource: ["contact", "conversation", "lead"],
            operation: ["list"],
          },
        },
      },
      {
        displayName: "Search",
        name: "search",
        type: "string",
        default: "",
        description: "Filter contacts by name or phone",
        displayOptions: {
          show: { resource: ["contact"], operation: ["list"] },
        },
      },
      {
        displayName: "Update Fields",
        name: "updateFields",
        type: "collection",
        placeholder: "Add Field",
        default: {},
        displayOptions: {
          show: { resource: ["contact"], operation: ["update"] },
        },
        options: [
          {
            displayName: "Company",
            name: "company",
            type: "string",
            default: "",
          },
          { displayName: "Email", name: "email", type: "string", default: "" },
          { displayName: "Name", name: "name", type: "string", default: "" },
          { displayName: "Notes", name: "notes", type: "string", default: "" },
          {
            displayName: "Tags (Comma-Separated)",
            name: "tags",
            type: "string",
            default: "",
          },
        ],
      },
      {
        displayName: "Note",
        name: "note",
        type: "string",
        typeOptions: { rows: 4 },
        required: true,
        default: "",
        displayOptions: {
          show: { resource: ["contact"], operation: ["addNote"] },
        },
      },
      {
        displayName: "Contacts JSON",
        name: "contactsJson",
        type: "json",
        required: true,
        default: '[\n  { "name": "Aisha", "wa_id": "971501234567" }\n]',
        description: "Array of contacts. Each item requires name and wa_id.",
        displayOptions: {
          show: { resource: ["contact"], operation: ["sync"] },
        },
      },
      {
        displayName: "Tags (Comma-Separated)",
        name: "syncTags",
        type: "string",
        required: true,
        default: "",
        description: "Tags to merge onto every synced contact",
        displayOptions: {
          show: { resource: ["contact"], operation: ["sync"] },
        },
      },

      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: { show: { resource: ["conversation"] } },
        options: [
          {
            name: "Get Messages",
            value: "getMessages",
            description: "Return all messages for a conversation",
            action: "Get messages for a conversation",
          },
          {
            name: "List",
            value: "list",
            description: "Return a page of conversations",
            action: "List conversations",
          },
          {
            name: "Update",
            value: "update",
            description: "Update conversation status, AI toggle, or assignee",
            action: "Update a conversation",
          },
        ],
        default: "list",
      },
      {
        displayName: "Conversation ID",
        name: "conversationId",
        type: "string",
        required: true,
        default: "",
        displayOptions: {
          show: {
            resource: ["conversation"],
            operation: ["getMessages", "update"],
          },
        },
      },
      {
        displayName: "Conversation Status",
        name: "conversationStatusFilter",
        type: "options",
        options: [
          { name: "All", value: "" },
          { name: "Open", value: "open" },
          { name: "Pending", value: "pending" },
          { name: "Resolved", value: "resolved" },
        ],
        default: "",
        displayOptions: {
          show: { resource: ["conversation"], operation: ["list"] },
        },
      },
      {
        displayName: "Update Fields",
        name: "conversationUpdateFields",
        type: "collection",
        placeholder: "Add Field",
        default: {},
        displayOptions: {
          show: { resource: ["conversation"], operation: ["update"] },
        },
        options: [
          {
            displayName: "AI Active",
            name: "ai_active",
            type: "boolean",
            default: true,
          },
          {
            displayName: "Assigned Agent ID",
            name: "assigned_agent_id",
            type: "string",
            default: "",
          },
          {
            displayName: "Status",
            name: "status",
            type: "options",
            options: [
              { name: "Open", value: "open" },
              { name: "Pending", value: "pending" },
              { name: "Resolved", value: "resolved" },
            ],
            default: "open",
          },
        ],
      },

      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: { show: { resource: ["lead"] } },
        options: [
          {
            name: "List",
            value: "list",
            description: "Return a page of leads",
            action: "List leads",
          },
          {
            name: "Update Status",
            value: "update",
            description: "Update lead status",
            action: "Update lead status",
          },
        ],
        default: "list",
      },
      {
        displayName: "Lead ID",
        name: "leadId",
        type: "string",
        required: true,
        default: "",
        displayOptions: { show: { resource: ["lead"], operation: ["update"] } },
      },
      {
        displayName: "Lead Status",
        name: "leadStatus",
        type: "options",
        options: [
          { name: "All", value: "" },
          { name: "New", value: "new" },
          { name: "Contacted", value: "contacted" },
          { name: "Qualified", value: "qualified" },
          { name: "Lost", value: "lost" },
        ],
        default: "",
        displayOptions: { show: { resource: ["lead"], operation: ["list"] } },
      },
      {
        displayName: "Status",
        name: "status",
        type: "options",
        required: true,
        options: [
          { name: "New", value: "new" },
          { name: "Contacted", value: "contacted" },
          { name: "Qualified", value: "qualified" },
          { name: "Lost", value: "lost" },
        ],
        default: "contacted",
        displayOptions: { show: { resource: ["lead"], operation: ["update"] } },
      },

      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: { show: { resource: ["message"] } },
        options: [
          {
            name: "Send Audio",
            value: "sendAudio",
            description: "Send an audio file",
            action: "Send an audio message",
          },
          {
            name: "Send Document",
            value: "sendDocument",
            description: "Send a document file",
            action: "Send a document message",
          },
          {
            name: "Send Image",
            value: "sendImage",
            description: "Send an image with optional caption",
            action: "Send an image message",
          },
          {
            name: "Send Raw WhatsApp Message",
            value: "sendRaw",
            description:
              "Send any supported WhatsApp message object through Zena",
            action: "Send raw WhatsApp message",
          },
          {
            name: "Send Template",
            value: "sendTemplate",
            description: "Send a WhatsApp template message",
            action: "Send a template message",
          },
          {
            name: "Send Text",
            value: "sendText",
            description: "Send a plain text message",
            action: "Send a text message",
          },
          {
            name: "Send Video",
            value: "sendVideo",
            description: "Send a video with optional caption",
            action: "Send a video message",
          },
        ],
        default: "sendText",
      },
      {
        displayName: "To (Phone Number)",
        name: "to",
        type: "string",
        required: true,
        default: "",
        placeholder: "971501234567",
        description: "Recipient phone number in E.164 format without +",
        displayOptions: { show: { resource: ["message"] } },
      },
      {
        displayName: "Text",
        name: "text",
        type: "string",
        typeOptions: { rows: 4 },
        required: true,
        default: "",
        displayOptions: {
          show: { resource: ["message"], operation: ["sendText"] },
        },
      },
      {
        displayName: "Media URL",
        name: "mediaUrl",
        type: "string",
        required: true,
        default: "",
        description: "Publicly accessible URL of the media file",
        displayOptions: {
          show: {
            resource: ["message"],
            operation: ["sendImage", "sendVideo", "sendAudio", "sendDocument"],
          },
        },
      },
      {
        displayName: "Caption",
        name: "caption",
        type: "string",
        default: "",
        displayOptions: {
          show: {
            resource: ["message"],
            operation: ["sendImage", "sendVideo", "sendDocument"],
          },
        },
      },
      {
        displayName: "Filename",
        name: "filename",
        type: "string",
        default: "",
        displayOptions: {
          show: { resource: ["message"], operation: ["sendDocument"] },
        },
      },
      {
        displayName: "Template Name",
        name: "templateName",
        type: "string",
        required: true,
        default: "",
        displayOptions: {
          show: { resource: ["message"], operation: ["sendTemplate"] },
        },
      },
      {
        displayName: "Language Code",
        name: "languageCode",
        type: "string",
        default: "en",
        displayOptions: {
          show: { resource: ["message"], operation: ["sendTemplate"] },
        },
      },
      {
        displayName: "Components JSON",
        name: "components",
        type: "json",
        default: "[]",
        description:
          "Template components array as per the WhatsApp Cloud API spec",
        displayOptions: {
          show: { resource: ["message"], operation: ["sendTemplate"] },
        },
      },
      {
        displayName: "Message Object JSON",
        name: "rawMessageJson",
        type: "json",
        default:
          '{\n  "type": "location",\n  "location": {\n    "latitude": "25.2048",\n    "longitude": "55.2708",\n    "name": "Dubai"\n  }\n}',
        description: "WhatsApp message object without messaging_product or to",
        displayOptions: {
          show: { resource: ["message"], operation: ["sendRaw"] },
        },
      },

      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: { show: { resource: ["broadcast"] } },
        options: [
          {
            name: "List",
            value: "list",
            description: "Return broadcast campaigns",
            action: "List broadcasts",
          },
          {
            name: "Send Now",
            value: "sendNow",
            description: "Create and launch a document-template broadcast",
            action: "Send broadcast now",
          },
        ],
        default: "list",
      },
      {
        displayName: "Broadcast Status",
        name: "broadcastStatusFilter",
        type: "options",
        options: [
          { name: "All", value: "" },
          { name: "Draft", value: "draft" },
          { name: "Scheduled", value: "scheduled" },
          { name: "Running", value: "running" },
          { name: "Paused", value: "paused" },
          { name: "Completed", value: "completed" },
          { name: "Failed", value: "failed" },
        ],
        default: "",
        displayOptions: {
          show: { resource: ["broadcast"], operation: ["list"] },
        },
      },
      {
        displayName: "Template Name",
        name: "broadcastTemplateName",
        type: "string",
        required: true,
        default: "",
        displayOptions: {
          show: { resource: ["broadcast"], operation: ["sendNow"] },
        },
      },
      {
        displayName: "Template Language",
        name: "broadcastTemplateLanguage",
        type: "string",
        default: "en",
        displayOptions: {
          show: { resource: ["broadcast"], operation: ["sendNow"] },
        },
      },
      {
        displayName: "Document URL",
        name: "broadcastDocumentUrl",
        type: "string",
        required: true,
        default: "",
        displayOptions: {
          show: { resource: ["broadcast"], operation: ["sendNow"] },
        },
      },
      {
        displayName: "Document Filename",
        name: "broadcastDocumentFilename",
        type: "string",
        required: true,
        default: "document.pdf",
        displayOptions: {
          show: { resource: ["broadcast"], operation: ["sendNow"] },
        },
      },
      {
        displayName: "Audience Tags (Comma-Separated)",
        name: "broadcastAudienceTags",
        type: "string",
        default: "",
        displayOptions: {
          show: { resource: ["broadcast"], operation: ["sendNow"] },
        },
      },
      {
        displayName: "Audience Contact IDs (Comma-Separated)",
        name: "broadcastContactIds",
        type: "string",
        default: "",
        displayOptions: {
          show: { resource: ["broadcast"], operation: ["sendNow"] },
        },
      },

      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: { show: { resource: ["event"] } },
        options: [
          {
            name: "List Registrations",
            value: "listRegistrations",
            description: "List registrations for an event",
            action: "List event registrations",
          },
          {
            name: "Update Registration Reminders",
            value: "updateRegistration",
            description: "Mark event reminder flags as sent or unsent",
            action: "Update event registration reminders",
          },
        ],
        default: "listRegistrations",
      },
      {
        displayName: "Event Key",
        name: "eventKey",
        type: "string",
        required: true,
        default: "",
        displayOptions: { show: { resource: ["event"] } },
      },
      {
        displayName: "Pending Reminder",
        name: "pendingReminder",
        type: "options",
        options: [
          { name: "All", value: "" },
          { name: "24 Hours", value: "24h" },
          { name: "1 Hour", value: "1h" },
          { name: "10 Minutes", value: "10m" },
          { name: "Post Event", value: "post_event" },
        ],
        default: "",
        displayOptions: {
          show: { resource: ["event"], operation: ["listRegistrations"] },
        },
      },
      {
        displayName: "Registration ID",
        name: "registrationId",
        type: "string",
        required: true,
        default: "",
        displayOptions: {
          show: { resource: ["event"], operation: ["updateRegistration"] },
        },
      },
      {
        displayName: "Reminder Flags",
        name: "reminderFlags",
        type: "collection",
        placeholder: "Add Flag",
        default: {},
        displayOptions: {
          show: { resource: ["event"], operation: ["updateRegistration"] },
        },
        options: [
          {
            displayName: "24h Reminder Sent",
            name: "reminder_24h_sent",
            type: "boolean",
            default: true,
          },
          {
            displayName: "1h Reminder Sent",
            name: "reminder_1h_sent",
            type: "boolean",
            default: true,
          },
          {
            displayName: "10m Reminder Sent",
            name: "reminder_10m_sent",
            type: "boolean",
            default: true,
          },
          {
            displayName: "Post Event Sent",
            name: "post_event_sent",
            type: "boolean",
            default: true,
          },
        ],
      },

      {
        displayName: "Operation",
        name: "operation",
        type: "options",
        noDataExpression: true,
        displayOptions: { show: { resource: ["owner"] } },
        options: [
          {
            name: "Submit Dump",
            value: "dump",
            description: "Submit raw idea text and fire owner.quickdump",
            action: "Submit a quick dump",
          },
          {
            name: "Submit Idea Session",
            value: "session",
            description:
              "Submit structured idea session data and fire owner.session_done",
            action: "Submit an idea session brief",
          },
        ],
        default: "dump",
      },
      {
        displayName: "Raw Dump Text",
        name: "rawDump",
        type: "string",
        typeOptions: { rows: 4 },
        required: true,
        default: "",
        displayOptions: { show: { resource: ["owner"], operation: ["dump"] } },
      },
      {
        displayName: "Brief JSON",
        name: "brief",
        type: "json",
        required: true,
        default:
          '{\n  "title": "",\n  "stage": "",\n  "framework": "",\n  "priority_score": 0,\n  "hook": ""\n}',
        displayOptions: {
          show: { resource: ["owner"], operation: ["session"] },
        },
      },
      {
        displayName: "Additional Fields",
        name: "additionalFields",
        type: "collection",
        placeholder: "Add Field",
        default: {},
        displayOptions: {
          show: { resource: ["owner"], operation: ["dump", "session"] },
        },
        options: [
          {
            displayName: "Contact ID",
            name: "contact_id",
            type: "string",
            default: "",
          },
          {
            displayName: "WhatsApp ID (wa_id)",
            name: "wa_id",
            type: "string",
            default: "",
          },
        ],
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const credentials = credentialsFrom(
      (await this.getCredentials("zenaApi")) as IDataObject,
    );

    for (let i = 0; i < items.length; i++) {
      try {
        const resource = this.getNodeParameter("resource", i) as string;
        const operation = this.getNodeParameter("operation", i) as string;
        let responseData: unknown;

        if (resource === "account") {
          responseData = await zenaRequest(this, credentials, "GET", "/me");
        } else if (resource === "contact") {
          responseData = await handleContact.call(
            this,
            i,
            operation,
            credentials,
          );
        } else if (resource === "conversation") {
          responseData = await handleConversation.call(
            this,
            i,
            operation,
            credentials,
          );
        } else if (resource === "lead") {
          responseData = await handleLead.call(this, i, operation, credentials);
        } else if (resource === "media") {
          returnData.push(
            ...(await handleMedia.call(this, i, operation, credentials)),
          );
          continue;
        } else if (resource === "message") {
          responseData = await handleMessage.call(
            this,
            i,
            operation,
            credentials,
          );
        } else if (resource === "broadcast") {
          responseData = await handleBroadcast.call(
            this,
            i,
            operation,
            credentials,
          );
        } else if (resource === "event") {
          responseData = await handleEvent.call(
            this,
            i,
            operation,
            credentials,
          );
        } else if (resource === "owner") {
          responseData = await handleOwner.call(
            this,
            i,
            operation,
            credentials,
          );
        }

        if (responseData === undefined) {
          throw new NodeOperationError(
            this.getNode(),
            `Unsupported operation: ${resource}.${operation}`,
            { itemIndex: i },
          );
        }

        const data = Array.isArray(responseData)
          ? responseData
          : [responseData];
        returnData.push(...(data as IDataObject[]).map((json) => ({ json })));
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: error instanceof Error ? error.message : String(error),
            },
            pairedItem: i,
          });
          continue;
        }
        throw new NodeOperationError(this.getNode(), error as Error, {
          itemIndex: i,
        });
      }
    }

    return [returnData];
  }
}

async function handleContact(
  this: IExecuteFunctions,
  itemIndex: number,
  operation: string,
  credentials: ReturnType<typeof credentialsFrom>,
): Promise<unknown> {
  if (operation === "list") {
    const qs = new URLSearchParams({
      limit: String(this.getNodeParameter("limit", itemIndex) as number),
      offset: String(this.getNodeParameter("offset", itemIndex) as number),
    });
    const search = this.getNodeParameter("search", itemIndex) as string;
    const updatedSince = this.getNodeParameter(
      "updatedSince",
      itemIndex,
    ) as string;
    if (search) qs.set("search", search);
    if (updatedSince) qs.set("updated_since", updatedSince);
    return unwrapList(
      await zenaRequest(this, credentials, "GET", `/contacts?${qs}`),
    );
  }

  if (operation === "get") {
    const contactId = this.getNodeParameter("contactId", itemIndex) as string;
    return unwrapOne(
      await zenaRequest(
        this,
        credentials,
        "GET",
        `/contacts/${encodeURIComponent(contactId)}`,
      ),
    );
  }

  if (operation === "update") {
    const contactId = this.getNodeParameter("contactId", itemIndex) as string;
    const fields = this.getNodeParameter(
      "updateFields",
      itemIndex,
    ) as IDataObject;
    const body: IDataObject = {};
    for (const key of ["name", "email", "company", "notes"]) {
      if (fields[key]) body[key] = fields[key];
    }
    if (typeof fields.tags === "string" && fields.tags.trim())
      body.tags = splitCsv(fields.tags);
    return unwrapOne(
      await zenaRequest(
        this,
        credentials,
        "PATCH",
        `/contacts/${encodeURIComponent(contactId)}`,
        body,
      ),
    );
  }

  if (operation === "addNote") {
    const contactId = this.getNodeParameter("contactId", itemIndex) as string;
    const note = this.getNodeParameter("note", itemIndex) as string;
    return unwrapOne(
      await zenaRequest(
        this,
        credentials,
        "POST",
        `/contacts/${encodeURIComponent(contactId)}/notes`,
        { note },
      ),
    );
  }

  if (operation === "sync") {
    const contacts = parseJsonParameter<IDataObject[]>(
      this.getNode(),
      this.getNodeParameter("contactsJson", itemIndex) as string,
      "Contacts JSON",
      "array",
    );
    const tags = splitCsv(
      this.getNodeParameter("syncTags", itemIndex) as string,
    );
    if (!tags.length)
      throw new NodeOperationError(
        this.getNode(),
        "At least one sync tag is required",
        { itemIndex },
      );
    return await zenaRequest(this, credentials, "POST", "/contacts/sync", {
      contacts,
      tags,
    });
  }

  return undefined;
}

async function handleConversation(
  this: IExecuteFunctions,
  itemIndex: number,
  operation: string,
  credentials: ReturnType<typeof credentialsFrom>,
): Promise<unknown> {
  if (operation === "list") {
    const qs = new URLSearchParams({
      limit: String(this.getNodeParameter("limit", itemIndex) as number),
      offset: String(this.getNodeParameter("offset", itemIndex) as number),
    });
    const status = this.getNodeParameter(
      "conversationStatusFilter",
      itemIndex,
    ) as string;
    const updatedSince = this.getNodeParameter(
      "updatedSince",
      itemIndex,
    ) as string;
    if (status) qs.set("status", status);
    if (updatedSince) qs.set("updated_since", updatedSince);
    return unwrapList(
      await zenaRequest(this, credentials, "GET", `/conversations?${qs}`),
    );
  }

  if (operation === "getMessages") {
    const conversationId = this.getNodeParameter(
      "conversationId",
      itemIndex,
    ) as string;
    return unwrapList(
      await zenaRequest(
        this,
        credentials,
        "GET",
        `/conversations/${encodeURIComponent(conversationId)}/messages`,
      ),
    );
  }

  if (operation === "update") {
    const conversationId = this.getNodeParameter(
      "conversationId",
      itemIndex,
    ) as string;
    const fields = this.getNodeParameter(
      "conversationUpdateFields",
      itemIndex,
    ) as IDataObject;
    const body: IDataObject = {};
    if (fields.status !== undefined) body.status = fields.status;
    if (fields.ai_active !== undefined) body.ai_active = fields.ai_active;
    if (fields.assigned_agent_id !== undefined)
      body.assigned_agent_id = fields.assigned_agent_id || null;
    return unwrapOne(
      await zenaRequest(
        this,
        credentials,
        "PATCH",
        `/conversations/${encodeURIComponent(conversationId)}`,
        body,
      ),
    );
  }

  return undefined;
}

async function handleLead(
  this: IExecuteFunctions,
  itemIndex: number,
  operation: string,
  credentials: ReturnType<typeof credentialsFrom>,
): Promise<unknown> {
  if (operation === "list") {
    const qs = new URLSearchParams({
      limit: String(this.getNodeParameter("limit", itemIndex) as number),
      offset: String(this.getNodeParameter("offset", itemIndex) as number),
    });
    const status = this.getNodeParameter("leadStatus", itemIndex) as string;
    const updatedSince = this.getNodeParameter(
      "updatedSince",
      itemIndex,
    ) as string;
    if (status) qs.set("status", status);
    if (updatedSince) qs.set("updated_since", updatedSince);
    return unwrapList(
      await zenaRequest(this, credentials, "GET", `/leads?${qs}`),
    );
  }

  if (operation === "update") {
    const leadId = this.getNodeParameter("leadId", itemIndex) as string;
    const status = this.getNodeParameter("status", itemIndex) as string;
    return unwrapOne(
      await zenaRequest(
        this,
        credentials,
        "PATCH",
        `/leads/${encodeURIComponent(leadId)}`,
        { status },
      ),
    );
  }

  return undefined;
}

async function handleMedia(
  this: IExecuteFunctions,
  itemIndex: number,
  operation: string,
  credentials: ReturnType<typeof credentialsFrom>,
): Promise<INodeExecutionData[]> {
  if (operation === "metadata" || operation === "metadataRaw") {
    const path = mediaPath.call(this, itemIndex, operation, "metadata");
    return [
      {
        json: unwrapOne(
          await zenaRequest(this, credentials, "GET", path),
        ),
        pairedItem: itemIndex,
      },
    ];
  }

  if (operation === "download" || operation === "downloadRaw") {
    const path = mediaPath.call(this, itemIndex, operation, "download");
    const binaryPropertyName = this.getNodeParameter(
      "binaryPropertyName",
      itemIndex,
    ) as string;
    const response = (await this.helpers.request({
      method: "GET",
      url: `${credentials.baseUrl}${path}`,
      headers: { Authorization: `Bearer ${credentials.apiKey}` },
      encoding: null,
      resolveWithFullResponse: true,
      json: false,
    } as IDataObject)) as BinaryResponse;

    const body = Buffer.isBuffer(response.body)
      ? response.body
      : Buffer.from(response.body);
    const mimeType = getHeader(response.headers, "content-type") ||
      "application/octet-stream";
    const fileName = fileNameFromDisposition(
      getHeader(response.headers, "content-disposition"),
    ) || "zena-media.bin";

    const binaryData = await this.helpers.prepareBinaryData(
      body,
      fileName,
      mimeType,
    );

    return [
      {
        json: {
          fileName,
          mimeType,
          fileSize: body.length,
          source: operation === "downloadRaw" ? "media_id" : "message_id",
        },
        binary: {
          [binaryPropertyName]: binaryData,
        },
        pairedItem: itemIndex,
      },
    ];
  }

  return [];
}

function mediaPath(
  this: IExecuteFunctions,
  itemIndex: number,
  operation: string,
  action: "download" | "metadata",
): string {
  if (operation === "download" || operation === "metadata") {
    const messageId = this.getNodeParameter(
      "mediaMessageId",
      itemIndex,
    ) as string;
    return `/media/${encodeURIComponent(messageId)}/${action}`;
  }

  const mediaId = this.getNodeParameter("mediaId", itemIndex) as string;
  return `/media/raw/${encodeURIComponent(mediaId)}/${action}`;
}

function getHeader(
  headers: BinaryResponse["headers"] | undefined,
  name: string,
): string | undefined {
  if (!headers) return undefined;
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== target || value === undefined) continue;
    return Array.isArray(value) ? value[0] : value;
  }
  return undefined;
}

function fileNameFromDisposition(disposition: string | undefined): string | undefined {
  if (!disposition) return undefined;
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1].replace(/"/g, ""));
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match?.[1];
}

async function handleMessage(
  this: IExecuteFunctions,
  itemIndex: number,
  operation: string,
  credentials: ReturnType<typeof credentialsFrom>,
): Promise<unknown> {
  const wa_id = this.getNodeParameter("to", itemIndex) as string;
  let message: string | IDataObject;

  if (operation === "sendText") {
    message = this.getNodeParameter("text", itemIndex) as string;
  } else if (operation === "sendImage") {
    const image: IDataObject = {
      link: this.getNodeParameter("mediaUrl", itemIndex) as string,
    };
    const caption = this.getNodeParameter("caption", itemIndex) as string;
    if (caption) image.caption = caption;
    message = { type: "image", image };
  } else if (operation === "sendVideo") {
    const video: IDataObject = {
      link: this.getNodeParameter("mediaUrl", itemIndex) as string,
    };
    const caption = this.getNodeParameter("caption", itemIndex) as string;
    if (caption) video.caption = caption;
    message = { type: "video", video };
  } else if (operation === "sendAudio") {
    message = {
      type: "audio",
      audio: { link: this.getNodeParameter("mediaUrl", itemIndex) as string },
    };
  } else if (operation === "sendDocument") {
    const document: IDataObject = {
      link: this.getNodeParameter("mediaUrl", itemIndex) as string,
    };
    const caption = this.getNodeParameter("caption", itemIndex) as string;
    const filename = this.getNodeParameter("filename", itemIndex) as string;
    if (caption) document.caption = caption;
    if (filename) document.filename = filename;
    message = { type: "document", document };
  } else if (operation === "sendTemplate") {
    const components = parseJsonParameter<IDataObject[]>(
      this.getNode(),
      this.getNodeParameter("components", itemIndex) as string,
      "Components JSON",
      "array",
    );
    message = {
      type: "template",
      template: {
        name: this.getNodeParameter("templateName", itemIndex) as string,
        language: {
          code: this.getNodeParameter("languageCode", itemIndex) as string,
        },
        components,
      },
    };
  } else if (operation === "sendRaw") {
    message = parseJsonParameter<IDataObject>(
      this.getNode(),
      this.getNodeParameter("rawMessageJson", itemIndex) as string,
      "Message Object JSON",
      "object",
    );
  } else {
    return undefined;
  }

  return await zenaRequest(this, credentials, "POST", "/messages", {
    wa_id,
    message,
  });
}

async function handleBroadcast(
  this: IExecuteFunctions,
  itemIndex: number,
  operation: string,
  credentials: ReturnType<typeof credentialsFrom>,
): Promise<unknown> {
  if (operation === "list") {
    const qs = new URLSearchParams({
      limit: String(this.getNodeParameter("limit", itemIndex) as number),
      offset: String(this.getNodeParameter("offset", itemIndex) as number),
    });
    const status = this.getNodeParameter(
      "broadcastStatusFilter",
      itemIndex,
    ) as string;
    if (status) qs.set("status", status);
    return unwrapList(
      await zenaRequest(this, credentials, "GET", `/broadcasts?${qs}`),
    );
  }

  if (operation === "sendNow") {
    const tags = splitCsv(
      this.getNodeParameter("broadcastAudienceTags", itemIndex) as string,
    );
    const contact_ids = splitCsv(
      this.getNodeParameter("broadcastContactIds", itemIndex) as string,
    );
    if (!tags.length && !contact_ids.length) {
      throw new NodeOperationError(
        this.getNode(),
        "Audience tags or contact IDs are required for Broadcast Send Now",
        { itemIndex },
      );
    }
    return await zenaRequest(
      this,
      credentials,
      "POST",
      "/broadcasts/send-now",
      {
        template_name: this.getNodeParameter(
          "broadcastTemplateName",
          itemIndex,
        ) as string,
        template_language: this.getNodeParameter(
          "broadcastTemplateLanguage",
          itemIndex,
        ) as string,
        document_url: this.getNodeParameter(
          "broadcastDocumentUrl",
          itemIndex,
        ) as string,
        document_filename: this.getNodeParameter(
          "broadcastDocumentFilename",
          itemIndex,
        ) as string,
        audience: {
          ...(tags.length ? { tags } : {}),
          ...(contact_ids.length ? { contact_ids } : {}),
        },
      },
    );
  }

  return undefined;
}

async function handleEvent(
  this: IExecuteFunctions,
  itemIndex: number,
  operation: string,
  credentials: ReturnType<typeof credentialsFrom>,
): Promise<unknown> {
  const eventKey = this.getNodeParameter("eventKey", itemIndex) as string;

  if (operation === "listRegistrations") {
    const qs = new URLSearchParams();
    const pendingReminder = this.getNodeParameter(
      "pendingReminder",
      itemIndex,
    ) as string;
    if (pendingReminder) qs.set("pending_reminder", pendingReminder);
    const suffix = qs.toString() ? `?${qs}` : "";
    const response = (await zenaRequest(
      this,
      credentials,
      "GET",
      `/events/${encodeURIComponent(eventKey)}/registrations${suffix}`,
    )) as IDataObject;
    const registrations = Array.isArray(response.registrations)
      ? (response.registrations as IDataObject[])
      : [];
    return registrations.map((registration) => ({
      ...registration,
      event: response.event as IDataObject,
    }));
  }

  if (operation === "updateRegistration") {
    const registrationId = this.getNodeParameter(
      "registrationId",
      itemIndex,
    ) as string;
    const flags = this.getNodeParameter(
      "reminderFlags",
      itemIndex,
    ) as IDataObject;
    const body: IDataObject = {};
    for (const key of [
      "reminder_24h_sent",
      "reminder_1h_sent",
      "reminder_10m_sent",
      "post_event_sent",
    ] as ReminderFlag[]) {
      if (Object.prototype.hasOwnProperty.call(flags, key))
        body[key] = flags[key];
    }
    if (!Object.keys(body).length) {
      throw new NodeOperationError(
        this.getNode(),
        "At least one reminder flag is required",
        { itemIndex },
      );
    }
    return await zenaRequest(
      this,
      credentials,
      "PATCH",
      `/events/${encodeURIComponent(eventKey)}/registrations/${encodeURIComponent(registrationId)}`,
      body,
    );
  }

  return undefined;
}

async function handleOwner(
  this: IExecuteFunctions,
  itemIndex: number,
  operation: string,
  credentials: ReturnType<typeof credentialsFrom>,
): Promise<unknown> {
  const additionalFields = this.getNodeParameter(
    "additionalFields",
    itemIndex,
  ) as IDataObject;
  const extra: IDataObject = {};
  if (additionalFields.contact_id)
    extra.contact_id = additionalFields.contact_id;
  if (additionalFields.wa_id) extra.wa_id = additionalFields.wa_id;

  if (operation === "dump") {
    return await zenaRequest(this, credentials, "POST", "/owner/dump", {
      raw_dump: this.getNodeParameter("rawDump", itemIndex) as string,
      ...extra,
    });
  }

  if (operation === "session") {
    const brief = parseJsonParameter<IDataObject>(
      this.getNode(),
      this.getNodeParameter("brief", itemIndex) as string,
      "Brief JSON",
      "object",
    );
    return await zenaRequest(this, credentials, "POST", "/owner/session", {
      brief,
      ...extra,
    });
  }

  return undefined;
}
