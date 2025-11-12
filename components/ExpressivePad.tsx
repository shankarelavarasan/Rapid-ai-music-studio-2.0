import React, { useState, useRef, useEffect } from 'react';
import { ExpressiveNote, PitchType } from '../types';

interface ExpressivePadProps {
  onFinish: (notes: ExpressiveNote[]) => void;
  bpm: number;
  quantizeValue: number;
}

const PitchIndicator: React.FC<{ pitch: PitchType }> = ({ pitch }) => {
  let text = 'Mid';
  if (pitch === PitchType.HIGH) text = 'High';
  if (pitch === PitchType.LOW) text = 'Low';
  return (
    <div className="absolute top-4 right-4 bg-black/50 text-white font-bold px-4 py-2 rounded-lg">
      Pitch: {text}
    </div>
  );
};

const ExpressivePad: React.FC<ExpressivePadProps> = ({ onFinish, bpm, quantizeValue }) => {
  const [notes, setNotes] = useState<ExpressiveNote[]>([]);
  const [currentPitch, setCurrentPitch] = useState<PitchType>(PitchType.MID);
  const padRef = useRef<HTMLDivElement>(null);
  const sessionStartTimeRef = useRef<number | null>(null);
  const pressInfoRef = useRef<{ startTime: number; pitch: PitchType; midiNote: number; volume: number } | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const metronomeIntervalRef = useRef<number | null>(null);
  const beatCounterRef = useRef<number>(0);

  // WebAudio helpers
  const ensureAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current!;
  };

  const playMetronomeClick = (accent = false) => {
    const ctx = ensureAudioCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = accent ? 1200 : 900;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(accent ? 0.6 : 0.4, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.14);
  };

  const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

  const playToneAt = (midi: number, durationSec: number, volume: number, startOffsetSec: number) => {
    const ctx = ensureAudioCtx();
    const startAt = ctx.currentTime + Math.max(0, startOffsetSec);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = midiToFreq(midi);
    const v = Math.min(1, Math.max(0.05, volume));
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(v, startAt + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + Math.max(0.08, durationSec));
    osc.connect(gain).connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + Math.max(0.1, durationSec + 0.05));
  };

  // Mapping helper
  const map = (value: number, inMin: number, inMax: number, outMin: number, outMax: number) => {
    const clamped = Math.min(inMax, Math.max(inMin, value));
    const ratio = (clamped - inMin) / (inMax - inMin || 1);
    return outMin + ratio * (outMax - outMin);
  };

  // Scale config (C Major by default)
  const SCALE: number[] = [0, 2, 4, 5, 7, 9, 11];
  const BASE_NOTE = 48; // C3
  const TOTAL_NOTES = 49; // e.g., guitar range

  const getPitchFromY = (y: number, height: number): PitchType => {
    if (y < height * 0.33) return PitchType.HIGH;
    if (y > height * 0.66) return PitchType.LOW;
    return PitchType.MID;
  };

  const getNoteFromTouch = (x: number, y: number, pressure: number, width: number, height: number) => {
    const noteIndex = Math.floor(map(x, 0, width, 0, TOTAL_NOTES - 1));
    const octave = Math.floor(noteIndex / SCALE.length);
    const noteInScale = SCALE[noteIndex % SCALE.length];
    const midiNote = BASE_NOTE + (octave * 12) + noteInScale;

    const volume = map(y, 0, height, 0.2, 1.0); // top soft, bottom loud
    const durationFromPressure = map(pressure, 0, 1, 0.1, 1.0);

    return { midiNote, volume, durationFromPressure };
  };

  // Start metronome when pad becomes active
  useEffect(() => {
    const beatMs = (60 / Math.max(1, bpm)) * 1000;
    // Start immediately to give groove
    playMetronomeClick(true);
    beatCounterRef.current = 1;
    const id = window.setInterval(() => {
      const beatIdx = beatCounterRef.current % 4;
      playMetronomeClick(beatIdx === 0);
      beatCounterRef.current += 1;
    }, beatMs);
    metronomeIntervalRef.current = id;
    return () => {
      if (metronomeIntervalRef.current !== null) {
        clearInterval(metronomeIntervalRef.current);
        metronomeIntervalRef.current = null;
      }
    };
  }, [bpm]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const now = performance.now();
    if (sessionStartTimeRef.current === null) {
      sessionStartTimeRef.current = now;
    }

    const rect = padRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pitch = getPitchFromY(y, rect.height);
    const pressure = e.pressure ?? 0;
    const { midiNote, volume } = getNoteFromTouch(x, y, pressure, rect.width, rect.height);
    
    setCurrentPitch(pitch);
    pressInfoRef.current = { startTime: now, pitch, midiNote, volume };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pressInfoRef.current) {
      const rect = padRef.current!.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const pitch = getPitchFromY(y, rect.height);
      setCurrentPitch(pitch);
      pressInfoRef.current.pitch = pitch;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (!pressInfoRef.current || sessionStartTimeRef.current === null) return;
    
    const { startTime, pitch, midiNote, volume } = pressInfoRef.current;
    const endTime = performance.now();
    const durationHeld = (endTime - startTime) / 1000;
    const relativeTime = (startTime - sessionStartTimeRef.current) / 1000;

    const rect = padRef.current!.getBoundingClientRect();
    const pressure = e.pressure ?? 0;
    const { durationFromPressure } = getNoteFromTouch(0, 0, pressure, rect.width, rect.height);

    const duration = pressure > 0 ? durationFromPressure : durationHeld;

    // Quantize event start time to nearest beat/subdivision
    const beatInterval = 60 / Math.max(1, bpm);
    const subdivision = Math.max(1, quantizeValue);
    const step = beatInterval / subdivision;
    const quantizedTime = Math.round(relativeTime / step) * step;

    setNotes(prev => [...prev, { time: quantizedTime, duration, pitch, midiNote, volume }]);

    // Beat-synced preview tone at quantized start
    try {
      const absStartMs = sessionStartTimeRef.current + quantizedTime * 1000;
      const startOffsetSec = Math.max(0, (absStartMs - performance.now()) / 1000);
      playToneAt(midiNote, duration, volume, startOffsetSec);
    } catch {}

    pressInfoRef.current = null;
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-white p-4">
      <h3 className="text-2xl font-bold mb-2">Expressive Pad</h3>
      <p className="text-gray-400 mb-6">Create notes. Output is always in rhythm and in scale.</p>
    
      <div 
        ref={padRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-full h-64 md:h-80 bg-gray-800 rounded-lg cursor-pointer touch-none relative select-none overflow-hidden"
      >
        <div className="absolute inset-0 flex flex-col pointer-events-none">
          <div className="flex-1 bg-red-500/30 flex items-center justify-center"><span className="font-bold text-lg opacity-50">HIGH</span></div>
          <div className="flex-1 bg-orange-500/30 flex items-center justify-center"><span className="font-bold text-lg opacity-50">MID</span></div>
          <div className="flex-1 bg-green-500/30 flex items-center justify-center"><span className="font-bold text-lg opacity-50">LOW</span></div>
        </div>

        <PitchIndicator pitch={currentPitch} />
        <div className="absolute bottom-4 left-4 bg-black/50 px-4 py-2 rounded-lg">
          Notes: {notes.length}
        </div>
      </div>

      <button onClick={() => onFinish(notes)} className="mt-6 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">
        Finish & Compose
      </button>
    </div>
  );
};

export default ExpressivePad;
