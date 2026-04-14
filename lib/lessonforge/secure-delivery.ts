import crypto from "node:crypto";

type DeliveryTokenPayload = {
  orderId: string;
  productId: string;
  buyerEmail: string;
  assetKind: "original";
  expiresAt: number;
};

function getDeliverySecret() {
  return process.env.AUTH_SECRET || "lessonforge-local-download-secret";
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signValue(value: string) {
  return crypto
    .createHmac("sha256", getDeliverySecret())
    .update(value)
    .digest("base64url");
}

export function createProtectedDeliveryToken(payload: DeliveryTokenPayload) {
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signValue(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyProtectedDeliveryToken(token: string) {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return { valid: false as const, reason: "Malformed delivery token." };
  }

  const expectedSignature = signValue(encodedPayload);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return { valid: false as const, reason: "Invalid delivery signature." };
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as DeliveryTokenPayload;

    if (payload.assetKind !== "original") {
      return { valid: false as const, reason: "Unsupported asset kind." };
    }

    if (Date.now() > payload.expiresAt) {
      return { valid: false as const, reason: "Delivery token expired." };
    }

    return {
      valid: true as const,
      payload,
    };
  } catch {
    return { valid: false as const, reason: "Unreadable delivery token." };
  }
}
