import { useState, useEffect } from 'react';
import { removeBackground, loadImageFromUrl } from '@/utils/backgroundRemoval';
import { Button } from '@/components/ui/button';

interface LogoProcessorProps {
  onProcessedLogo: (logoUrl: string) => void;
}

export function LogoProcessor({ onProcessedLogo }: LogoProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processLogo = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Load the current logo
      const img = await loadImageFromUrl('/lovable-uploads/87465dc5-ad33-4bb5-8eac-1f34ac94a2bb.png');
      
      // Remove background
      const processedBlob = await removeBackground(img);
      
      // Create a URL for the processed image
      const processedUrl = URL.createObjectURL(processedBlob);
      
      // Create a download link and trigger download
      const a = document.createElement('a');
      a.href = processedUrl;
      a.download = 'logo-transparent.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Also provide the URL for immediate use
      onProcessedLogo(processedUrl);
      
    } catch (err) {
      console.error('Error processing logo:', err);
      setError('Failed to process logo. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white">
      <h3 className="text-lg font-semibold mb-2">Logo Background Removal</h3>
      <p className="text-sm text-gray-600 mb-4">
        Click the button below to remove the black background from your logo and make it transparent.
      </p>
      
      <Button 
        onClick={processLogo} 
        disabled={isProcessing}
        className="w-full"
      >
        {isProcessing ? 'Processing Logo...' : 'Remove Background'}
      </Button>
      
      {error && (
        <p className="text-red-600 text-sm mt-2">{error}</p>
      )}
      
      {isProcessing && (
        <p className="text-blue-600 text-sm mt-2">
          This may take a few moments. The processed logo will be downloaded automatically.
        </p>
      )}
    </div>
  );
}