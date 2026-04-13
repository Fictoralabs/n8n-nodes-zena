import {
  IPollFunctions,
  IDataObject,
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
    subtitle: '={{$parameter["event"]}}',
    description: 'Trigger workflows from Zena events via polling',
    defaults: { name: 'Zena Trigger' },
    inputs: [],
    outputs: ['main'],
    credentials: [{ name: 'zenaApi', required: true }],
    polling: true,
    properties: [
      {
        displayName: 'Event',
        name: 'event',
        type: 'options',
        options: [
          {
            name: 'New Message',
            value: 'new_message',
            description: 'Fires when a new inbound WhatsApp message arrives',
          },
          {
            name: 'New Lead',
            value: 'new_lead',
            description: 'Fires when a new lead is captured',
          },
          {
            name: 'Lead Status Changed',
            value: 'lead_status_changed',
            description: 'Fires when a lead status is updated',
          },
          {
            name: 'New Contact',
            value: 'new_contact',
            description: 'Fires when a new contact is created',
          },
          {
            name: 'Conversation Status Changed',
            value: 'conversation_status_changed',
            description: 'Fires when a conversation status changes (open / pending / resolved)',
          },
        ],
        default: 'new_message',
        noDataExpression: true,
      },
      {
        displayName: 'Poll Interval',
        name: 'pollInterval',
        type: 'options',
        options: [
          { name: 'Every Minute',      value: 1 },
          { name: 'Every 5 Minutes',   value: 5 },
          { name: 'Every 15 Minutes',  value: 15 },
          { name: 'Every 30 Minutes',  value: 30 },
          { name: 'Every Hour',        value: 60 },
        ],
        default: 5,
        description: 'How often to check for new events',
      },
    ],
  };

  async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
    const credentials = await this.getCredentials('zenaApi');
    const baseUrl = (credentials.baseUrl as string).replace(/\/$/, '');
    const apiKey = credentials.apiKey as string;
    const headers = { 'x-api-key': apiKey, 'Content-Type': 'application/json' };

    const event = this.getNodeParameter('event') as string;
    const workflowStaticData = this.getWorkflowStaticData('node');

    // Use last poll time as cursor; seed with current time minus 5 min on first run
    const now = new Date();
    const lastPollTime = workflowStaticData.lastPollTime as string | undefined;
    const since = lastPollTime || new Date(now.getTime() - 5 * 60 * 1000).toISOString();

    // Update cursor immediately so we don't re-process on errors
    workflowStaticData.lastPollTime = now.toISOString();

    let items: IDataObject[] = [];

    try {
      if (event === 'new_message') {
        // Poll conversations updated since last check and surface messages
        const qs = new URLSearchParams({ limit: '100', updated_since: since });
        const convs = await this.helpers.request({
          method: 'GET',
          url: `${baseUrl}/conversations?${qs}`,
          headers,
          json: true,
        }) as IDataObject[];
        items = Array.isArray(convs) ? convs.map(c => ({ ...c, _event: 'new_message' })) : [];

      } else if (event === 'new_lead' || event === 'lead_status_changed') {
        const qs = new URLSearchParams({ limit: '100', updated_since: since });
        const leads = await this.helpers.request({
          method: 'GET',
          url: `${baseUrl}/leads?${qs}`,
          headers,
          json: true,
        }) as IDataObject[];
        if (Array.isArray(leads)) {
          if (event === 'new_lead') {
            // Only leads created since last poll
            items = leads
              .filter(l => l.created_at && new Date(l.created_at as string) >= new Date(since))
              .map(l => ({ ...l, _event: 'new_lead' }));
          } else {
            // Leads whose updated_at > created_at (i.e. status was changed after creation)
            items = leads
              .filter(l => l.updated_at && l.created_at &&
                new Date(l.updated_at as string) > new Date(l.created_at as string))
              .map(l => ({ ...l, _event: 'lead_status_changed' }));
          }
        }

      } else if (event === 'new_contact') {
        const qs = new URLSearchParams({ limit: '100', updated_since: since });
        const contacts = await this.helpers.request({
          method: 'GET',
          url: `${baseUrl}/contacts?${qs}`,
          headers,
          json: true,
        }) as IDataObject[];
        if (Array.isArray(contacts)) {
          items = contacts
            .filter(c => c.created_at && new Date(c.created_at as string) >= new Date(since))
            .map(c => ({ ...c, _event: 'new_contact' }));
        }

      } else if (event === 'conversation_status_changed') {
        const qs = new URLSearchParams({ limit: '100', updated_since: since });
        const convs = await this.helpers.request({
          method: 'GET',
          url: `${baseUrl}/conversations?${qs}`,
          headers,
          json: true,
        }) as IDataObject[];
        if (Array.isArray(convs)) {
          items = convs
            .filter(c => c.updated_at && c.created_at &&
              new Date(c.updated_at as string) > new Date(c.created_at as string))
            .map(c => ({ ...c, _event: 'conversation_status_changed' }));
        }
      }

    } catch (error) {
      throw new NodeOperationError(this.getNode(), error as Error);
    }

    if (!items.length) return null;

    return [items.map(item => ({ json: item }))];
  }
}
