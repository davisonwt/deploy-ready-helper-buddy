import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb } from 'lucide-react';

const templates = {
  script: [
    {
      title: "Fresh Produce Sales",
      description: "Farm-fresh vegetables, local families, energetic style",
      example: "Show vibrant vegetables → 'These tomatoes were picked this morning!' → Show happy family cooking → 'Farm-to-table freshness your family deserves.'"
    },
    {
      title: "Artisan Products",
      description: "Handmade soaps, eco-conscious consumers, authentic style",
      example: "Close-up of soap making → 'Each bar is crafted with love' → Show natural ingredients → 'Pure, natural skincare for your family.'"
    }
  ],
  tips: [
    {
      title: "Social Media Growth",
      description: "Post consistently, use local hashtags, engage with community",
      example: "• Post daily at 7 AM and 5 PM\n• Use #LocalFarm #FreshProduce\n• Reply to every comment within 2 hours"
    }
  ],
  thumbnail: [
    {
      title: "Product Showcase",
      description: "Bright colors, clear product focus, 16:9 ratio",
      example: "Vibrant vegetables arranged on rustic wooden table with natural lighting"
    }
  ]
};

export const ExampleTemplates = ({ type }) => {
  const examples = templates[type] || [];

  if (examples.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5" />
          Example Templates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {examples.map((template, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium">{template.title}</h4>
                <Badge variant="outline">Template</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
              <div className="bg-muted p-3 rounded text-xs">
                {template.example}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};