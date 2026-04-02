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
  Upload,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardFooter } from '../components/ui/Card';

const CONVERSATION_PROMPTS = [
  "Describe your typical morning routine in detail.",
  "Tell me about a favourite meal you enjoy cooking or eating.",
  "Describe what you can see from your window right now.",
  "Talk about a happy memory from a recent family gathering.",
  "Describe the neighbourhood you live in.",
  "Tell me about what you did yesterday from start to finish.",
  "Describe your favourite place to visit and why you enjoy it.",
  "Talk about a hobby or activity you enjoy doing.",
  "Describe how you would make a cup of tea or coffee.",
  "Tell me about a trip or outing you remember well.",
];

interface RecordingProps {
  onProceed: () => void;
  onFileSelected: (file: File) => void;
  subjectId: string;
  onSubjectIdChange: (id: string) => void;
}

export const Recording: FC<RecordingProps> = ({ onProceed, onFileSelected, subjectId, onSubjectIdChange }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState<string>("");
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(20).fill(0));
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

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

  // Clean up media stream and audio context on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      audioContextRef.current?.close();
    };
  }, []);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      // Stop recording — clean up audio visualizer
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      audioContextRef.current?.close();
      audioContextRef.current = null;
      analyserRef.current = null;
      setAudioLevels(new Array(20).fill(0));

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

        // Pick a random conversation prompt
        const randomPrompt = CONVERSATION_PROMPTS[Math.floor(Math.random() * CONVERSATION_PROMPTS.length)];
        setCurrentPrompt(randomPrompt);

        // Set up live audio waveform visualizer
        const audioCtx = new AudioContext();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;

        const updateLevels = () => {
          const data = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(data);
          const levels = Array.from(data.slice(0, 20)).map(v => v / 255);
          setAudioLevels(levels);
          animationFrameRef.current = requestAnimationFrame(updateLevels);
        };
        updateLevels();

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
          {/* Hidden file input — always present */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="audio/*"
            className="hidden"
          />

          {isRecording ? (
            /* ===== RECORDING STATE ===== */
            <div className="flex flex-col items-center w-full">
              {/* Live Recording badge */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 mb-6"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-red-500">Live Recording</span>
              </motion.div>

              {/* Heading */}
              <h2 className="text-2xl font-bold text-slate-800 mb-4">Recording...</h2>

              {/* Conversation prompt */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-slate-600 text-sm italic leading-relaxed mb-6 px-4"
              >
                "{currentPrompt}"
              </motion.p>

              {/* Live waveform visualizer */}
              <div className="flex items-end justify-center gap-1 h-24 w-full p-4 border border-slate-200 rounded-xl bg-white mb-6">
                {audioLevels.map((level, i) => (
                  <div
                    key={i}
                    className="w-2 rounded-full bg-blue-400 transition-all duration-75"
                    style={{ height: `${Math.max(8, level * 100)}%` }}
                  />
                ))}
              </div>

              {/* Instruction text */}
              <p className="text-slate-500 text-sm leading-relaxed mb-8 px-4">
                Speak naturally and take your time. Try to speak for at least 60 seconds.
              </p>

              {/* Stop button */}
              <div className="flex flex-col items-center mb-8">
                <button
                  onClick={handleToggleRecording}
                  disabled={!isOverOneMinute}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-opacity ${
                    isOverOneMinute ? 'bg-slate-800 opacity-100 cursor-pointer' : 'bg-slate-800 opacity-30 cursor-not-allowed'
                  }`}
                >
                  <Square size={20} className="text-white" fill="white" />
                </button>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-800 mt-3">
                  Tap to Stop
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full">
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min((seconds / 60) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-400">
                  <span>{formatTime(seconds)}</span>
                  <span>Min. 1:00 recommended</span>
                </div>
              </div>

              {/* Mic error */}
              {micError && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs font-medium text-red-500 px-4 mt-4"
                >
                  {micError}
                </motion.p>
              )}
            </div>
          ) : isFinished ? (
            /* ===== FINISHED STATE (unchanged) ===== */
            <>
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full flex items-center justify-center bg-emerald-50">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-inner bg-emerald-500">
                    <CheckCircle2 className="text-white" size={32} />
                  </div>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-3xl font-mono font-bold mb-4 text-emerald-600"
              >
                {formatTime(seconds)}
              </motion.div>

              <h2 className="text-2xl font-bold text-slate-800 mb-2">Recording is complete</h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-10 px-4">
                Your voice assessment has been successfully captured. You can now proceed.
              </p>

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
            </>
          ) : (
            /* ===== PRE-RECORDING STATE (unchanged) ===== */
            <>
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full flex items-center justify-center bg-blue-50">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-inner bg-blue-600">
                    <Mic className="text-white" size={32} />
                  </div>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-slate-800 mb-2">Ready to Record</h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-6 px-4">
                Please find a quiet place and speak naturally into your microphone when ready.
              </p>

              {/* Subject ID input */}
              <div className="w-full mb-6 px-4">
                <label htmlFor="subject-id" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Who is being screened?
                </label>
                <input
                  id="subject-id"
                  type="text"
                  value={subjectId}
                  onChange={(e) => onSubjectIdChange(e.target.value)}
                  placeholder="Enter name or ID"
                  className="w-full px-4 py-3 text-sm text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-300 transition-shadow"
                />
              </div>

              <div className="flex flex-col gap-3 w-full">
                <Button
                  onClick={handleToggleRecording}
                  variant={subjectId.trim() ? 'primary' : 'disabled'}
                  disabled={!subjectId.trim()}
                  fullWidth
                  icon={<Play size={20} fill="currentColor" />}
                >
                  Start Recording
                </Button>
                <Button
                  variant={subjectId.trim() ? 'secondary' : 'disabled'}
                  disabled={!subjectId.trim()}
                  fullWidth
                  icon={<Upload size={18} />}
                  onClick={triggerFileUpload}
                >
                  Upload Recording
                </Button>
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
            </>
          )}
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
