"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { AuthState } from "@/app/[locale]/login/actions";
import { Alert } from "./ui/Alert";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary btn-lg w-full" disabled={pending}>
      {label}
    </button>
  );
}

export function AuthForm({
  mode,
  locale,
  dict,
  next,
  action,
}: {
  mode: "login" | "register";
  locale: Locale;
  dict: Dictionary;
  next?: string;
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
}) {
  const [state, formAction] = useActionState(action, {});
  const isRegister = mode === "register";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}

      {state.error && <Alert variant="error">{state.error}</Alert>}

      {isRegister && (
        <div>
          <label className="label" htmlFor="name">
            {dict.auth.name}
          </label>
          <input id="name" name="name" type="text" className="input" required autoComplete="name" />
        </div>
      )}

      <div>
        <label className="label" htmlFor="email">
          {dict.auth.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="input ltr-text"
          required
          autoComplete="email"
          dir="ltr"
        />
      </div>

      {isRegister && (
        <div>
          <label className="label" htmlFor="phone">
            {dict.auth.phone}{" "}
            <span style={{ color: "var(--text-faint)" }}>({dict.common.optional})</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            className="input ltr-text"
            autoComplete="tel"
            dir="ltr"
            maxLength={20}
          />
        </div>
      )}

      <div>
        <label className="label" htmlFor="password">
          {dict.auth.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="input ltr-text"
          required
          minLength={isRegister ? 8 : undefined}
          autoComplete={isRegister ? "new-password" : "current-password"}
          dir="ltr"
        />
      </div>

      {isRegister && (
        <div>
          <label className="label" htmlFor="confirmPassword">
            {dict.auth.confirmPassword}
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            className="input ltr-text"
            required
            minLength={8}
            autoComplete="new-password"
            dir="ltr"
          />
        </div>
      )}

      <div className="mt-1">
        <SubmitButton label={isRegister ? dict.auth.register : dict.auth.login} />
      </div>
    </form>
  );
}
