import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const MAX_RECORDING_TIME = 120; // 2 minutes in seconds

export const useVoiceMemo = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const { toast } = useToast();

  const startRecording = useCallback(async (currentTopic = "General discussion") => {
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
      setRecordingTime(0);

      // Add topic context as metadata
      mediaRecorder.addEventListener('start', () => {
        console.log(`Recording started for topic: ${currentTopic}`);
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          if (newTime >= MAX_RECORDING_TIME) {
            // Auto-stop at 2 minutes
            stopRecording();
            toast({
              title: "Recording Stopped",
              description: "Maximum recording time of 2 minutes reached.",
            });
          }
          return newTime;
        });
      }, 1000);

      // Auto-stop timer at 2 minutes
      timerRef.current = setTimeout(() => {
        if (isRecording) {
          stopRecording();
        }
      }, MAX_RECORDING_TIME * 1000);

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
  }, [toast, isRecording]);

  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      // Clear timers
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          
          // Stop all tracks
          if (mediaRecorderRef.current?.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
          }
          
          setIsRecording(false);
          setRecordingTime(0);
          resolve(audioBlob);
        };

        mediaRecorderRef.current.stop();
      } else {
        setRecordingTime(0);
        resolve(null);
      }
    });
  }, [isRecording]);

  const uploadVoiceMemo = useCallback(async (audioBlob, participantId, topic = "General discussion") => {
    if (!audioBlob) return null;

    setIsUploading(true);
    try {
      const fileName = `voice-memo-${participantId}-${Date.now()}.webm`;
      const filePath = `chat-voice-memos/${fileName}`;

      // Create metadata with topic information
      const metadata = {
        topic: topic,
        participantId: participantId,
        recordedAt: new Date().toISOString(),
        duration: recordingTime
      };

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, audioBlob, {
          contentType: 'audio/webm',
          upsert: false,
          metadata: metadata
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);

      // Calculate actual duration from recording time
      const duration = recordingTime;

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
        description: `Your message about "${topic}" has been recorded and saved to your queue position.`,
      });

      return { url: publicUrl, duration, topic };
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
        .from('chat-files')
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

  // Format recording time for display
  const formatRecordingTime = (seconds) => {
    const remainingTime = MAX_RECORDING_TIME - seconds;
    const mins = Math.floor(remainingTime / 60);
    const secs = remainingTime % 60;
    return `${mins}:${secs.toString().padStart(2, '0')} left`;
  };

  return {
    isRecording,
    isUploading,
    recordingTime,
    maxRecordingTime: MAX_RECORDING_TIME,
    formatRecordingTime,
    startRecording,
    stopRecording,
    uploadVoiceMemo,
    deleteVoiceMemo
  };
};