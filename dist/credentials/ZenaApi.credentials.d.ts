import { ICredentialTestRequest, ICredentialType, INodeProperties } from "n8n-workflow";
export declare class ZenaApi implements ICredentialType {
    name: string;
    displayName: string;
    documentationUrl: string;
    test: ICredentialTestRequest;
    properties: INodeProperties[];
}
