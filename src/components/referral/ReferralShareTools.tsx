import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Share2, MessageCircle, Mail } from 'lucide-react';
import QRCode from 'qrcode';

interface ReferralShareToolsProps {
  referralLink: string;
  referralCode: string;
  theme: any;
}

export function ReferralShareTools({ referralLink, referralCode, theme }: ReferralShareToolsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrGenerated, setQrGenerated] = useState(false);

  useEffect(() => {
    if (referralLink && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, referralLink, {
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      }).then(() => setQrGenerated(true));
    }
  }, [referralLink]);

  const downloadQR = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `s2g-referral-${referralCode}.png`;
    a.click();
  };

  const shareWhatsApp = () => {
    const text = `Join me on sow2grow! 🌱 Use my referral link: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareEmail = () => {
    const subject = 'Join sow2grow - Community Farm';
    const body = `Hey!\n\nI'd love for you to join the sow2grow community farm. Use my referral link to sign up:\n\n${referralLink}\n\nSee you there! 🌱`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const shareNative = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Join sow2grow',
        text: 'Join the sow2grow community farm!',
        url: referralLink,
      });
    }
  };

  return (
    <Card className="border shadow-lg" style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2" style={{ color: theme.textPrimary }}>
          <Share2 className="h-5 w-5" style={{ color: theme.accent }} />
          Send a Ripple
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* QR Code */}
        <div className="flex flex-col items-center gap-3">
          <div className="bg-white p-3 rounded-xl shadow-md">
            <canvas ref={canvasRef} />
          </div>
          {qrGenerated && (
            <Button onClick={downloadQR} size="sm" variant="outline" style={{ color: theme.textPrimary, borderColor: theme.cardBorder }}>
              <Download className="h-4 w-4 mr-1" /> Download QR
            </Button>
          )}
        </div>

        {/* Share Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Button onClick={shareWhatsApp} className="w-full" style={{ background: '#25D366', color: '#fff' }}>
            <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
          </Button>
          <Button onClick={shareEmail} className="w-full" style={{ background: theme.primaryButton, color: theme.textPrimary }}>
            <Mail className="h-4 w-4 mr-1" /> Email
          </Button>
          {'share' in navigator && (
            <Button onClick={shareNative} className="w-full" style={{ background: theme.secondaryButton, color: theme.textPrimary, border: `1px solid ${theme.cardBorder}` }}>
              <Share2 className="h-4 w-4 mr-1" /> Share
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
