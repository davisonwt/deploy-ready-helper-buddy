import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  const navigate = useNavigate();
  return (
    <div className="container max-w-3xl mx-auto py-8 px-4 space-y-6">
      <Button variant="outline" size="sm" onClick={() => navigate('/')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Home
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Terms of Service</CardTitle>
          <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-4 text-sm leading-relaxed">
          <p>
            These terms govern your use of Sow2Grow. By creating an account or using the platform,
            you agree to them.
          </p>

          <h2 className="text-lg font-semibold">The platform</h2>
          <p>
            Sow2Grow lets sowers offer digital and physical seeds, and lets bestowers support them
            through bestowals. A platform fee (currently 15%) applies to bestowals, added on top of
            the sower's price; payment processors may charge their own separate fee.
          </p>

          <h2 className="text-lg font-semibold">Payments and payouts</h2>
          <p>
            Bestowals are processed by PayPal or NOWPayments, depending on the option you choose at
            checkout. Sower and whisperer payouts are sent via PayPal Payouts to a PayPal account
            you connect yourself, weekly, subject to a minimum payout threshold. You're responsible
            for any fee your payment processor or bank charges on your end.
          </p>

          <h2 className="text-lg font-semibold">Acceptable use</h2>
          <p>
            Don't use the platform to upload content you don't have the rights to, to defraud
            another user, or to violate any applicable law. We may suspend or remove an account
            that does.
          </p>

          <h2 className="text-lg font-semibold">Content</h2>
          <p>
            You retain ownership of what you upload. By offering a seed on the platform, you grant
            Sow2Grow the right to host, display, and deliver it to a bestower who's paid for it.
          </p>

          <h2 className="text-lg font-semibold">No warranty</h2>
          <p>
            The platform is provided as-is. We work to keep it reliable and correct, but we don't
            guarantee uninterrupted availability or that every feature is error-free.
          </p>

          <h2 className="text-lg font-semibold">Changes</h2>
          <p>
            We may update these terms as the platform evolves. Continued use after a change means
            you accept the update.
          </p>

          <h2 className="text-lg font-semibold">Contact</h2>
          <p>
            Questions about these terms: <a href="mailto:support@sow2growapp.com" className="underline">support@sow2growapp.com</a>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
