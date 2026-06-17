import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Upload, Download, FileText, X, CheckCircle, AlertCircle, Copy, Printer, RefreshCw } from "lucide-react";
import { TopNav } from "./dashboard/TopNav";
import { AdminSidebar } from "./dashboard/AdminSidebar";
import { Button } from "./ui/button";
import { BulkService, UploadResponse, UploadError, BadgePrintRecord } from "../api/services/bulk.service";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const prefixOptions = [
  { value: "VS",  label: "VS — Visitors" },
  { value: "VI",  label: "VI — VIPs" },
  { value: "FDL", label: "FDL — Foreign Delegates" },
  { value: "EH",  label: "EH — Exhibitors" },
  { value: "OR",  label: "OR — Organisers" },
  { value: "SPK", label: "SPK — Speakers" },
  { value: "DL",  label: "DL — Delegates" },
  { value: "SPR", label: "SPR — Sponsors" },
];

export function BulkUploadPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<"upload" | "badge-print">("upload");

  // ── Upload tab state ───────────────────────────────────────────────────────
  const [uploadStep, setUploadStep] = useState(1); // 1=Select, 2=Processing, 3=Results
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPrefix, setSelectedPrefix] = useState("VS");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [jobPolling, setJobPolling] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Badge Print tab state ──────────────────────────────────────────────────
  const [badgeFile, setBadgeFile] = useState<File | null>(null);
  const [isBadgePrinting, setIsBadgePrinting] = useState(false);
  const [badgeRecords, setBadgeRecords] = useState<BadgePrintRecord[]>([]);
  const [isDraggingBadge, setIsDraggingBadge] = useState(false);
  const badgeFileInputRef = useRef<HTMLInputElement>(null);

  // Stop polling on unmount
  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);


  // ── Upload helpers ─────────────────────────────────────────────────────────
  const isValidUploadFile = (file: File) => {
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (![".csv", ".xls", ".xlsx"].includes(ext)) {
      toast.error("Invalid file type. Please upload CSV, XLS, or XLSX files only.");
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10 MB.");
      return false;
    }
    return true;
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && isValidUploadFile(file)) setSelectedFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isValidUploadFile(file)) setSelectedFile(file);
  };

  const downloadTemplate = () => {
    const headers = ["name", "email", "phoneNumber", "designation", "companyName", "city"];
    const ws = XLSX.utils.aoa_to_sheet([headers]);

    // Style header row: bold
    headers.forEach((_, colIdx) => {
      const cellAddr = XLSX.utils.encode_cell({ r: 0, c: colIdx });
      if (!ws[cellAddr]) ws[cellAddr] = {};
      ws[cellAddr].s = { font: { bold: true }, fill: { fgColor: { rgb: "1E5FCC" } }, alignment: { horizontal: "center" } };
    });

    // Set column widths
    ws["!cols"] = headers.map(() => ({ wch: 22 }));

    // Freeze first row (pane freeze at A2)
    ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft" };

    // SheetJS uses !freeze through sheetViews; set it properly
    (ws as any)["!sheetViews"] = [{ state: "frozen", ySplit: 1, topLeftCell: "A2" }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pre-Registrations");
    XLSX.writeFile(wb, "nexus_prereg_template.xlsx");
  };

  const pollJobUntilDone = useCallback((jobId: string) => {
    setJobPolling(true);
    pollingRef.current = setInterval(async () => {
      try {
        const job = await BulkService.getJobStatus(jobId);
        setUploadProgress(job.progress ?? 95);
        if (job.status === "completed" || job.status === "failed") {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          setJobPolling(false);
          setUploadResult(prev => prev ? {
            ...prev,
            imported: job.imported,
            failed: job.failed,
            errors: job.errors ?? [],
          } : prev);
          setUploadProgress(100);
          setUploadStep(3);
        }
      } catch {
        clearInterval(pollingRef.current!);
        pollingRef.current = null;
        setJobPolling(false);
        setUploadStep(3);
      }
    }, 2000);
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStep(2);

    // Animate progress while waiting
    const progInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 8, 85));
    }, 400);

    try {
      const response = await BulkService.upload(selectedFile, selectedPrefix);
      clearInterval(progInterval);
      setUploadResult(response);

      // If job is queued/processing (async), start polling
      if (response.jobId && response.imported === 0 && response.failed === 0) {
        pollJobUntilDone(response.jobId);
      } else {
        setUploadProgress(100);
        setUploadStep(3);
      }
    } catch (err: any) {
      clearInterval(progInterval);
      toast.error(err.message || "Upload failed");
      setUploadStep(1);
    } finally {
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    setUploadStep(1);
    setSelectedFile(null);
    setUploadResult(null);
    setUploadProgress(0);
    setJobPolling(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const copyJobId = () => {
    if (!uploadResult?.jobId) return;
    navigator.clipboard.writeText(uploadResult.jobId);
    toast.success("Job ID copied");
  };

  const handleExport = async (format: "csv" | "pdf") => {
    try {
      const url = await BulkService.exportData({ format, prefix: selectedPrefix });
      window.open(url, "_blank");
    } catch {
      toast.error("Export failed");
    }
  };

  // ── Badge Print helpers ────────────────────────────────────────────────────
  const isValidBadgeFile = (file: File) => {
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (![".csv", ".xls", ".xlsx"].includes(ext)) {
      toast.error("Please upload a CSV, XLS, or XLSX file.");
      return false;
    }
    return true;
  };

  const downloadBadgeTemplate = () => {
    const headers = ["SL No", "Name", "Designation", "Company Name"];
    const example = [1, "JOHN DOE", "DIRECTOR", "ACME CORP"];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);

    headers.forEach((_, colIdx) => {
      const cellAddr = XLSX.utils.encode_cell({ r: 0, c: colIdx });
      if (!ws[cellAddr]) ws[cellAddr] = {};
      ws[cellAddr].s = { font: { bold: true }, fill: { fgColor: { rgb: "1E5FCC" } }, alignment: { horizontal: "center" } };
    });

    ws["!cols"] = [{ wch: 8 }, { wch: 30 }, { wch: 30 }, { wch: 35 }];
    (ws as any)["!sheetViews"] = [{ state: "frozen", ySplit: 1, topLeftCell: "A2" }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "COSMETICA-2026 BADGES LIST");
    XLSX.writeFile(wb, "cosmetica_2026_badge_template.xlsx");
  };

  const handleBadgeFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingBadge(false);
    const file = e.dataTransfer.files[0];
    if (file && isValidBadgeFile(file)) setBadgeFile(file);
  };

  const handleBadgeFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isValidBadgeFile(file)) setBadgeFile(file);
  };

  const handleBadgePrint = async () => {
    if (!badgeFile) return;
    setIsBadgePrinting(true);
    try {
      const data = await badgeFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      // Read every row as a raw array so we can locate the actual header row.
      // This works whether the file is the master sheet (headers in row 4),
      // an individual company file (headers in row 5), or a simple template (row 1).
      const allRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

      const NAME_VARIANTS = new Set(["name", "name of the person"]);
      const headerRowIdx = allRows.findIndex(row =>
        (row as unknown[]).some(cell => NAME_VARIANTS.has(String(cell).toLowerCase().trim()))
      );

      if (headerRowIdx === -1) {
        toast.error("Could not find a 'Name' header column. Please use the COSMETICA-2026 template.");
        return;
      }

      const headers = (allRows[headerRowIdx] as unknown[]).map(h => String(h).trim());
      const col = (variants: string[]) => {
        const v = new Set(variants.map(s => s.toLowerCase()));
        return headers.findIndex(h => v.has(h.toLowerCase()));
      };

      const nameIdx    = col(["Name", "name of the person"]);
      const desigIdx   = col(["Designation"]);
      const companyIdx = col(["Company Name", "companyName", "company name"]);

      const BAD_NAME = new Set(["name", "name of the person", "sl no", "designation", ""]);

      const records: BadgePrintRecord[] = allRows
        .slice(headerRowIdx + 1)
        .map((row, i) => {
          const r = row as unknown[];
          return {
            row: headerRowIdx + i + 2,
            id: String(i + 1),
            name:        nameIdx    >= 0 ? String(r[nameIdx]    ?? "").trim() : "",
            designation: desigIdx   >= 0 ? String(r[desigIdx]   ?? "").trim() : "",
            companyName: companyIdx >= 0 ? String(r[companyIdx] ?? "").trim() : "",
            stallNumber: "",
            photoUrl:    null,
            badgeQrUrl:  null,
          };
        })
        .filter(r => r.name.trim() !== "" && !BAD_NAME.has(r.name.toLowerCase()));

      setBadgeRecords(records);
      toast.success(`Processed ${records.length} records — ready to print`);
    } catch (err: any) {
      toast.error(err.message || "Badge print processing failed");
    } finally {
      setIsBadgePrinting(false);
    }
  };

  const resetBadgePrint = () => {
    setBadgeFile(null);
    setBadgeRecords([]);
    if (badgeFileInputRef.current) badgeFileInputRef.current.value = "";
  };

  const printBadgeGrid = () => window.print();

  const formatFileSize = (bytes: number) =>
    bytes < 1024 ? `${bytes} B` : bytes < 1024 ** 2 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`;

  return (
    <div className="min-h-screen w-full bg-nexus-page-bg pt-16">
      <TopNav role="admin" />

      <div className="flex">
        <AdminSidebar collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />

        <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-60"}`}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 lg:p-8">

            {/* Page Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-semibold text-nexus-text-primary">Bulk Operations</h1>
              <p className="mt-1 text-base text-nexus-text-secondary">Import attendees or process badge print batches</p>
            </div>

            {/* Tab Switcher */}
            <div className="mb-8 flex gap-1 rounded-2xl bg-nexus-surface border border-nexus-border p-1 w-fit shadow-sm">
              {[
                { key: "upload",      label: "Bulk Pre-Reg Upload" },
                { key: "badge-print", label: "Bulk Badge Print" },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`rounded-xl px-6 py-2.5 text-sm font-bold transition-all ${
                    activeTab === tab.key
                      ? "bg-nexus-brand text-white shadow-lg"
                      : "text-nexus-text-secondary hover:text-nexus-text-primary"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── TAB 1: Bulk Upload ─────────────────────────────────────────── */}
            <AnimatePresence mode="wait">
              {activeTab === "upload" && (
                <motion.div key="upload" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>

                  {/* Step Indicator */}
                  <div className="mb-10 flex items-center justify-center">
                    {[
                      { num: 1, label: "Select File" },
                      { num: 2, label: "Processing" },
                      { num: 3, label: "Results" },
                    ].map((step, i) => (
                      <div key={step.num} className="flex items-center">
                        <div className="flex flex-col items-center">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold transition-all ${
                            uploadStep >= step.num ? "bg-nexus-brand text-white shadow-lg" : "border-2 border-nexus-border-strong bg-nexus-surface text-nexus-text-hint"
                          }`}>
                            {uploadStep > step.num ? <CheckCircle className="h-6 w-6" /> : step.num}
                          </div>
                          <p className={`mt-2 text-xs font-bold uppercase tracking-wider ${uploadStep >= step.num ? "text-nexus-brand" : "text-nexus-text-hint"}`}>
                            {step.label}
                          </p>
                        </div>
                        {i < 2 && (
                          <div className={`mx-4 h-1 w-24 rounded-full ${uploadStep > step.num ? "bg-nexus-brand" : "bg-nexus-border-strong"}`} />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Step 1 — Select File */}
                  {uploadStep === 1 && (
                    <div className="mx-auto max-w-3xl rounded-2xl border border-nexus-border bg-nexus-surface p-8 shadow-sm">
                      {/* Drop Zone */}
                      <div
                        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleFileDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`group relative cursor-pointer rounded-2xl border-2 border-dashed p-14 text-center transition-all ${
                          isDragging ? "border-nexus-brand bg-nexus-brand/5" : "border-nexus-border-strong hover:border-nexus-brand/50 hover:bg-nexus-surface-hover"
                        }`}
                      >
                        <input ref={fileInputRef} type="file" accept=".csv,.xls,.xlsx" onChange={handleFileInput} className="hidden" />
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-nexus-brand-light transition-transform group-hover:scale-110">
                          <Upload className="h-10 w-10 text-nexus-brand" />
                        </div>
                        <p className="mt-6 text-xl font-bold text-nexus-text-primary">
                          {selectedFile ? selectedFile.name : "Select Spreadsheet"}
                        </p>
                        <p className="mt-2 text-sm text-nexus-text-secondary">
                          {selectedFile ? formatFileSize(selectedFile.size) : "CSV, XLS, or XLSX — up to 10 MB"}
                        </p>
                        {selectedFile && (
                          <button
                            onClick={e => { e.stopPropagation(); setSelectedFile(null); }}
                            className="mt-4 flex items-center gap-1 mx-auto text-xs font-bold text-red-500 hover:underline"
                          >
                            <X className="h-3 w-3" /> Remove
                          </button>
                        )}
                      </div>

                      {/* Prefix Selector */}
                      <div className="mt-8">
                        <label className="text-xs font-bold uppercase tracking-widest text-nexus-text-secondary">Target Category</label>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {prefixOptions.map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => setSelectedPrefix(opt.value)}
                              className={`flex items-center justify-between rounded-xl border p-4 transition-all ${
                                selectedPrefix === opt.value
                                  ? "border-nexus-brand bg-nexus-brand-light ring-2 ring-nexus-brand/10"
                                  : "border-nexus-border bg-nexus-surface-muted hover:border-nexus-brand/30"
                              }`}
                            >
                              <span className={`text-sm font-bold ${selectedPrefix === opt.value ? "text-nexus-brand" : "text-nexus-text-primary"}`}>
                                {opt.label}
                              </span>
                              {selectedPrefix === opt.value && <CheckCircle className="h-5 w-5 text-nexus-brand" />}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-10 flex items-center justify-between border-t border-nexus-border pt-8">
                        <button
                          onClick={downloadTemplate}
                          className="flex items-center gap-2 text-sm font-bold text-nexus-text-secondary hover:text-nexus-brand"
                        >
                          <Download className="h-5 w-5" /> Download Empty Template
                        </button>
                        <Button
                          onClick={handleUpload}
                          disabled={!selectedFile || isUploading}
                          className="h-12 bg-nexus-brand px-8 font-bold text-white shadow-lg hover:bg-nexus-brand-hover disabled:opacity-50"
                        >
                          Upload & Import
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Step 2 — Processing */}
                  {uploadStep === 2 && (
                    <div className="mx-auto max-w-xl rounded-3xl border border-nexus-border bg-nexus-surface p-12 shadow-xl text-center">
                      <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-nexus-brand-light">
                        <RefreshCw className="h-12 w-12 text-nexus-brand animate-spin" />
                      </div>
                      <h2 className="text-2xl font-black text-nexus-text-primary">
                        {jobPolling ? "Processing Records..." : "Uploading..."}
                      </h2>
                      <p className="mt-3 text-sm text-nexus-text-secondary">
                        {jobPolling ? "Generating QR codes and saving records. This may take a moment." : "Uploading and validating your file..."}
                      </p>
                      <div className="mt-10">
                        <div className="mb-2 flex justify-between text-sm font-bold text-nexus-brand">
                          <span>Progress</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-nexus-border">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadProgress}%` }}
                            transition={{ ease: "linear" }}
                            className="h-full bg-nexus-brand"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3 — Results */}
                  {uploadStep === 3 && uploadResult && (
                    <div className="mx-auto max-w-2xl">
                      {/* Summary card */}
                      <div className="rounded-3xl border border-nexus-border bg-nexus-surface p-10 shadow-2xl text-center mb-8">
                        <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full mb-6 ${uploadResult.failed === 0 ? "bg-green-100" : "bg-amber-100"}`}>
                          {uploadResult.failed === 0
                            ? <CheckCircle className="h-12 w-12 text-green-500" />
                            : <AlertCircle className="h-12 w-12 text-amber-500" />
                          }
                        </div>
                        <h2 className="text-3xl font-black text-nexus-text-primary">
                          {uploadResult.failed === 0 ? "Import Complete" : "Import Finished with Errors"}
                        </h2>

                        <div className="mt-8 grid grid-cols-2 gap-4">
                          <div className="rounded-2xl bg-green-50 border border-green-100 p-6">
                            <p className="text-[10px] font-bold uppercase text-green-600/70">Imported</p>
                            <p className="mt-1 text-4xl font-black text-green-600">{uploadResult.imported}</p>
                          </div>
                          <div className="rounded-2xl bg-red-50 border border-red-100 p-6">
                            <p className="text-[10px] font-bold uppercase text-red-600/70">Failed</p>
                            <p className="mt-1 text-4xl font-black text-red-600">{uploadResult.failed}</p>
                          </div>
                        </div>

                        {uploadResult.jobId && (
                          <div className="mt-8 rounded-2xl bg-nexus-surface-muted p-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-nexus-text-hint">Job ID</p>
                            <div className="mt-2 flex items-center justify-center gap-3">
                              <code className="font-mono text-sm font-black text-nexus-brand">{uploadResult.jobId}</code>
                              <button onClick={copyJobId} className="rounded-lg p-1.5 text-nexus-text-hint hover:bg-gray-200">
                                <Copy className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Error list */}
                      {uploadResult.errors.length > 0 && (
                        <div className="mb-8 rounded-2xl border border-red-200 bg-nexus-surface overflow-hidden shadow-sm">
                          <div className="border-b border-red-200 bg-red-50 px-6 py-4">
                            <h3 className="flex items-center gap-2 font-bold text-red-900">
                              <AlertCircle className="h-5 w-5" />
                              Failed Rows ({uploadResult.errors.length})
                            </h3>
                          </div>
                          <div className="divide-y divide-red-50 max-h-72 overflow-y-auto">
                            {uploadResult.errors.map((err: UploadError, i) => (
                              <div key={i} className="flex items-center gap-4 px-6 py-3">
                                <span className="rounded bg-gray-100 px-2.5 py-0.5 font-mono text-xs font-bold text-gray-700">
                                  ROW {err.row}
                                </span>
                                <span className="text-sm text-red-800">{err.reason}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row gap-4">
                        <Button onClick={resetUpload} variant="outline" className="h-12 flex-1 font-bold border-nexus-border-strong">
                          New Upload
                        </Button>
                        <Button onClick={() => handleExport("csv")} variant="outline" className="h-12 flex-1 font-bold border-nexus-border-strong">
                          <Download className="mr-2 h-4 w-4" /> Export CSV
                        </Button>
                        <Button
                          onClick={() => (window.location.href = "/admin/pre-registration")}
                          className="h-12 flex-1 bg-nexus-brand font-bold text-white hover:bg-nexus-brand-hover"
                        >
                          View Pre-Registrations
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── TAB 2: Badge Print ─────────────────────────────────────────── */}
              {activeTab === "badge-print" && (
                <motion.div key="badge-print" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>

                  {badgeRecords.length === 0 ? (
                    <div className="mx-auto max-w-2xl">
                      <div className="rounded-2xl border border-nexus-border bg-nexus-surface p-8 shadow-sm">
                        <div
                          onDragOver={e => { e.preventDefault(); setIsDraggingBadge(true); }}
                          onDragLeave={() => setIsDraggingBadge(false)}
                          onDrop={handleBadgeFileDrop}
                          onClick={() => badgeFileInputRef.current?.click()}
                          className={`group cursor-pointer rounded-2xl border-2 border-dashed p-14 text-center transition-all ${
                            isDraggingBadge ? "border-nexus-brand bg-nexus-brand/5" : "border-nexus-border-strong hover:border-nexus-brand/50 hover:bg-nexus-surface-hover"
                          }`}
                        >
                          <input ref={badgeFileInputRef} type="file" accept=".csv,.xls,.xlsx" onChange={handleBadgeFileInput} className="hidden" />
                          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-nexus-brand-light transition-transform group-hover:scale-110">
                            <FileText className="h-10 w-10 text-nexus-brand" />
                          </div>
                          <p className="mt-6 text-xl font-bold text-nexus-text-primary">
                            {badgeFile ? badgeFile.name : "Select File"}
                          </p>
                          <p className="mt-2 text-sm text-nexus-text-secondary">
                            {badgeFile ? formatFileSize(badgeFile.size) : "CSV, XLS, or XLSX — attendee data per row"}
                          </p>
                          {badgeFile && (
                            <button
                              onClick={e => { e.stopPropagation(); setBadgeFile(null); }}
                              className="mt-4 flex items-center gap-1 mx-auto text-xs font-bold text-red-500 hover:underline"
                            >
                              <X className="h-3 w-3" /> Remove
                            </button>
                          )}
                        </div>

                        <div className="mt-8 rounded-xl border border-amber-100 bg-amber-50 p-5">
                          <p className="text-sm font-bold text-amber-800">Expected File Format</p>
                          <p className="mt-1 text-xs text-amber-700">
                            Each row must contain: <strong>SL No</strong>, <strong>Name</strong>, <strong>Designation</strong>, <strong>Company Name</strong>. Accepted formats: CSV, XLS, XLSX. Badges print at <strong>4.2 × 6 inch</strong> (one per page).
                          </p>
                        </div>

                        <div className="mt-8 flex items-center justify-between border-t border-nexus-border pt-6">
                          <button
                            onClick={downloadBadgeTemplate}
                            className="flex items-center gap-2 text-sm font-bold text-nexus-text-secondary hover:text-nexus-brand"
                          >
                            <Download className="h-5 w-5" /> Download Badge Template
                          </button>
                          <Button
                            onClick={handleBadgePrint}
                            disabled={!badgeFile || isBadgePrinting}
                            className="h-12 bg-nexus-brand px-8 font-bold text-white shadow-lg hover:bg-nexus-brand-hover disabled:opacity-50"
                          >
                            {isBadgePrinting ? "Processing..." : "Process & Generate Badges"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Badge Records */
                    <div>
                      {/* Toolbar */}
                      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <h2 className="text-xl font-black text-nexus-text-primary">{badgeRecords.length} Badges Ready</h2>
                          <p className="text-sm text-nexus-text-secondary">Each badge prints at 4.2 × 6 inch — one per page</p>
                        </div>
                        <div className="flex gap-3">
                          <Button onClick={resetBadgePrint} variant="outline" className="h-11 font-bold border-nexus-border-strong">
                            Upload New File
                          </Button>
                          <Button onClick={printBadgeGrid} className="h-11 bg-nexus-brand font-bold text-white hover:bg-nexus-brand-hover">
                            <Printer className="mr-2 h-5 w-5" /> Print All Badges
                          </Button>
                        </div>
                      </div>

                      {/* Screen preview grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                        {badgeRecords.map(record => (
                          <div
                            key={record.row}
                            className="relative flex flex-col overflow-hidden rounded-2xl border border-nexus-border bg-white shadow-md"
                            style={{ aspectRatio: "2/3" }}
                          >
                            {/* Header */}
                            <div
                              className="flex flex-col items-center justify-center px-2 py-3"
                              style={{ background: "linear-gradient(135deg,#1e3a8a,#2563eb)", flexShrink: 0, minHeight: "22%" }}
                            >
                              <p className="font-black tracking-[0.25em] text-white text-sm leading-tight">NEXUS</p>
                              <p className="text-blue-200 tracking-widest text-[9px] font-bold uppercase mt-0.5">Event 2026</p>
                            </div>

                            {/* Photo */}
                            <div className="flex justify-center mt-3" style={{ flexShrink: 0 }}>
                              <div className="w-12 h-12 rounded-full overflow-hidden border-4 border-blue-100 bg-blue-50 flex items-center justify-center">
                                {record.photoUrl && (
                                  <img src={record.photoUrl} alt={record.name} className="w-full h-full object-cover" />
                                )}
                              </div>
                            </div>

                            {/* Name + Info */}
                            <div className="flex-1 flex flex-col items-center justify-center text-center px-2 py-1 gap-0.5 overflow-hidden">
                              <p className="font-black text-gray-900 uppercase tracking-tight text-xs leading-tight line-clamp-2">{record.name}</p>
                              {record.designation && (
                                <p className="text-[9px] font-semibold text-gray-500 mt-0.5 leading-snug line-clamp-1">{record.designation}</p>
                              )}
                              {record.companyName && (
                                <p className="text-[9px] text-gray-400 leading-snug line-clamp-1">{record.companyName}</p>
                              )}
                            </div>

                            {/* Footer */}
                            <div
                              className="py-1.5 flex items-center justify-center"
                              style={{ background: "#1e3a8a", flexShrink: 0 }}
                            >
                              <p className="text-blue-300 text-[7px] font-bold tracking-[0.25em] uppercase">powered by nexus</p>
                            </div>

                            {/* Row badge */}
                            <div className="absolute top-2 right-2 rounded-full bg-white/20 px-1.5 py-0.5 text-[8px] font-black text-white">
                              #{record.row}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Hidden print-only layout — one badge per page at 4.2×6 inch */}
                      <div id="badge-print-area" aria-hidden="true">
                        {badgeRecords.map(record => (
                          <div key={record.row} className="badge-print-item">
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
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </main>
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
