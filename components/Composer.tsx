import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Track, TrackType, SampleInfo, ExpressiveNote } from '../types';
import { INSTRUMENTS } from '../constants';
import { sampleLibrary } from '../services/sampleLibrary';
import { detectOnsets } from '../services/rhythmDetector';
import ExpressivePad from './ExpressivePad';
import { ProfessionalInstrumentComposer } from '../services/ai';

// --- Helper Components defined outside to prevent re-renders ---

interface InstrumentSelectorProps {
  selectedInstrument: string | null;
  onSelect: (instrument: string) => void;
}

const InstrumentSelector: React.FC<InstrumentSelectorProps> = ({ selectedInstrument, onSelect }) => (
  <div className="flex-shrink-0 p-4">
    <div className="flex space-x-3 overflow-x-auto pb-4">
      {INSTRUMENTS.map((instrument) => (
        <button
          key={instrument}
          onClick={() => onSelect(instrument)}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
            selectedInstrument === instrument
              ? 'bg-indigo-500 text-white shadow-lg'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {instrument.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </button>
      ))}
    </div>
  </div>
);

interface SampleGridProps {
    samples: SampleInfo[];
    onSelect: (sample: SampleInfo) => void;
    selectedSamplePath: string | null;
}

const SampleGrid: React.FC<SampleGridProps> = ({ samples, onSelect, selectedSamplePath }) => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
        {samples.map((sample) => (
            <button
                key={sample.path}
                onClick={() => onSelect(sample)}
                className={`p-4 rounded-lg text-center transition-all duration-200 ${
                    selectedSamplePath === sample.path ? 'bg-indigo-600 ring-2 ring-indigo-400' : 'bg-gray-800 hover:bg-gray-700'
                }`}
            >
                <span className="block text-2xl mb-2">🎵</span>
                <span className="text-sm font-medium break-words">{sample.name}</span>
            </button>
        ))}
    </div>
);

const RecordIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z" clipRule="evenodd" /></svg>;
const StopIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z" clipRule="evenodd" /></svg>;
const TapIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v1.586l-.297.297A1.5 1.5 0 0 0 1.5 7.5v1.5a1.5 1.5 0 0 0 1.5 1.5h1.5a1.5 1.5 0 0 0 1.5-1.5v-1.5a1.5 1.5 0 0 0-.44-1.06l-.297-.297V5.41a8.23 8.23 0 0 1 5.25-2.103.75.75 0 0 0 0-1.5.75.75 0 0 0-.75-.274Z" /><path d="M13.16 3.073a.75.75 0 0 1 .53 1.28l-1.5 1.5a.75.75 0 0 1-1.06-1.06l1.5-1.5a.75.75 0 0 1 .53-.22Zm3.182 4.161a.75.75 0 0 1 1.06 0l1.5 1.5a.75.75 0 0 1-1.06 1.06l-1.5-1.5a.75.75 0 0 1 0-1.06Zm-4.95-3.536a.75.75 0 0 1 1.06 0l1.5 1.5a.75.75 0 0 1-1.06 1.06l-1.5-1.5a.75.75 0 0 1 0-1.06Zm3.536 4.95a.75.75 0 0 1 1.06 0l1.5 1.5a.75.75 0 1 1-1.06 1.06l-1.5-1.5a.75.75 0 0 1 0-1.06Zm-3.182 3.182a.75.75 0 0 1 .53 1.28l-1.5 1.5a.75.75 0 0 1-1.06-1.06l1.5-1.5a.75.75 0 0 1 .53-.22Zm-4.242-1.06a.75.75 0 0 1 1.06 0l1.5 1.5a.75.75 0 0 1-1.06 1.06l-1.5-1.5a.75.75 0 0 1 0-1.06Zm-1.414 4.95a.75.75 0 0 1 1.06 0l1.5 1.5a.75.75 0 0 1-1.06 1.06l-1.5-1.5a.75.75 0 0 1 0-1.06Z" /></svg>
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" /></svg>;
const PadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M11.25 3.75a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 0 1.5h-1.5v1.5a.75.75 0 0 1-1.5 0v-1.5h-1.5a.75.75 0 0 1 0-1.5h1.5v-1.5a.75.75 0 0 1 .75-.75ZM10.5 12a.75.75 0 0 0-1.5 0v.75a.75.75 0 0 0 1.5 0v-.75ZM12 10.5a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-1.5 0v-.75a.75.75 0 0 1 .75-.75ZM13.5 12a.75.75 0 0 0-1.5 0v.75a.75.75 0 0 0 1.5 0v-.75ZM12 13.5a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-1.5 0v-.75A.75.75 0 0 1 12 13.5ZM10.5 15a.75.75 0 0 0-1.5 0v.75a.75.75 0 0 0 1.5 0v-.75ZM12 16.5a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-1.5 0v-.75a.75.75 0 0 1 .75-.75ZM13.5 15a.75.75 0 0 0-1.5 0v.75a.75.75 0 0 0 1.5 0v-.75Z" /><path fillRule="evenodd" d="M5.25 2.25A.75.75 0 0 0 4.5 3v18a.75.75 0 0 0 .75.75h13.5a.75.75 0 0 0 .75-.75V3a.75.75 0 0 0-.75-.75H5.25ZM6 12a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75a.75.75 0 0 1-.75-.75Zm.75 3.75a.75.75 0 0 0 0 1.5h10.5a.75.75 0 0 0 0-1.5H6.75Z" clipRule="evenodd" /></svg>;


// --- Main Composer Component ---

interface ComposerProps {
  onClose: () => void;
  onCompose: (track: Omit<Track, 'id'>) => void;
  bpm: number;
  quantizeValue: number;
}

const Composer: React.FC<ComposerProps> = ({ onClose, onCompose, bpm, quantizeValue }) => {
  const [selectedInstrument, setSelectedInstrument] = useState<string | null>(null);
  const [selectedSample, setSelectedSample] = useState<SampleInfo | null>(null);
  const [samples, setSamples] = useState<SampleInfo[]>([]);
  const [mode, setMode] = useState<'record' | 'tap' | 'expressive' | 'idle'>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [taps, setTaps] = useState<number[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const tapStartTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  useEffect(() => {
    if (selectedInstrument) {
      setSamples(sampleLibrary.getSamplesFor(selectedInstrument));
      setSelectedSample(null);
    } else {
      setSamples([]);
    }
  }, [selectedInstrument]);

  useEffect(() => {
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, []);

  // Fix: Made handleCompose async to support the async compose method from the AI service.
  const handleCompose = async (onsets: number[]) => {
    if (!selectedInstrument || !selectedSample) {
      alert('Please select an instrument and a sample.');
      return;
    }
    
    let finalOnsets = onsets;

    // For instruments, generate a professional rhythm instead of using raw user taps
    if (onsets.length > 1) {
        const instrumentComposer = new ProfessionalInstrumentComposer({
            userOnsets: onsets,
            bpm: bpm,
        });
        finalOnsets = await instrumentComposer.compose();
    }
    
    if (quantizeValue > 0) {
        const beatSec = 60.0 / bpm;
        finalOnsets = finalOnsets.map(onset => {
            return Math.round(onset / (beatSec * quantizeValue)) * (beatSec * quantizeValue);
        });
        // Remove duplicates after quantization
        finalOnsets = [...new Set(finalOnsets)];
    }

    onCompose({
        name: `${selectedSample.name} Comp`,
        type: TrackType.INSTRUMENT,
        filePath: selectedSample.path,
        volume: 1.0,
        loop: false,
        muted: false,
        trimStart: 0,
        trimEnd: 0,
        offset: 0,
        onsets: finalOnsets,
    });
    onClose();
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Your browser does not support audio recording.');
        return;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasMicrophone = devices.some(device => device.kind === 'audioinput');
      if (!hasMicrophone) {
          alert('No microphone found. Please connect a microphone and try again.');
          return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = event => {
        audioChunks.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const arrayBuffer = await audioBlob.arrayBuffer();
        if (audioContextRef.current) {
            try {
                const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
                const onsets = detectOnsets(audioBuffer);
                if (onsets.length > 0) {
                  await handleCompose(onsets);
                } else {
                  alert('No beats detected. Try making a clearer sound.');
                }
            } catch (decodeError) {
                console.error("Error decoding audio data:", decodeError);
                alert("Could not process the recording. The audio format might not be supported.");
            }
        }
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setMode('record');
    } catch (err) {
      console.error('Error starting recording:', err);
      let message = 'Could not start recording.';
        if (err instanceof DOMException) {
            if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                message = 'No microphone found. Please connect a microphone and try again.';
            } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                message = 'Microphone access was denied. Please allow microphone access in your browser settings.';
            } else {
                message = `An error occurred: ${err.name}. Please check your microphone and browser settings.`;
            }
        }
        alert(message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setMode('idle');
    }
  };
  
  const startTapping = () => {
    setMode('tap');
    setTaps([]);
    tapStartTimeRef.current = performance.now();
  };
  
  const handleTap = () => {
    if (mode === 'tap') {
      const tapTime = (performance.now() - tapStartTimeRef.current) / 1000;
      setTaps(prev => [...prev, tapTime]);
    }
  };
  
  const finishTapping = async () => {
    if (taps.length > 0) {
        await handleCompose(taps);
    }
    setMode('idle');
    setTaps([]);
  };
  
  const handleExpressivePadFinish = async (notes: ExpressiveNote[]) => {
    if (notes.length > 0) {
      const onsets = notes.map(n => n.time);
      await handleCompose(onsets);
    }
    setMode('idle');
  };


  const renderMainContent = () => {
    if (mode === 'expressive') {
        return <ExpressivePad onFinish={handleExpressivePadFinish} />;
    }

    if (!selectedSample) {
        return (
            <div className="text-center text-gray-400">
                <p className="text-2xl">Select a Sample</p>
                <p>Choose an instrument and then a sample to continue.</p>
            </div>
        );
    }

    if (mode === 'tap') {
        return (
            <div className="flex flex-col items-center space-y-4">
                <div
                    onMouseDown={handleTap}
                    className="w-64 h-64 bg-indigo-500 rounded-full flex items-center justify-center text-white text-3xl font-bold select-none cursor-pointer transition-transform duration-100 active:scale-95 shadow-2xl"
                >
                    TAP
                </div>
                <p className="text-lg">Taps: {taps.length}</p>
                <button onClick={finishTapping} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">
                    <CheckIcon />
                    Use This Rhythm
                </button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-lg text-center">
            <h3 className="text-2xl font-bold mb-2">Create Rhythm</h3>
            <p className="text-gray-400 mb-6">Choose an input method for your selected sample.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={mode !== 'idle' && !isRecording}
                    className={`flex flex-col items-center justify-center space-y-2 p-8 rounded-lg transition-colors ${
                        isRecording ? 'bg-red-600 animate-pulse' : 'bg-gray-800 hover:bg-gray-700'
                    } disabled:opacity-50`}
                >
                    {isRecording ? <StopIcon /> : <RecordIcon />}
                    <span className="font-semibold">{isRecording ? 'Stop' : 'Record (Clap/Voice)'}</span>
                </button>
                <button
                    onClick={startTapping}
                    disabled={isRecording}
                    className="flex flex-col items-center justify-center space-y-2 p-8 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                    <TapIcon />
                    <span className="font-semibold">Manual Tap</span>
                </button>
                 <button
                    onClick={() => setMode('expressive')}
                    disabled={isRecording}
                    className="flex flex-col items-center justify-center space-y-2 p-8 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                    <PadIcon />
                    <span className="font-semibold">Expressive Pad</span>
                </button>
            </div>
        </div>
    );
  };


  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-95 z-50 flex flex-col">
      <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold">Create Composition</h2>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </header>
      
      <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
        <aside className="w-full md:w-1/3 flex-shrink-0 flex flex-col border-b md:border-b-0 md:border-r border-gray-700 overflow-y-auto">
          <InstrumentSelector selectedInstrument={selectedInstrument} onSelect={setSelectedInstrument} />
          <div className="flex-grow overflow-y-auto">
            {selectedInstrument ? (
              samples.length > 0 ? (
                <SampleGrid samples={samples} onSelect={setSelectedSample} selectedSamplePath={selectedSample?.path ?? null} />
              ) : (
                <p className="p-4 text-center text-gray-400">No samples found for this instrument.</p>
              )
            ) : (
              <p className="p-4 text-center text-gray-400">Select an instrument to see samples.</p>
            )}
          </div>
        </aside>

        <main className="flex-grow flex flex-col items-center justify-center p-4">
          {renderMainContent()}
        </main>
      </div>
    </div>
  );
};

export default Composer;
