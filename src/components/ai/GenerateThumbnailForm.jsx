import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Download, Eye, AlertTriangle } from 'lucide-react';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { toast } from '@/hooks/use-toast';

export const GenerateThumbnailForm = () => {
  const [formData, setFormData] = useState({
    productDescription: '',
    style: 'vibrant',
    customPrompt: ''
  });
  
  const [result, setResult] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { generateThumbnail, isGenerating } = useAIAssistant();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.productDescription.trim()) {
      toast({
        title: "Missing Information",
        description: "Please describe your product or service.",
        variant: "destructive",
      });
      return;
    }

    try {
      // First call without confirmation
      const response = await generateThumbnail({ ...formData, confirmed: false });
      
      if (response.requiresConfirmation) {
        setShowConfirmation(true);
        return;
      }
      
      setResult(response);
      setShowConfirmation(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleConfirmedGeneration = async () => {
    try {
      const response = await generateThumbnail({ ...formData, confirmed: true });
      setResult(response);
      setShowConfirmation(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleDownload = async () => {
    if (!result?.imageUrl) return;
    
    try {
      const response = await fetch(result.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `thumbnail-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Downloaded!",
        description: "Thumbnail saved to your downloads.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Please right-click and save the image manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Image generation uses 2 AI credits per thumbnail. You'll be asked to confirm before generating.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product">Product/Service Description *</Label>
              <Textarea
                id="product"
                placeholder="e.g., Fresh strawberries on a rustic wooden table"
                value={formData.productDescription}
                onChange={(e) => setFormData({ ...formData, productDescription: e.target.value })}
                rows={3}
                maxLength={300}
              />
              <p className="text-xs text-muted-foreground">
                {formData.productDescription.length}/300 characters
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="style">Visual Style</Label>
              <Select
                value={formData.style}
                onValueChange={(value) => setFormData({ ...formData, style: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vibrant">Vibrant & Colorful</SelectItem>
                  <SelectItem value="natural">Natural & Organic</SelectItem>
                  <SelectItem value="modern">Modern & Clean</SelectItem>
                  <SelectItem value="rustic">Rustic & Traditional</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="artistic">Artistic & Creative</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="custom">Custom Visual Instructions (Optional)</Label>
          <Textarea
            id="custom"
            placeholder="e.g., Include farm setting, bright lighting, close-up view..."
            value={formData.customPrompt}
            onChange={(e) => setFormData({ ...formData, customPrompt: e.target.value })}
            rows={2}
          />
        </div>

        <Button type="submit" disabled={isGenerating} className="w-full">
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Thumbnail...
            </>
          ) : (
            'Generate Thumbnail'
          )}
        </Button>
      </form>

      {showConfirmation && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="w-5 h-5" />
              Confirm Image Generation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-700 mb-4">
              Generating a thumbnail will use 2 of your daily AI credits. Do you want to proceed?
            </p>
            <div className="flex gap-2">
              <Button onClick={handleConfirmedGeneration} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Yes, Generate Thumbnail'
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowConfirmation(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Your Generated Thumbnail
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative bg-checkered rounded-lg overflow-hidden">
                <img
                  src={result.imageUrl}
                  alt="Generated thumbnail"
                  className="w-full h-auto max-h-96 object-contain"
                />
              </div>
              
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-1" />
                  Preview in Video
                </Button>
                <Button variant="outline" size="sm">
                  Generate Variation
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <style jsx>{`
        .bg-checkered {
          background-image: 
            linear-gradient(45deg, #f3f4f6 25%, transparent 25%), 
            linear-gradient(-45deg, #f3f4f6 25%, transparent 25%), 
            linear-gradient(45deg, transparent 75%, #f3f4f6 75%), 
            linear-gradient(-45deg, transparent 75%, #f3f4f6 75%);
          background-size: 20px 20px;
          background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
        }
      `}</style>
    </div>
  );
};