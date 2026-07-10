"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.credentialsFrom = credentialsFrom;
exports.splitCsv = splitCsv;
exports.parseJsonParameter = parseJsonParameter;
exports.unwrapList = unwrapList;
exports.unwrapOne = unwrapOne;
exports.zenaRequest = zenaRequest;
exports.fetchAllPages = fetchAllPages;
const n8n_workflow_1 = require("n8n-workflow");
function credentialsFrom(data) {
    const baseUrl = String(data.baseUrl || "").replace(/\/$/, "");
    const apiKey = String(data.apiKey || "");
    return { baseUrl, apiKey };
}
function splitCsv(value) {
    return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}
function parseJsonParameter(node, raw, label, expected) {
    try {
        const parsed = JSON.parse(raw);
        if (expected === "array" && !Array.isArray(parsed)) {
            throw new Error(`${label} must be a JSON array`);
        }
        if (expected === "object" &&
            (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))) {
            throw new Error(`${label} must be a JSON object`);
        }
        return parsed;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new n8n_workflow_1.NodeOperationError(node, `Invalid ${label}: ${message}`);
    }
}
function unwrapList(res) {
    const data = res;
    if (Array.isArray(data === null || data === void 0 ? void 0 : data.data))
        return data.data;
    if (Array.isArray(res))
        return res;
    return [];
}
function unwrapOne(res) {
    const data = res;
    if ((data === null || data === void 0 ? void 0 : data.data) && !Array.isArray(data.data))
        return data.data;
    return res;
}
async function zenaRequest(context, credentials, method, path, body) {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const options = {
        method,
        url: `${credentials.baseUrl}${cleanPath}`,
        headers: {
            Authorization: `Bearer ${credentials.apiKey}`,
            "Content-Type": "application/json",
        },
        json: true,
    };
    if (body !== undefined)
        options.body = body;
    return context.helpers.request(options);
}
async function fetchAllPages(context, credentials, path, query, pageSize = 100, maxPages = 20) {
    const all = [];
    let offset = 0;
    for (let page = 0; page < maxPages; page++) {
        const qs = new URLSearchParams({
            ...query,
            limit: String(pageSize),
            offset: String(offset),
        });
        const response = await zenaRequest(context, credentials, "GET", `${path}?${qs}`);
        const rows = unwrapList(response);
        all.push(...rows);
        const total = Number(response.total || 0);
        if (!rows.length || rows.length < pageSize)
            break;
        offset += rows.length;
        if (total > 0 && offset >= total)
            break;
    }
    return all;
}
