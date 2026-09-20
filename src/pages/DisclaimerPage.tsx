import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function DisclaimerPage() {
  const navigate = useNavigate();
  return (
    <div className="container max-w-3xl mx-auto py-8 px-4 space-y-6">
      <Button variant="outline" size="sm" onClick={() => navigate('/')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Home
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Disclaimer</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-4 text-sm leading-relaxed">
          <p>
            Sow2Grow provides this platform 'as is' and 'as available'. While Sow2Grow takes all
            reasonable steps to keep the platform free of viruses, spambots and other known malware,
            no online service can be guaranteed secure, and responsibility for detecting and
            preventing harmful software on your own devices lies with you. Sow2Grow does not warrant
            that data transmitted over the platform is free of corruption, interception or tampering.
          </p>

          <p>
            Sow2Grow is a platform only. Sowers, whisperers, bestowers and members offering services
            (including Sleeping Wheels, Sleeping Pillows and Sleeping Hands listings) are independent
            members of the community — they are not employees, agents or representatives of Sow2Grow,
            and Sow2Grow does not endorse, vet or verify any member, product or service. All products
            and services are offered by members to members and are accessed and used at each tribe
            member's sole discretion. Registration is free of cost and obligation.
          </p>

          <p>
            By using the platform, tribe members acknowledge the risks inherent in any online
            ecosystem and agree that, to the fullest extent permitted by applicable law, Sow2Grow
            will not be liable for any loss or damage, however caused, arising from access to or use
            of the platform or from any product or service offered by a member.
          </p>

          <p>
            Content that members upload — their music, books, images, product listings and other
            works — remains the property of those members. The Sow2Grow platform itself, including
            its name, design, software and branding, is the intellectual property of Sow2Grow.
            Unauthorized use, data harvesting, scraping, dissemination or reverse engineering of the
            platform or of other members' content is strictly prohibited.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
