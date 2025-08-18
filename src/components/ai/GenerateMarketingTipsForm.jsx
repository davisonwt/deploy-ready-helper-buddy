import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Copy, BookOpen, TrendingUp } from 'lucide-react';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { toast } from '@/hooks/use-toast';

export const GenerateMarketingTipsForm = () => {
  const [formData, setFormData] = useState({
    productDescription: '',
    targetAudience: '',
    platform: 'all',
    customPrompt: ''
  });
  
  const [result, setResult] = useState(null);
  const { generateMarketingTips, isGenerating } = useAIAssistant();

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
      const response = await generateMarketingTips(formData);
      setResult(response);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result?.tips);
      toast({
        title: "Copied!",
        description: "Marketing tips copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Please copy the text manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product">Product/Service Description *</Label>
              <Textarea
                id="product"
                placeholder="e.g., Handmade soaps using farm-fresh goat milk"
                value={formData.productDescription}
                onChange={(e) => setFormData({ ...formData, productDescription: e.target.value })}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {formData.productDescription.length}/500 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="audience">Target Audience</Label>
              <Input
                id="audience"
                placeholder="e.g., Eco-conscious consumers"
                value={formData.targetAudience}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platform">Platform Focus</Label>
              <Select
                value={formData.platform}
                onValueChange={(value) => setFormData({ ...formData, platform: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="twitter">Twitter/X</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom">Specific Marketing Goals (Optional)</Label>
              <Textarea
                id="custom"
                placeholder="e.g., Focus on increasing local sales, building brand awareness..."
                value={formData.customPrompt}
                onChange={(e) => setFormData({ ...formData, customPrompt: e.target.value })}
                rows={3}
              />
            </div>
          </div>
        </div>

        <Button type="submit" disabled={isGenerating} className="w-full">
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Tips...
            </>
          ) : (
            'Generate Marketing Tips'
          )}
        </Button>
      </form>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Your Marketing Strategy
              </div>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="w-4 h-4 mr-1" />
                Copy All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
                  {result.tips}
                </div>
              </div>
              
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" size="sm">
                  <BookOpen className="w-4 h-4 mr-1" />
                  Save to Notes
                </Button>
                <Button variant="outline" size="sm">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  Create Action Plan
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};