import { useState, useEffect, useRef, type FC, type ChangeEvent } from 'react';
import { 
  Mic, 
  Play, 
  Shield, 
  Volume2, 
  Timer, 
  Lock,
  Square,
  CheckCircle2,
  ArrowRight,
  Upload
} from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardFooter } from '../components/ui/Card';

interface RecordingProps {
  onProceed: () => void;
  onFileSelected: (file: File) => void;
}

export const Recording: FC<RecordingProps> = ({ onProceed, onFileSelected }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Clean up media stream on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
      setIsRecording(false);
    } else {
      // Start recording
      setSeconds(0);
      setIsFinished(false);
      setMicError(null);
      chunksRef.current = [];

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
          const ext = recorder.mimeType.includes('webm') ? '.webm' : '.ogg';
          const file = new File([blob], `recording${ext}`, { type: recorder.mimeType });
          onFileSelected(file);
          setIsFinished(true);
        };

        recorder.start();
        setIsRecording(true);
      } catch {
        setMicError('Microphone access denied. Please allow mic permission or upload a file instead.');
      }
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelected(file);
      setIsFinished(true);

      // Read actual audio duration from file metadata
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      audio.addEventListener('loadedmetadata', () => {
        setSeconds(Math.round(audio.duration));
        URL.revokeObjectURL(url);
      });
      audio.addEventListener('error', () => {
        setSeconds(0);
        URL.revokeObjectURL(url);
      });
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const isOverOneMinute = seconds >= 60;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-3xl w-full text-center mb-12">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-extrabold text-slate-900 mb-4"
        >
          Dementia Screening
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-lg text-slate-500 max-w-xl mx-auto"
        >
          Your cognitive health journey starts here. Press the button below to begin your voice assessment.
        </motion.p>
      </div>

      {/* Assessment Card */}
      <Card className="max-w-md">
        <CardHeader>
          <div className="relative mb-6">
            <motion.div 
              animate={isRecording ? { scale: [1, 1.15, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-colors duration-500 ${
                isFinished ? 'bg-emerald-50' : isRecording ? (isOverOneMinute ? 'bg-emerald-50' : 'bg-red-50') : 'bg-blue-50'
              }`}
            >
              <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-inner transition-colors duration-500 ${
                isFinished ? 'bg-emerald-500' : isRecording ? (isOverOneMinute ? 'bg-emerald-500' : 'bg-red-500') : 'bg-blue-600'
              }`}>
                {isFinished ? (
                  <CheckCircle2 className="text-white" size={32} />
                ) : (
                  <Mic className="text-white" size={32} />
                )}
              </div>
            </motion.div>
            {isRecording && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`absolute -inset-4 border-2 rounded-full animate-ping ${isOverOneMinute ? 'border-emerald-200' : 'border-red-200'}`}
              />
            )}
          </div>

          {/* Timer Display */}
          {(isRecording || isFinished) && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`text-3xl font-mono font-bold mb-4 ${isOverOneMinute ? 'text-emerald-600' : 'text-slate-800'}`}
            >
              {formatTime(seconds)}
            </motion.div>
          )}

          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            {isFinished ? 'Recording is complete' : isRecording ? 'Recording...' : 'Ready to Record'}
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-10 px-4">
            {isFinished 
              ? 'Your voice assessment has been successfully captured. You can now proceed.' 
              : 'Please find a quiet place and speak naturally into your microphone when ready.'}
          </p>

          <div className="flex flex-col gap-4 w-full">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="audio/*" 
              className="hidden" 
            />
            {!isFinished ? (
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={handleToggleRecording}
                  disabled={isRecording && !isOverOneMinute}
                  variant={isRecording ? (isOverOneMinute ? 'success' : 'disabled') : 'primary'}
                  fullWidth
                  icon={isRecording ? (isOverOneMinute ? <Square size={20} fill="currentColor" /> : <Lock size={20} />) : <Play size={20} fill="currentColor" />}
                >
                  {isRecording ? (isOverOneMinute ? 'Stop Recording' : `Recording... (${60 - seconds}s left)`) : 'Start Recording'}
                </Button>

                {!isRecording && (
                  <Button 
                    variant="secondary" 
                    fullWidth 
                    icon={<Upload size={18} />}
                    onClick={triggerFileUpload}
                  >
                    Upload Recording
                  </Button>
                )}
                
                {isRecording && !isOverOneMinute && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                  >
                    Minimum 60 seconds required
                  </motion.p>
                )}
                {micError && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs font-medium text-red-500 px-4"
                  >
                    {micError}
                  </motion.p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3 w-full">
                <Button 
                  variant="primary"
                  fullWidth
                  onClick={onProceed}
                  icon={<ArrowRight size={20} />}
                  className="flex-row-reverse"
                >
                  Proceed to the next step
                </Button>
                <button 
                  onClick={() => {
                    setIsFinished(false);
                    setSeconds(0);
                  }}
                  className="text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Redo Recording
                </button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardFooter>
          <Shield size={16} className="text-blue-600" />
          <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
            Secure & Encrypted Assessment
          </span>
        </CardFooter>
      </Card>

      {/* Bottom Features */}
      <div className="grid grid-cols-3 gap-16 mt-20 w-full max-w-3xl">
        <FeatureItem 
          icon={Volume2} 
          title="Clear Voice" 
          desc="Speak at a normal volume" 
          delay={0.3}
        />
        <FeatureItem 
          icon={Timer} 
          title="2-3 Minutes" 
          desc="Short verbal exercises" 
          delay={0.4}
        />
        <FeatureItem 
          icon={Lock} 
          title="100% Private" 
          desc="Results only for you" 
          delay={0.5}
        />
      </div>
    </div>
  );
};

function FeatureItem({ icon: Icon, title, desc, delay }: { icon: any, title: string, desc: string, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex flex-col items-center text-center"
    >
      <div className="text-blue-600 mb-3">
        <Icon size={24} />
      </div>
      <h3 className="font-bold text-slate-800 text-sm mb-1">{title}</h3>
      <p className="text-slate-400 text-xs">{desc}</p>
    </motion.div>
  );
}
