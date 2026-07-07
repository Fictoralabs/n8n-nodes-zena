import {
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from "n8n-workflow";

export class ZenaApi implements ICredentialType {
  name = "zenaApi";
  displayName = "Zena API";
  documentationUrl = "https://zena.fictoralabs.ae/integrations";
  test: ICredentialTestRequest = {
    request: {
      method: "GET",
      baseURL: "={{$credentials.baseUrl}}",
      url: "/me",
      headers: {
        Authorization: "=Bearer {{$credentials.apiKey}}",
      },
    },
  };
  properties: INodeProperties[] = [
    {
      displayName: "API Key",
      name: "apiKey",
      type: "string",
      typeOptions: { password: true },
      default: "",
      required: true,
      description:
        "Your Zena API key from Settings -> Integrations -> API Keys",
    },
    {
      displayName: "Base URL",
      name: "baseUrl",
      type: "string",
      default: "https://zena.fictoralabs.ae/api/v1",
      required: true,
      description: "Leave as default unless you are self-hosting Zena",
    },
  ];
}
