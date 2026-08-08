import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "react-i18next";

/**
 * Landing page for the email-confirmation link.
 *
 * On native this URL arrives as a Universal / App Link, so the user ends up
 * back inside the app — where plan selection goes through the App Store /
 * Google Play instead of the Stripe web checkout.
 */
const AuthConfirmedPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (loading) return;
    navigate(user ? "/dashboard" : "/auth", { replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-sm text-muted-foreground animate-pulse">{t("common.loading")}</p>
    </div>
  );
};

export default AuthConfirmedPage;
