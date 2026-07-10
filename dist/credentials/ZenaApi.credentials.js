"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZenaApi = void 0;
class ZenaApi {
    constructor() {
        this.name = "zenaApi";
        this.displayName = "Zena API";
        this.documentationUrl = "https://zena.fictoralabs.ae/integrations";
        this.test = {
            request: {
                method: "GET",
                baseURL: "={{$credentials.baseUrl}}",
                url: "/me",
                headers: {
                    Authorization: "=Bearer {{$credentials.apiKey}}",
                },
            },
        };
        this.properties = [
            {
                displayName: "API Key",
                name: "apiKey",
                type: "string",
                typeOptions: { password: true },
                default: "",
                required: true,
                description: "Your Zena API key from Settings -> Integrations -> API Keys",
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
}
exports.ZenaApi = ZenaApi;
