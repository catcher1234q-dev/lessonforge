import type {
  OrderRecord,
  ProductRecord,
  RefundRequestRecord,
  ReportRecord,
  ReviewRecord,
} from "@/types";

function normalizeEmail(value?: string) {
  return value?.trim().toLowerCase();
}

function normalizeName(value?: string) {
  return value?.trim().toLowerCase();
}

export function isPublicProductStatus(status?: ProductRecord["productStatus"]) {
  return !status || status === "Published";
}

export function hasVerifiedPurchase(
  orders: OrderRecord[],
  productId: string,
  buyerEmail: string,
) {
  const normalizedBuyerEmail = normalizeEmail(buyerEmail);

  return orders.some(
    (order) =>
      order.productId === productId &&
      normalizeEmail(order.buyerEmail) === normalizedBuyerEmail,
  );
}

export function findExistingReview(
  reviews: ReviewRecord[],
  productId: string,
  buyerName: string,
  buyerEmail: string,
) {
  const normalizedBuyerEmail = normalizeEmail(buyerEmail);
  const normalizedBuyerName = normalizeName(buyerName);

  return reviews.find(
    (review) =>
      review.productId === productId &&
      (normalizeEmail(review.buyerEmail) === normalizedBuyerEmail ||
        normalizeName(review.buyerName) === normalizedBuyerName),
  );
}

export function findOrderById(orders: OrderRecord[], orderId: string) {
  return orders.find((order) => order.id === orderId);
}

export function orderBelongsToBuyer(order: OrderRecord, buyerEmail: string) {
  if (!order.buyerEmail) {
    return true;
  }

  return normalizeEmail(order.buyerEmail) === normalizeEmail(buyerEmail);
}

export function findExistingSubmittedRefundRequest(
  refundRequests: RefundRequestRecord[],
  orderId: string,
) {
  return refundRequests.find(
    (entry) => entry.orderId === orderId && entry.status === "Submitted",
  );
}

export function findExistingOpenReport(
  reports: ReportRecord[],
  productId: string,
  reporterEmail: string,
) {
  const normalizedReporterEmail = normalizeEmail(reporterEmail);

  return reports.find(
    (entry) =>
      entry.productId === productId &&
      normalizeEmail(entry.reporterEmail) === normalizedReporterEmail &&
      (entry.status === "Open" || entry.status === "Under review"),
  );
}
