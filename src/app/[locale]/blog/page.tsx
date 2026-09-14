import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Newspaper } from "lucide-react";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { prisma } from "@/lib/db";
import { formatDate, formatNumber } from "@/lib/format";
import { readingMinutes } from "@/lib/markdown";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return { title: dict.blog.title, description: dict.blog.subtitle };
}

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const dict = getDictionary(locale);

  const posts = await prisma.post.findMany({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <header className="text-center">
        <h1 className="text-3xl font-extrabold">{dict.blog.title}</h1>
        <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
          {dict.blog.subtitle}
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="mt-10">
          <EmptyState icon={<Newspaper size={26} />} title={dict.blog.empty} />
        </div>
      ) : (
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {posts.map((post) => {
            const body = locale === "fa" ? post.bodyFa : post.bodyEn;
            return (
              <Link
                key={post.id}
                href={`/${locale}/blog/${post.slug}`}
                className="card flex flex-col p-6 transition-transform hover:-translate-y-0.5"
              >
                <span className="text-3xl" aria-hidden>
                  {post.coverEmoji}
                </span>
                <h2 className="mt-3 font-bold">{locale === "fa" ? post.titleFa : post.titleEn}</h2>
                <p
                  className="mt-2 line-clamp-3 flex-1 text-sm leading-7"
                  style={{ color: "var(--text-muted)" }}
                >
                  {locale === "fa" ? post.excerptFa : post.excerptEn}
                </p>
                <div
                  className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4 text-xs"
                  style={{ color: "var(--text-faint)" }}
                >
                  <span>{formatDate(post.publishedAt, locale)}</span>
                  <span>·</span>
                  <span>
                    {formatNumber(readingMinutes(body), locale)} {dict.blog.minRead}
                  </span>
                  <span className="link ms-auto">{dict.blog.readMore}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
