import "server-only";
import { prisma } from "./db";
import { nextInvoiceNumber, nextOrderNumber } from "./ids";
import { snapshotPlan } from "./catalog";
import { addCycle } from "./billing";
import type { PricedCart } from "./pricing";
import { INVOICE_DUE_DAYS } from "./constants";
import type { InvoiceType, PaymentMethod } from "./types";

/**
 * Turns a priced cart into an Order plus its Invoice, inside one transaction so
 * a failure can never leave an order without the invoice that pays for it.
 */
export async function createOrderWithInvoice(input: {
  userId: string;
  priced: PricedCart;
  note?: string;
}) {
  const { userId, priced, note } = input;
  if (priced.lines.length === 0) throw new Error("Cannot create an order from an empty cart");

  const couponId = priced.coupon && !priced.couponProblem ? priced.coupon.id : null;
  const discount = couponId ? priced.discount : 0;
  const orderNumber = await nextOrderNumber();
  const invoiceNumber = await nextInvoiceNumber();

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        number: orderNumber,
        userId,
        status: "PENDING",
        subtotal: priced.subtotal,
        discount,
        tax: priced.tax,
        total: priced.total,
        couponId,
        note: note?.slice(0, 500) || null,
        items: {
          create: priced.lines.map((line) => ({
            planId: line.plan.id,
            locationId: line.location.id,
            osId: line.os.id,
            planSnapshot: snapshotPlan(line.plan),
            billingCycle: line.item.cycle,
            hostname: line.item.hostname ?? null,
            quantity: line.item.quantity,
            unitPrice: line.unitPrice,
            lineTotal: line.lineTotal,
          })),
        },
      },
      include: { items: true },
    });

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + INVOICE_DUE_DAYS);

    const invoice = await tx.invoice.create({
      data: {
        number: invoiceNumber,
        userId,
        orderId: order.id,
        type: "NEW_ORDER",
        status: "UNPAID",
        subtotal: priced.subtotal,
        discount,
        tax: priced.tax,
        total: priced.total,
        dueDate,
      },
    });

    if (couponId) {
      // Reserve the redemption with the order so the usage cap holds even if
      // the invoice is never paid; cancelling an order releases it again.
      await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
      await tx.couponRedemption.create({
        data: { couponId, userId, orderId: order.id, amount: discount },
      });
    }

    return { order, invoice };
  });
}

/** Issues a standalone invoice not tied to an order (top-ups, renewals). */
export async function createStandaloneInvoice(input: {
  userId: string;
  type: InvoiceType;
  total: number;
  description: string;
  dueInDays?: number;
}) {
  const number = await nextInvoiceNumber();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (input.dueInDays ?? INVOICE_DUE_DAYS));

  return prisma.invoice.create({
    data: {
      number,
      userId: input.userId,
      type: input.type,
      status: "UNPAID",
      subtotal: input.total,
      discount: 0,
      tax: 0,
      total: input.total,
      description: input.description,
      dueDate,
    },
  });
}

/**
 * The single place an invoice becomes paid.
 *
 * It is idempotent (a second call on a paid invoice is a no-op) and handles
 * every downstream effect in one transaction: the wallet debit or credit, the
 * order transition, and creating the Service rows the admin will hand over.
 */
export async function settleInvoice(input: {
  invoiceId: string;
  method: PaymentMethod;
  reference?: string;
  confirmedById?: string;
}): Promise<{ ok: true } | { ok: false; reason: "not_found" | "already_paid" | "insufficient" }> {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: input.invoiceId },
      include: { order: { include: { items: true } } },
    });
    if (!invoice) return { ok: false as const, reason: "not_found" as const };
    if (invoice.status === "PAID") return { ok: false as const, reason: "already_paid" as const };

    const user = await tx.user.findUnique({ where: { id: invoice.userId } });
    if (!user) return { ok: false as const, reason: "not_found" as const };

    // Paying from the wallet must not push the balance negative.
    if (input.method === "WALLET") {
      if (user.walletBalance < invoice.total) {
        return { ok: false as const, reason: "insufficient" as const };
      }
      const balanceAfter = user.walletBalance - invoice.total;
      await tx.user.update({ where: { id: user.id }, data: { walletBalance: balanceAfter } });
      await tx.walletTransaction.create({
        data: {
          userId: user.id,
          type: "PAYMENT",
          amount: -invoice.total,
          balanceAfter,
          description: `پرداخت فاکتور ${invoice.number}`,
          invoiceId: invoice.id,
        },
      });
    }

    // A top-up settled by any other means credits the wallet instead.
    if (invoice.type === "WALLET_TOPUP" && input.method !== "WALLET") {
      const balanceAfter = user.walletBalance + invoice.total;
      await tx.user.update({ where: { id: user.id }, data: { walletBalance: balanceAfter } });
      await tx.walletTransaction.create({
        data: {
          userId: user.id,
          type: "DEPOSIT",
          amount: invoice.total,
          balanceAfter,
          description: `شارژ کیف پول — فاکتور ${invoice.number}`,
          invoiceId: invoice.id,
        },
      });
    }

    await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: "PAID", paidAt: new Date() },
    });

    await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        userId: user.id,
        method: input.method,
        status: "SUCCESS",
        amount: invoice.total,
        reference: input.reference ?? null,
        confirmedById: input.confirmedById ?? null,
        confirmedAt: new Date(),
      },
    });

    // A paid order becomes work for the admin: one Service per unit ordered.
    if (invoice.order) {
      await tx.order.update({ where: { id: invoice.order.id }, data: { status: "PAID" } });

      const existing = await tx.service.count({ where: { orderItem: { orderId: invoice.order.id } } });
      if (existing === 0) {
        for (const item of invoice.order.items) {
          const snapshot = item.planSnapshot as { nameFa?: string; slug?: string };
          for (let unit = 0; unit < item.quantity; unit += 1) {
            await tx.service.create({
              data: {
                userId: user.id,
                orderItemId: item.id,
                planId: item.planId,
                locationId: item.locationId,
                osId: item.osId,
                label: snapshot.nameFa ?? snapshot.slug ?? "Server",
                hostname: item.hostname,
                status: "PENDING",
                billingCycle: item.billingCycle,
                price: item.unitPrice,
                expiresAt: addCycle(new Date(), item.billingCycle),
              },
            });
          }
        }
      }
    }

    // A renewal invoice pushes its service's expiry out by one more cycle.
    const renewedService = await tx.service.findFirst({
      where: { renewalInvoiceId: invoice.id },
    });
    if (renewedService) {
      const base =
        renewedService.expiresAt && renewedService.expiresAt > new Date()
          ? renewedService.expiresAt
          : new Date();
      await tx.service.update({
        where: { id: renewedService.id },
        data: {
          expiresAt: addCycle(base, renewedService.billingCycle),
          status: renewedService.status === "EXPIRED" ? "ACTIVE" : renewedService.status,
          renewalInvoiceId: null,
        },
      });
    }

    return { ok: true as const };
  });
}

/** Credits or debits a wallet and writes the matching ledger row. */
export async function adjustWallet(input: {
  userId: string;
  amount: number;
  description: string;
  type: "DEPOSIT" | "REFUND" | "ADJUSTMENT";
}) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: input.userId } });
    if (!user) throw new Error("User not found");

    // Clamp rather than allow a negative balance from a manual adjustment.
    const balanceAfter = Math.max(user.walletBalance + input.amount, 0);
    const applied = balanceAfter - user.walletBalance;

    await tx.user.update({ where: { id: user.id }, data: { walletBalance: balanceAfter } });
    return tx.walletTransaction.create({
      data: {
        userId: user.id,
        type: input.type,
        amount: applied,
        balanceAfter,
        description: input.description,
      },
    });
  });
}
