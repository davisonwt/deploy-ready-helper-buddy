import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, Volume2, CheckCircle, AlertCircle } from 'lucide-react';

interface DeviceCheckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export const DeviceCheckModal = ({ open, onOpenChange, onComplete }: DeviceCheckModalProps) => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [micLevel, setMicLevel] = useState(0);
  const [isTesting, setIsTesting] = useState(false);
  const [autoplayPassed, setAutoplayPassed] = useState<boolean | null>(null);
  const [micAccessGranted, setMicAccessGranted] = useState<boolean | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  // iOS Safari has strict autoplay and permission UX; offer a one-tap quick join
  const isIOS =
    typeof navigator !== 'undefined' &&
    ((/iP(hone|od|ad)/.test(navigator.userAgent)) ||
      (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1));
  const isMobileSafari =
    isIOS &&
    /Safari/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : '') &&
    !/CriOS|FxiOS|EdgiOS/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : '');

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const testAudioRef = useRef<HTMLAudioElement | null>(null);

// Load available microphones (avoid auto-permission on iOS Safari; use Quick Join)
  useEffect(() => {
    if (open) {
      if (!isMobileSafari || showAdvanced) {
        loadDevices();
      }
    }
    return () => {
      stopMicTest();
    };
  }, [open, isMobileSafari, showAdvanced]);

const loadDevices = async () => {
    try {
      if (isMobileSafari && !showAdvanced) {
        // On mobile Safari we defer permissions to a user-gesture (Quick Join)
        setMicAccessGranted(null);
        setDevices([]);
        return;
      }
      // Request permission first (desktop/advanced)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = deviceList.filter(device => device.kind === 'audioinput');
      setDevices(audioInputs);
      if (audioInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(audioInputs[0].deviceId);
      }
      setMicAccessGranted(true);
    } catch (error) {
      console.error('❌ [DeviceCheck] Failed to get devices:', error);
      setMicAccessGranted(false);
    }
  };

  const startMicTest = async () => {
    if (!selectedDeviceId) return;
    
    setIsTesting(true);
    
    try {
      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedDeviceId,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      streamRef.current = stream;

      // Create audio context and analyser
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // Start monitoring levels
      monitorMicLevel();
      
      console.log('✅ [DeviceCheck] Mic test started');
    } catch (error) {
      console.error('❌ [DeviceCheck] Mic test failed:', error);
      setIsTesting(false);
    }
  };

  const monitorMicLevel = () => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateLevel = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((acc, val) => acc + val, 0) / bufferLength;
      const normalizedLevel = Math.min(100, (average / 255) * 100 * 2); // Amplify for visibility
      
      setMicLevel(normalizedLevel);
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  };

  const stopMicTest = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsTesting(false);
    setMicLevel(0);
  };

  // One-tap quick join for mobile: requests mic and unlocks audio on a user gesture
  const quickJoin = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      // Attach to hidden bridge to unlock audio paths
      try {
        const globalLocal = typeof document !== 'undefined' ? document.getElementById('global-local-audio') as HTMLAudioElement | null : null;
        if (globalLocal) {
          globalLocal.srcObject = stream;
          globalLocal.muted = true;
          await globalLocal.play().catch(() => {});
        }
        const globalRemote = typeof document !== 'undefined' ? document.getElementById('global-remote-audio') as HTMLAudioElement | null : null;
        if (globalRemote) {
          globalRemote.muted = false;
        }
      } catch {}
      // We don't keep this stream here; real call flow will request again
      stream.getTracks().forEach(t => t.stop());
      setMicAccessGranted(true);
      onComplete();
      onOpenChange(false);
    } catch (error) {
      setMicAccessGranted(false);
      console.warn('❌ [DeviceCheck] Quick join mic denied:', error);
    }
  };

  const testAutoplay = async () => {
    try {
      // Create a silent audio element and try to play it
      const audio = new Audio();
      testAudioRef.current = audio;
      const silentAudio = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
      audio.src = silentAudio;
      await audio.play();
      setAutoplayPassed(true);
      console.log('✅ [DeviceCheck] Autoplay test passed');
    } catch (error) {
      setAutoplayPassed(false);
      console.warn('⚠️ [DeviceCheck] Autoplay blocked:', error);
    }
  };

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    if (isTesting) {
      stopMicTest();
      setTimeout(() => {
        startMicTest();
      }, 100);
    }
  };

  const handleComplete = () => {
    stopMicTest();
    onComplete();
    onOpenChange(false);
  };

  const canProceed = micAccessGranted && (autoplayPassed === null || autoplayPassed === true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Device Check</DialogTitle>
          <DialogDescription>
            Test your microphone and audio before joining the call
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {isMobileSafari && !showAdvanced ? (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Quick setup for iPhone/iPad: tap Join and allow microphone. You can change devices later during the call.
                </AlertDescription>
              </Alert>
              <Button onClick={quickJoin} className="w-full">
                Join with Microphone
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setShowAdvanced(true)}>
                Advanced setup
              </Button>
            </div>
          ) : (
            <>
              {/* Microphone Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Mic className="h-4 w-4" />
                  Microphone
                </label>
                <Select value={selectedDeviceId} onValueChange={handleDeviceChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select microphone..." />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Mic Test Button */}
              <div className="space-y-2">
                <Button
                  onClick={isTesting ? stopMicTest : startMicTest}
                  variant={isTesting ? "destructive" : "default"}
                  className="w-full"
                  disabled={!selectedDeviceId}
                >
                  {isTesting ? 'Stop Test' : 'Test Microphone'}
                </Button>
              </div>

              {/* Mic Level Meter */}
              {isTesting && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Input Level</label>
                  <Progress value={micLevel} className="h-3" />
                  <p className="text-xs text-muted-foreground">
                    {micLevel > 5 ? '✓ Microphone is working' : 'Speak to test your microphone'}
                  </p>
                </div>
              )}

              {/* Autoplay Test */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Audio Playback Test
                </label>
                <Button onClick={testAutoplay} variant="outline" className="w-full">
                  Test Audio Playback
                </Button>
                {autoplayPassed !== null && (
                  <Alert variant={autoplayPassed ? "default" : "destructive"}>
                    <AlertDescription className="flex items-center gap-2">
                      {autoplayPassed ? (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Audio playback is working
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4" />
                          Autoplay blocked. You may need to click to enable audio during the call.
                        </>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Mic Access Status */}
              {micAccessGranted === false && (
                <Alert variant="destructive">
                  <AlertDescription className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Microphone access denied. Please allow microphone access in your browser settings.
                  </AlertDescription>
                </Alert>
              )}

              {/* Continue Button */}
              <Button onClick={handleComplete} className="w-full" disabled={!(micAccessGranted && (autoplayPassed === null || autoplayPassed === true))}>
                {micAccessGranted ? 'Continue to Call' : 'Fix Issues to Continue'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
