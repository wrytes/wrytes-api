export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface InvoiceExtraction {
  fromName: string | null;
  toName: string | null;
  amount: number | null;
  currency: string | null;
  reference: string | null;
  itemTags: string[];
  bankHolder: string | null;
  bankStreet: string | null;
  bankStreetNr: string | null;
  bankZip: string | null;
  bankCity: string | null;
  bankIban: string | null;
}

export interface AiProvider {
  complete(prompt: string, systemPrompt?: string): Promise<string>;
  ask(history: ConversationMessage[], systemPrompt?: string): Promise<string>;
  extractInvoice(fileData: Buffer, fileType: string): Promise<InvoiceExtraction>;
}

export const INVOICE_SYSTEM_PROMPT = `Extract invoice data and return a single JSON object. Use null for any field not found.

Example:
{
  "fromName": "Acme GmbH",
  "toName": "Jane Doe",
  "amount": 119.00,
  "currency": "EUR",
  "reference": "INV-2024-001",
  "itemTags": ["Consulting", "Software"],
  "bankHolder": "Acme GmbH",
  "bankStreet": "Hauptstrasse",
  "bankStreetNr": "12",
  "bankZip": "10115",
  "bankCity": "Berlin",
  "bankIban": "DE89370400440532013000"
}

Notes:
- amount: number only, no currency symbol
- currency: 3-letter code (EUR, CHF, USD)
- reference: invoice number or payment reference
- itemTags: 1-3 short English words per line item
- bankIban: full IBAN string if present`;

export function parseInvoiceJson(raw: string): InvoiceExtraction {
  // Strip markdown fences and any leading prose before the first '{'
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in response');
  const json = raw.slice(start, end + 1);
  const parsed = JSON.parse(json) as InvoiceExtraction;
  return {
    fromName:     parsed.fromName     ?? null,
    toName:       parsed.toName       ?? null,
    amount:       typeof parsed.amount === 'number' ? parsed.amount : null,
    currency:     parsed.currency     ?? null,
    reference:    parsed.reference    ?? null,
    itemTags:     Array.isArray(parsed.itemTags) ? parsed.itemTags : [],
    bankHolder:   parsed.bankHolder   ?? null,
    bankStreet:   parsed.bankStreet   ?? null,
    bankStreetNr: parsed.bankStreetNr ?? null,
    bankZip:      parsed.bankZip      ?? null,
    bankCity:     parsed.bankCity     ?? null,
    bankIban:     parsed.bankIban     ?? null,
  };
}

export function emptyExtraction(): InvoiceExtraction {
  return {
    fromName: null, toName: null, amount: null, currency: null,
    reference: null, itemTags: [],
    bankHolder: null, bankStreet: null, bankStreetNr: null,
    bankZip: null, bankCity: null, bankIban: null,
  };
}
