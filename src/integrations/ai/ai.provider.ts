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

export const INVOICE_SYSTEM_PROMPT = `You are an invoice data extractor. Extract structured data from the invoice document and return it as a single JSON object.

Rules:
- Return ONLY the JSON object. No prose, no explanation, no markdown fences.
- Use null for any field you cannot find.
- "amount" must be a number (e.g. 35.84), not a string.
- "itemTags" must be an array of short English strings describing the line items (e.g. ["Hosting", "Server"]).
- "currency" must be an ISO 4217 code (e.g. "EUR", "CHF", "USD").
- "reference" is the invoice number or payment reference shown on the document.
- "bankIban" is the full IBAN if present.

JSON schema:
{
  "fromName": string | null,
  "toName": string | null,
  "amount": number | null,
  "currency": string | null,
  "reference": string | null,
  "itemTags": string[],
  "bankHolder": string | null,
  "bankStreet": string | null,
  "bankStreetNr": string | null,
  "bankZip": string | null,
  "bankCity": string | null,
  "bankIban": string | null
}`;

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
