"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { RefreshCw } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";

const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#%^*_-";

function randomPassword(length = 18): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => ALPHABET[value % ALPHABET.length]).join("");
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {label}
    </button>
  );
}

/**
 * The hand-over form. The password is typed or generated here and travels once
 * to the server, which seals it before it touches the database.
 */
export function DeliverForm({
  locale,
  dict,
  service,
  action,
}: {
  locale: Locale;
  dict: Dictionary;
  service: {
    id: string;
    ipv4: string | null;
    ipv6: string | null;
    username: string;
    sshPort: number;
    hostname: string | null;
    adminNote: string | null;
    isWindows: boolean;
  };
  action: (formData: FormData) => Promise<void>;
}) {
  const [password, setPassword] = useState("");

  return (
    <form action={action} className="card flex flex-col gap-4 p-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="serviceId" value={service.id} />

      <div>
        <h2 className="font-bold">{dict.admin.deliverTitle}</h2>
        <p className="mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
          {dict.admin.deliverNote}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="ipv4">
            IPv4
          </label>
          <input
            id="ipv4"
            name="ipv4"
            type="text"
            className="input ltr-text"
            defaultValue={service.ipv4 ?? ""}
            placeholder="192.0.2.10"
            dir="ltr"
          />
        </div>

        <div>
          <label className="label" htmlFor="ipv6">
            IPv6 <span style={{ color: "var(--text-faint)" }}>({dict.common.optional})</span>
          </label>
          <input
            id="ipv6"
            name="ipv6"
            type="text"
            className="input ltr-text"
            defaultValue={service.ipv6 ?? ""}
            maxLength={60}
            dir="ltr"
          />
        </div>

        <div>
          <label className="label" htmlFor="username">
            {dict.services.username}
          </label>
          <input
            id="username"
            name="username"
            type="text"
            className="input ltr-text"
            defaultValue={service.username || (service.isWindows ? "Administrator" : "root")}
            required
            dir="ltr"
          />
        </div>

        <div>
          <label className="label" htmlFor="sshPort">
            {service.isWindows ? "RDP Port" : dict.services.sshPort}
          </label>
          <input
            id="sshPort"
            name="sshPort"
            type="number"
            className="input ltr-text"
            defaultValue={service.sshPort || (service.isWindows ? 3389 : 22)}
            min={1}
            max={65535}
            required
            dir="ltr"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="password">
          {dict.services.password}
        </label>
        <div className="flex gap-2">
          <input
            id="password"
            name="password"
            type="text"
            className="input ltr-text"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            maxLength={200}
            dir="ltr"
          />
          <button
            type="button"
            className="btn btn-outline btn-sm shrink-0"
            onClick={() => setPassword(randomPassword())}
          >
            <RefreshCw size={14} aria-hidden />
            {dict.admin.generatePassword}
          </button>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="hostname">
          {dict.plans.hostname}
        </label>
        <input
          id="hostname"
          name="hostname"
          type="text"
          className="input ltr-text"
          defaultValue={service.hostname ?? ""}
          maxLength={120}
          dir="ltr"
        />
      </div>

      <div>
        <label className="label" htmlFor="adminNote">
          {dict.services.adminNote}
        </label>
        <textarea
          id="adminNote"
          name="adminNote"
          className="textarea"
          rows={3}
          maxLength={1000}
          defaultValue={service.adminNote ?? ""}
        />
      </div>

      <div className="mt-1">
        <SubmitButton label={dict.admin.deliver} />
      </div>
    </form>
  );
}
