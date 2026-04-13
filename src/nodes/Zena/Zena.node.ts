import {
  IExecuteFunctions,
  IDataObject,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from 'n8n-workflow';

export class Zena implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Zena',
    name: 'zena',
    icon: 'file:zena.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Interact with Zena — WhatsApp AI CRM for MENA',
    defaults: { name: 'Zena' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [{ name: 'zenaApi', required: true }],
    properties: [
      // ─── Resource ────────────────────────────────────────────────────────────
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Contact',      value: 'contact' },
          { name: 'Conversation', value: 'conversation' },
          { name: 'Lead',         value: 'lead' },
          { name: 'Message',      value: 'message' },
          { name: 'Broadcast',    value: 'broadcast' },
        ],
        default: 'contact',
      },

      // ═══════════════════════════════════════════════════════════════════════
      // CONTACT operations
      // ═══════════════════════════════════════════════════════════════════════
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['contact'] } },
        options: [
          { name: 'Get',      value: 'get',      description: 'Retrieve a single contact by ID',    action: 'Get a contact' },
          { name: 'List',     value: 'list',     description: 'Return a page of contacts',           action: 'List contacts' },
          { name: 'Update',   value: 'update',   description: 'Update contact fields',               action: 'Update a contact' },
          { name: 'Add Note', value: 'addNote',  description: 'Append a note to a contact',          action: 'Add note to a contact' },
        ],
        default: 'list',
      },

      // contact → get
      {
        displayName: 'Contact ID',
        name: 'contactId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['contact'], operation: ['get', 'update', 'addNote'] } },
      },

      // contact → list
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        typeOptions: { minValue: 1, maxValue: 200 },
        default: 50,
        displayOptions: { show: { resource: ['contact'], operation: ['list'] } },
      },
      {
        displayName: 'Offset',
        name: 'offset',
        type: 'number',
        typeOptions: { minValue: 0 },
        default: 0,
        displayOptions: { show: { resource: ['contact'], operation: ['list'] } },
      },
      {
        displayName: 'Updated Since',
        name: 'updatedSince',
        type: 'string',
        default: '',
        placeholder: '2025-01-01T00:00:00Z',
        description: 'Only return contacts updated after this ISO timestamp (optional)',
        displayOptions: { show: { resource: ['contact'], operation: ['list'] } },
      },
      {
        displayName: 'Search',
        name: 'search',
        type: 'string',
        default: '',
        description: 'Filter by name or phone (optional)',
        displayOptions: { show: { resource: ['contact'], operation: ['list'] } },
      },

      // contact → update
      {
        displayName: 'Update Fields',
        name: 'updateFields',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        displayOptions: { show: { resource: ['contact'], operation: ['update'] } },
        options: [
          { displayName: 'Name',    name: 'name',    type: 'string', default: '' },
          { displayName: 'Email',   name: 'email',   type: 'string', default: '' },
          { displayName: 'Company', name: 'company', type: 'string', default: '' },
          { displayName: 'Tags (comma-separated)', name: 'tags', type: 'string', default: '' },
          { displayName: 'Notes',   name: 'notes',   type: 'string', default: '' },
        ],
      },

      // contact → addNote
      {
        displayName: 'Note',
        name: 'note',
        type: 'string',
        typeOptions: { rows: 4 },
        required: true,
        default: '',
        displayOptions: { show: { resource: ['contact'], operation: ['addNote'] } },
      },

      // ═══════════════════════════════════════════════════════════════════════
      // CONVERSATION operations
      // ═══════════════════════════════════════════════════════════════════════
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['conversation'] } },
        options: [
          { name: 'List',   value: 'list',   description: 'Return a page of conversations',       action: 'List conversations' },
          { name: 'Update', value: 'update', description: 'Update conversation status or agent',   action: 'Update a conversation' },
        ],
        default: 'list',
      },

      // conversation → list
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        typeOptions: { minValue: 1, maxValue: 200 },
        default: 50,
        displayOptions: { show: { resource: ['conversation'], operation: ['list'] } },
      },
      {
        displayName: 'Offset',
        name: 'offset',
        type: 'number',
        typeOptions: { minValue: 0 },
        default: 0,
        displayOptions: { show: { resource: ['conversation'], operation: ['list'] } },
      },
      {
        displayName: 'Status Filter',
        name: 'statusFilter',
        type: 'options',
        options: [
          { name: 'All',      value: '' },
          { name: 'Open',     value: 'open' },
          { name: 'Pending',  value: 'pending' },
          { name: 'Resolved', value: 'resolved' },
        ],
        default: '',
        displayOptions: { show: { resource: ['conversation'], operation: ['list'] } },
      },
      {
        displayName: 'Updated Since',
        name: 'updatedSince',
        type: 'string',
        default: '',
        placeholder: '2025-01-01T00:00:00Z',
        description: 'Only return conversations updated after this ISO timestamp (optional)',
        displayOptions: { show: { resource: ['conversation'], operation: ['list'] } },
      },

      // conversation → update
      {
        displayName: 'Conversation ID',
        name: 'conversationId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['conversation'], operation: ['update'] } },
      },
      {
        displayName: 'Update Fields',
        name: 'updateFields',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        displayOptions: { show: { resource: ['conversation'], operation: ['update'] } },
        options: [
          {
            displayName: 'Status',
            name: 'status',
            type: 'options',
            options: [
              { name: 'Open',     value: 'open' },
              { name: 'Pending',  value: 'pending' },
              { name: 'Resolved', value: 'resolved' },
            ],
            default: 'open',
          },
          { displayName: 'AI Active', name: 'ai_active', type: 'boolean', default: true },
          { displayName: 'Assigned Agent ID', name: 'assigned_agent_id', type: 'string', default: '' },
        ],
      },

      // ═══════════════════════════════════════════════════════════════════════
      // LEAD operations
      // ═══════════════════════════════════════════════════════════════════════
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['lead'] } },
        options: [
          { name: 'List',   value: 'list',   description: 'Return a page of leads',    action: 'List leads' },
          { name: 'Update', value: 'update', description: 'Update lead status',         action: 'Update a lead' },
        ],
        default: 'list',
      },

      // lead → list
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        typeOptions: { minValue: 1, maxValue: 200 },
        default: 50,
        displayOptions: { show: { resource: ['lead'], operation: ['list'] } },
      },
      {
        displayName: 'Offset',
        name: 'offset',
        type: 'number',
        typeOptions: { minValue: 0 },
        default: 0,
        displayOptions: { show: { resource: ['lead'], operation: ['list'] } },
      },
      {
        displayName: 'Updated Since',
        name: 'updatedSince',
        type: 'string',
        default: '',
        placeholder: '2025-01-01T00:00:00Z',
        displayOptions: { show: { resource: ['lead'], operation: ['list'] } },
      },

      // lead → update
      {
        displayName: 'Lead ID',
        name: 'leadId',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['lead'], operation: ['update'] } },
      },
      {
        displayName: 'Status',
        name: 'status',
        type: 'options',
        required: true,
        options: [
          { name: 'New',       value: 'new' },
          { name: 'Contacted', value: 'contacted' },
          { name: 'Qualified', value: 'qualified' },
          { name: 'Lost',      value: 'lost' },
        ],
        default: 'contacted',
        displayOptions: { show: { resource: ['lead'], operation: ['update'] } },
      },

      // ═══════════════════════════════════════════════════════════════════════
      // MESSAGE operations
      // ═══════════════════════════════════════════════════════════════════════
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['message'] } },
        options: [
          { name: 'Send Text',     value: 'sendText',     description: 'Send a plain text message',          action: 'Send a text message' },
          { name: 'Send Image',    value: 'sendImage',    description: 'Send an image with optional caption', action: 'Send an image message' },
          { name: 'Send Video',    value: 'sendVideo',    description: 'Send a video with optional caption',  action: 'Send a video message' },
          { name: 'Send Audio',    value: 'sendAudio',    description: 'Send an audio file',                  action: 'Send an audio message' },
          { name: 'Send Document', value: 'sendDocument', description: 'Send a document file',                action: 'Send a document message' },
          { name: 'Send Template', value: 'sendTemplate', description: 'Send a WhatsApp template message',    action: 'Send a template message' },
        ],
        default: 'sendText',
      },

      // message → all: to (phone number)
      {
        displayName: 'To (Phone Number)',
        name: 'to',
        type: 'string',
        required: true,
        default: '',
        placeholder: '971501234567',
        description: 'Recipient phone number in E.164 format without + (e.g. 971501234567)',
        displayOptions: { show: { resource: ['message'] } },
      },

      // message → sendText
      {
        displayName: 'Text',
        name: 'text',
        type: 'string',
        typeOptions: { rows: 4 },
        required: true,
        default: '',
        displayOptions: { show: { resource: ['message'], operation: ['sendText'] } },
      },

      // message → sendImage / sendVideo / sendAudio / sendDocument
      {
        displayName: 'Media URL',
        name: 'mediaUrl',
        type: 'string',
        required: true,
        default: '',
        description: 'Publicly accessible URL of the media file',
        displayOptions: { show: { resource: ['message'], operation: ['sendImage', 'sendVideo', 'sendAudio', 'sendDocument'] } },
      },
      {
        displayName: 'Caption',
        name: 'caption',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['message'], operation: ['sendImage', 'sendVideo', 'sendDocument'] } },
      },
      {
        displayName: 'Filename',
        name: 'filename',
        type: 'string',
        default: '',
        description: 'Display filename for documents (optional)',
        displayOptions: { show: { resource: ['message'], operation: ['sendDocument'] } },
      },

      // message → sendTemplate
      {
        displayName: 'Template Name',
        name: 'templateName',
        type: 'string',
        required: true,
        default: '',
        displayOptions: { show: { resource: ['message'], operation: ['sendTemplate'] } },
      },
      {
        displayName: 'Language Code',
        name: 'languageCode',
        type: 'string',
        default: 'en',
        displayOptions: { show: { resource: ['message'], operation: ['sendTemplate'] } },
      },
      {
        displayName: 'Components (JSON)',
        name: 'components',
        type: 'json',
        default: '[]',
        description: 'Template components array as per Meta API spec',
        displayOptions: { show: { resource: ['message'], operation: ['sendTemplate'] } },
      },

      // ═══════════════════════════════════════════════════════════════════════
      // BROADCAST operations
      // ═══════════════════════════════════════════════════════════════════════
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['broadcast'] } },
        options: [
          { name: 'List', value: 'list', description: 'Return broadcast campaigns', action: 'List broadcasts' },
        ],
        default: 'list',
      },
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        typeOptions: { minValue: 1, maxValue: 200 },
        default: 50,
        displayOptions: { show: { resource: ['broadcast'], operation: ['list'] } },
      },
      {
        displayName: 'Status Filter',
        name: 'statusFilter',
        type: 'options',
        options: [
          { name: 'All',       value: '' },
          { name: 'Draft',     value: 'draft' },
          { name: 'Running',   value: 'running' },
          { name: 'Completed', value: 'completed' },
          { name: 'Failed',    value: 'failed' },
        ],
        default: '',
        displayOptions: { show: { resource: ['broadcast'], operation: ['list'] } },
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const credentials = await this.getCredentials('zenaApi');
    const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');
    const apiKey = credentials.apiKey as string;

    const headers = { 'x-api-key': apiKey, 'Content-Type': 'application/json' };

    for (let i = 0; i < items.length; i++) {
      try {
        const resource = this.getNodeParameter('resource', i) as string;
        const operation = this.getNodeParameter('operation', i) as string;

        let responseData: unknown;

        // ─── CONTACT ────────────────────────────────────────────────────────
        if (resource === 'contact') {
          if (operation === 'list') {
            const limit = this.getNodeParameter('limit', i) as number;
            const offset = this.getNodeParameter('offset', i) as number;
            const search = this.getNodeParameter('search', i) as string;
            const updatedSince = this.getNodeParameter('updatedSince', i) as string;
            const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) });
            if (search) qs.set('search', search);
            if (updatedSince) qs.set('updated_since', updatedSince);
            const res = await this.helpers.request({ method: 'GET', url: `${baseUrl}/contacts?${qs}`, headers, json: true });
            responseData = res;

          } else if (operation === 'get') {
            const contactId = this.getNodeParameter('contactId', i) as string;
            responseData = await this.helpers.request({ method: 'GET', url: `${baseUrl}/contacts/${contactId}`, headers, json: true });

          } else if (operation === 'update') {
            const contactId = this.getNodeParameter('contactId', i) as string;
            const fields = this.getNodeParameter('updateFields', i) as Record<string, string>;
            const body: Record<string, unknown> = {};
            if (fields.name)    body.name    = fields.name;
            if (fields.email)   body.email   = fields.email;
            if (fields.company) body.company = fields.company;
            if (fields.notes)   body.notes   = fields.notes;
            if (fields.tags)    body.tags    = fields.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
            responseData = await this.helpers.request({ method: 'PATCH', url: `${baseUrl}/contacts/${contactId}`, headers, body, json: true });

          } else if (operation === 'addNote') {
            const contactId = this.getNodeParameter('contactId', i) as string;
            const note = this.getNodeParameter('note', i) as string;
            responseData = await this.helpers.request({ method: 'POST', url: `${baseUrl}/contacts/${contactId}/notes`, headers, body: { note }, json: true });
          }

        // ─── CONVERSATION ───────────────────────────────────────────────────
        } else if (resource === 'conversation') {
          if (operation === 'list') {
            const limit = this.getNodeParameter('limit', i) as number;
            const offset = this.getNodeParameter('offset', i) as number;
            const statusFilter = this.getNodeParameter('statusFilter', i) as string;
            const updatedSince = this.getNodeParameter('updatedSince', i) as string;
            const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) });
            if (statusFilter) qs.set('status', statusFilter);
            if (updatedSince) qs.set('updated_since', updatedSince);
            responseData = await this.helpers.request({ method: 'GET', url: `${baseUrl}/conversations?${qs}`, headers, json: true });

          } else if (operation === 'update') {
            const conversationId = this.getNodeParameter('conversationId', i) as string;
            const fields = this.getNodeParameter('updateFields', i) as Record<string, unknown>;
            const body: Record<string, unknown> = {};
            if (fields.status !== undefined)             body.status             = fields.status;
            if (fields.ai_active !== undefined)          body.ai_active          = fields.ai_active;
            if (fields.assigned_agent_id !== undefined && fields.assigned_agent_id !== '')
              body.assigned_agent_id = fields.assigned_agent_id;
            responseData = await this.helpers.request({ method: 'PATCH', url: `${baseUrl}/conversations/${conversationId}`, headers, body, json: true });
          }

        // ─── LEAD ───────────────────────────────────────────────────────────
        } else if (resource === 'lead') {
          if (operation === 'list') {
            const limit = this.getNodeParameter('limit', i) as number;
            const offset = this.getNodeParameter('offset', i) as number;
            const updatedSince = this.getNodeParameter('updatedSince', i) as string;
            const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) });
            if (updatedSince) qs.set('updated_since', updatedSince);
            responseData = await this.helpers.request({ method: 'GET', url: `${baseUrl}/leads?${qs}`, headers, json: true });

          } else if (operation === 'update') {
            const leadId = this.getNodeParameter('leadId', i) as string;
            const status = this.getNodeParameter('status', i) as string;
            responseData = await this.helpers.request({ method: 'PATCH', url: `${baseUrl}/leads/${leadId}`, headers, body: { status }, json: true });
          }

        // ─── MESSAGE ────────────────────────────────────────────────────────
        } else if (resource === 'message') {
          const to = this.getNodeParameter('to', i) as string;

          if (operation === 'sendText') {
            const text = this.getNodeParameter('text', i) as string;
            responseData = await this.helpers.request({ method: 'POST', url: `${baseUrl}/messages`, headers, body: { to, type: 'text', text }, json: true });

          } else if (operation === 'sendImage') {
            const mediaUrl = this.getNodeParameter('mediaUrl', i) as string;
            const caption = this.getNodeParameter('caption', i) as string;
            const body: Record<string, unknown> = { to, type: 'image', image: { link: mediaUrl } };
            if (caption) (body.image as Record<string, string>).caption = caption;
            responseData = await this.helpers.request({ method: 'POST', url: `${baseUrl}/messages`, headers, body, json: true });

          } else if (operation === 'sendVideo') {
            const mediaUrl = this.getNodeParameter('mediaUrl', i) as string;
            const caption = this.getNodeParameter('caption', i) as string;
            const body: Record<string, unknown> = { to, type: 'video', video: { link: mediaUrl } };
            if (caption) (body.video as Record<string, string>).caption = caption;
            responseData = await this.helpers.request({ method: 'POST', url: `${baseUrl}/messages`, headers, body, json: true });

          } else if (operation === 'sendAudio') {
            const mediaUrl = this.getNodeParameter('mediaUrl', i) as string;
            responseData = await this.helpers.request({ method: 'POST', url: `${baseUrl}/messages`, headers, body: { to, type: 'audio', audio: { link: mediaUrl } }, json: true });

          } else if (operation === 'sendDocument') {
            const mediaUrl = this.getNodeParameter('mediaUrl', i) as string;
            const caption = this.getNodeParameter('caption', i) as string;
            const filename = this.getNodeParameter('filename', i) as string;
            const doc: Record<string, string> = { link: mediaUrl };
            if (caption)  doc.caption  = caption;
            if (filename) doc.filename = filename;
            responseData = await this.helpers.request({ method: 'POST', url: `${baseUrl}/messages`, headers, body: { to, type: 'document', document: doc }, json: true });

          } else if (operation === 'sendTemplate') {
            const templateName = this.getNodeParameter('templateName', i) as string;
            const languageCode = this.getNodeParameter('languageCode', i) as string;
            const componentsRaw = this.getNodeParameter('components', i) as string;
            let components: unknown[] = [];
            try { components = JSON.parse(componentsRaw); } catch { /* use empty */ }
            responseData = await this.helpers.request({
              method: 'POST', url: `${baseUrl}/messages`, headers,
              body: { to, type: 'template', template: { name: templateName, language: { code: languageCode }, components } },
              json: true,
            });
          }

        // ─── BROADCAST ──────────────────────────────────────────────────────
        } else if (resource === 'broadcast') {
          if (operation === 'list') {
            const limit = this.getNodeParameter('limit', i) as number;
            const statusFilter = this.getNodeParameter('statusFilter', i) as string;
            const qs = new URLSearchParams({ limit: String(limit) });
            if (statusFilter) qs.set('status', statusFilter);
            responseData = await this.helpers.request({ method: 'GET', url: `${baseUrl}/broadcasts?${qs}`, headers, json: true });
          }
        }

        const data = Array.isArray(responseData) ? responseData : [responseData];
        returnData.push(...(data as IDataObject[]).map(d => ({ json: d })));

      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({ json: { error: (error as Error).message }, pairedItem: i });
          continue;
        }
        throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
      }
    }

    return [returnData];
  }
}
