/**
 * Prisma 7 exports row types as `<Model>Model`. Re-exporting them under their
 * plain names keeps application code readable and gives us one place to change
 * if the generator's naming shifts again.
 */
export type {
  UserModel as User,
  LocationModel as Location,
  OperatingSystemModel as OperatingSystem,
  PlanModel as Plan,
  OrderModel as Order,
  OrderItemModel as OrderItem,
  InvoiceModel as Invoice,
  PaymentModel as Payment,
  WalletTransactionModel as WalletTransaction,
  ServiceModel as Service,
  TicketModel as Ticket,
  TicketMessageModel as TicketMessage,
  CouponModel as Coupon,
  CouponRedemptionModel as CouponRedemption,
  PostModel as Post,
  SettingModel as Setting,
  AuditLogModel as AuditLog,
  SupplierProductModel as SupplierProduct,
} from "@/generated/prisma/models";

export type {
  Role,
  ProductType,
  BillingCycle,
  OrderStatus,
  InvoiceStatus,
  InvoiceType,
  PaymentMethod,
  PaymentStatus,
  WalletTxType,
  ServiceStatus,
  TicketStatus,
  TicketDepartment,
  TicketPriority,
  CouponType,
} from "@/generated/prisma/enums";
