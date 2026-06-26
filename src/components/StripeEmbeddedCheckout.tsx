import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";
import { isNative } from "@/lib/revenuecat";

interface Props {
  priceId: string;
  returnUrl: string;
}

export function StripeEmbeddedCheckout({ priceId, returnUrl }: Props) {
  const fetchClientSecret = useCallback(async (): Promise<string> => {
    if (isNative()) throw new Error("Native app purchases must use the App Store or Google Play.");
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { priceId, returnUrl, environment: getStripeEnvironment() },
    });
    if (error || !data?.clientSecret) throw new Error(error?.message || data?.error || "Failed to create checkout session");
    return data.clientSecret;
  }, [priceId, returnUrl]);

  if (isNative()) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        Native app purchases must use the App Store or Google Play. Close this screen and choose the plan again.
      </div>
    );
  }

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}

export function PaymentTestModeBanner() {
  if (isNative()) return null;
  const token = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;
  if (!token?.startsWith("pk_test_")) return null;
  return (
    <div className="w-full bg-warning/15 text-warning-foreground border-b border-warning/20 px-4 py-2 text-center text-xs">
      Payments are in test mode. Use card 4242 4242 4242 4242 to try.
    </div>
  );
}
