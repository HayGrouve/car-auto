"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import type { InvoiceDoc } from "@/types/visit";
import { generateInvoicePdf } from "@/lib/pdf-generator";
import { cn } from "@/lib/utils";

type InvoicePdfButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "onClick" | "children"
> & {
  inv: InvoiceDoc;
  fileName: string;
};

export default function InvoicePdfButton({
  inv,
  fileName,
  className,
  variant = "outline",
  size = "sm",
  ...buttonProps
}: InvoicePdfButtonProps) {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    try {
      setLoading(true);
      const blob = await generateInvoicePdf(inv);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF файлът е свален успешно");
    } catch (error) {
      console.error("Invoice PDF generation error:", error);
      toast.error("Грешка при генериране на фактура");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      {...buttonProps}
      onClick={onClick}
      disabled={loading || buttonProps.disabled}
      variant={variant}
      size={size}
      className={cn("justify-center", className)}
    >
      <FileText className="mr-2 size-4" />
      {loading ? "Генериране..." : "Свали фактура"}
    </Button>
  );
}
