import { IDataObject, INode } from "n8n-workflow";
export interface ZenaApiCredentials {
    baseUrl: string;
    apiKey: string;
}
type ZenaRequestContext = {
    helpers: {
        request(options: IDataObject): Promise<unknown>;
    };
};
export declare function credentialsFrom(data: IDataObject): ZenaApiCredentials;
export declare function splitCsv(value: string): string[];
export declare function parseJsonParameter<T>(node: INode, raw: string, label: string, expected: "array" | "object"): T;
export declare function unwrapList(res: unknown): IDataObject[];
export declare function unwrapOne(res: unknown): IDataObject;
export declare function zenaRequest(context: ZenaRequestContext, credentials: ZenaApiCredentials, method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE", path: string, body?: IDataObject): Promise<unknown>;
export declare function fetchAllPages(context: ZenaRequestContext, credentials: ZenaApiCredentials, path: string, query: Record<string, string>, pageSize?: number, maxPages?: number): Promise<IDataObject[]>;
export {};
