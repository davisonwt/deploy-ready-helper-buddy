import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Database, Cookie, Mail, FileText } from "lucide-react";

export default function TrustPage() {
  return (
    <main className="container mx-auto max-w-3xl py-10 px-4">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Trust, Security & Privacy</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          This page is maintained by the Sow2Grow team to answer common security and privacy
          questions about Sow2Grow. It is app-owned editable content — not an independent
          certification or audit, and not "verified by Lovable".
        </p>
      </header>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-5 w-5" /> Authentication & access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Accounts are protected by email + password sign-in. After signup, members complete
              a security-questions step so they can recover access. Role-based controls (member,
              ambassador, admin) gate sensitive areas.
            </p>
            <p>
              Row-level security policies in our database restrict each member to data they own
              or have explicit permission to view.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5" /> Hosting & subprocessors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Sow2Grow runs on Lovable's hosting platform, with database, authentication, file
              storage and serverless functions provided by Supabase. Payment settlement is
              handled through NOWPayments (crypto) and PayPal, configured by the app owner.
            </p>
            <p>
              These platform features are provided by third parties under their own terms — the
              app owner is responsible for configuration, data handling, and the practices
              described on this page.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" /> Data we collect & how we use it
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              We collect what's needed to run the marketplace and community: account profile,
              content you publish (seeds, products, posts, messages), interactions, and
              transaction records for bestowals and orders.
            </p>
            <p>
              Sensitive credentials (payment-processor API keys, live-stream ingest keys) are
              stored server-side and are never returned to the browser.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Cookie className="h-5 w-5" /> Cookies & analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              We use cookies and local storage to keep you signed in and remember your
              preferences. Aggregated, in-house analytics help us understand usage; we do not
              sell personal data.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5" /> Security & privacy contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              To report a security issue, request data deletion, or ask a privacy question,
              please contact the Sow2Grow team through the in-app Communications Hub.
            </p>
            <p className="text-xs">
              The app owner may replace this paragraph with a dedicated security contact email
              when one is published.
            </p>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Last updated: {new Date().toISOString().slice(0, 10)}. This page describes current
          practices and is not a legal contract or certification. Contact the team for any
          specific compliance questions.
        </p>
      </div>
    </main>
  );
}
