import { z } from "zod";

export const createUserSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(120, "El nombre es demasiado largo."),
  email: z.string().trim().email("Ingresa un correo válido."),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres.")
    .max(72, "La contraseña es demasiado larga."),
  roleId: z.coerce.number().int().positive("Selecciona un rol."),
});

export const updateUserSchema = z.object({
  userId: z.string().uuid("Usuario inválido."),
  roleId: z.coerce.number().int().positive("Selecciona un rol."),
});
