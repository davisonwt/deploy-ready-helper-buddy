import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Copy, Download, Share2, Edit3 } from 'lucide-react';
import { useAIAssistant } from '@/hooks/useAIAssistant';
import { toast } from '@/hooks/use-toast';

export const GenerateScriptForm = () => {
  const [formData, setFormData] = useState({
    productDescription: '',
    targetAudience: '',
    videoLength: 45,
    style: 'informative',
    customPrompt: ''
  });
  
  const [result, setResult] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedScript, setEditedScript] = useState('');
  
  const { generateScript, isGenerating } = useAIAssistant();

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
      const response = await generateScript(formData);
      setResult(response);
      setEditedScript(response.script);
      setIsEditing(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleCopy = async () => {
    const textToCopy = isEditing ? editedScript : result?.script;
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast({
        title: "Copied!",
        description: "Script copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Please copy the text manually.",
        variant: "destructive",
      });
    }
  };

  const handleSaveEdit = () => {
    setResult({ ...result, script: editedScript });
    setIsEditing(false);
    toast({
      title: "Script Updated",
      description: "Your edits have been saved.",
    });
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
                placeholder="e.g., Fresh organic tomatoes from our family farm"
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
                placeholder="e.g., Health-conscious families"
                value={formData.targetAudience}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="length">Video Length (seconds)</Label>
              <Select
                value={formData.videoLength.toString()}
                onValueChange={(value) => setFormData({ ...formData, videoLength: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="45">45 seconds</SelectItem>
                  <SelectItem value="60">60 seconds</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="style">Style</Label>
              <Select
                value={formData.style}
                onValueChange={(value) => setFormData({ ...formData, style: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fun">Fun & Energetic</SelectItem>
                  <SelectItem value="informative">Informative</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="personal">Personal & Authentic</SelectItem>
                  <SelectItem value="promotional">Promotional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="custom">Custom Instructions (Optional)</Label>
          <Textarea
            id="custom"
            placeholder="Any specific requirements or style preferences..."
            value={formData.customPrompt}
            onChange={(e) => setFormData({ ...formData, customPrompt: e.target.value })}
            rows={2}
          />
        </div>

        <Button type="submit" disabled={isGenerating} className="w-full">
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Script...
            </>
          ) : (
            'Generate Video Script'
          )}
        </Button>
      </form>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Your Generated Script
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit3 className="w-4 h-4 mr-1" />
                  {isEditing ? 'Cancel' : 'Edit'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <Textarea
                  value={editedScript}
                  onChange={(e) => setEditedScript(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                />
                <div className="flex gap-2">
                  <Button onClick={handleSaveEdit}>Save Changes</Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
                  {result.script}
                </pre>
                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-1" />
                    Export to Video
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share2 className="w-4 h-4 mr-1" />
                    Share Script
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};