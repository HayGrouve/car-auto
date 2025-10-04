"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { toast } from "sonner";

type PdfDownloadButtonProps = {
  generatePdf: () => Blob | Promise<Blob>;
  fileName: string;
  variant?: string;
  className?: string;
  ariaLabel?: string;
  children?: React.ReactNode;
  onStart?: () => void;
  onComplete?: (blob: Blob) => void;
};

export default function PdfDownloadButton({
  generatePdf,
  fileName,
  variant = "ghost",
  className,
  ariaLabel = "Изтегли PDF",
  children,
  onStart,
  onComplete,
}: PdfDownloadButtonProps) {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    try {
      setLoading(true);
      onStart?.();
      const blob = await generatePdf();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onComplete?.(blob);
      toast.success("PDF файлът е свален успешно");
    } catch (err) {
      console.error("PDF download failed", err);
      toast.error("Неуспешно генериране на PDF");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant as "default" | "secondary" | "outline" | "ghost"}
      className={className}
      disabled={loading}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {loading
        ? "Генериране..."
        : (children ?? <FileText className="size-4" />)}
    </Button>
  );
}
