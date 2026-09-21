"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { syncSupplierProducts, SupplierNotConfiguredError } from "@/lib/supplierSync";
import { isLocale, defaultLocale, type Locale } from "@/i18n/config";

function localeOf(formData: FormData): Locale {
  const value = String(formData.get("locale") ?? "");
  return isLocale(value) ? value : defaultLocale;
}

async function audit(
  actorId: string,
  action: string,
  entity: string,
  entityId: string,
  meta?: Record<string, string | number | boolean | null>,
) {
  await prisma.auditLog.create({
    data: { actorId, action, entity, entityId, meta: meta ?? undefined },
  });
}

/**
 * Pulls the upstream feed and refreshes prices on rows an admin has already
 * approved. Never touches anything else — a row's spec, name or whether a
 * linked plan is active are exactly as the admin last left them.
 */
export async function syncSupplierAction(formData: FormData) {
  const locale = localeOf(formData);
  const admin = await requireAdmin(locale);

  try {
    const result = await syncSupplierProducts();
    await audit(admin.id, "supplier.sync", "SupplierProduct", "radib", {
      fetched: result.fetched,
      created: result.created,
      updated: result.updated,
      pricesRefreshed: result.pricesRefreshed,
    });
    revalidatePath(`/${locale}/admin/supplier`);
    redirect(
      `/${locale}/admin/supplier?synced=1&created=${result.created}&updated=${result.updated}&refreshed=${result.pricesRefreshed}`,
    );
  } catch (error) {
    if (error instanceof SupplierNotConfiguredError) {
      redirect(`/${locale}/admin/supplier?error=notconfigured`);
    }
    // A network/feed error should not look like a silent success.
    redirect(`/${locale}/admin/supplier?error=fetch`);
  }
}

/**
 * Turns one staged supplier row into a real (initially inactive) Plan,
 * pre-filled with the best-effort parsed specs, then sends the admin
 * straight to the existing plan editor to confirm or correct everything
 * before it can go live.
 */
export async function createPlanFromSupplierAction(formData: FormData) {
  const locale = localeOf(formData);
  await requireAdmin(locale);

  const supplierProductId = String(formData.get("supplierProductId") ?? "");
  const row = await prisma.supplierProduct.findUnique({ where: { id: supplierProductId } });
  if (!row) redirect(`/${locale}/admin/supplier`);
  if (row.linkedPlanId) redirect(`/${locale}/admin/plans?edit=${row.linkedPlanId}`);

  // Deterministic and collision-free: every supplier row's externalId is
  // already unique, so deriving the slug from it needs no uniqueness check.
  const shortId = row.externalId.replace(/\D/g, "") || row.externalId;
  const slug = `radib-${shortId}`;

  // Windows is the one case worth detecting from the title — everything
  // else the feed sends under "server + hosting" fits VPS_LINUX well enough
  // to review, without inventing a product type this schema doesn't have.
  const isWindows = /ویندوز|windows/i.test(`${row.title} ${row.shortDesc}`);

  const plan = await prisma.plan.create({
    data: {
      slug,
      type: isWindows ? "VPS_WINDOWS" : "VPS_LINUX",
      nameFa: row.title,
      nameEn: row.title,
      descFa: row.shortDesc.slice(0, 300),
      descEn: "",
      cpuCores: row.parsedCpuCores ?? 1,
      ramMb: row.parsedRamMb ?? 1024,
      diskGb: row.parsedDiskGb ?? 10,
      bandwidthGb: row.parsedBandwidthGb ?? 1000,
      portMbps: 1000,
      ipv4Count: row.parsedIpv4Count ?? 1,
      priceMonthly: row.currentPrice,
      // Never goes live on its own — an admin must open the editor below,
      // review the auto-parsed guesses, and explicitly activate it.
      active: false,
    },
  });

  await prisma.supplierProduct.update({
    where: { id: row.id },
    data: { linkedPlanId: plan.id },
  });

  revalidatePath(`/${locale}/admin`, "layout");
  redirect(`/${locale}/admin/plans?edit=${plan.id}#plan-editor`);
}

export async function unlinkSupplierProductAction(formData: FormData) {
  const locale = localeOf(formData);
  await requireAdmin(locale);
  const supplierProductId = String(formData.get("supplierProductId") ?? "");

  await prisma.supplierProduct.update({
    where: { id: supplierProductId },
    data: { linkedPlanId: null },
  });

  revalidatePath(`/${locale}/admin/supplier`);
  redirect(`/${locale}/admin/supplier`);
}
