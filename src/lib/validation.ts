import { z } from "zod";
import type { ActionResult } from "@/types/database";

export const emptyAction: ActionResult | null = null;

export function fieldErrorsFromZod(
  error: z.ZodError,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    const messages = result[key] ?? [];
    messages.push(issue.message);
    result[key] = messages;
  }

  return result;
}

export function actionError(
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult {
  return { ok: false, message, fieldErrors };
}

export function actionOk(message?: string): ActionResult {
  return { ok: true, message };
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string" &&
    (error as { message: string }).message.trim() !== ""
  ) {
    return (error as { message: string }).message;
  }

  return "Ocurrió un error inesperado.";
}

export const requiredNumber = (schema: z.ZodNumber) =>
  z.preprocess((value) => {
    if (value === null || value === undefined || value === "") {
      return undefined;
    }
    return Number(value);
  }, schema);

export const optionalText = z
  .preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().max(500).nullable(),
  )
  .optional();
