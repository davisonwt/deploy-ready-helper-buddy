import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Copy, Lightbulb, Plus } from 'lucide-react';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { toast } from '@/hooks/use-toast';

export const GenerateContentIdeasForm = () => {
  const [formData, setFormData] = useState({
    productDescription: '',
    targetAudience: '',
    contentType: 'mixed',
    customPrompt: ''
  });
  
  const [result, setResult] = useState(null);
  const { generateContentIdeas, isGenerating } = useAIAssistant();

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
      const response = await generateContentIdeas(formData);
      setResult(response);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result?.ideas);
      toast({
        title: "Copied!",
        description: "Content ideas copied to clipboard.",
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
                placeholder="e.g., Organic vegetable garden boxes delivered weekly"
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
                placeholder="e.g., Busy professionals who want to eat healthy"
                value={formData.targetAudience}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="content-type">Content Type Focus</Label>
              <Select
                value={formData.contentType}
                onValueChange={(value) => setFormData({ ...formData, contentType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mixed">Mixed Content</SelectItem>
                  <SelectItem value="video">Videos & Reels</SelectItem>
                  <SelectItem value="social">Social Media Posts</SelectItem>
                  <SelectItem value="stories">Stories & Highlights</SelectItem>
                  <SelectItem value="educational">Educational Content</SelectItem>
                  <SelectItem value="seasonal">Seasonal Content</SelectItem>
                  <SelectItem value="behind-scenes">Behind the Scenes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom">Specific Themes or Goals (Optional)</Label>
              <Textarea
                id="custom"
                placeholder="e.g., Focus on sustainability, include customer testimonials..."
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
              Generating Ideas...
            </>
          ) : (
            'Generate Content Ideas'
          )}
        </Button>
      </form>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Your Content Ideas
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
                  {result.ideas}
                </div>
              </div>
              
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add to Content Calendar
                </Button>
                <Button variant="outline" size="sm">
                  <Lightbulb className="w-4 h-4 mr-1" />
                  Generate More Variations
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};