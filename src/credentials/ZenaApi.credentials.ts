import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class ZenaApi implements ICredentialType {
  name = 'zenaApi';
  displayName = 'Zena API';
  documentationUrl = 'https://zena.chat/docs/api';
  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description: 'Your Zena API key — Settings → Integrations → API Keys',
    },
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'https://app.zena.chat/api/v1',
      required: true,
      description: 'Leave as default unless you are self-hosting Zena',
    },
  ];
}
