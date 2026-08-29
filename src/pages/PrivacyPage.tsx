import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  const navigate = useNavigate();
  return (
    <div className="container max-w-3xl mx-auto py-8 px-4 space-y-6">
      <Button variant="outline" size="sm" onClick={() => navigate('/')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Home
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Privacy Policy</CardTitle>
          <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-4 text-sm leading-relaxed">
          <p>
            Sow2Grow ("we," "us," "the platform") connects sowers, whisperers, and bestowers around
            digital and physical seeds, bestowals, and community. This page explains what we collect,
            why, and how it's handled.
          </p>

          <h2 className="text-lg font-semibold">What we collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Account information: name, email, and profile details you provide.</li>
            <li>Payment information: handled by our payment processors (PayPal, NOWPayments) — we
              do not store your card number, bank details, or PayPal password. When you connect a
              PayPal account for payouts, we store the email address and account identifier PayPal
              provides so we know where to send your payout.</li>
            <li>Content you create: seeds, messages, bestowals, and other activity on the platform.</li>
            <li>Usage data: standard technical logs (device, browser, timestamps) used for security
              and reliability.</li>
          </ul>

          <h2 className="text-lg font-semibold">How we use it</h2>
          <p>
            To operate the platform: process bestowals and payouts, deliver purchased content,
            send transactional messages (receipts, payout confirmations), and keep the service
            secure. We do not sell your personal information.
          </p>

          <h2 className="text-lg font-semibold">Third parties</h2>
          <p>
            We share the minimum necessary information with the services that make the platform
            work: PayPal and NOWPayments for payments and payouts, and our email delivery provider
            for transactional email. Each of these has its own privacy policy governing how they
            handle your data.
          </p>

          <h2 className="text-lg font-semibold">Your choices</h2>
          <p>
            You can review and update your profile information, remove a connected payout method,
            and request deletion of your account by contacting us.
          </p>

          <h2 className="text-lg font-semibold">Contact</h2>
          <p>
            Questions about this policy: <a href="mailto:support@sow2growapp.com" className="underline">support@sow2growapp.com</a>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
