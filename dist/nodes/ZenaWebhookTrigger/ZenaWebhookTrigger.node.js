"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZenaWebhookTrigger = void 0;
const crypto_1 = __importDefault(require("crypto"));
const EVENTS = [
    { name: "All Events", value: "*" },
    { name: "Contact Created", value: "contact.created" },
    { name: "Conversation Created", value: "conversation.created" },
    { name: "Event Registered", value: "event.registered" },
    { name: "Lead Captured", value: "lead.captured" },
    { name: "Lead Status Changed", value: "lead.status_changed" },
    { name: "Message Received", value: "message.received" },
    { name: "Owner Message", value: "owner.message" },
    { name: "Owner Quickdump", value: "owner.quickdump" },
    { name: "Owner Session Done", value: "owner.session_done" },
];
class ZenaWebhookTrigger {
    constructor() {
        this.description = {
            displayName: "Zena Webhook Trigger",
            name: "zenaWebhookTrigger",
            icon: "file:zena.svg",
            group: ["trigger"],
            version: 1,
            description: "Trigger workflows from Zena outbound webhook events",
            defaults: { name: "Zena Webhook Trigger" },
            inputs: [],
            outputs: ["main"],
            webhooks: [
                {
                    name: "default",
                    httpMethod: "POST",
                    responseMode: "onReceived",
                    responseData: "firstEntryJson",
                    path: "zena",
                },
            ],
            properties: [
                {
                    displayName: "Event",
                    name: "event",
                    type: "options",
                    options: EVENTS,
                    default: "*",
                    description: "Zena event this node should accept",
                },
                {
                    displayName: "Webhook Signing Secret",
                    name: "webhookSecret",
                    type: "string",
                    typeOptions: { password: true },
                    required: true,
                    default: "",
                    description: "Secret shown when creating or rotating the webhook in Zena Integrations",
                },
            ],
        };
    }
    async webhook() {
        const body = this.getBodyData();
        const headers = this.getHeaderData();
        const response = this.getResponseObject();
        const signature = headerValue(headers["x-zena-signature"]);
        const event = headerValue(headers["x-zena-event"]);
        const deliveryId = headerValue(headers["x-zena-delivery-id"]);
        const expectedEvent = this.getNodeParameter("event");
        const secret = this.getNodeParameter("webhookSecret");
        const rawBody = getRawBody(this.getRequestObject(), body);
        if (!verifySignature(secret, rawBody, signature)) {
            response.status(401).json({ ok: false, error: "Invalid Zena signature" });
            return { noWebhookResponse: true };
        }
        if (expectedEvent !== "*" && event !== expectedEvent) {
            response.status(200).json({ ok: true, ignored: true, event });
            return { noWebhookResponse: true };
        }
        const json = normalizePayload(body, event, deliveryId, signature);
        const workflowData = [[{ json }]];
        return {
            workflowData,
            webhookResponse: { ok: true, event, delivery_id: deliveryId || null },
        };
    }
}
exports.ZenaWebhookTrigger = ZenaWebhookTrigger;
function normalizePayload(body, event, deliveryId, signature) {
    const payload = typeof body === "object" && body !== null ? body : { body };
    return {
        ...payload,
        _zena_event: event || payload.event || null,
        _zena_delivery_id: deliveryId || payload.event_id || null,
        _zena_signature: signature,
    };
}
function headerValue(value) {
    if (Array.isArray(value))
        return value[0] || "";
    return value || "";
}
function getRawBody(request, body) {
    if (Buffer.isBuffer(request.rawBody))
        return request.rawBody.toString("utf8");
    if (typeof request.rawBody === "string")
        return request.rawBody;
    return JSON.stringify(body);
}
function verifySignature(secret, rawBody, signatureHeader) {
    if (!secret || !signatureHeader)
        return false;
    const candidates = signatureHeader
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
    for (const candidate of candidates) {
        const signature = candidate.startsWith("sha256=")
            ? candidate.slice(7)
            : candidate;
        const expected = crypto_1.default
            .createHmac("sha256", secret)
            .update(rawBody)
            .digest("hex");
        if (timingSafeEqual(signature, expected))
            return true;
    }
    return false;
}
function timingSafeEqual(a, b) {
    const left = Buffer.from(a, "hex");
    const right = Buffer.from(b, "hex");
    if (left.length !== right.length)
        return false;
    return crypto_1.default.timingSafeEqual(left, right);
}
