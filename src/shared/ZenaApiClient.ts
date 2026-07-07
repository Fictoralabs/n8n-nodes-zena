import { IDataObject, INode, NodeOperationError } from "n8n-workflow";

export interface ZenaApiCredentials {
  baseUrl: string;
  apiKey: string;
}

type ZenaRequestContext = {
  helpers: {
    request(options: IDataObject): Promise<unknown>;
  };
};

export function credentialsFrom(data: IDataObject): ZenaApiCredentials {
  const baseUrl = String(data.baseUrl || "").replace(/\/$/, "");
  const apiKey = String(data.apiKey || "");
  return { baseUrl, apiKey };
}

export function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseJsonParameter<T>(
  node: INode,
  raw: string,
  label: string,
  expected: "array" | "object",
): T {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (expected === "array" && !Array.isArray(parsed)) {
      throw new Error(`${label} must be a JSON array`);
    }
    if (
      expected === "object" &&
      (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
    ) {
      throw new Error(`${label} must be a JSON object`);
    }
    return parsed as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new NodeOperationError(node, `Invalid ${label}: ${message}`);
  }
}

export function unwrapList(res: unknown): IDataObject[] {
  const data = res as { data?: unknown };
  if (Array.isArray(data?.data)) return data.data as IDataObject[];
  if (Array.isArray(res)) return res as IDataObject[];
  return [];
}

export function unwrapOne(res: unknown): IDataObject {
  const data = res as { data?: unknown };
  if (data?.data && !Array.isArray(data.data)) return data.data as IDataObject;
  return res as IDataObject;
}

export async function zenaRequest(
  context: ZenaRequestContext,
  credentials: ZenaApiCredentials,
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: IDataObject,
): Promise<unknown> {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const options: IDataObject = {
    method,
    url: `${credentials.baseUrl}${cleanPath}`,
    headers: {
      Authorization: `Bearer ${credentials.apiKey}`,
      "Content-Type": "application/json",
    },
    json: true,
  };
  if (body !== undefined) options.body = body;
  return context.helpers.request(options);
}

export async function fetchAllPages(
  context: ZenaRequestContext,
  credentials: ZenaApiCredentials,
  path: string,
  query: Record<string, string>,
  pageSize = 100,
  maxPages = 20,
): Promise<IDataObject[]> {
  const all: IDataObject[] = [];
  let offset = 0;

  for (let page = 0; page < maxPages; page++) {
    const qs = new URLSearchParams({
      ...query,
      limit: String(pageSize),
      offset: String(offset),
    });
    const response = await zenaRequest(
      context,
      credentials,
      "GET",
      `${path}?${qs}`,
    );
    const rows = unwrapList(response);
    all.push(...rows);

    const total = Number((response as { total?: unknown }).total || 0);
    if (!rows.length || rows.length < pageSize) break;
    offset += rows.length;
    if (total > 0 && offset >= total) break;
  }

  return all;
}
