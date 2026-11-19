import { useEffect, useMemo, useState, useCallback, type FormEvent } from "react";
import { CheckCircle2, Printer, RefreshCw, Search, Ticket, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { BadgeRecord, IssueInfo, issuePass, loadBadgeRecords } from "../utils/badgeSheet";

type StatusFilter = "all" | "issued" | "pending";

export function BadgePrintPage() {
  const [records, setRecords] = useState<BadgeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  // Company name → who collected the passes (from the "Pass Issued" tab, plus issues made this session)
  const [issued, setIssued] = useState<Map<string, IssueInfo>>(new Map());
  const [issuing, setIssuing] = useState<BadgeRecord | null>(null);
  // What actually goes into the print area (snapshot taken when Print is clicked)
  const [printing, setPrinting] = useState<BadgeRecord[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { records: data, issued: fromSheet } = await loadBadgeRecords();
      setRecords(data);
      // Keep issues made in this session until the sheet export catches up
      setIssued(prev => {
        const next = new Map(fromSheet);
        prev.forEach((v, k) => { if (!next.has(k)) next.set(k, v); });
        return next;
      });
      // Drop selections that no longer exist
      setSelected(prev => new Set([...prev].filter(k => data.some(r => r.key === k))));
      toast.success(`Loaded ${data.length} people from the sheet`);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load the sheet");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const companies = useMemo(
    () => [...new Set(records.map(r => r.companyName).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [records],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter(r =>
      (!company || r.companyName === company) &&
      (status === "all" || (status === "issued") === issued.has(r.companyName)) &&
      (!q || `${r.name} ${r.designation} ${r.companyName}`.toLowerCase().includes(q)),
    );
  }, [records, search, company, status, issued]);

  const issuedCount = companies.filter(c => issued.has(c)).length;

  // Group filtered rows by company, preserving sheet order
  const groups = useMemo(() => {
    const m = new Map<string, BadgeRecord[]>();
    for (const r of filtered) {
      const k = r.companyName || "(No company)";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    return [...m.entries()];
  }, [filtered]);

  const setMany = (keys: string[], on: boolean) =>
    setSelected(prev => {
      const next = new Set(prev);
      keys.forEach(k => (on ? next.add(k) : next.delete(k)));
      return next;
    });

  const toggle = (key: string) => setMany([key], !selected.has(key));

  const allFilteredSelected = filtered.length > 0 && filtered.every(r => selected.has(r.key));
  const someFilteredSelected = filtered.some(r => selected.has(r.key));

  const printSelected = () => {
    const list = records.filter(r => selected.has(r.key));
    if (!list.length) return;
    setPrinting(list);
  };

  // Print once the print area has rendered the snapshot
  useEffect(() => {
    if (!printing.length) return;
    const t = setTimeout(() => {
      window.print();
      setPrinting([]);
    }, 50);
    return () => clearTimeout(t);
  }, [printing]);

  return (
    <div className="min-h-screen w-full bg-nexus-page-bg">
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-nexus-text-primary">Bulk Badge Print</h1>
            <p className="mt-1 text-base text-nexus-text-secondary">
              {loading
                ? "Loading from Google Sheet…"
                : `${records.length} people · ${companies.length} companies · ${issuedCount} issued · ${companies.length - issuedCount} yet to issue`}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={load} variant="outline" disabled={loading} className="h-11 font-bold border-nexus-border-strong">
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button
              onClick={() => setSelected(new Set())}
              variant="outline"
              disabled={!selected.size}
              className="h-11 font-bold border-nexus-border-strong"
            >
              Clear selection
            </Button>
            <Button
              onClick={printSelected}
              disabled={!selected.size}
              className="h-11 bg-nexus-brand font-bold text-white hover:bg-nexus-brand-hover disabled:opacity-50"
            >
              <Printer className="mr-2 h-5 w-5" /> Print Selected ({selected.size})
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-nexus-text-secondary" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, designation or company"
              className="h-11 w-full rounded-xl border border-nexus-border bg-nexus-surface pl-9 pr-3 text-sm outline-none focus:border-nexus-brand"
            />
          </div>
          <div className="relative max-w-full">
            <select
              value={company}
              onChange={e => setCompany(e.target.value)}
              className="h-11 max-w-full cursor-pointer appearance-none rounded-xl border border-nexus-border bg-nexus-surface pl-3 pr-9 text-sm outline-none focus:border-nexus-brand"
            >
              <option value="">All companies</option>
              {companies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <svg
              viewBox="0 0 16 16"
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-nexus-text-secondary"
            >
              <path d="M2 4h12L8 11z" fill="currentColor" />
            </svg>
          </div>
          <div className="relative max-w-full">
            <select
              value={status}
              onChange={e => setStatus(e.target.value as StatusFilter)}
              aria-label="Pass status"
              className="h-11 max-w-full cursor-pointer appearance-none rounded-xl border border-nexus-border bg-nexus-surface pl-3 pr-9 text-sm outline-none focus:border-nexus-brand"
            >
              <option value="all">All statuses</option>
              <option value="issued">Pass issued ({issuedCount})</option>
              <option value="pending">Yet to issue ({companies.length - issuedCount})</option>
            </select>
            <svg
              viewBox="0 0 16 16"
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-nexus-text-secondary"
            >
              <path d="M2 4h12L8 11z" fill="currentColor" />
            </svg>
          </div>
          <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-nexus-border bg-nexus-surface px-3 text-sm font-semibold">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={allFilteredSelected}
              ref={el => { if (el) el.indeterminate = !allFilteredSelected && someFilteredSelected; }}
              onChange={e => setMany(filtered.map(r => r.key), e.target.checked)}
              disabled={!filtered.length}
            />
            Select all{search || company || status !== "all" ? " (filtered)" : ""} · {filtered.length}
          </label>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-nexus-border bg-nexus-surface shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-nexus-border text-xs uppercase tracking-wide text-nexus-text-secondary">
              <tr>
                <th className="w-10 px-4 py-3"></th>
                <th className="w-12 px-2 py-3">#</th>
                <th className="px-2 py-3">Name</th>
                <th className="px-2 py-3">Designation</th>
                <th className="px-2 py-3">Company</th>
                <th className="px-4 py-3 text-right">Pass</th>
              </tr>
            </thead>
            <tbody>
              {!loading && !filtered.length && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-nexus-text-secondary">No rows to show</td></tr>
              )}
              {groups.map(([name, rows]) => {
                const all = rows.every(r => selected.has(r.key));
                const some = rows.some(r => selected.has(r.key));
                const issue = issued.get(name);
                return [
                  <tr key={`g-${name}`} className="bg-nexus-page-bg/60 border-b border-nexus-border">
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={all}
                        ref={el => { if (el) el.indeterminate = !all && some; }}
                        onChange={e => setMany(rows.map(r => r.key), e.target.checked)}
                        aria-label={`Select all from ${name}`}
                      />
                    </td>
                    <td colSpan={4} className="px-2 py-2 font-bold text-nexus-text-primary">
                      {name} <span className="font-normal text-nexus-text-secondary">· {rows.length}</span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {issue ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-800"
                          title={`Issued to ${issue.name} · ${issue.phone}${issue.at ? ` · ${issue.at}` : ""}`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Pass issued
                          <span className="font-normal">· {issue.name} · {issue.phone}{issue.at ? ` · ${issue.at}` : ""}</span>
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
                          Yet to issue
                        </span>
                      )}
                    </td>
                  </tr>,
                  ...rows.map((r, i) => (
                    <tr
                      key={r.key}
                      onClick={() => toggle(r.key)}
                      className={`cursor-pointer border-b border-nexus-border last:border-0 hover:bg-nexus-surface-hover ${
                        selected.has(r.key) ? "bg-nexus-brand/5" : ""
                      }`}
                    >
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={selected.has(r.key)}
                          onChange={() => toggle(r.key)}
                          onClick={e => e.stopPropagation()}
                          aria-label={`Select ${r.name}`}
                        />
                      </td>
                      <td className="px-2 py-2 text-nexus-text-secondary">{i + 1}</td>
                      <td className="px-2 py-2 font-semibold uppercase text-nexus-text-primary">{r.name}</td>
                      <td className="px-2 py-2 text-nexus-text-secondary">{r.designation}</td>
                      <td className="px-2 py-2 text-nexus-text-secondary">{r.companyName}</td>
                      <td className="px-4 py-2 text-right" onClick={e => e.stopPropagation()}>
                        {issue ? (
                          issue.name === r.name && (
                            <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                              Collected
                            </span>
                          )
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIssuing(r)}
                            className="h-8 whitespace-nowrap font-bold border-nexus-border-strong"
                          >
                            <Ticket className="mr-1.5 h-3.5 w-3.5" /> Issue Pass
                          </Button>
                        )}
                      </td>
                    </tr>
                  )),
                ];
              })}
            </tbody>
          </table>
        </div>
      </main>

      <IssuePassDialog
        record={issuing}
        onClose={() => setIssuing(null)}
        onIssued={(company, info) => setIssued(prev => new Map(prev).set(company, info))}
      />

      {/* Hidden print-only layout — one badge per page at 4.2×6 inch */}
      <div id="badge-print-area" aria-hidden="true">
        {printing.map(record => (
          <div key={record.key} className="badge-print-item">
            <div className="badge-content">
              <div style={{ textAlign: "center", marginTop: "1cm" }}>
                <p style={{ fontWeight: 900, color: "#111827", textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "18pt", lineHeight: 1.3, margin: 0 }}>{record.name}</p>
                {record.designation && (
                  <p style={{ fontSize: "15pt", fontWeight: 600, color: "#374151", lineHeight: 1.3, marginTop: "0.15cm" }}>{record.designation}</p>
                )}
                {record.companyName && (
                  <p style={{ fontSize: "13pt", color: "#6B7280", lineHeight: 1.3, marginTop: "0.1cm" }}>{record.companyName}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Print styles
          Total badge : 4.2in wide × 6in tall
          Printing area: 4.2in wide × 3.6in tall
          Non-printable top: 6in - 3.6in = 2.4in (lanyard/clip area)
      */}
      <style>{`
        @page {
          size: 4.2in 6in;
          margin: 0;
        }

        @media print {
          html, body {
            margin: 0;
            padding: 0;
            background: white;
          }

          body * {
            visibility: hidden !important;
          }

          #badge-print-area,
          #badge-print-area * {
            visibility: visible !important;
          }

          #badge-print-area {
            position: absolute;
            top: 0;
            left: 0;
            width: 4.2in;
          }

          .badge-print-item {
            width: 4.2in;
            height: 6in;

            /* Push content down 8cm from the top of the badge */
            padding-top: 8cm;
            padding-left: 0.1in;
            padding-right: 0.1in;
            padding-bottom: 0;

            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;

            break-after: page;
          }

          .badge-print-item:last-child {
            break-after: avoid;
          }

          /* PRINTABLE CONTENT AREA: 4.0in × 3.6in */
          .badge-content {
            width: 4.0in;
            height: 3.6in;

            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            align-items: center;
          }

          .badge-content img {
            max-width: 1.5in;
            max-height: 1.5in;
          }
        }

        /* Hidden on screen */
        #badge-print-area { display: none; }
        @media print { #badge-print-area { display: block !important; } }
      `}</style>
    </div>
  );
}

function IssuePassDialog({
  record,
  onClose,
  onIssued,
}: {
  record: BadgeRecord | null;
  onClose: () => void;
  onIssued: (company: string, info: IssueInfo) => void;
}) {
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPhone("");
    setTouched(false);
    setError(null);
  }, [record]);

  const valid = /^\d{10}$/.test(phone);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!record || !valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const info = await issuePass({
        company: record.companyName,
        name: record.name,
        designation: record.designation,
        phone,
      });
      onIssued(record.companyName, info);
      toast.success(`Pass issued to ${record.name} for ${record.companyName}`);
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Couldn't save. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={!!record} onOpenChange={o => { if (!o && !submitting) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-xl font-semibold text-gray-900">Issue Pass</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-gray-600">
                Marks every pass for this company as issued.
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-md p-1 text-gray-500 hover:bg-gray-100" aria-label="Close" disabled={submitting}>
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          {record && (
            <div className="mb-4 rounded-xl bg-gray-50 p-3 text-sm">
              <p className="font-bold uppercase text-gray-900">{record.name}</p>
              {record.designation && <p className="text-gray-600">{record.designation}</p>}
              <p className="text-gray-600">{record.companyName}</p>
            </div>
          )}

          <form onSubmit={submit}>
            <label htmlFor="issue-phone" className="mb-1 block text-sm font-semibold text-gray-800">
              Phone number (10 digits)
            </label>
            <input
              id="issue-phone"
              autoFocus
              type="tel"
              inputMode="numeric"
              autoComplete="off"
              maxLength={10}
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              onBlur={() => setTouched(true)}
              placeholder="98XXXXXXXX"
              className="h-12 w-full rounded-xl border border-gray-300 px-3 text-lg tracking-widest outline-none focus:border-nexus-brand"
            />
            <p className={`mt-1 text-xs ${touched && !valid ? "text-red-600" : "text-gray-500"}`}>
              {touched && !valid ? `Enter exactly 10 digits (${phone.length}/10)` : `${phone.length}/10`}
            </p>
            {error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting} className="h-11 font-bold">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!valid || submitting}
                className="h-11 bg-nexus-brand font-bold text-white hover:bg-nexus-brand-hover disabled:opacity-50"
              >
                {submitting ? "Saving…" : "Submit"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
