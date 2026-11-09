"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/admin/actions";
import { btnPrimary, field, label } from "../styles";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, { error: null });
  return (
    <form action={action} className="rise mt-10 max-w-sm space-y-5" style={{ "--d": "120ms" } as React.CSSProperties}>
      <div className="space-y-2">
        <label htmlFor="password" className={label}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={field}
          aria-invalid={Boolean(state.error)}
          aria-describedby={state.error ? "password-error" : undefined}
        />
        {state.error && (
          <p id="password-error" role="alert" className="text-[14px] text-danger">
            {state.error}
          </p>
        )}
      </div>
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "Controllo..." : "Entra"}
      </button>
    </form>
  );
}
