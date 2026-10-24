'use client';

import { useActionState, useState } from "react";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { loginAction, type LoginState } from "@/lib/auth/actions";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import styles from "./login.module.scss";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="mt-7 space-y-4">
      <FormMessage message={state.error} />

      <Field label="Correo electrónico" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          required
          autoFocus
        />
      </Field>

      <Field label="Contraseña" htmlFor="password">
        <div className={styles.passwordWrap}>
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Tu contraseña"
            required
          />
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
      </Field>

      <SubmitButton
        className="mt-2 w-full"
        pendingLabel="Ingresando…"
        size="lg"
      >
        Ingresar a Botica
        <ArrowRight className="size-4" />
      </SubmitButton>

      <p className="pt-1 text-center text-xs leading-relaxed text-muted">
        Acceso exclusivo para personal autorizado. Si no recuerdas tu
        contraseña, contacta al administrador.
      </p>
    </form>
  );
}
