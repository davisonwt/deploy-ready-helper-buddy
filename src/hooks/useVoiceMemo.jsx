import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export const useVoiceMemo = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100); // Record in 100ms chunks
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: "Could not start recording. Please check microphone permissions.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          
          // Stop all tracks
          if (mediaRecorderRef.current?.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
          }
          
          setIsRecording(false);
          resolve(audioBlob);
        };

        mediaRecorderRef.current.stop();
      } else {
        resolve(null);
      }
    });
  }, [isRecording]);

  const uploadVoiceMemo = useCallback(async (audioBlob, participantId) => {
    if (!audioBlob) return null;

    setIsUploading(true);
    try {
      const fileName = `voice-memo-${participantId}-${Date.now()}.webm`;
      const filePath = `chat-voice-memos/${fileName}`;

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat_files')
        .upload(filePath, audioBlob, {
          contentType: 'audio/webm',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat_files')
        .getPublicUrl(filePath);

      // Calculate duration (approximate)
      const duration = Math.round(audioBlob.size / 16000); // Rough estimate

      // Update participant record with voice memo
      const { error: updateError } = await supabase
        .from('live_call_participants')
        .update({
          voice_memo_url: publicUrl,
          voice_memo_duration: duration,
          recorded_at: new Date().toISOString()
        })
        .eq('id', participantId);

      if (updateError) throw updateError;

      toast({
        title: "Voice Memo Saved",
        description: "Your message has been recorded and saved to your queue position.",
      });

      return { url: publicUrl, duration };
    } catch (error) {
      console.error('Error uploading voice memo:', error);
      toast({
        title: "Upload Failed",
        description: "Could not save your voice memo. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [toast]);

  const deleteVoiceMemo = useCallback(async (participantId, voiceMemoUrl) => {
    try {
      // Extract file path from URL
      const urlParts = voiceMemoUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `chat-voice-memos/${fileName}`;

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('chat_files')
        .remove([filePath]);

      if (deleteError) throw deleteError;

      // Update participant record
      const { error: updateError } = await supabase
        .from('live_call_participants')
        .update({
          voice_memo_url: null,
          voice_memo_duration: null,
          recorded_at: null
        })
        .eq('id', participantId);

      if (updateError) throw updateError;

      toast({
        title: "Voice Memo Deleted",
        description: "Your recorded message has been removed.",
      });
    } catch (error) {
      console.error('Error deleting voice memo:', error);
      toast({
        title: "Delete Failed",
        description: "Could not delete voice memo. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast]);

  return {
    isRecording,
    isUploading,
    startRecording,
    stopRecording,
    uploadVoiceMemo,
    deleteVoiceMemo
  };
};