import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate, formatNumber } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { deletePostAction, savePostAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPostsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saved?: string; error?: string; edit?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);
  await requireAdmin(locale);
  const flags = await searchParams;

  const posts = await prisma.post.findMany({ orderBy: { createdAt: "desc" } });
  const editing = flags.edit ? posts.find((post) => post.id === flags.edit) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-extrabold">{dict.admin.posts}</h1>

      {flags.saved && <Alert variant="success">{dict.admin.saved}</Alert>}
      {flags.error === "slug" && (
        <Alert variant="error">
          {locale === "fa" ? "این نامک قبلاً استفاده شده است." : "That slug is already taken."}
        </Alert>
      )}
      {flags.error === "invalid" && <Alert variant="error">{dict.common.error}</Alert>}

      <form key={editing?.id ?? "new"} action={savePostAction} className="card flex flex-col gap-5 p-5">
        <input type="hidden" name="locale" value={locale} />
        {editing && <input type="hidden" name="postId" value={editing.id} />}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold">{editing ? dict.admin.edit : dict.admin.create}</h2>
          {editing && (
            <Link href={`/${locale}/admin/posts`} className="btn btn-ghost btn-sm">
              {dict.admin.cancel}
            </Link>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Slug" name="slug" defaultValue={editing?.slug ?? ""} ltr required />
          <Field label="Emoji" name="coverEmoji" defaultValue={editing?.coverEmoji ?? "📘"} />
          <Field
            label={locale === "fa" ? "برچسب‌ها (با کاما)" : "Tags (comma separated)"}
            name="tags"
            defaultValue={editing?.tags.join(", ") ?? ""}
            ltr
          />
          <label className="flex items-end gap-2 pb-2.5 text-sm font-semibold">
            <input
              type="checkbox"
              name="published"
              defaultChecked={editing?.published ?? false}
              className="size-4 accent-[var(--brand)]"
            />
            {dict.blog.published}
          </label>

          <Field label="عنوان (FA)" name="titleFa" defaultValue={editing?.titleFa ?? ""} required />
          <Field label="Title (EN)" name="titleEn" defaultValue={editing?.titleEn ?? ""} required />
          <Field label="خلاصه (FA)" name="excerptFa" defaultValue={editing?.excerptFa ?? ""} />
          <Field label="Excerpt (EN)" name="excerptEn" defaultValue={editing?.excerptEn ?? ""} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="label" htmlFor="bodyFa">
              متن فارسی (Markdown)
            </label>
            <textarea
              id="bodyFa"
              name="bodyFa"
              className="textarea"
              rows={12}
              defaultValue={editing?.bodyFa ?? ""}
            />
          </div>
          <div>
            <label className="label" htmlFor="bodyEn">
              English body (Markdown)
            </label>
            <textarea
              id="bodyEn"
              name="bodyEn"
              className="textarea"
              rows={12}
              dir="ltr"
              defaultValue={editing?.bodyEn ?? ""}
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary self-start">
          {dict.admin.save}
        </button>
      </form>

      {posts.length === 0 ? (
        <div className="card p-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          {dict.admin.noResults}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th />
                <th>{dict.tickets.subject}</th>
                <th>{dict.admin.status}</th>
                <th>{dict.blog.views}</th>
                <th>{dict.admin.date}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id}>
                  <td className="text-xl">{post.coverEmoji}</td>
                  <td>
                    <span className="font-semibold">
                      {locale === "fa" ? post.titleFa : post.titleEn}
                    </span>
                    <span className="mono block text-xs" style={{ color: "var(--text-faint)" }}>
                      {post.slug}
                    </span>
                  </td>
                  <td>
                    <Badge tone={post.published ? "ok" : "muted"}>
                      {post.published ? dict.blog.published : dict.blog.draft}
                    </Badge>
                  </td>
                  <td>{formatNumber(post.viewCount, locale)}</td>
                  <td className="whitespace-nowrap">{formatDate(post.createdAt, locale)}</td>
                  <td>
                    <div className="flex gap-2">
                      <a href={`/${locale}/admin/posts?edit=${post.id}`} className="btn btn-outline btn-sm">
                        {dict.admin.edit}
                      </a>
                      <form action={deletePostAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="postId" value={post.id} />
                        <button
                          type="submit"
                          className="btn btn-ghost btn-sm"
                          style={{ color: "var(--danger)" }}
                        >
                          {dict.admin.delete}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  ltr,
  required,
}: {
  label: string;
  name: string;
  defaultValue: string;
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
        type="text"
        className={`input ${ltr ? "ltr-text" : ""}`}
        defaultValue={defaultValue}
        dir={ltr ? "ltr" : undefined}
        required={required}
      />
    </div>
  );
}
