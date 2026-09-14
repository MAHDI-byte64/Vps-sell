"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readCart, writeCart, sameConfiguration, type CartItem } from "@/lib/cart";
import { CYCLE_ORDER } from "@/lib/billing";
import { isLocale, defaultLocale } from "@/i18n/config";

const schema = z.object({
  locale: z.string(),
  planId: z.string().min(1),
  locationId: z.string().min(1),
  osId: z.string().min(1),
  cycle: z.enum(CYCLE_ORDER as [string, ...string[]]),
  // Hostnames are optional; when given they must look like one.
  hostname: z
    .string()
    .trim()
    .max(120)
    .regex(/^[a-zA-Z0-9.-]*$/, "invalid")
    .optional()
    .or(z.literal("")),
  quantity: z.coerce.number().int().min(1).max(10),
});

export async function addToCartAction(formData: FormData) {
  const parsed = schema.safeParse({
    locale: formData.get("locale"),
    planId: formData.get("planId"),
    locationId: formData.get("locationId"),
    osId: formData.get("osId"),
    cycle: formData.get("cycle"),
    hostname: formData.get("hostname") ?? "",
    quantity: formData.get("quantity") ?? 1,
  });

  const locale = isLocale(String(formData.get("locale"))) ? String(formData.get("locale")) : defaultLocale;

  if (!parsed.success) redirect(`/${locale}/plans?error=invalid`);
  const input = parsed.data;

  // Never trust the ids from the form: the plan must exist, be sellable, and
  // actually offer the chosen location.
  const plan = await prisma.plan.findFirst({
    where: { id: input.planId, active: true },
    include: { locations: { select: { id: true } } },
  });
  if (!plan) redirect(`/${locale}/plans?error=notfound`);
  if (plan.stock !== null && plan.stock <= 0) redirect(`/${locale}/plans?error=stock`);
  if (!plan.locations.some((location) => location.id === input.locationId)) {
    redirect(`/${locale}/plans/${plan.slug}?error=location`);
  }

  const os = await prisma.operatingSystem.findFirst({ where: { id: input.osId, active: true } });
  if (!os) redirect(`/${locale}/plans/${plan.slug}?error=os`);
  // A Linux plan cannot be delivered with a Windows image, and vice versa.
  const expectedFamily = plan.type === "VPS_WINDOWS" ? "windows" : "linux";
  if (plan.type !== "DEDICATED" && os.family !== expectedFamily) {
    redirect(`/${locale}/plans/${plan.slug}?error=os`);
  }

  const item: CartItem = {
    planId: plan.id,
    locationId: input.locationId,
    osId: os.id,
    cycle: input.cycle as CartItem["cycle"],
    hostname: input.hostname ? input.hostname : undefined,
    quantity: input.quantity,
  };

  const cart = await readCart();
  const existing = cart.items.find((line) => sameConfiguration(line, item));
  if (existing) {
    existing.quantity = Math.min(existing.quantity + item.quantity, 10);
  } else {
    cart.items.push(item);
  }

  await writeCart(cart);
  revalidatePath(`/${locale}`, "layout");
  redirect(`/${locale}/cart?added=1`);
}
