import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Hash, Sparkles, TrendingUp, Target, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const SmartHashtagGenerator = ({ productDescription: initialDescription = '' }) => {
  const [productDescription, setProductDescription] = useState(initialDescription);
  const [targetAudience, setTargetAudience] = useState('');
  const [platform, setPlatform] = useState('all');
  const [generating, setGenerating] = useState(false);
  const [hashtags, setHashtags] = useState(null);
  
  const { toast } = useToast();

  const platforms = [
    { value: 'all', label: 'All Platforms', icon: Globe },
    { value: 'sow2grow', label: 'Sow2Grow', icon: Target },
    { value: 'instagram', label: 'Instagram', icon: Hash },
    { value: 'tiktok', label: 'TikTok', icon: TrendingUp },
    { value: 'youtube', label: 'YouTube', icon: Hash },
    { value: 'twitter', label: 'Twitter/X', icon: Hash }
  ];

  const generateHashtags = async () => {
    if (!productDescription.trim()) {
      toast({
        title: "Missing information",
        description: "Please describe your product or service",
        variant: "destructive"
      });
      return;
    }

    setGenerating(true);
    try {
      const platformPrompt = platform === 'all' 
        ? 'Generate hashtags for all major social platforms including Sow2Grow marketplace'
        : `Generate hashtags specifically optimized for ${platform}`;

      const { data, error } = await supabase.functions.invoke('generate-content-ideas', {
        body: {
          productDescription,
          targetAudience: targetAudience || 'potential buyers and marketplace users',
          contentType: 'hashtags-advanced',
          customPrompt: `${platformPrompt}. 

          IMPORTANT: Include these Sow2Grow-specific hashtags in every response:
          #Sow2Grow #BestowersWanted #OrchardLife #SowingSuccess #GrowTogether #MarketplaceMagic #SowerPride #HarvestTogether #BestowWithLove #OrchardCommunity

          For this product/service: "${productDescription}"
          Target audience: "${targetAudience || 'marketplace buyers'}"

          Generate categorized hashtags:
          1. TRENDING (10-15 popular hashtags with high reach)
          2. NICHE (10-15 specific industry/product hashtags)
          3. COMMUNITY (10-15 engagement-focused hashtags)
          4. LOCATION (5-10 if applicable)
          5. SOW2GROW SPECIAL (platform-specific hashtags for our marketplace)

          Format as clean hashtag lists, grouped by category.
          Focus on hashtags that will attract bestowers (buyers) to sowers (sellers).`
        }
      });

      if (error) throw error;

      // Parse the response to extract different categories
      const response = data.ideas;
      const parsedHashtags = parseHashtagResponse(response);
      setHashtags(parsedHashtags);

      toast({
        title: "Hashtags generated!",
        description: "Smart hashtags created for maximum reach"
      });

    } catch (error) {
      console.error('Hashtag generation failed:', error);
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate hashtags",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const parseHashtagResponse = (response) => {
    // Basic parsing - could be enhanced with more sophisticated parsing
    const categories = {
      trending: [],
      niche: [],
      community: [],
      location: [],
      sow2grow: ['#Sow2Grow', '#BestowersWanted', '#OrchardLife', '#SowingSuccess', '#GrowTogether', '#MarketplaceMagic', '#SowerPride', '#HarvestTogether', '#BestowWithLove', '#OrchardCommunity']
    };

    // Extract hashtags from response
    const allHashtags = response.match(/#[\w\d]+/g) || [];
    
    // Distribute hashtags across categories (simplified)
    const uniqueHashtags = [...new Set(allHashtags)];
    
    categories.trending = uniqueHashtags.slice(0, 15);
    categories.niche = uniqueHashtags.slice(15, 30);
    categories.community = uniqueHashtags.slice(30, 45);
    categories.location = uniqueHashtags.slice(45, 55);

    return {
      all: uniqueHashtags,
      categories,
      rawResponse: response
    };
  };

  const copyToClipboard = async (hashtagArray, label) => {
    const text = Array.isArray(hashtagArray) ? hashtagArray.join(' ') : hashtagArray;
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5" />
            Smart Hashtag Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Product Description */}
          <div className="space-y-2">
            <Label htmlFor="hashtag-product">Product/Service Description *</Label>
            <Textarea
              id="hashtag-product"
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder="Describe what you're selling in your orchard. Include key features, benefits, and target market..."
              rows={3}
            />
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <Label htmlFor="hashtag-audience">Target Audience</Label>
            <Input
              id="hashtag-audience"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., Health-conscious families, Local food enthusiasts, Organic produce buyers"
            />
          </div>

          {/* Platform Selection */}
          <div className="space-y-2">
            <Label>Platform Focus</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {platforms.map((p) => {
                const Icon = p.icon;
                return (
                  <Button
                    key={p.value}
                    variant={platform === p.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPlatform(p.value)}
                    className="flex items-center gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {p.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={generateHashtags}
            disabled={!productDescription.trim() || generating}
            className="w-full"
            size="lg"
          >
            {generating ? (
              <>
                <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                Generating Smart Hashtags...
              </>
            ) : (
              <>
                <Hash className="w-4 h-4 mr-2" />
                Generate Platform-Optimized Hashtags
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Hashtags Display */}
      {hashtags && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Sparkles className="w-5 h-5" />
              Generated Hashtags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="categories" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="categories">By Category</TabsTrigger>
                <TabsTrigger value="platform">Platform Specific</TabsTrigger>
              </TabsList>

              <TabsContent value="categories" className="space-y-4">
                {/* Sow2Grow Special */}
                <Card className="bg-green-50 border-green-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-green-800 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        🌱 Sow2Grow Marketplace
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(hashtags.categories.sow2grow, 'Sow2Grow hashtags')}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-1">
                      {hashtags.categories.sow2grow.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="bg-green-100 text-green-800">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Trending */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        🔥 Trending & Popular
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(hashtags.categories.trending, 'Trending hashtags')}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-1">
                      {hashtags.categories.trending.slice(0, 15).map((tag, index) => (
                        <Badge key={index} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Niche */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        🎯 Niche & Specific
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(hashtags.categories.niche, 'Niche hashtags')}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-1">
                      {hashtags.categories.niche.slice(0, 15).map((tag, index) => (
                        <Badge key={index} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Community */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        🤝 Community & Engagement
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(hashtags.categories.community, 'Community hashtags')}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-1">
                      {hashtags.categories.community.slice(0, 15).map((tag, index) => (
                        <Badge key={index} variant="outline" className="bg-purple-50">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="platform" className="space-y-4">
                <div className="grid gap-4">
                  {['Instagram', 'TikTok', 'YouTube', 'Twitter'].map((platform) => (
                    <Card key={platform}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{platform}</h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const platformHashtags = hashtags.all.slice(0, platform === 'Instagram' ? 30 : platform === 'TikTok' ? 20 : 15);
                              copyToClipboard(platformHashtags, `${platform} hashtags`);
                            }}
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-1">
                          {hashtags.all.slice(0, platform === 'Instagram' ? 30 : platform === 'TikTok' ? 20 : 15).map((tag, index) => (
                            <Badge key={index} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            {/* Copy All Button */}
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => copyToClipboard(hashtags.all, 'All hashtags')}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy All Hashtags ({hashtags.all.length} total)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};