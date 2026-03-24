import {
  IExecuteFunctions,
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
    group: ['output'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Send WhatsApp messages, manage contacts, leads and conversations via Zena',
    defaults: {
      name: 'Zena',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'zenaApi',
        required: true,
      },
    ],
    properties: [

      // ── RESOURCE ──────────────────────────────────────────────────────
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Message',      value: 'message' },
          { name: 'Contact',      value: 'contact' },
          { name: 'Lead',         value: 'lead' },
          { name: 'Conversation', value: 'conversation' },
        ],
        default: 'message',
      },

      // ── MESSAGE OPERATIONS ────────────────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['message'] } },
        options: [
          {
            name: 'Send Template',
            value: 'sendTemplate',
            description: 'Send a Meta-approved WhatsApp template message',
            action: 'Send a template message',
          },
          {
            name: 'Send Text',
            value: 'sendText',
            description: 'Send a plain text message to an opted-in contact',
            action: 'Send a text message',
          },
          {
            name: 'Send Image',
            value: 'sendImage',
            description: 'Send an image with optional caption',
            action: 'Send an image message',
          },
          {
            name: 'Send Document',
            value: 'sendDocument',
            description: 'Send a PDF or file with optional caption',
            action: 'Send a document message',
          },
        ],
        default: 'sendTemplate',
      },

      // ── CONTACT OPERATIONS ────────────────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['contact'] } },
        options: [
          {
            name: 'Get All',
            value: 'getAll',
            description: 'List all contacts',
            action: 'Get all contacts',
          },
          {
            name: 'Upsert',
            value: 'upsert',
            description: 'Create or update a contact by phone number',
            action: 'Upsert a contact',
          },
        ],
        default: 'getAll',
      },

      // ── LEAD OPERATIONS ───────────────────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['lead'] } },
        options: [
          {
            name: 'Get All',
            value: 'getAll',
            description: 'List all captured leads',
            action: 'Get all leads',
          },
        ],
        default: 'getAll',
      },

      // ── CONVERSATION OPERATIONS ───────────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['conversation'] } },
        options: [
          {
            name: 'Get All',
            value: 'getAll',
            description: 'List all conversations',
            action: 'Get all conversations',
          },
          {
            name: 'Get Messages',
            value: 'getMessages',
            description: 'Get all messages for a specific conversation',
            action: 'Get conversation messages',
          },
        ],
        default: 'getAll',
      },

      // ── SHARED: WA_ID ─────────────────────────────────────────────────
      {
        displayName: 'WhatsApp ID (wa_id)',
        name: 'waId',
        type: 'string',
        required: true,
        default: '',
        placeholder: '971501234567',
        description: 'Recipient phone number in international format without + (e.g. 971501234567)',
        displayOptions: {
          show: {
            resource: ['message'],
          },
        },
      },

      // ── SEND TEMPLATE FIELDS ──────────────────────────────────────────
      {
        displayName: 'Template Name',
        name: 'templateName',
        type: 'string',
        required: true,
        default: '',
        placeholder: 'appointment_reminder',
        description: 'Exact name of the approved WhatsApp template',
        displayOptions: {
          show: { resource: ['message'], operation: ['sendTemplate'] },
        },
      },
      {
        displayName: 'Language Code',
        name: 'languageCode',
        type: 'options',
        options: [
          { name: 'English',      value: 'en' },
          { name: 'Arabic',       value: 'ar' },
          { name: 'English (US)', value: 'en_US' },
          { name: 'English (UK)', value: 'en_GB' },
        ],
        default: 'en',
        displayOptions: {
          show: { resource: ['message'], operation: ['sendTemplate'] },
        },
      },
      {
        displayName: 'Body Parameters',
        name: 'bodyParameters',
        type: 'fixedCollection',
        typeOptions: { multipleValues: true },
        default: {},
        description: 'Variable values for {{1}}, {{2}}, etc. in the template body — add in order',
        displayOptions: {
          show: { resource: ['message'], operation: ['sendTemplate'] },
        },
        options: [
          {
            name: 'parameter',
            displayName: 'Parameter',
            values: [
              {
                displayName: 'Value',
                name: 'value',
                type: 'string',
                default: '',
                description: 'The value to substitute into the template variable',
              },
            ],
          },
        ],
      },
      {
        displayName: 'Header Parameters',
        name: 'headerParameters',
        type: 'fixedCollection',
        typeOptions: { multipleValues: true },
        default: {},
        description: 'Variable values for the template header (if it contains variables or media)',
        displayOptions: {
          show: { resource: ['message'], operation: ['sendTemplate'] },
        },
        options: [
          {
            name: 'parameter',
            displayName: 'Parameter',
            values: [
              {
                displayName: 'Type',
                name: 'type',
                type: 'options',
                options: [
                  { name: 'Text',         value: 'text' },
                  { name: 'Image URL',    value: 'image' },
                  { name: 'Document URL', value: 'document' },
                  { name: 'Video URL',    value: 'video' },
                ],
                default: 'text',
              },
              {
                displayName: 'Value',
                name: 'value',
                type: 'string',
                default: '',
              },
            ],
          },
        ],
      },

      // ── SEND TEXT FIELDS ──────────────────────────────────────────────
      {
        displayName: 'Message Text',
        name: 'messageText',
        type: 'string',
        typeOptions: { rows: 4 },
        required: true,
        default: '',
        description: 'Plain text message content',
        displayOptions: {
          show: { resource: ['message'], operation: ['sendText'] },
        },
      },

      // ── SEND IMAGE FIELDS ─────────────────────────────────────────────
      {
        displayName: 'Image URL',
        name: 'imageUrl',
        type: 'string',
        required: true,
        default: '',
        placeholder: 'https://example.com/image.jpg',
        description: 'Publicly accessible URL of the image to send',
        displayOptions: {
          show: { resource: ['message'], operation: ['sendImage'] },
        },
      },
      {
        displayName: 'Caption',
        name: 'imageCaption',
        type: 'string',
        default: '',
        description: 'Optional caption to display below the image',
        displayOptions: {
          show: { resource: ['message'], operation: ['sendImage'] },
        },
      },

      // ── SEND DOCUMENT FIELDS ──────────────────────────────────────────
      {
        displayName: 'Document URL',
        name: 'documentUrl',
        type: 'string',
        required: true,
        default: '',
        placeholder: 'https://example.com/file.pdf',
        description: 'Publicly accessible URL of the document to send',
        displayOptions: {
          show: { resource: ['message'], operation: ['sendDocument'] },
        },
      },
      {
        displayName: 'Filename',
        name: 'documentFilename',
        type: 'string',
        default: '',
        placeholder: 'report.pdf',
        description: 'Filename shown to the recipient',
        displayOptions: {
          show: { resource: ['message'], operation: ['sendDocument'] },
        },
      },
      {
        displayName: 'Caption',
        name: 'documentCaption',
        type: 'string',
        default: '',
        description: 'Optional caption to display with the document',
        displayOptions: {
          show: { resource: ['message'], operation: ['sendDocument'] },
        },
      },

      // ── CONTACT UPSERT FIELDS ─────────────────────────────────────────
      {
        displayName: 'Phone Number',
        name: 'phoneNumber',
        type: 'string',
        required: true,
        default: '',
        placeholder: '971501234567',
        description: 'Phone number in international format without +',
        displayOptions: {
          show: { resource: ['contact'], operation: ['upsert'] },
        },
      },
      {
        displayName: 'Name',
        name: 'contactName',
        type: 'string',
        default: '',
        displayOptions: {
          show: { resource: ['contact'], operation: ['upsert'] },
        },
      },
      {
        displayName: 'Additional Fields',
        name: 'additionalFields',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        displayOptions: {
          show: { resource: ['contact'], operation: ['upsert'] },
        },
        options: [
          { displayName: 'Email',   name: 'email',   type: 'string', placeholder: 'name@email.com', default: '' },
          { displayName: 'Company', name: 'company', type: 'string', default: '' },
          { displayName: 'Tags',    name: 'tags',    type: 'string', default: '', description: 'Comma-separated tags' },
          { displayName: 'Notes',   name: 'notes',   type: 'string', default: '' },
        ],
      },

      // ── CONVERSATION ID ───────────────────────────────────────────────
      {
        displayName: 'Conversation ID',
        name: 'conversationId',
        type: 'string',
        required: true,
        default: '',
        description: 'ID of the conversation to fetch messages for',
        displayOptions: {
          show: { resource: ['conversation'], operation: ['getMessages'] },
        },
      },

      // ── SHARED PAGINATION ─────────────────────────────────────────────
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        typeOptions: { minValue: 1, maxValue: 200 },
        default: 50,
        description: 'Maximum number of results to return',
        displayOptions: {
          show: {
            resource: ['contact', 'lead', 'conversation'],
            operation: ['getAll'],
          },
        },
      },
      {
        displayName: 'Offset',
        name: 'offset',
        type: 'number',
        typeOptions: { minValue: 0 },
        default: 0,
        description: 'Number of results to skip (for pagination)',
        displayOptions: {
          show: {
            resource: ['contact', 'lead', 'conversation'],
            operation: ['getAll'],
          },
        },
      },

      // ── CONTACT SEARCH ────────────────────────────────────────────────
      {
        displayName: 'Search',
        name: 'search',
        type: 'string',
        default: '',
        description: 'Filter contacts by name or phone number',
        displayOptions: {
          show: { resource: ['contact'], operation: ['getAll'] },
        },
      },

      // ── LEAD STATUS FILTER ────────────────────────────────────────────
      {
        displayName: 'Status Filter',
        name: 'leadStatus',
        type: 'options',
        options: [
          { name: 'All',       value: '' },
          { name: 'New',       value: 'new' },
          { name: 'Contacted', value: 'contacted' },
          { name: 'Qualified', value: 'qualified' },
          { name: 'Lost',      value: 'lost' },
        ],
        default: '',
        description: 'Filter leads by status',
        displayOptions: {
          show: { resource: ['lead'], operation: ['getAll'] },
        },
      },

      // ── CONVERSATION STATUS FILTER ────────────────────────────────────
      {
        displayName: 'Status Filter',
        name: 'conversationStatus',
        type: 'options',
        options: [
          { name: 'All',      value: '' },
          { name: 'Open',     value: 'open' },
          { name: 'Resolved', value: 'resolved' },
          { name: 'Pending',  value: 'pending' },
        ],
        default: '',
        description: 'Filter conversations by status',
        displayOptions: {
          show: { resource: ['conversation'], operation: ['getAll'] },
        },
      },

    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const credentials = await this.getCredentials('zenaApi');
    const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');
    const apiKey = credentials.apiKey as string;

    const request = async (method: string, path: string, body?: object, params?: Record<string, any>) => {
      const qs = params
        ? '?' + Object.entries(params)
            .filter(([, v]) => v !== '' && v !== undefined && v !== null)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&')
        : '';
      return this.helpers.httpRequest({
        method: method as any,
        url: `${baseUrl}${path}${qs}`,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body,
        json: true,
      });
    };

    for (let i = 0; i < items.length; i++) {
      const resource  = this.getNodeParameter('resource',  i) as string;
      const operation = this.getNodeParameter('operation', i) as string;

      let responseData: any;

      try {

        // ── MESSAGE: SEND TEMPLATE ──────────────────────────────────────
        if (resource === 'message' && operation === 'sendTemplate') {
          const waId         = this.getNodeParameter('waId', i) as string;
          const templateName = this.getNodeParameter('templateName', i) as string;
          const languageCode = this.getNodeParameter('languageCode', i) as string;
          const bodyParams   = this.getNodeParameter('bodyParameters.parameter', i, []) as Array<{ value: string }>;
          const headerParams = this.getNodeParameter('headerParameters.parameter', i, []) as Array<{ type: string; value: string }>;

          const components: any[] = [];

          if (headerParams.length > 0) {
            components.push({
              type: 'header',
              parameters: headerParams.map((p) => {
                if (p.type === 'text')     return { type: 'text',     text:     p.value };
                if (p.type === 'image')    return { type: 'image',    image:    { link: p.value } };
                if (p.type === 'document') return { type: 'document', document: { link: p.value } };
                if (p.type === 'video')    return { type: 'video',    video:    { link: p.value } };
                return { type: p.type, text: p.value };
              }),
            });
          }

          if (bodyParams.length > 0) {
            components.push({
              type: 'body',
              parameters: bodyParams.map((p) => ({ type: 'text', text: p.value })),
            });
          }

          responseData = await request('POST', '/messages', {
            wa_id: waId,
            message: {
              type: 'template',
              template: {
                name: templateName,
                language: { code: languageCode },
                ...(components.length > 0 && { components }),
              },
            },
          });
        }

        // ── MESSAGE: SEND TEXT ──────────────────────────────────────────
        else if (resource === 'message' && operation === 'sendText') {
          const waId        = this.getNodeParameter('waId', i) as string;
          const messageText = this.getNodeParameter('messageText', i) as string;

          responseData = await request('POST', '/messages', {
            wa_id: waId,
            message: messageText,
          });
        }

        // ── MESSAGE: SEND IMAGE ─────────────────────────────────────────
        else if (resource === 'message' && operation === 'sendImage') {
          const waId     = this.getNodeParameter('waId', i) as string;
          const imageUrl = this.getNodeParameter('imageUrl', i) as string;
          const caption  = this.getNodeParameter('imageCaption', i, '') as string;

          responseData = await request('POST', '/messages', {
            wa_id: waId,
            message: {
              type: 'image',
              image: {
                link: imageUrl,
                ...(caption && { caption }),
              },
            },
          });
        }

        // ── MESSAGE: SEND DOCUMENT ──────────────────────────────────────
        else if (resource === 'message' && operation === 'sendDocument') {
          const waId     = this.getNodeParameter('waId', i) as string;
          const docUrl   = this.getNodeParameter('documentUrl', i) as string;
          const filename = this.getNodeParameter('documentFilename', i, '') as string;
          const caption  = this.getNodeParameter('documentCaption', i, '') as string;

          responseData = await request('POST', '/messages', {
            wa_id: waId,
            message: {
              type: 'document',
              document: {
                link: docUrl,
                ...(filename && { filename }),
                ...(caption  && { caption }),
              },
            },
          });
        }

        // ── CONTACT: GET ALL ────────────────────────────────────────────
        else if (resource === 'contact' && operation === 'getAll') {
          const limit  = this.getNodeParameter('limit',  i, 50) as number;
          const offset = this.getNodeParameter('offset', i, 0)  as number;
          const search = this.getNodeParameter('search', i, '') as string;

          responseData = await request('GET', '/contacts', undefined, { limit, offset, search });
        }

        // ── CONTACT: UPSERT ─────────────────────────────────────────────
        else if (resource === 'contact' && operation === 'upsert') {
          const phoneNumber    = this.getNodeParameter('phoneNumber', i) as string;
          const contactName    = this.getNodeParameter('contactName', i) as string;
          const additionalFields = this.getNodeParameter('additionalFields', i, {}) as Record<string, string>;

          responseData = await request('POST', '/contacts', {
            phone: phoneNumber,
            name: contactName,
            ...additionalFields,
          });
        }

        // ── LEAD: GET ALL ───────────────────────────────────────────────
        else if (resource === 'lead' && operation === 'getAll') {
          const limit      = this.getNodeParameter('limit',      i, 50) as number;
          const offset     = this.getNodeParameter('offset',     i, 0)  as number;
          const leadStatus = this.getNodeParameter('leadStatus', i, '') as string;

          responseData = await request('GET', '/leads', undefined, {
            limit,
            offset,
            ...(leadStatus && { status: leadStatus }),
          });
        }

        // ── CONVERSATION: GET ALL ───────────────────────────────────────
        else if (resource === 'conversation' && operation === 'getAll') {
          const limit              = this.getNodeParameter('limit',              i, 50) as number;
          const offset             = this.getNodeParameter('offset',             i, 0)  as number;
          const conversationStatus = this.getNodeParameter('conversationStatus', i, '') as string;

          responseData = await request('GET', '/conversations', undefined, {
            limit,
            offset,
            ...(conversationStatus && { status: conversationStatus }),
          });
        }

        // ── CONVERSATION: GET MESSAGES ──────────────────────────────────
        else if (resource === 'conversation' && operation === 'getMessages') {
          const conversationId = this.getNodeParameter('conversationId', i) as string;

          responseData = await request('GET', `/conversations/${conversationId}/messages`);
        }

        else {
          throw new NodeOperationError(
            this.getNode(),
            `Unknown operation: ${resource}/${operation}`,
          );
        }

        returnData.push({
          json: responseData,
          pairedItem: { item: i },
        });

      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: { error: (error as Error).message },
            pairedItem: { item: i },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
