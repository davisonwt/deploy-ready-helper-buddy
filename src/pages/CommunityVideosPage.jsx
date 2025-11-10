import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Video, Upload, TrendingUp, Users, Play, Sparkles, Lightbulb } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { QuickAIHelper } from '@/components/ai/QuickAIHelper'
import VideoFeed from '@/components/community/VideoFeed.jsx'
import VideoUploadModal from '@/components/community/VideoUploadModal.jsx'

export default function CommunityVideosPage() {
  const [showUploadModal, setShowUploadModal] = useState(false)
  const { user } = useAuth()

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: '#001f3f' }}>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background/50 border-b backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-900" style={{textShadow: '2px 2px 0 white, -2px -2px 0 white, 2px -2px 0 white, -2px 2px 0 white'}}>
                <Video className="h-8 w-8 text-primary" style={{filter: 'drop-shadow(1px 1px 0 white) drop-shadow(-1px -1px 0 white) drop-shadow(1px -1px 0 white) drop-shadow(-1px 1px 0 white)'}} />
                Community Videos
              </h1>
              <p className="text-lg text-slate-800 font-medium" style={{textShadow: '1px 1px 0 white, -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white'}}>
                Share your marketing insights and discover what's working for other sowers
              </p>
            </div>
            
            {user && (
              <Button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 text-slate-800 hover:text-slate-900"
                style={{
                  backgroundColor: '#ff9f9b',
                  borderColor: '#ff9f9b'
                }}
                size="lg"
              >
                <Upload className="h-5 w-5" />
                Upload Video
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Play className="h-4 w-4 text-primary" />
                Total Videos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Coming Soon</div>
              <p className="text-xs text-muted-foreground">
                Approved community content
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Active Creators
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Growing</div>
              <p className="text-xs text-muted-foreground">
                Sowers sharing knowledge
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Trending Now
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Marketing Tips</div>
              <p className="text-xs text-muted-foreground">
                Most popular category
              </p>
            </CardContent>
          </Card>
        </div>

        {/* AI Assistance Section */}
        {user && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <QuickAIHelper
              type="video-script"
              compact={false}
              placeholder="Describe the marketing video you want to create (e.g., 'promoting organic vegetables at farmers market')"
              suggestions={[
                "promoting fresh farm eggs",
                "showcasing sustainable farming practices", 
                "introducing our family farm business"
              ]}
            />
            <QuickAIHelper
              type="video-ideas"
              compact={false}
              placeholder="What agricultural product or service do you want video ideas for?"
              suggestions={[
                "seasonal vegetable marketing",
                "farm-to-table storytelling",
                "community-supported agriculture"
              ]}
            />
          </div>
        )}

        {/* Marketing Tips Card */}
        <Card className="mb-8 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Marketing Assistant Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-start gap-4">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-4">
                  Need help creating compelling video content? Our AI assistant can help you generate scripts, marketing tips, content ideas, and thumbnails to grow your 364yhvh community - sow2grow business and reach more customers.
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded">🎬 Video Scripts</span>
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded">📈 Marketing Tips</span>
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded">💡 Content Ideas</span>
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded">🖼️ Thumbnails</span>
                </div>
              </div>
              <Button asChild className="flex items-center gap-2">
                <a href="/ai-assistant">
                  <Lightbulb className="h-4 w-4" />
                  Open AI Assistant
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Guidelines */}
        {!user && (
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Video className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-2">Join the Community</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Log in to upload your own marketing videos (30 sec - 1 min) and engage with other sowers' content.
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="bg-background px-2 py-1 rounded">✓ Video reviews</span>
                    <span className="bg-background px-2 py-1 rounded">✓ Marketing tips</span>
                    <span className="bg-background px-2 py-1 rounded">✓ Success stories</span>
                    <span className="bg-background px-2 py-1 rounded">✓ Quick tutorials</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

          {/* Video Feed */}
          <VideoFeed />
        </div>
      </div>

      {/* Upload Modal */}
      <VideoUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
      />
    </div>
  )
}