import * as XLSX from "xlsx";

export const SHEET_ID = "1Z87gai6YF6aqsfq_M4DICLx_cXzKGFiVV7Fr5sxqvf4";
const EXPORT_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=xlsx`;
const GVIZ_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

export interface BadgeRecord {
  key: string;
  tab: string;
  row: number;
  name: string;
  designation: string;
  companyName: string;
}

const NAME_VARIANTS = new Set(["name", "name of the person"]);
const BAD_NAME = new Set(["name", "name of the person", "sl no", "designation", ""]);

const cell = (v: unknown) => String(v ?? "").trim();
const header = (v: unknown) => cell(v).toLowerCase().replace(/\s+/g, " ").replace(/\s*:$/, "");

/** Parse one worksheet. Finds the header row (the row containing a "Name" cell),
 *  so it works for simple lists and for the COSMETICA layout with a title block. */
export function parseSheet(sheet: XLSX.WorkSheet, tab: string): BadgeRecord[] {
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  return parseWide(rows, tab) ?? parseLong(rows, tab);
}

const SLOT_NAME = /^(.*?)\s*(\d+)\s*name$/i;

/** Google Form layout: one row per company with "Co-Ex 1 Name | Co-Ex 1 Designation | Co-Ex 2 Name …".
 *  Returns null when the sheet isn't in this layout. */
function parseWide(rows: unknown[][], tab: string): BadgeRecord[] | null {
  const headerIdx = rows.findIndex(r => r.some(c => SLOT_NAME.test(cell(c))));
  if (headerIdx === -1) return null;

  const headers = rows[headerIdx].map(h => cell(h).toLowerCase().replace(/\s+/g, " "));
  const companyIdx = headers.findIndex(h => ["company name", "company"].includes(h));
  const slots = headers.flatMap((h, nameIdx) => {
    const m = h.match(SLOT_NAME);
    if (!m) return [];
    const prefix = m[1].trim();
    const desigIdx = headers.findIndex(x => x === `${prefix} ${m[2]} designation`.trim());
    return [{ n: m[2], nameIdx, desigIdx }];
  });

  // Extra people pasted past the last named slot (header cells left blank) continue as
  // Name/Designation pairs, so a header that stops at "Co-Ex 9" doesn't drop anyone.
  if (slots.length) {
    const last = slots[slots.length - 1];
    const width = Math.max(...rows.map(r => r.length));
    let n = Number(last.n);
    for (let c = Math.max(last.nameIdx, last.desigIdx) + 1; c < width; c += 2) {
      if (headers[c] || headers[c + 1]) break;
      slots.push({ n: String(++n), nameIdx: c, desigIdx: c + 1 < width ? c + 1 : -1 });
    }
  }

  const out: BadgeRecord[] = [];
  rows.slice(headerIdx + 1).forEach((r, i) => {
    const row = headerIdx + i + 2;
    const companyName = companyIdx >= 0 ? cell(r[companyIdx]) : "";
    for (const s of slots) {
      const name = cell(r[s.nameIdx]);
      if (!name) continue;
      out.push({
        key: `${tab}-${row}-${s.n}`,
        tab,
        row,
        name,
        designation: s.desigIdx >= 0 ? cell(r[s.desigIdx]) : "",
        companyName,
      });
    }
  });
  return out;
}

/** One person per row, with a "Name" header (optionally below a title block). */
function parseLong(rows: unknown[][], tab: string): BadgeRecord[] {
  const headerIdx = rows.findIndex(r => r.some(c => NAME_VARIANTS.has(cell(c).toLowerCase())));
  if (headerIdx === -1) return [];

  // "Company Name | ACME" in the block above the header acts as a default company.
  let defaultCompany = "";
  for (const r of rows.slice(0, headerIdx)) {
    if (cell(r[0]).toLowerCase() === "company name" && cell(r[1])) defaultCompany = cell(r[1]);
  }

  const headers = rows[headerIdx].map(header);
  const col = (variants: string[]) => headers.findIndex(h => variants.includes(h));
  const nameIdx = col(["name", "name of the person"]);
  const desigIdx = col(["designation"]);
  const companyIdx = col(["company name", "companyname", "company"]);

  const out: BadgeRecord[] = [];
  rows.slice(headerIdx + 1).forEach((r, i) => {
    const name = nameIdx >= 0 ? cell(r[nameIdx]) : "";
    if (BAD_NAME.has(name.toLowerCase())) return;
    const row = headerIdx + i + 2; // 1-based sheet row number
    out.push({
      key: `${tab}-${row}`,
      tab,
      row,
      name,
      designation: desigIdx >= 0 ? cell(r[desigIdx]) : "",
      companyName: (companyIdx >= 0 ? cell(r[companyIdx]) : "") || defaultCompany,
    });
  });
  return out;
}

/** Tab the Apps Script (apps-script/PassIssue.gs) appends issued passes to. */
export const ISSUED_TAB = "Pass Issued";

/** Apps Script web-app URL ending in /exec. Empty = Issue Pass not set up yet. */
export const PASS_SCRIPT_URL = "";

export interface IssueInfo {
  at: string;
  name: string;
  designation: string;
  phone: string;
}

const isIssuedTab = (name: string) => name.trim().toLowerCase() === ISSUED_TAB.toLowerCase();

export function parseWorkbook(wb: XLSX.WorkBook): BadgeRecord[] {
  return wb.SheetNames.filter(n => !isIssuedTab(n)).flatMap(name => parseSheet(wb.Sheets[name], name));
}

/** Company name → latest issue from the "Pass Issued" tab. */
export function parseIssued(wb: XLSX.WorkBook): Map<string, IssueInfo> {
  const out = new Map<string, IssueInfo>();
  const tab = wb.SheetNames.find(isIssuedTab);
  if (!tab) return out;
  const rows: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets[tab], { header: 1, defval: "", raw: false });
  const headers = (rows[0] ?? []).map(header);
  const col = (h: string) => headers.indexOf(h);
  const [at, co, to, de, ph] = ["timestamp", "company name", "issued to", "designation", "phone"].map(col);
  for (const r of rows.slice(1)) {
    const company = cell(r[co]);
    if (!company) continue;
    out.set(company, { at: cell(r[at]), name: cell(r[to]), designation: cell(r[de]), phone: cell(r[ph]) });
  }
  return out;
}

export async function issuePass(p: { company: string; name: string; designation: string; phone: string }): Promise<IssueInfo> {
  if (!PASS_SCRIPT_URL) throw new Error("Issue Pass isn't set up yet (Apps Script URL missing).");
  if (!/^\d{10}$/.test(p.phone)) throw new Error("Phone must be exactly 10 digits");
  let data: { ok?: boolean; error?: string; at?: string };
  try {
    // text/plain keeps this a "simple" request, so no CORS preflight (Apps Script can't answer one).
    const res = await fetch(PASS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(p),
    });
    data = await res.json();
  } catch {
    throw new Error("Couldn't reach the sheet. Check the internet connection and try again.");
  }
  if (!data.ok) throw new Error(data.error || "The sheet didn't accept the entry");
  return { at: data.at ?? "", name: p.name, designation: p.designation, phone: p.phone };
}

const NOT_PUBLIC =
  "Couldn't read the Google Sheet. Set its sharing to \"Anyone with the link → Viewer\" and refresh.";

async function fetchBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url, { cache: "no-store" });
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || type.includes("text/html")) throw new Error(NOT_PUBLIC);
  return res.arrayBuffer();
}

/** Load every tab of the sheet. Falls back to the gviz CSV endpoint (first tab only)
 *  if the xlsx export is blocked. */
export async function loadBadgeRecords(): Promise<{ records: BadgeRecord[]; issued: Map<string, IssueInfo> }> {
  try {
    const wb = XLSX.read(await fetchBuffer(EXPORT_URL));
    return { records: parseWorkbook(wb), issued: parseIssued(wb) };
  } catch (err) {
    try {
      const wb = XLSX.read(new TextDecoder().decode(await fetchBuffer(GVIZ_CSV_URL)), { type: "string" });
      return { records: parseSheet(wb.Sheets[wb.SheetNames[0]], "Sheet1"), issued: new Map() };
    } catch {
      throw err instanceof Error ? err : new Error(NOT_PUBLIC);
    }
  }
}
