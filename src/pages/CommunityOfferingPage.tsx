import { useNavigate } from 'react-router-dom';
import { CommunityOfferingGenerator } from '@/components/ai/CommunityOfferingGenerator';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles } from 'lucide-react';

export default function CommunityOfferingPage() {
  const navigate = useNavigate();

  const handleUseContent = (generatedContent: any) => {
    // Store the generated content in session storage
    sessionStorage.setItem('generated_offering', JSON.stringify(generatedContent));
    // Navigate to create orchard page
    navigate('/create-orchard?from_ai=true');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Sparkles className="h-12 w-12 text-primary" />
              <h1 className="text-4xl md:text-5xl font-bold">
                <span className="text-green-600">Community</span>{" "}
                <span className="text-blue-600">Offering</span>{" "}
                <span className="text-purple-600">Generator</span>
              </h1>
            </div>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Transform your ideas into heartfelt community offerings that inspire genuine support and connection
            </p>
            
            <div className="bg-primary/10 border-2 border-primary/30 rounded-lg p-4 max-w-2xl mx-auto">
              <p className="text-sm text-foreground">
                <strong>Remember:</strong> We don't "sell" in Sow2Grow - we share our stories and invite our community 
                to bestow support. This tool helps you express your offering in a way that strengthens community bonds.
              </p>
            </div>
          </div>
        </div>

        {/* Generator Component */}
        <CommunityOfferingGenerator onUseGeneration={handleUseContent} />

        {/* Help Section */}
        <div className="mt-8 p-6 bg-white/80 rounded-lg border">
          <h3 className="font-semibold text-lg mb-3">Tips for Best Results:</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• <strong>Be authentic:</strong> Share your real story - why this matters to you personally</li>
            <li>• <strong>Focus on connection:</strong> Explain how your offering helps the community</li>
            <li>• <strong>Dream big:</strong> Share what achieving this goal means for your journey</li>
            <li>• <strong>Be specific:</strong> Details make your story relatable and memorable</li>
            <li>• <strong>Think long-term:</strong> How does this fit into your larger vision?</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
