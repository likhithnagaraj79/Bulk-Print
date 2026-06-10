import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";

interface TOTPInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete: (value: string) => void;
}

export function TOTPInput({ value, onChange, onComplete }: TOTPInputProps) {
  const [timeRemaining, setTimeRemaining] = useState(30);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) return 30;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Handle input change
  const handleChange = (index: number, inputValue: string) => {
    // Only allow digits
    if (inputValue && !/^\d$/.test(inputValue)) return;

    const newValue = value.split("");
    newValue[index] = inputValue;
    const updatedValue = newValue.join("");

    onChange(updatedValue);

    // Auto-focus next input
    if (inputValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Call onComplete when all 6 digits are entered
    if (updatedValue.length === 6 && !updatedValue.includes("")) {
      onComplete(updatedValue);
    }
  };

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!value[index] && index > 0) {
        // If current box is empty, focus previous
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current box
        const newValue = value.split("");
        newValue[index] = "";
        onChange(newValue.join(""));
      }
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      onChange(pastedData.padEnd(6, ""));
      if (pastedData.length === 6) {
        onComplete(pastedData);
      }
    }
  };

  // Calculate progress percentage
  const progress = (timeRemaining / 30) * 100;
  const circumference = 2 * Math.PI * 20;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      {/* TOTP Input Boxes */}
      <div className="flex flex-1 gap-2.5">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <motion.input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[index] || ""}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className="h-14 w-full rounded-lg border-2 border-nexus-border-strong bg-nexus-surface text-center text-2xl font-semibold text-nexus-text-primary shadow-sm transition-all focus:border-nexus-brand focus:outline-none focus:ring-4 focus:ring-nexus-brand/10"
            style={{ 
              fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', 'Roboto Mono', monospace",
              fontVariantNumeric: "tabular-nums"
            }}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.03, duration: 0.2 }}
          />
        ))}
      </div>

      {/* Countdown Timer - Apple style */}
      <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center">
        <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 48 48">
          {/* Background circle */}
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="#E5E7EB"
            strokeWidth="3"
            fill="none"
          />
          {/* Progress circle */}
          <motion.circle
            cx="24"
            cy="24"
            r="20"
            stroke="#0066CC"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: "stroke-dashoffset 0.3s ease"
            }}
          />
        </svg>
        <motion.span
          className="absolute text-sm font-semibold tabular-nums text-nexus-text-primary"
          style={{ 
            fontFamily: "ui-monospace, 'SF Mono', 'Cascadia Code', 'Roboto Mono', monospace",
            fontVariantNumeric: "tabular-nums"
          }}
          key={timeRemaining}
          initial={{ scale: 1.15, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {timeRemaining}
        </motion.span>
      </div>
    </div>
  );
}
