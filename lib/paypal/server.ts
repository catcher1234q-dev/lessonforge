type PayPalAccessTokenResponse = {
  access_token?: string;
  expires_in?: number;
};

type PayPalLink = {
  href?: string;
  rel?: string;
};

type PayPalCreateOrderResponse = {
  id?: string;
  status?: string;
  links?: PayPalLink[];
};

type PayPalCaptureResponse = {
  id?: string;
  status?: string;
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{
        id?: string;
        status?: string;
      }>;
    };
  }>;
};

const PAYPAL_SANDBOX_API_BASE_URL = "https://api-m.sandbox.paypal.com";
const PAYPAL_LIVE_API_BASE_URL = "https://api-m.paypal.com";

function getPayPalClientId() {
  return process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";
}

function getPayPalClientSecret() {
  return process.env.PAYPAL_CLIENT_SECRET || process.env.PAYPAL_SECRET || "";
}

function getPayPalApiBaseUrl() {
  if (process.env.PAYPAL_API_BASE_URL) {
    return process.env.PAYPAL_API_BASE_URL;
  }

  return process.env.PAYPAL_ENV === "live"
    ? PAYPAL_LIVE_API_BASE_URL
    : PAYPAL_SANDBOX_API_BASE_URL;
}

export function isPayPalCheckoutConfigured() {
  return Boolean(getPayPalClientId() && getPayPalClientSecret());
}

async function getPayPalAccessToken() {
  const clientId = getPayPalClientId();
  const clientSecret = getPayPalClientSecret();

  if (!clientId || !clientSecret) {
    throw new Error("PayPal checkout is not configured yet.");
  }

  const response = await fetch(`${getPayPalApiBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as PayPalAccessTokenResponse;

  if (!response.ok || !payload.access_token) {
    throw new Error("PayPal checkout could not authenticate.");
  }

  return payload.access_token;
}

export async function createPayPalOrder(input: {
  amountCents: number;
  productId: string;
  productTitle: string;
  sellerId?: string | null;
  returnUrl: string;
  cancelUrl: string;
}) {
  const accessToken = await getPayPalAccessToken();
  const amount = (input.amountCents / 100).toFixed(2);

  const response = await fetch(`${getPayPalApiBaseUrl()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.productId,
          description: input.productTitle.slice(0, 127),
          amount: {
            currency_code: "USD",
            value: amount,
          },
          custom_id: input.productId,
          invoice_id: `${input.productId}-${Date.now()}`.slice(0, 127),
        },
      ],
      application_context: {
        brand_name: "LessonForgeHub",
        landing_page: "LOGIN",
        user_action: "PAY_NOW",
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
      },
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as PayPalCreateOrderResponse;

  if (!response.ok || !payload.id) {
    throw new Error("Unable to create PayPal checkout.");
  }

  const approvalUrl = payload.links?.find((link) => link.rel === "approve")?.href;

  if (!approvalUrl) {
    throw new Error("PayPal did not return an approval link.");
  }

  return {
    id: payload.id,
    approvalUrl,
  };
}

export async function capturePayPalOrder(orderId: string) {
  const accessToken = await getPayPalAccessToken();
  const response = await fetch(
    `${getPayPalApiBaseUrl()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      cache: "no-store",
    },
  );

  const payload = (await response.json().catch(() => ({}))) as PayPalCaptureResponse;

  if (!response.ok || payload.status !== "COMPLETED") {
    throw new Error("PayPal checkout was not completed.");
  }

  const capture = payload.purchase_units
    ?.flatMap((unit) => unit.payments?.captures ?? [])
    .find((entry) => Boolean(entry.id));

  return {
    orderId: payload.id ?? orderId,
    captureId: capture?.id ?? orderId,
    status: payload.status,
  };
}
