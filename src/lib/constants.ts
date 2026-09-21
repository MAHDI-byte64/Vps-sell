/**
 * Values shared between server actions and the pages that render them.
 *
 * They live outside any "use server" module because such a module may only
 * export async functions.
 */
export const MIN_TOPUP = 50_000;
export const MAX_TOPUP = 500_000_000;
export const EXPIRY_WARNING_DAYS = 14;
export const INVOICE_DUE_DAYS = 3;
