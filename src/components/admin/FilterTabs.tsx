import Link from "next/link";

/** Status filter tabs shared by the admin list pages. */
export function FilterTabs({
  basePath,
  current,
  allLabel,
  options,
}: {
  basePath: string;
  current?: string;
  allLabel: string;
  options: { value: string; label: string; count?: number }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Tab href={basePath} active={!current}>
        {allLabel}
      </Tab>
      {options.map((option) => (
        <Tab
          key={option.value}
          href={`${basePath}?status=${option.value}`}
          active={current === option.value}
        >
          {option.label}
          {option.count !== undefined && option.count > 0 ? (
            <span className="ms-1.5 opacity-70">({option.count})</span>
          ) : null}
        </Tab>
      ))}
    </div>
  );
}

function Tab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors"
      style={{
        background: active ? "var(--brand)" : "var(--surface-sunken)",
        color: active ? "var(--brand-contrast)" : "var(--text-muted)",
        borderColor: active ? "var(--brand)" : "var(--line)",
      }}
    >
      {children}
    </Link>
  );
}
