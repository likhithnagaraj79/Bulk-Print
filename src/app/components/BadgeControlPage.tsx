import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Lock, Unlock, Search, Printer, Mail, MessageCircle, Save, Eye, RotateCcw, Type, Building, QrCode, User } from "lucide-react";
import { TopNav } from "./dashboard/TopNav";
import { AdminSidebar } from "./dashboard/AdminSidebar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { BadgeService, BadgeTemplate, BadgeField } from "../api/services/badge.service";

// Internal editor template — pixel-based, kept separate from the API's percentage format
interface EditorTemplate {
  fields: BadgeField[];
  background: string;
  border: { color: string; width: number };
}

const CANVAS_W = 380;
const CANVAS_H = 540;

const pct = (val: number, total: number) => `${((val / total) * 100).toFixed(1)}%`;
const px = (val: string, total: number) => parseFloat(val) / 100 * total;

function fieldsToApiTemplate(fields: BadgeField[]): BadgeTemplate {
  const defaults: BadgeTemplate = {
    photo:       { x: "50%", y: "22%", w: "0%",  h: "0%",  rotation: 0 },
    name:        { x: "50%", y: "46%", w: "80%", h: "8%",  rotation: 0 },
    designation: { x: "50%", y: "56%", w: "80%", h: "7%",  rotation: 0 },
    companyName: { x: "50%", y: "65%", w: "80%", h: "7%",  rotation: 0 },
    qrCode:      { x: "50%", y: "83%", w: "28%", h: "20%", rotation: 0 },
  };
  const result = { ...defaults };
  for (const field of fields) {
    if (field.type === "name" || field.type === "designation" || field.type === "companyName") {
      result[field.type] = { x: pct(field.x, CANVAS_W), y: pct(field.y, CANVAS_H), w: "80%", h: "8%", rotation: 0 };
    } else if (field.type === "qrCode") {
      const size = field.size || 150;
      result.qrCode = { x: pct(field.x + size / 2, CANVAS_W), y: pct(field.y + size / 2, CANVAS_H), w: pct(size, CANVAS_W), h: pct(size, CANVAS_H), rotation: 0 };
    }
  }
  return result;
}

function apiTemplateToFields(tpl: BadgeTemplate): BadgeField[] {
  const qW = px(tpl.qrCode.w, CANVAS_W);
  const qH = px(tpl.qrCode.h, CANVAS_H);
  const qSize = Math.round(Math.min(qW, qH));
  return [
    { type: "name",        x: Math.round(px(tpl.name.x, CANVAS_W)),        y: Math.round(px(tpl.name.y, CANVAS_H)),        fontSize: 24, fontWeight: "bold",   color: "#000000", align: "center" },
    { type: "designation", x: Math.round(px(tpl.designation.x, CANVAS_W)), y: Math.round(px(tpl.designation.y, CANVAS_H)), fontSize: 14, fontWeight: "normal", color: "#666666", align: "center" },
    { type: "companyName", x: Math.round(px(tpl.companyName.x, CANVAS_W)), y: Math.round(px(tpl.companyName.y, CANVAS_H)), fontSize: 14, fontWeight: "normal", color: "#333333", align: "center" },
    { type: "qrCode",      x: Math.round(px(tpl.qrCode.x, CANVAS_W) - qSize / 2), y: Math.round(px(tpl.qrCode.y, CANVAS_H) - qSize / 2), size: qSize },
  ];
}
import { RegistrationService, Registration } from "../api/services/registration.service";
import { NotificationService } from "../api/services/notification.service";
import { toast } from "sonner";

const defaultTemplate: EditorTemplate = {
  fields: [
    { type: "name", x: 190, y: 160, fontSize: 24, fontWeight: "bold", color: "#000000", align: "center" },
    { type: "designation", x: 190, y: 200, fontSize: 14, fontWeight: "normal", color: "#666666", align: "center" },
    { type: "companyName", x: 190, y: 230, fontSize: 14, fontWeight: "normal", color: "#333333", align: "center" },
    { type: "qrCode", x: 115, y: 360, size: 150 },
  ],
  background: "#FFFFFF",
  border: { color: "#1E5FCC", width: 2 },
};


const fieldTypes = [
  { type: "name", label: "Name", icon: User },
  { type: "designation", label: "Designation", icon: Type },
  { type: "companyName", label: "Company", icon: Building },
  { type: "qrCode", label: "QR Code", icon: QrCode },
];

export function BadgeControlPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [template, setTemplate] = useState<EditorTemplate>(defaultTemplate);
  const [selectedField, setSelectedField] = useState<number | null>(null);
  const [draggingField, setDraggingField] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPrintLocked, setIsPrintLocked] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Registration[]>([]);
  const [selectedRegistrant, setSelectedRegistrant] = useState<Registration | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [whatsappStatus, setWhatsappStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [guidelineX, setGuidelineX] = useState<number | null>(null);
  const [guidelineY, setGuidelineY] = useState<number | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Load template and print control on mount
  useEffect(() => {
    loadTemplate();
    loadPrintControl();
  }, []);

  const loadPrintControl = async () => {
    try {
      const response = await BadgeService.getPrintLockStatus();
      setIsPrintLocked(response.printLock);
    } catch (error) {
      console.error("Failed to load print control:", error);
    }
  };

  const loadTemplate = async () => {
    try {
      const response = await BadgeService.getTemplate("all");
      if (response.template) {
        setTemplate(prev => ({ ...prev, fields: apiTemplateToFields(response.template!) }));
      } else {
        setTemplate(defaultTemplate);
      }
    } catch (error) {
      console.error("Failed to load template:", error);
      toast.error("Failed to load template");
    }
  };

  const saveTemplate = async () => {
    setIsSaving(true);
    try {
      const apiTemplate = fieldsToApiTemplate(template.fields);
      await BadgeService.saveTemplate("all", apiTemplate);
      toast.success("Template saved successfully");
    } catch (error) {
      console.error("Failed to save template:", error);
      toast.error("Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldMouseDown = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault(); // prevent text selection while dragging
    setSelectedField(index);
    setDraggingField(index);

    const field = template.fields[index];
    const canvasBounds = canvasRef.current!.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - canvasBounds.left - field.x,
      y: e.clientY - canvasBounds.top - field.y,
    });
  };

  const SNAP_THRESHOLD = 8;

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (draggingField === null || !canvasRef.current) return;

    const canvasBounds = canvasRef.current.getBoundingClientRect();
    let newX = e.clientX - canvasBounds.left - dragOffset.x;
    let newY = e.clientY - canvasBounds.top - dragOffset.y;

    // Snap to 10px grid
    newX = Math.round(newX / 10) * 10;
    newY = Math.round(newY / 10) * 10;

    // Keep within canvas bounds
    newX = Math.max(0, Math.min(380 - 50, newX));
    newY = Math.max(0, Math.min(540 - 50, newY));

    // --- Smart Guidelines ---
    const draggedField = template.fields[draggingField];
    const draggedCenterX = draggedField.type === "qrCode"
      ? newX + (draggedField.size || 150) / 2
      : newX; // text fields use x as center
    const draggedCenterY = draggedField.type === "qrCode"
      ? newY + (draggedField.size || 150) / 2
      : newY;

    // Candidate snap lines: canvas center + other fields' centers
    const snapXCandidates = [
      CANVAS_W / 2,
      ...template.fields
        .filter((_, i) => i !== draggingField)
        .map(f => f.type === "qrCode" ? f.x + (f.size || 150) / 2 : f.x),
    ];
    const snapYCandidates = [
      CANVAS_H / 2,
      ...template.fields
        .filter((_, i) => i !== draggingField)
        .map(f => f.type === "qrCode" ? f.y + (f.size || 150) / 2 : f.y),
    ];

    let gX: number | null = null;
    let gY: number | null = null;

    for (const sx of snapXCandidates) {
      if (Math.abs(draggedCenterX - sx) < SNAP_THRESHOLD) {
        gX = sx;
        // Snap the field to this guide
        newX = draggedField.type === "qrCode" ? sx - (draggedField.size || 150) / 2 : sx;
        break;
      }
    }
    for (const sy of snapYCandidates) {
      if (Math.abs(draggedCenterY - sy) < SNAP_THRESHOLD) {
        gY = sy;
        newY = draggedField.type === "qrCode" ? sy - (draggedField.size || 150) / 2 : sy;
        break;
      }
    }

    setGuidelineX(gX);
    setGuidelineY(gY);
    // -------------------------

    setTemplate((prev) => ({
      ...prev,
      fields: prev.fields.map((field, i) =>
        i === draggingField ? { ...field, x: newX, y: newY } : field
      ),
    }));
  };

  const handleCanvasMouseUp = () => {
    setDraggingField(null);
    setGuidelineX(null);
    setGuidelineY(null);
  };

  const updateFieldProperty = (property: string, value: any) => {
    if (selectedField === null) return;

    setTemplate((prev) => ({
      ...prev,
      fields: prev.fields.map((field, i) =>
        i === selectedField ? { ...field, [property]: value } : field
      ),
    }));
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const response = await RegistrationService.getRegistrations({ search: query, limit: 10 });
      setSearchResults(response.data);
      setShowSearchResults(true);
    } catch (error) {
      console.error("Search failed:", error);
    }
  };

  const selectRegistrant = (registrant: Registration) => {
    setSelectedRegistrant(registrant);
    setShowSearchResults(false);
    setEmailStatus(null);
    setWhatsappStatus(null);
  };

  const togglePrintLock = async () => {
    try {
      const response = await BadgeService.togglePrintLock(!isPrintLocked);
      setIsPrintLocked(response.printLock);
      toast.success(`Print lock ${response.printLock ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("Toggle print lock failed:", error);
      toast.error("Failed to update print lock");
    }
  };

  const handlePrint = async () => {
    if (!selectedRegistrant) return;

    if (isPrintLocked && selectedRegistrant.printCount > 0) {
      toast.error("Print lock is active. This badge has already been printed.");
      return;
    }

    try {
      const response = await BadgeService.logPrint(selectedRegistrant.registrationId);
      setSelectedRegistrant(prev => prev ? { ...prev, printCount: response.printCount } : null);
      toast.success("Print logged. Opening print dialog...");
      window.print();
    } catch (error: any) {
      console.error("Print logging failed:", error);
      toast.error(error.message || "Failed to log print");
    }
  };

  const sendEmail = async () => {
    if (!selectedRegistrant) return;

    setEmailStatus("sending");
    try {
      await NotificationService.sendBadgeEmail(selectedRegistrant.registrationId);
      setEmailStatus("sent");
      toast.success("Email sent successfully");
    } catch (error) {
      console.error("Email failed:", error);
      setEmailStatus("failed");
      toast.error("Failed to send email");
    }
  };

  const sendWhatsApp = async () => {
    if (!selectedRegistrant) return;

    setWhatsappStatus("sending");
    try {
      await NotificationService.sendBadgeWhatsapp(selectedRegistrant.registrationId);
      setWhatsappStatus("sent");
      toast.success("WhatsApp message sent successfully");
    } catch (error) {
      console.error("WhatsApp failed:", error);
      setWhatsappStatus("failed");
      toast.error("Failed to send WhatsApp message");
    }
  };

  const resetTemplate = () => {
    if (confirm("Reset to default template? This will discard your changes.")) {
      setTemplate(defaultTemplate);
      setSelectedField(null);
    }
  };

  const getFieldLabel = (type: string) => {
    const field = fieldTypes.find((f) => f.type === type);
    return field ? field.label : type;
  };

  const TEXT_FIELD_WIDTH = 300;

  const renderBadgeField = (field: BadgeField, index: number, isPreview = false, registrant?: Registration) => {
    const isSelected = selectedField === index && !isPreview;
    const isTextType = field.type !== "qrCode";
    const fieldWidth = isTextType ? (field.width || TEXT_FIELD_WIDTH) : undefined;
    const style: React.CSSProperties = {
      position: "absolute",
      left: isTextType ? field.x - (fieldWidth! / 2) : field.x,
      top: field.y,
      width: fieldWidth,
      cursor: isPreview ? "default" : "move",
      fontSize: field.fontSize ? `${field.fontSize}px` : undefined,
      fontWeight: field.fontWeight as any,
      color: field.color,
      textAlign: field.align as any,
      border: isSelected ? "2px dashed #1E5FCC" : "1px dashed transparent",
      padding: "4px",
      userSelect: "none",
      pointerEvents: isPreview ? "none" : "auto",
      zIndex: isSelected ? 10 : 1,
    };

    if (field.type === "qrCode") {
      return (
        <div
          key={index}
          style={{
            ...style,
            width: field.size,
            height: field.size,
            backgroundColor: registrant ? "transparent" : "#F3F4F6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: isSelected ? "2px dashed #1E5FCC" : "none",
          }}
          onMouseDown={(e) => !isPreview && handleFieldMouseDown(index, e)}
          onClick={(e) => e.stopPropagation()}
        >
          {registrant ? (
            <div className="flex h-full w-full items-center justify-center bg-white p-2">
              <QrCode className="h-full w-full text-black" />
            </div>
          ) : (
            <QrCode className="h-12 w-12 text-nexus-text-hint" />
          )}
        </div>
      );
    }

    // Text fields
    const getValue = () => {
      if (!registrant) return `[${getFieldLabel(field.type)}]`;
      switch (field.type) {
        case "name":
          return registrant.name;
        case "designation":
          return registrant.designation;
        case "companyName":
          return registrant.companyName;
        default:
          return `[${field.type}]`;
      }
    };

    return (
      <div
        key={index}
        style={style}
        onMouseDown={(e) => !isPreview && handleFieldMouseDown(index, e)}
        onClick={(e) => e.stopPropagation()}
      >
        {getValue()}
      </div>
    );
  };

  const selectedFieldData = selectedField !== null ? template.fields[selectedField] : null;

  return (
    <div className="min-h-screen w-full bg-nexus-page-bg pt-16">
      <TopNav role="admin" />

      <div className="flex">
        <AdminSidebar collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />

        <main
          className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? "lg:pl-20" : "lg:pl-60"
            }`}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 lg:p-8"
          >
            <div className="mb-6 text-center lg:text-left">
              <h1 className="text-3xl font-semibold text-nexus-text-primary">Badge Template & Print Control</h1>
              <p className="mt-1 text-base text-nexus-text-secondary">
                Design badge templates and manage print permissions
              </p>
            </div>

            <div className="mb-8 rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm">
              <h2 className="mb-6 text-xl font-semibold text-nexus-text-primary">Badge Template Editor</h2>

              <div className="grid gap-8 lg:grid-cols-[380px_1fr_280px]">
                {/* Badge Canvas */}
                <div className="flex flex-col items-center lg:items-start">
                  <p className="mb-2 text-sm font-medium text-nexus-text-label">Canvas (380×540px)</p>
                  <div
                    ref={canvasRef}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={() => { handleCanvasMouseUp(); setGuidelineX(null); setGuidelineY(null); }}
                    onClick={() => setSelectedField(null)}
                    className="relative overflow-hidden rounded-lg shadow-2xl"
                    style={{
                      width: "380px",
                      height: "540px",
                      backgroundColor: template.background,
                      border: `${template.border.width}px solid ${template.border.color}`,
                      backgroundImage:
                        "radial-gradient(circle, #e5e7eb 1px, transparent 1px)",
                      backgroundSize: "20px 20px",
                    }}
                  >
                    {template.fields.map((field, index) => renderBadgeField(field, index))}

                    {/* Smart Guidelines */}
                    {guidelineX !== null && (
                      <div style={{ position: "absolute", left: guidelineX, top: 0, bottom: 0, width: 1, backgroundColor: "#FF3B3B", pointerEvents: "none", zIndex: 20, opacity: 0.85 }} />
                    )}
                    {guidelineY !== null && (
                      <div style={{ position: "absolute", left: 0, right: 0, top: guidelineY, height: 1, backgroundColor: "#FF3B3B", pointerEvents: "none", zIndex: 20, opacity: 0.85 }} />
                    )}
                  </div>
                </div>

                {/* Available Fields */}
                <div className="space-y-6">
                  <div>
                    <p className="mb-3 text-sm font-medium text-nexus-text-label">Available Fields</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {fieldTypes.map((field) => {
                        const Icon = field.icon;
                        return (
                          <div
                            key={field.type}
                            className="flex items-center gap-3 rounded-xl border border-nexus-border-strong bg-nexus-surface p-4 shadow-sm"
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nexus-brand-light">
                              <Icon className="h-5 w-5 text-nexus-brand" />
                            </div>
                            <span className="text-sm font-semibold text-nexus-text-primary">{field.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-4">
                    <Button onClick={saveTemplate} disabled={isSaving} className="h-12 bg-nexus-brand px-6 hover:bg-nexus-brand-hover">
                      <Save className="mr-2 h-5 w-5" />
                      {isSaving ? "Saving..." : "Save Template"}
                    </Button>
                    <Button onClick={resetTemplate} variant="outline" className="h-12 px-6">
                      <RotateCcw className="mr-2 h-5 w-5" />
                      Reset to Default
                    </Button>
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex gap-3">
                      <Eye className="h-5 w-5 text-amber-600" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800">Visual Editor Tips</p>
                        <ul className="mt-1 list-disc pl-4 text-xs text-amber-700 space-y-1">
                          <li>Drag and drop elements to reposition them</li>
                          <li>Select an element to see its properties</li>
                          <li>Grid snapping is enabled for precise placement</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Properties Panel */}
                <div className="lg:border-l lg:border-nexus-border lg:pl-8">
                  <p className="mb-4 text-sm font-semibold text-nexus-text-primary">Field Properties</p>
                  {selectedFieldData ? (
                    <div className="space-y-5">
                      <div className="rounded-lg bg-nexus-brand-light p-3">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-nexus-brand/70">Selected Field</label>
                        <p className="text-sm font-bold text-nexus-brand">
                          {getFieldLabel(selectedFieldData.type)}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-nexus-text-secondary">X Position</label>
                          <Input
                            type="number"
                            value={selectedFieldData.x}
                            onChange={(e) => updateFieldProperty("x", parseInt(e.target.value))}
                            className="h-10 text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-nexus-text-secondary">Y Position</label>
                          <Input
                            type="number"
                            value={selectedFieldData.y}
                            onChange={(e) => updateFieldProperty("y", parseInt(e.target.value))}
                            className="h-10 text-sm"
                          />
                        </div>
                      </div>

                      {selectedFieldData.fontSize !== undefined && (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-nexus-text-secondary">Font Size (px)</label>
                            <Input
                              type="number"
                              value={selectedFieldData.fontSize}
                              onChange={(e) => updateFieldProperty("fontSize", parseInt(e.target.value))}
                              className="h-10 text-sm"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-nexus-text-secondary">Font Weight</label>
                            <select
                              value={selectedFieldData.fontWeight}
                              onChange={(e) => updateFieldProperty("fontWeight", e.target.value)}
                              className="h-10 w-full rounded-lg border border-nexus-border-strong bg-nexus-surface px-3 text-sm focus:border-nexus-brand focus:outline-none"
                            >
                              <option value="normal">Normal</option>
                              <option value="bold">Bold</option>
                              <option value="600">Semi-Bold</option>
                              <option value="700">Extra-Bold</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-nexus-text-secondary">Text Color</label>
                            <div className="flex gap-2">
                              <Input
                                type="color"
                                value={selectedFieldData.color}
                                onChange={(e) => updateFieldProperty("color", e.target.value)}
                                className="h-10 w-12 p-1"
                              />
                              <Input
                                type="text"
                                value={selectedFieldData.color}
                                onChange={(e) => updateFieldProperty("color", e.target.value)}
                                className="h-10 flex-1 text-sm font-mono"
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-nexus-text-secondary">Text Alignment</label>
                            <div className="flex rounded-lg border border-nexus-border-strong bg-nexus-surface p-1">
                              {['left', 'center', 'right'].map((align) => (
                                <button
                                  key={align}
                                  onClick={() => updateFieldProperty("align", align)}
                                  className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-all ${selectedFieldData.align === align
                                      ? "bg-nexus-brand text-white shadow-sm"
                                      : "text-nexus-text-secondary hover:bg-nexus-surface-hover"
                                    }`}
                                >
                                  {align.charAt(0).toUpperCase() + align.slice(1)}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-nexus-border bg-nexus-surface-muted p-12 text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-nexus-surface shadow-sm">
                        <Type className="h-8 w-8 text-nexus-text-hint" />
                      </div>
                      <p className="text-sm font-semibold text-nexus-text-primary">No Field Selected</p>
                      <p className="mt-1 text-xs text-nexus-text-secondary">Select an element on the canvas to edit its properties</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Print Control */}
            <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
              {/* Print Lock & Search */}
              <div className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm">
                <h2 className="mb-6 text-xl font-semibold text-nexus-text-primary">Reprint Control & Manual Issuance</h2>

                {/* Print Lock Toggle */}
                <div className={`mb-8 flex items-center justify-between rounded-2xl border p-5 transition-all ${isPrintLocked ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"
                  }`}>
                  <div className="flex gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isPrintLocked ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                      }`}>
                      {isPrintLocked ? <Lock /> : <Unlock />}
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${isPrintLocked ? "text-red-800" : "text-green-800"}`}>Print Lock: {isPrintLocked ? "ACTIVE" : "INACTIVE"}</p>
                      <p className={`mt-0.5 text-xs ${isPrintLocked ? "text-red-600" : "text-green-600"}`}>
                        {isPrintLocked ? "Duplicates/Reprints are currently blocked" : "Reprints are allowed for all zones"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={togglePrintLock}
                    className={`relative h-10 w-20 rounded-full transition-colors ${isPrintLocked ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"
                      }`}
                  >
                    <motion.div
                      animate={{ x: isPrintLocked ? 44 : 4 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg"
                    >
                      {isPrintLocked ? <Lock className="h-4 w-4 text-red-600" /> : <Unlock className="h-4 w-4 text-green-600" />}
                    </motion.div>
                  </button>
                </div>

                {/* Quick Print Search */}
                <p className="mb-4 text-sm font-semibold text-nexus-text-primary">Search Registrant for Printing</p>
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-nexus-text-hint" />
                  <Input
                    type="text"
                    placeholder="Search by name, email, or badge ID..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                    className="h-14 pl-12 text-base shadow-sm focus:ring-2 focus:ring-nexus-brand/20"
                  />

                  {/* Search Results Dropdown */}
                  <AnimatePresence>
                    {showSearchResults && searchResults.length > 0 && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowSearchResults(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute left-0 right-0 top-16 z-20 overflow-hidden rounded-2xl border border-nexus-border bg-nexus-surface shadow-2xl"
                        >
                          {searchResults.map((result) => (
                            <button
                              key={result.registrationId}
                              onClick={() => selectRegistrant(result)}
                              className="flex w-full items-center gap-4 border-b border-nexus-border p-4 text-left transition-colors hover:bg-nexus-surface-hover last:border-b-0"
                            >
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-nexus-brand-light font-bold text-nexus-brand">
                                {result.name.charAt(0)}
                              </div>
                              <div className="flex-1">
                                <p className="font-bold text-nexus-text-primary">{result.name}</p>
                                <p className="text-xs text-nexus-text-secondary">{result.email} • {result.companyName}</p>
                              </div>
                              <div className="text-right">
                                <span className="rounded-lg bg-nexus-page-bg px-2 py-1 font-mono text-xs font-bold text-nexus-text-primary">
                                  {result.registrationId}
                                </span>
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Selected Registrant Info */}
                {selectedRegistrant ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-2xl border border-nexus-border bg-nexus-page-bg/30 p-6"
                  >
                    <div className="mb-6 flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-nexus-text-primary">{selectedRegistrant.name}</h3>
                        <p className="text-sm text-nexus-text-secondary">{selectedRegistrant.email}</p>
                        <div className="mt-3 flex gap-2">
                          <span className="rounded bg-nexus-brand-light px-2 py-0.5 text-[10px] font-bold text-nexus-brand uppercase tracking-wider">{selectedRegistrant.prefix}</span>
                          <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600 uppercase tracking-wider">{selectedRegistrant.designation}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase text-nexus-text-hint">Times Printed</p>
                        <p className={`text-2xl font-black ${selectedRegistrant.printCount > 0 ? "text-amber-600" : "text-green-600"}`}>{selectedRegistrant.printCount}</p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <Button onClick={handlePrint} className="h-12 bg-nexus-brand font-bold hover:bg-nexus-brand-hover">
                        <Printer className="mr-2 h-5 w-5" />
                        Print
                      </Button>
                      <Button
                        onClick={sendEmail}
                        variant="outline"
                        className="h-12 border-nexus-border-strong font-semibold"
                        disabled={emailStatus === "sending"}
                      >
                        <Mail className={`mr-2 h-5 w-5 ${emailStatus === 'sent' ? 'text-green-500' : ''}`} />
                        {emailStatus === "sending" ? "..." : emailStatus === 'sent' ? "Sent" : "Email"}
                      </Button>
                      <Button
                        onClick={sendWhatsApp}
                        variant="outline"
                        className="h-12 border-nexus-border-strong font-semibold"
                        disabled={whatsappStatus === "sending"}
                      >
                        <MessageCircle className={`mr-2 h-5 w-5 ${whatsappStatus === 'sent' ? 'text-green-500' : ''}`} />
                        {whatsappStatus === "sending" ? "..." : whatsappStatus === 'sent' ? "Sent" : "WhatsApp"}
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="py-12 text-center">
                    <Search className="mx-auto h-12 w-12 text-nexus-text-hint opacity-20" />
                    <p className="mt-4 text-sm font-medium text-nexus-text-secondary">Search results will appear here</p>
                  </div>
                )}
              </div>

              {/* Badge Preview */}
              <div className="rounded-xl border border-nexus-border bg-nexus-surface p-6 shadow-sm">
                <h2 className="mb-6 text-xl font-semibold text-nexus-text-primary">Badge Preview</h2>
                {selectedRegistrant ? (
                  <div className="flex justify-center">
                    <div
                      className="relative origin-top transform scale-90 shadow-2xl print:shadow-none"
                      style={{
                        width: "380px",
                        height: "540px",
                        backgroundColor: template.background,
                        border: `${template.border.width}px solid ${template.border.color}`,
                      }}
                    >
                      {template.fields.map((field, index) =>
                        renderBadgeField(field, index, true, selectedRegistrant)
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-[540px] items-center justify-center rounded-2xl border-2 border-dashed border-nexus-border bg-nexus-surface-hover">
                    <div className="max-w-[200px] text-center">
                      <div className="mb-4 flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-nexus-surface shadow-sm text-nexus-text-hint">
                        <Eye className="h-8 w-8" />
                      </div>
                      <p className="text-sm font-bold text-nexus-text-primary">Preview Locked</p>
                      <p className="mt-1 text-xs text-nexus-text-secondary">
                        Search and select a registrant to see a live badge preview
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </main>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-badge-container,
          .print-badge-container * {
            visibility: visible;
          }
          .print-badge-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 380px;
            height: 540px;
          }
        }
      `}</style>
    </div>
  );
}
