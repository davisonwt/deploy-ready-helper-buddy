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
            Bestowals are processed by PayPal or directly on-chain in USDC (Solana), depending on
            the option you choose at checkout. <strong>Your funds stay in your own wallet.</strong>{' '}
            Sow2Grow holds only sale proceeds awaiting payout (paid out automatically once your
            owed balance reaches $20, or on request for any amount $1 or more if you're paid in
            USDC) and orchard funds under the orchard rules. Sower and whisperer payouts are sent
            to the PayPal account or Solana wallet you connect yourself. You're responsible for any
            fee your payment processor, wallet, or bank charges on your end.
          </p>

          <h2 className="text-lg font-semibold">Acceptable use</h2>
          <p>
            Don't use the platform to upload content you don't have the rights to, to defraud
            another user, or to violate any applicable law. We may suspend or remove an account
            that does.
          </p>

          <h2 className="text-lg font-semibold">No nudity or sexual content</h2>
          <p>
            Sow2Grow does not allow nudity, sexual activity, or sexual content anywhere on the
            platform -- photos, videos, voice/video notes, profiles, and Wandering Hearts included.
            Uploads are scanned automatically, and any member can report content they see. Violating
            this rule removes your account; content involving a minor is escalated immediately and
            may be reported to the relevant authorities.
          </p>

          <h2 className="text-lg font-semibold">Automated content review</h2>
          <p>
            Sow2Grow uses automated systems to scan for harassment, scams, phishing, and other
            content that breaks these terms -- across chat messages, listing descriptions, profile
            bios, and orchard descriptions. A human doesn't read ordinary conversations; the system
            only raises what it flags for a moderator (a "gosat") to review. Certain content -- a
            wallet address in a message, or a request for your password, seed phrase, or a
            verification code -- is blocked automatically before it's sent, since those are the most
            common way marketplace members get robbed or have an account taken over.
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
