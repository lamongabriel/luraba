import { Suspense } from "react";
import { OAuthConsent } from "@/components/oauth/oauth-consent";

export default function OAuthConsentPage() {
  return (
    <Suspense fallback={null}>
      <OAuthConsent />
    </Suspense>
  );
}
