import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function FormMessage({
  message,
  tone = "error",
  className,
}: {
  message?: string | null;
  tone?: "error" | "success" | "info";
  className?: string;
}) {
  if (!message) return null;

  const styles = {
    error: "border-[#efd2ce] bg-danger-soft text-danger",
    success: "border-[#cfe6d3] bg-[#edf7ef] text-[#276a39]",
    info: "border-[#d7e7ea] bg-sky text-[#3a6570]",
  } as const;

  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm font-medium leading-relaxed",
        styles[tone],
        className,
      )}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
