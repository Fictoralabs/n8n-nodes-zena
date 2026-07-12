import {
  IPollFunctions,
  IDataObject,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from "n8n-workflow";

import {
  credentialsFrom,
  fetchAllPages,
  unwrapList,
  zenaRequest,
} from "../../shared/ZenaApiClient";

const MAX_SEEN_IDS = 2000;

export class ZenaTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Zena AI Trigger",
    name: "zenaTrigger",
    icon: "file:zena.svg",
    group: ["trigger"],
    version: 1,
    subtitle: '={{$parameter["event"]}}',
    description: "Trigger workflows from Zena AI WhatsApp events via API polling",
    defaults: { name: "Zena AI Trigger" },
    inputs: [],
    outputs: ["main"],
    credentials: [{ name: "zenaApi", required: true }],
    polling: true,
    properties: [
      {
        displayName: "Event",
        name: "event",
        type: "options",
        options: [
          {
            name: "New Inbound Message",
            value: "new_message",
            description:
              "Polls updated conversations, fetches their messages, and emits new inbound messages",
          },
          {
            name: "New Lead",
            value: "new_lead",
            description: "Fires when a new lead is captured",
          },
          {
            name: "Lead Status Changed",
            value: "lead_status_changed",
            description: "Fires when a lead row is updated after creation",
          },
          {
            name: "New Contact",
            value: "new_contact",
            description: "Fires when a new contact is created",
          },
          {
            name: "Conversation Updated",
            value: "conversation_status_changed",
            description:
              "Fires when a conversation row is updated after creation",
          },
        ],
        default: "new_message",
        noDataExpression: true,
      },
      {
        displayName: "First Poll Lookback",
        name: "pollInterval",
        type: "options",
        options: [
          { name: "1 Minute", value: 1 },
          { name: "5 Minutes", value: 5 },
          { name: "15 Minutes", value: 15 },
          { name: "30 Minutes", value: 30 },
          { name: "1 Hour", value: 60 },
        ],
        default: 5,
        description:
          "How far back the first poll should look. n8n controls the recurring polling schedule.",
      },
      {
        displayName: "Maximum Pages",
        name: "maxPages",
        type: "number",
        typeOptions: { minValue: 1, maxValue: 50 },
        default: 10,
        description:
          "Maximum API pages to scan on each poll. Each page contains 100 records.",
      },
    ],
  };

  async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
    const credentials = credentialsFrom(
      (await this.getCredentials("zenaApi")) as IDataObject,
    );
    const event = this.getNodeParameter("event") as string;
    const workflowStaticData = this.getWorkflowStaticData("node");

    const now = new Date();
    const lookbackMinutes = Number(this.getNodeParameter("pollInterval") || 5);
    const cursorKey = `lastPollTime:${event}`;
    const seenKey = `seen:${event}`;
    const lastPollTime = workflowStaticData[cursorKey] as string | undefined;
    const since =
      lastPollTime ||
      new Date(now.getTime() - lookbackMinutes * 60 * 1000).toISOString();
    const maxPages = Number(this.getNodeParameter("maxPages") || 10);

    const seen = Array.isArray(workflowStaticData[seenKey])
      ? (workflowStaticData[seenKey] as string[])
      : [];
    const seenSet = new Set(seen);
    const nextSeen = [...seen];
    const items: IDataObject[] = [];

    const addItem = (key: string, item: IDataObject) => {
      if (seenSet.has(key)) return;
      seenSet.add(key);
      nextSeen.push(key);
      items.push(item);
    };

    try {
      if (event === "new_message") {
        const conversations = await fetchAllPages(
          this,
          credentials,
          "/conversations",
          { updated_since: since },
          100,
          maxPages,
        );

        for (const conversation of conversations) {
          const conversationId = String(conversation.id || "");
          if (!conversationId) continue;
          const response = await zenaRequest(
            this,
            credentials,
            "GET",
            `/conversations/${encodeURIComponent(conversationId)}/messages`,
          );
          const messages = unwrapList(response);
          for (const message of messages) {
            if (message.direction !== "inbound") continue;
            if (!isAtOrAfter(message.created_at, since)) continue;
            const messageId = String(
              message.id ||
                `${conversationId}:${message.created_at}:${message.body || ""}`,
            );
            addItem(`message:${messageId}`, {
              ...message,
              conversation_id: conversationId,
              conversation,
              _event: "new_message",
            });
          }
        }
      } else if (event === "new_lead" || event === "lead_status_changed") {
        const leads = await fetchAllPages(
          this,
          credentials,
          "/leads",
          { updated_since: since },
          100,
          maxPages,
        );
        for (const lead of leads) {
          if (event === "new_lead") {
            if (!isAtOrAfter(lead.created_at, since)) continue;
            addItem(`lead:${lead.id}`, { ...lead, _event: "new_lead" });
          } else {
            if (!isAfter(lead.updated_at, lead.created_at)) continue;
            addItem(
              `lead-status:${lead.id}:${lead.status}:${lead.updated_at}`,
              {
                ...lead,
                _event: "lead_status_changed",
              },
            );
          }
        }
      } else if (event === "new_contact") {
        const contacts = await fetchAllPages(
          this,
          credentials,
          "/contacts",
          { updated_since: since },
          100,
          maxPages,
        );
        for (const contact of contacts) {
          if (!isAtOrAfter(contact.created_at, since)) continue;
          addItem(`contact:${contact.id}`, {
            ...contact,
            _event: "new_contact",
          });
        }
      } else if (event === "conversation_status_changed") {
        const conversations = await fetchAllPages(
          this,
          credentials,
          "/conversations",
          { updated_since: since },
          100,
          maxPages,
        );
        for (const conversation of conversations) {
          if (!isAfter(conversation.updated_at, conversation.created_at))
            continue;
          addItem(
            `conversation:${conversation.id}:${conversation.status}:${conversation.updated_at}`,
            {
              ...conversation,
              _event: "conversation_status_changed",
            },
          );
        }
      }

      workflowStaticData[cursorKey] = now.toISOString();
      workflowStaticData[seenKey] = nextSeen.slice(-MAX_SEEN_IDS);
    } catch (error) {
      throw new NodeOperationError(this.getNode(), error as Error);
    }

    if (!items.length) return null;
    return [items.map((item) => ({ json: item }))];
  }
}

function isAtOrAfter(value: unknown, since: string): boolean {
  const timestamp = toDate(value);
  const cursor = toDate(since);
  if (!timestamp || !cursor) return false;
  return timestamp.getTime() >= cursor.getTime();
}

function isAfter(value: unknown, compareTo: unknown): boolean {
  const timestamp = toDate(value);
  const base = toDate(compareTo);
  if (!timestamp || !base) return false;
  return timestamp.getTime() > base.getTime();
}

function toDate(value: unknown): Date | null {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
