import {
  IPollFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from 'n8n-workflow';

export class ZenaTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Zena Trigger',
    name: 'zenaTrigger',
    icon: 'file:zena.svg',
    group: ['trigger'],
    version: 1,
    description: 'Triggers a workflow when new leads, conversations, or messages arrive in Zena',
    defaults: {
      name: 'Zena Trigger',
    },
    inputs: [],
    outputs: ['main'],
    credentials: [
      {
        name: 'zenaApi',
        required: true,
      },
    ],
    polling: true,
    properties: [
      {
        displayName: 'Trigger On',
        name: 'triggerOn',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'New Lead Captured',
            value: 'newLead',
            description: 'Fires when a new lead is captured via the AI chatbot',
          },
          {
            name: 'New Conversation',
            value: 'newConversation',
            description: 'Fires when a new WhatsApp conversation starts',
          },
          {
            name: 'Conversation Resolved',
            value: 'conversationResolved',
            description: 'Fires when an agent marks a conversation as resolved',
          },
          {
            name: 'New Contact',
            value: 'newContact',
            description: 'Fires when a new contact is created in Zena',
          },
        ],
        default: 'newLead',
      },

      // Lead filters
      {
        displayName: 'Lead Status Filter',
        name: 'leadStatusFilter',
        type: 'options',
        options: [
          { name: 'Any Status',  value: '' },
          { name: 'New',        value: 'new' },
          { name: 'Contacted',  value: 'contacted' },
          { name: 'Qualified',  value: 'qualified' },
          { name: 'Lost',       value: 'lost' },
        ],
        default: 'new',
        description: 'Only trigger for leads with this status',
        displayOptions: {
          show: { triggerOn: ['newLead'] },
        },
      },

      // Conversation status filter
      {
        displayName: 'Conversation Status Filter',
        name: 'conversationStatusFilter',
        type: 'options',
        options: [
          { name: 'Any Status', value: '' },
          { name: 'Open',       value: 'open' },
          { name: 'Pending',    value: 'pending' },
        ],
        default: 'open',
        description: 'Only trigger for conversations with this status',
        displayOptions: {
          show: { triggerOn: ['newConversation'] },
        },
      },

      {
        displayName: 'Poll Interval',
        name: 'pollInterval',
        type: 'options',
        options: [
          { name: 'Every Minute',    value: '* * * * *' },
          { name: 'Every 5 Minutes', value: '*/5 * * * *' },
          { name: 'Every 15 Minutes',value: '*/15 * * * *' },
          { name: 'Every 30 Minutes',value: '*/30 * * * *' },
          { name: 'Every Hour',      value: '0 * * * *' },
        ],
        default: '*/5 * * * *',
        description: 'How often to check for new data',
      },
    ],
  };

  async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
    const triggerOn   = this.getNodeParameter('triggerOn') as string;
    const credentials = await this.getCredentials('zenaApi');
    const baseUrl     = (credentials.baseUrl as string).replace(/\/$/, '');
    const apiKey      = credentials.apiKey as string;

    // Retrieve last poll time from static data
    const workflowStaticData = this.getWorkflowStaticData('node');
    const lastPollTime = workflowStaticData.lastPollTime as string | undefined;
    const now          = new Date().toISOString();

    const request = async (path: string, params?: Record<string, any>) => {
      const qs = params
        ? '?' + Object.entries(params)
            .filter(([, v]) => v !== '' && v !== undefined && v !== null)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&')
        : '';
      return this.helpers.httpRequest({
        method: 'GET',
        url: `${baseUrl}${path}${qs}`,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        json: true,
      });
    };

    let newItems: any[] = [];

    try {

      if (triggerOn === 'newLead') {
        const statusFilter = this.getNodeParameter('leadStatusFilter', '') as string;
        const response = await request('/leads', {
          limit: 100,
          offset: 0,
          ...(statusFilter && { status: statusFilter }),
        });

        const leads: any[] = response?.data ?? [];
        newItems = lastPollTime
          ? leads.filter((l: any) => new Date(l.created_at) > new Date(lastPollTime))
          : leads.slice(0, 1); // on first run, only return the most recent to avoid flooding

      } else if (triggerOn === 'newConversation') {
        const statusFilter = this.getNodeParameter('conversationStatusFilter', '') as string;
        const response = await request('/conversations', {
          limit: 100,
          offset: 0,
          ...(statusFilter && { status: statusFilter }),
        });

        const conversations: any[] = response?.data ?? [];
        newItems = lastPollTime
          ? conversations.filter((c: any) => new Date(c.last_message_at) > new Date(lastPollTime))
          : conversations.slice(0, 1);

      } else if (triggerOn === 'conversationResolved') {
        const response = await request('/conversations', {
          limit: 100,
          offset: 0,
          status: 'resolved',
        });

        const conversations: any[] = response?.data ?? [];
        // For resolved, we use last_message_at as a proxy for resolution time
        newItems = lastPollTime
          ? conversations.filter((c: any) => new Date(c.last_message_at) > new Date(lastPollTime))
          : conversations.slice(0, 1);

      } else if (triggerOn === 'newContact') {
        const response = await request('/contacts', {
          limit: 100,
          offset: 0,
        });

        const contacts: any[] = response?.data ?? [];
        newItems = lastPollTime
          ? contacts.filter((c: any) => new Date(c.updated_at) > new Date(lastPollTime))
          : contacts.slice(0, 1);

      } else {
        throw new NodeOperationError(this.getNode(), `Unknown trigger: ${triggerOn}`);
      }

    } catch (error) {
      throw new NodeOperationError(this.getNode(), `Zena API error: ${(error as Error).message}`);
    }

    // Update last poll time
    workflowStaticData.lastPollTime = now;

    if (newItems.length === 0) {
      return null;
    }

    return [newItems.map((item) => ({ json: item }))];
  }
}
