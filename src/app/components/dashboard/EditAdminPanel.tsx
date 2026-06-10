import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Eye, EyeOff } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { TOTPInput } from "../TOTPInput";
import { Admin } from "../../api/services/user.service";

interface EditAdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  admin: Admin | null;
  onUpdate: (adminId: string, field: string, value: string, totpCode: string) => void;
}

export function EditAdminPanel({ isOpen, onClose, admin, onUpdate }: EditAdminPanelProps) {
  const [selectedField, setSelectedField] = useState<string>("");
  const [newValue, setNewValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [showTOTPInput, setShowTOTPInput] = useState(false);

  const fields = [
    { value: "name", label: "Name" },
    { value: "email", label: "Email" },
    { value: "phoneNumber", label: "Phone Number" },
    { value: "companyEmail", label: "Company Email" },
    { value: "password", label: "Password" },
  ];

  const handleFieldChange = (field: string) => {
    setSelectedField(field);
    setNewValue("");
    setShowTOTPInput(false);
    setTotpCode("");
  };

  const handleContinue = () => {
    if (!newValue) return;
    setShowTOTPInput(true);
  };

  const handleUpdate = () => {
    if (!admin || totpCode.length !== 6) return;
    onUpdate(admin.id, selectedField, newValue, totpCode);
    handleClose();
  };

  const handleClose = () => {
    setSelectedField("");
    setNewValue("");
    setTotpCode("");
    setShowTOTPInput(false);
    onClose();
  };

  if (!isOpen || !admin) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end">
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* Side Panel */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative h-full w-full max-w-md border-l border-nexus-border bg-nexus-surface shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-nexus-border px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-nexus-text-primary">Edit Admin</h2>
            <p className="mt-1 text-sm text-nexus-text-secondary">{admin.name}</p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-nexus-text-hint transition-colors hover:bg-nexus-surface-muted hover:text-nexus-text-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-5rem)] overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {!showTOTPInput ? (
              <motion.div
                key="edit-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Field Selector */}
                <div className="space-y-2">
                  <Label>Select Field to Update</Label>
                  <select
                    value={selectedField}
                    onChange={(e) => handleFieldChange(e.target.value)}
                    className="h-11 w-full rounded-lg border border-nexus-border-strong bg-nexus-surface px-3 text-sm shadow-sm"
                  >
                    <option value="">Choose a field...</option>
                    {fields.map((field) => (
                      <option key={field.value} value={field.value}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Value Input */}
                {selectedField && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-2"
                  >
                    <Label>New Value</Label>
                    {selectedField === "password" ? (
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={newValue}
                          onChange={(e) => setNewValue(e.target.value)}
                          placeholder="Enter new password"
                          className="h-11 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-nexus-text-hint"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    ) : selectedField === "email" || selectedField === "companyEmail" ? (
                      <Input
                        type="email"
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        placeholder={`Enter new ${fields.find((f) => f.value === selectedField)?.label.toLowerCase()}`}
                        className="h-11"
                      />
                    ) : selectedField === "phoneNumber" ? (
                      <Input
                        type="tel"
                        value={newValue}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          if (value.length <= 10) setNewValue(value);
                        }}
                        placeholder="Enter new phone number"
                        className="h-11 font-mono"
                      />
                    ) : (
                      <Input
                        type="text"
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        placeholder={`Enter new ${fields.find((f) => f.value === selectedField)?.label.toLowerCase()}`}
                        className="h-11"
                      />
                    )}

                    {/* Current Value Display */}
                    <p className="text-xs text-nexus-text-muted">
                      Current: {selectedField === "password" ? "••••••••" : (admin as any)[selectedField] || "N/A"}
                    </p>
                  </motion.div>
                )}

                {selectedField && newValue && (
                  <Button
                    onClick={handleContinue}
                    className="h-11 w-full bg-nexus-brand hover:bg-nexus-brand-hover"
                  >
                    Continue
                  </Button>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="totp-confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-nexus-text-primary">Confirm with 2FA</h3>
                  <p className="mt-2 text-sm text-nexus-text-secondary">
                    Enter your authenticator code to confirm this change
                  </p>
                </div>

                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-6">
                  <TOTPInput value={totpCode} onChange={setTotpCode} onComplete={handleUpdate} />
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handleUpdate}
                    disabled={totpCode.length !== 6}
                    className="h-11 w-full bg-nexus-brand hover:bg-nexus-brand-hover"
                  >
                    Update Admin
                  </Button>
                  <Button
                    onClick={() => setShowTOTPInput(false)}
                    variant="outline"
                    className="h-11 w-full"
                  >
                    Back
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
