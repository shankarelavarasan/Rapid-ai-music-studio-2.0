import React, { useState, useRef, useCallback } from 'react';
import { ExpressiveNote, PitchType } from '../types';

interface ExpressivePadProps {
  onFinish: (notes: ExpressiveNote[]) => void;
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

const ExpressivePad: React.FC<ExpressivePadProps> = ({ onFinish }) => {
  const [notes, setNotes] = useState<ExpressiveNote[]>([]);
  const [currentPitch, setCurrentPitch] = useState<PitchType>(PitchType.MID);
  const padRef = useRef<HTMLDivElement>(null);
  const sessionStartTimeRef = useRef<number | null>(null);
  const pressInfoRef = useRef<{ startTime: number; pitch: PitchType } | null>(null);

  const getPitchFromY = (y: number, height: number): PitchType => {
    if (y < height * 0.33) return PitchType.HIGH;
    if (y > height * 0.66) return PitchType.LOW;
    return PitchType.MID;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const now = performance.now();
    if (sessionStartTimeRef.current === null) {
      sessionStartTimeRef.current = now;
    }

    const rect = padRef.current!.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const pitch = getPitchFromY(y, rect.height);
    
    setCurrentPitch(pitch);
    pressInfoRef.current = { startTime: now, pitch };
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
    
    const { startTime, pitch } = pressInfoRef.current;
    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000;
    const relativeTime = (startTime - sessionStartTimeRef.current) / 1000;

    setNotes(prev => [...prev, { time: relativeTime, duration, pitch }]);
    pressInfoRef.current = null;
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-white p-4">
        <h3 className="text-2xl font-bold mb-2">Expressive Pad</h3>
        <p className="text-gray-400 mb-6">Press, hold, and slide on the pad below to create notes.</p>
      
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
