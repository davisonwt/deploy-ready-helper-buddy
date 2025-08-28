import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export const useAIAssistant = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [usage, setUsage] = useState(0);
  const [limit, setLimit] = useState(10);
  const { session } = useAuth();

  const callAIFunction = useCallback(async (functionName, payload) => {
    console.log('🔧 callAIFunction started:', { functionName, hasSession: !!session, hasAccessToken: !!session?.access_token });
    
    if (!session?.access_token) {
      console.error('❌ No session or access token found');
      throw new Error('Authentication required');
    }

    console.log('📡 Invoking function:', functionName, 'with payload:', payload);
    
    try {
      const response = await supabase.functions.invoke(functionName, {
        body: payload,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('📥 Function response:', { 
        error: response.error, 
        hasData: !!response.data,
        statusText: response.statusText,
        status: response.status 
      });

      if (response.error) {
        console.error('❌ Function error:', response.error);
        throw new Error(response.error.message || 'AI generation failed');
      }

      return response.data;
    } catch (error) {
      console.error('❌ Function invocation failed:', error);
      throw error;
    }
  }, [session]);

  const generateScript = useCallback(async (params) => {
    setIsGenerating(true);
    try {
      const result = await callAIFunction('generate-script', params);
      
      if (result.usage !== undefined) {
        setUsage(result.usage);
        setLimit(result.limit);
      }

      toast({
        title: "Script Generated! 🎬",
        description: "Your video script is ready. Edit and use it for your next video!",
      });

      return result;
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [callAIFunction]);

  const generateMarketingTips = useCallback(async (params) => {
    setIsGenerating(true);
    try {
      const result = await callAIFunction('generate-marketing-tips', params);
      
      if (result.usage !== undefined) {
        setUsage(result.usage);
        setLimit(result.limit);
      }

      toast({
        title: "Marketing Tips Ready! 📈",
        description: "Actionable marketing strategies have been generated for you!",
      });

      return result;
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [callAIFunction]);

  const generateThumbnail = useCallback(async (params) => {
    setIsGenerating(true);
    try {
      const result = await callAIFunction('generate-thumbnail', params);
      
      if (result.requiresConfirmation) {
        return result;
      }
      
      if (result.usage !== undefined) {
        setUsage(result.usage);
        setLimit(result.limit);
      }

      toast({
        title: "Thumbnail Created! 🖼️",
        description: "Your eye-catching thumbnail is ready to download!",
      });

      return result;
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [callAIFunction]);

  const generateContentIdeas = useCallback(async (params) => {
    setIsGenerating(true);
    try {
      const result = await callAIFunction('generate-content-ideas', params);
      
      if (result.usage !== undefined) {
        setUsage(result.usage);
        setLimit(result.limit);
      }

      toast({
        title: "Content Ideas Generated! 💡",
        description: "Fresh creative ideas are ready to inspire your next content!",
      });

      return result;
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [callAIFunction]);

  const getMyCreations = useCallback(async (contentType) => {
    try {
      let query = supabase
        .from('ai_creations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (contentType && contentType !== 'all') {
        query = query.eq('content_type', contentType);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      toast({
        title: "Failed to load creations",
        description: error.message,
        variant: "destructive",
      });
      return [];
    }
  }, []);

  const deleteCreation = useCallback(async (id) => {
    try {
      const { error } = await supabase
        .from('ai_creations')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      toast({
        title: "Creation Deleted",
        description: "The AI creation has been removed from your library.",
      });

      return true;
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  }, []);

  const toggleFavorite = useCallback(async (id, currentState) => {
    try {
      const { error } = await supabase
        .from('ai_creations')
        .update({ is_favorited: !currentState })
        .eq('id', id);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  }, []);

  const getCurrentUsage = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_ai_usage_today');
      
      if (error) {
        throw error;
      }

      setUsage(data || 0);
      return data || 0;
    } catch (error) {
      console.error('Failed to get usage:', error);
      return 0;
    }
  }, []);

  return {
    isGenerating,
    usage,
    limit,
    generateScript,
    generateMarketingTips,
    generateThumbnail,
    generateContentIdeas,
    getMyCreations,
    deleteCreation,
    toggleFavorite,
    getCurrentUsage,
  };
};