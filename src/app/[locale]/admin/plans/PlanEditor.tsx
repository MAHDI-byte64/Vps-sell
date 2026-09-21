"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import type { ProductType } from "@/lib/types";

const TYPES: ProductType[] = ["VPS_LINUX", "VPS_WINDOWS", "DEDICATED"];

export type EditablePlan = {
  id: string;
  slug: string;
  type: ProductType;
  nameFa: string;
  nameEn: string;
  descFa: string;
  descEn: string;
  cpuCores: number;
  cpuNoteFa: string;
  cpuNoteEn: string;
  ramMb: number;
  diskGb: number;
  diskType: string;
  bandwidthGb: number;
  portMbps: number;
  ipv4Count: number;
  priceMonthly: number;
  setupFee: number;
  sortOrder: number;
  stock: number | null;
  active: boolean;
  featured: boolean;
  locationIds: string[];
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {label}
    </button>
  );
}

/**
 * One form serves both create and edit: with a plan it edits, without it
 * creates. The `key` on the form resets every uncontrolled field when the admin
 * switches between plans.
 */
export function PlanEditor({
  locale,
  dict,
  plan,
  locations,
  action,
}: {
  locale: Locale;
  dict: Dictionary;
  plan: EditablePlan | null;
  locations: { id: string; label: string }[];
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form
      id="plan-editor"
      key={plan?.id ?? "new"}
      action={action}
      className="card flex flex-col gap-5 p-5"
    >
      <input type="hidden" name="locale" value={locale} />
      {plan && <input type="hidden" name="planId" value={plan.id} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold">{plan ? dict.admin.edit : dict.admin.create}</h2>
        {plan && (
          <Link href={`/${locale}/admin/plans`} className="btn btn-ghost btn-sm">
            {dict.admin.cancel}
          </Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Slug" name="slug" defaultValue={plan?.slug ?? ""} ltr required />
        <div>
          <label className="label" htmlFor="type">
            {dict.plans.filterType}
          </label>
          <select id="type" name="type" className="select" defaultValue={plan?.type ?? "VPS_LINUX"}>
            {TYPES.map((value) => (
              <option key={value} value={value}>
                {dict.productTypes[value]}
              </option>
            ))}
          </select>
        </div>
        <Field label="نام (FA)" name="nameFa" defaultValue={plan?.nameFa ?? ""} required />
        <Field label="Name (EN)" name="nameEn" defaultValue={plan?.nameEn ?? ""} required />

        <Field label="توضیح (FA)" name="descFa" defaultValue={plan?.descFa ?? ""} />
        <Field label="Description (EN)" name="descEn" defaultValue={plan?.descEn ?? ""} />
        <Field
          label={dict.plans.cpu}
          name="cpuCores"
          type="number"
          defaultValue={String(plan?.cpuCores ?? 2)}
          required
        />
        <Field label="CPU note (FA)" name="cpuNoteFa" defaultValue={plan?.cpuNoteFa ?? ""} />

        <Field label="CPU note (EN)" name="cpuNoteEn" defaultValue={plan?.cpuNoteEn ?? ""} ltr />
        <Field
          label={`${dict.plans.ram} (MB)`}
          name="ramMb"
          type="number"
          defaultValue={String(plan?.ramMb ?? 2048)}
          required
        />
        <Field
          label={`${dict.plans.disk} (GB)`}
          name="diskGb"
          type="number"
          defaultValue={String(plan?.diskGb ?? 40)}
          required
        />
        <Field label="Disk type" name="diskType" defaultValue={plan?.diskType ?? "NVMe"} ltr />

        <Field
          label={`${dict.plans.bandwidth} (GB, 0 = ${dict.common.unlimited})`}
          name="bandwidthGb"
          type="number"
          defaultValue={String(plan?.bandwidthGb ?? 2000)}
          required
        />
        <Field
          label={`${dict.plans.port} (Mbps)`}
          name="portMbps"
          type="number"
          defaultValue={String(plan?.portMbps ?? 1000)}
          required
        />
        <Field
          label={dict.plans.ipv4}
          name="ipv4Count"
          type="number"
          defaultValue={String(plan?.ipv4Count ?? 1)}
          required
        />
        <Field
          label={`${dict.plans.perMonth} (تومان)`}
          name="priceMonthly"
          type="number"
          defaultValue={String(plan?.priceMonthly ?? 300000)}
          required
        />

        <Field
          label={dict.plans.setupFee}
          name="setupFee"
          type="number"
          defaultValue={String(plan?.setupFee ?? 0)}
        />
        <Field
          label={`Stock (${dict.common.optional})`}
          name="stock"
          type="number"
          defaultValue={plan?.stock === null || plan?.stock === undefined ? "" : String(plan.stock)}
        />
        <Field
          label="Sort order"
          name="sortOrder"
          type="number"
          defaultValue={String(plan?.sortOrder ?? 0)}
        />
      </div>

      <fieldset>
        <legend className="label">{dict.plans.filterLocation}</legend>
        <div className="flex flex-wrap gap-2">
          {locations.map((location) => (
            <label
              key={location.id}
              className="flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold"
              style={{ background: "var(--surface-sunken)" }}
            >
              <input
                type="checkbox"
                name="locationIds"
                value={location.id}
                defaultChecked={plan ? plan.locationIds.includes(location.id) : true}
                className="size-3.5 accent-[var(--brand)]"
              />
              {location.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-5">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            name="active"
            defaultChecked={plan ? plan.active : true}
            className="size-4 accent-[var(--brand)]"
          />
          {dict.common.active}
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={plan?.featured ?? false}
            className="size-4 accent-[var(--brand)]"
          />
          {dict.plans.popular}
        </label>
      </div>

      <div>
        <SubmitButton label={dict.admin.save} />
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  ltr,
  required,
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
  ltr?: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        className={`input ${ltr ? "ltr-text" : ""}`}
        defaultValue={defaultValue}
        dir={ltr ? "ltr" : undefined}
        required={required}
      />
    </div>
  );
}
