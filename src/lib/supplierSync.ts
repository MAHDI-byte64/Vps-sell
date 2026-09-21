import "server-only";
import { prisma } from "./db";
import { env } from "./env";

/**
 * Mirrors an upstream reseller's product feed (currently: Radib's
 * "representative" API, a WHMCS addon) into `SupplierProduct`.
 *
 * The feed is not scoped to hosting — a real response mixes VPS plans in
 * with Instagram-follower packages, app-design gigs, SEO campaigns, and
 * software licences, all under the same schema. This module does not try
 * to filter or judge that; it stores everything it's given, verbatim, and
 * leaves *what to sell* entirely to an admin picking rows in the panel.
 * The only thing this module infers is a best-effort guess at a synced
 * VPS/hosting row's specs, purely to pre-fill the plan editor — never
 * trusted as authoritative, and never written past that one prefill.
 */

const RADIB_BASE_URL = "https://my.radib.com/modules/addons/torobsync/representative.php";
const SUPPLIER_SLUG = "radib";

export type RadibProduct = {
  page_unique: string;
  page_url?: string;
  title: string;
  category_name: string;
  current_price: number;
  availability?: boolean;
  spec?: Record<string, unknown>;
  short_desc?: string;
  image_links?: string[];
};

type RadibResponse = {
  api_version?: string;
  current_page: number;
  total: number;
  max_pages: number;
  products: RadibProduct[];
};

export class SupplierNotConfiguredError extends Error {
  constructor() {
    super("RADIB_API_TOKEN is not set — add it to .env to enable supplier sync.");
    this.name = "SupplierNotConfiguredError";
  }
}

/** Fetches every page of the feed and returns the combined product list. */
export async function fetchAllRadibProducts(): Promise<RadibProduct[]> {
  if (!env.radibApiToken) throw new SupplierNotConfiguredError();

  const all: RadibProduct[] = [];
  let page = 1;
  let maxPages = 1;

  do {
    const url = `${RADIB_BASE_URL}?token=${encodeURIComponent(env.radibApiToken)}&page=${page}&sort=date_added_desc`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Radib API responded ${res.status} ${res.statusText} on page ${page}.`);
    }
    const data = (await res.json()) as RadibResponse;
    if (!Array.isArray(data.products)) {
      throw new Error(`Radib API returned an unexpected shape on page ${page}.`);
    }
    all.push(...data.products);
    maxPages = data.max_pages || 1;
    page += 1;
    // 4 pages today; this cap just stops a misbehaving feed from looping forever.
  } while (page <= maxPages && page <= 50);

  return all;
}

// ------------------------------- parsing ------------------------------------

const LOCATION_HINTS = [
  "ایران",
  "ژاپن",
  "کانادا",
  "لهستان",
  "هلند",
  "سنگاپور",
  "فنلاند",
  "انگلستان",
  "آلمان",
  "ترکیه",
  "آمریکا",
  "روسیه",
  "فرانسه",
  "امارات",
  "آسیاتک",
];

export type ParsedSpec = {
  cpuCores: number | null;
  ramMb: number | null;
  diskGb: number | null;
  bandwidthGb: number | null;
  ipv4Count: number | null;
  locationHint: string | null;
};

/**
 * Persian half-spaces (ZWNJ) and Arabic presentation marks routinely sit
 * between a label and its value in this feed's free text — normalizing them
 * to plain spaces up front means every regex below can stay a plain `\s*`
 * instead of special-casing invisible characters.
 */
function normalize(text: string): string {
  return text
    .replace(/[‌‏ً-ٟ]/g, " ")
    .replace(/：/g, ":")
    .replace(/\s+/g, " ");
}

/**
 * Best-effort extraction of VPS/hosting specs from a product's title and
 * free-text description. Never authoritative — every field an admin sees
 * from this stays editable, and nothing here is written to a Plan without
 * a human confirming it first.
 */
export function parseSupplierSpec(title: string, shortDesc: string): ParsedSpec {
  const text = normalize(`${title} ${shortDesc}`);

  const ramMatch = text.match(/(?:RAM|رم)\s*:?\s*(\d+)\s*GB/i);
  const ramMb = ramMatch ? Number(ramMatch[1]) * 1024 : null;

  const cpuMatch = text.match(/(\d+)\s*Core/i);
  const cpuCores = cpuMatch ? Number(cpuMatch[1]) : null;

  let diskGb: number | null = null;
  const diskGbMatch = text.match(/فضا\s*:?\s*(\d+)\s*(?:گیگابایت|گیگ|GB)/i);
  const diskMbMatch = text.match(/فضا\s*:?\s*(\d+)\s*(?:مگابایت|MB)/i);
  if (diskGbMatch) diskGb = Number(diskGbMatch[1]);
  else if (diskMbMatch) diskGb = Math.max(1, Math.round(Number(diskMbMatch[1]) / 1024));

  let bandwidthGb: number | null = null;
  const trafficWindow = text.match(/ترافیک\s*ماهیانه\s*:?\s*([\s\S]{0,40}?)(?=محل|پردازنده|کنترل|$)/i);
  if (trafficWindow) {
    const chunk = trafficWindow[1];
    if (/نامحدود/.test(chunk)) {
      bandwidthGb = 0; // matches this project's "0 = unmetered" convention
    } else {
      const tb = chunk.match(/(\d+)\s*TB/i);
      const gb = chunk.match(/(\d+)\s*GB/i);
      if (tb) bandwidthGb = Number(tb[1]) * 1024;
      else if (gb) bandwidthGb = Number(gb[1]);
    }
  }

  const ipMatch = text.match(/(?:IPV4|تعداد\s*آی\s*پی)\s*:?\s*(\d+)/i);
  const ipv4Count = ipMatch ? Number(ipMatch[1]) : null;

  const locationHint = LOCATION_HINTS.find((loc) => text.includes(loc)) ?? null;

  return { cpuCores, ramMb, diskGb, bandwidthGb, ipv4Count, locationHint };
}

// -------------------------------- sync ---------------------------------------

export type SyncResult = {
  fetched: number;
  created: number;
  updated: number;
  pricesRefreshed: number;
};

/**
 * Pulls the full feed and upserts it into `SupplierProduct`.
 *
 * A row that is already linked to a `Plan` (an admin approved it in an
 * earlier sync) gets that plan's `priceMonthly` refreshed to the supplier's
 * current price — the one thing safe to automate, since a price is never
 * ambiguous the way a parsed spec can be. Everything else about the plan
 * (name, specs, locations, active/featured) is left exactly as the admin
 * set it.
 */
export async function syncSupplierProducts(): Promise<SyncResult> {
  const products = await fetchAllRadibProducts();

  let created = 0;
  let updated = 0;
  let pricesRefreshed = 0;

  for (const product of products) {
    const spec = parseSupplierSpec(product.title, product.short_desc ?? "");

    const existing = await prisma.supplierProduct.findUnique({
      where: { supplierSlug_externalId: { supplierSlug: SUPPLIER_SLUG, externalId: product.page_unique } },
      select: { id: true, linkedPlanId: true },
    });

    await prisma.supplierProduct.upsert({
      where: { supplierSlug_externalId: { supplierSlug: SUPPLIER_SLUG, externalId: product.page_unique } },
      create: {
        supplierSlug: SUPPLIER_SLUG,
        externalId: product.page_unique,
        title: product.title,
        categoryName: product.category_name,
        currentPrice: product.current_price,
        shortDesc: product.short_desc ?? "",
        specRaw: (product.spec ?? {}) as object,
        pageUrl: product.page_url ?? "",
        imageUrl: product.image_links?.[0] ?? null,
        availability: product.availability ?? true,
        parsedCpuCores: spec.cpuCores,
        parsedRamMb: spec.ramMb,
        parsedDiskGb: spec.diskGb,
        parsedBandwidthGb: spec.bandwidthGb,
        parsedIpv4Count: spec.ipv4Count,
        parsedLocationHint: spec.locationHint,
      },
      update: {
        title: product.title,
        categoryName: product.category_name,
        currentPrice: product.current_price,
        shortDesc: product.short_desc ?? "",
        specRaw: (product.spec ?? {}) as object,
        pageUrl: product.page_url ?? "",
        imageUrl: product.image_links?.[0] ?? null,
        availability: product.availability ?? true,
        parsedCpuCores: spec.cpuCores,
        parsedRamMb: spec.ramMb,
        parsedDiskGb: spec.diskGb,
        parsedBandwidthGb: spec.bandwidthGb,
        parsedIpv4Count: spec.ipv4Count,
        parsedLocationHint: spec.locationHint,
      },
    });

    if (existing) updated += 1;
    else created += 1;

    if (existing?.linkedPlanId) {
      await prisma.plan.update({
        where: { id: existing.linkedPlanId },
        data: { priceMonthly: product.current_price },
      });
      pricesRefreshed += 1;
    }
  }

  return { fetched: products.length, created, updated, pricesRefreshed };
}
