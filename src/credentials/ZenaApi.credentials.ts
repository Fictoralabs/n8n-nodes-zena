import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class ZenaApi implements ICredentialType {
  name = 'zenaApi';
  displayName = 'Zena API';
  documentationUrl = 'https://zena.fictoralabs.ae';
  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      placeholder: 'zena_live_...',
      description: 'Your Zena API key. Find it in Zena Dashboard → Integrations → API Keys.',
    },
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'https://zena.fictoralabs.ae/api/v1',
      description: 'Zena API base URL. Only change this if you are self-hosting.',
    },
  ];

  authenticate = {
    type: 'generic' as const,
    properties: {
      headers: {
        Authorization: '=Bearer {{$credentials.apiKey}}',
      },
    },
  };
}
