import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { prisma } from "@/lib/db";
import { formatDate, formatNumber } from "@/lib/format";
import { readingMinutes, renderMarkdown } from "@/lib/markdown";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const post = await prisma.post.findFirst({ where: { slug, published: true } });
  if (!post) return {};
  return {
    title: locale === "fa" ? post.titleFa : post.titleEn,
    description: locale === "fa" ? post.excerptFa : post.excerptEn,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);

  const post = await prisma.post.findFirst({ where: { slug, published: true } });
  if (!post) notFound();

  // Best-effort view counter; a failure here must never break the article.
  prisma.post
    .update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => undefined);

  const related = await prisma.post.findMany({
    where: { published: true, id: { not: post.id } },
    orderBy: { publishedAt: "desc" },
    take: 2,
  });

  const title = locale === "fa" ? post.titleFa : post.titleEn;
  const body = locale === "fa" ? post.bodyFa : post.bodyEn;
  const Arrow = locale === "fa" ? ArrowRight : ArrowLeft;

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <Link
        href={`/${locale}/blog`}
        className="btn btn-ghost btn-sm -ms-3"
        style={{ color: "var(--text-muted)" }}
      >
        <Arrow size={16} aria-hidden />
        {dict.blog.backToBlog}
      </Link>

      <header className="mt-6">
        <span className="text-4xl" aria-hidden>
          {post.coverEmoji}
        </span>
        <h1 className="mt-4 text-2xl leading-snug font-extrabold sm:text-3xl">{title}</h1>
        <div
          className="mt-4 flex flex-wrap items-center gap-3 text-xs"
          style={{ color: "var(--text-faint)" }}
        >
          <span>{formatDate(post.publishedAt, locale)}</span>
          <span>·</span>
          <span>
            {formatNumber(readingMinutes(body), locale)} {dict.blog.minRead}
          </span>
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <span key={tag} className="badge badge-muted">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* The body is escaped and re-rendered by our own limited Markdown
          renderer, so no author-supplied markup reaches this HTML. */}
      <div
        className="prose-app mt-8 border-t pt-8"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }}
      />

      {related.length > 0 && (
        <section className="mt-14 border-t pt-8">
          <h2 className="font-bold">{dict.blog.relatedPosts}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {related.map((item) => (
              <Link key={item.id} href={`/${locale}/blog/${item.slug}`} className="card p-5">
                <span className="text-2xl" aria-hidden>
                  {item.coverEmoji}
                </span>
                <h3 className="mt-2 text-sm font-bold">
                  {locale === "fa" ? item.titleFa : item.titleEn}
                </h3>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
