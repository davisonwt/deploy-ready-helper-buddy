import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  HelpCircle, 
  Search, 
  MessageSquare, 
  Book, 
  Video,
  ExternalLink,
  Send
} from 'lucide-react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { toast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { useMutation } from '@tanstack/react-query';

const docs = [
  {
    id: 1,
    title: 'Getting Started with Orchards',
    content: 'Learn how to create your first orchard and plant seeds in the community.',
    category: 'basics',
    keywords: ['orchard', 'create', 'plant', 'seed', 'getting started'],
  },
  {
    id: 2,
    title: 'Understanding Tithing',
    content: 'Learn about tithing, how it works, and how to contribute to the community.',
    category: 'payments',
    keywords: ['tithing', 'payment', 'usdc', 'contribute', 'support'],
  },
  {
    id: 3,
    title: 'Community Guidelines',
    content: 'Guidelines for respectful participation in the Sow2Grow community.',
    category: 'community',
    keywords: ['community', 'guidelines', 'rules', 'behavior'],
  },
  {
    id: 4,
    title: 'Profile & Settings',
    content: 'How to manage your profile, update settings, and customize your experience.',
    category: 'account',
    keywords: ['profile', 'settings', 'account', 'preferences'],
  },
  {
    id: 5,
    title: 'Video & Media Upload',
    content: 'Learn how to upload videos, images, and other media to your orchards.',
    category: 'media',
    keywords: ['video', 'upload', 'media', 'images', 'content'],
  },
];

const faqs = [
  {
    question: 'How do I create my first orchard?',
    answer: 'Navigate to the "Create Orchard" page, fill in the required details including title, description, and initial seed amount, then click "Plant Seed".',
  },
  {
    question: 'What is tithing and how does it work?',
    answer: 'Tithing is a way to support the community. You can contribute USDC or other supported cryptocurrencies to help maintain and grow the platform.',
  },
  {
    question: 'How do I browse other orchards?',
    answer: 'Use the "Browse Orchards" page to discover orchards created by other community members. You can filter by category, recency, or popularity.',
  },
  {
    question: 'Can I edit my orchard after creating it?',
    answer: 'Yes, you can edit your orchards from the "My Orchards" page. Click the edit button next to any orchard you own.',
  },
];

const HelpModal = () => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [activeTab, setActiveTab] = useState('docs');
  const user = useUser();
  const supabase = useSupabaseClient();

  const filteredDocs = docs.filter(doc => 
    doc.title.toLowerCase().includes(search.toLowerCase()) ||
    doc.content.toLowerCase().includes(search.toLowerCase()) ||
    doc.keywords.some(keyword => keyword.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(search.toLowerCase()) ||
    faq.answer.toLowerCase().includes(search.toLowerCase())
  );

  const submitFeedbackMutation = useMutation({
    mutationFn: async (feedback: string) => {
      if (!user || !feedback.trim()) return;
      
      // Get session for authentication
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      
      if (!session?.access_token) {
        throw new Error('You must be logged in to submit feedback');
      }
      
      // Call edge function to handle feedback forwarding to gosats
      const { data, error } = await supabase.functions.invoke('submit-feedback', {
        body: {
          feedback: feedback.trim(),
          user_id: user.id,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }
      
      if (data?.error) {
        throw new Error(data.error);
      }
    },
    onSuccess: () => {
      setFeedback('');
      toast({
        title: 'Feedback sent!',
        description: 'Thank you for your feedback! You will receive a confirmation message from our team shortly.',
      });
    },
    onError: (error: any) => {
      console.error('Feedback submission error:', error);
      toast({
        title: 'Error sending feedback',
        description: error?.message || 'Please try again later or contact support.',
        variant: 'destructive',
      });
    },
  });

  const handleFeedbackSubmit = () => {
    if (feedback.trim()) {
      submitFeedbackMutation.mutate(feedback);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      basics: 'bg-green-100 text-green-800',
      payments: 'bg-blue-100 text-blue-800',
      community: 'bg-purple-100 text-purple-800',
      account: 'bg-orange-100 text-orange-800',
      media: 'bg-pink-100 text-pink-800',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="default" 
          size="icon"
          className="fixed top-20 right-20 z-50 shadow-lg hover:shadow-xl transition-shadow bg-blue-600 hover:bg-blue-700 text-white"
          aria-label="Help & Documentation"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Book className="h-5 w-5" />
            Help & Documentation
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="docs" className="flex items-center gap-2">
                <Book className="h-4 w-4" />
                Documentation
              </TabsTrigger>
              <TabsTrigger value="faqs" className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                FAQs
              </TabsTrigger>
              <TabsTrigger value="feedback" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Feedback
              </TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-hidden mt-4">
              <TabsContent value="docs" className="h-full flex flex-col mt-0">
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search documentation..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-4">
                  {filteredDocs.map((doc) => (
                    <div key={doc.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-lg">{doc.title}</h3>
                        <Badge className={getCategoryColor(doc.category)}>
                          {doc.category}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mb-3">{doc.content}</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex items-center gap-2"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Expand to show full content or navigate to detailed page
                          toast({
                            title: doc.title,
                            description: `Full documentation for "${doc.title}" is coming soon. For now, you can contact support for detailed information.`,
                          });
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Read More
                      </Button>
                    </div>
                  ))}
                  
                  {filteredDocs.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Book className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No documentation found for "{search}"</p>
                      <p className="text-sm mt-2">Try different keywords or browse all docs</p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="faqs" className="h-full flex flex-col mt-0">
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search FAQs..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-4">
                  {filteredFaqs.map((faq, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2 text-primary">{faq.question}</h3>
                      <p className="text-muted-foreground">{faq.answer}</p>
                    </div>
                  ))}
                  
                  {filteredFaqs.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No FAQs found for "{search}"</p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="feedback" className="h-full flex flex-col mt-0">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Send Feedback</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Help us improve by sharing your thoughts, suggestions, or reporting issues.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Share your feedback, suggestions, or report an issue..."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="min-h-[120px]"
                    />
                    
                    <Button 
                      onClick={handleFeedbackSubmit}
                      disabled={!feedback.trim() || submitFeedbackMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      {submitFeedbackMutation.isPending ? 'Sending...' : 'Send Feedback'}
                    </Button>
                  </div>
                  
                  <div className="mt-8 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Other Ways to Get Help</h4>
                    <div className="space-y-2 text-sm">
                      <p>• Join our community Discord for real-time support</p>
                      <p>• Check out our video tutorials on YouTube</p>
                      <p>• Email us directly at support@sow2grow.com</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HelpModal;