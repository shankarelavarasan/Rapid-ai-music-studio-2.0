// Fix: Created BeatMaker.tsx to provide the beat creation UI, resolving the module not found error.
import React, { useState, useMemo } from 'react';
import { BeatEvent, BeatTrack, TrackType } from '../types';
import { sampleLibrary } from '../services/sampleLibrary';
import { ProfessionalBeatComposer } from '../services/ai';

const STEPS = 16;

interface BeatMakerProps {
  onClose: () => void;
  onBeatCreated: (track: Omit<BeatTrack, 'id'>) => void;
  bpm: number;
}

const TapIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v1.586l-.297.297A1.5 1.5 0 0 0 1.5 7.5v1.5a1.5 1.5 0 0 0 1.5 1.5h1.5a1.5 1.5 0 0 0 1.5-1.5v-1.5a1.5 1.5 0 0 0-.44-1.06l-.297-.297V5.41a8.23 8.23 0 0 1 5.25-2.103.75.75 0 0 0 0-1.5.75.75 0 0 0-.75-.274Z" /><path d="M13.16 3.073a.75.75 0 0 1 .53 1.28l-1.5 1.5a.75.75 0 0 1-1.06-1.06l1.5-1.5a.75.75 0 0 1 .53-.22Zm3.182 4.161a.75.75 0 0 1 1.06 0l1.5 1.5a.75.75 0 0 1-1.06 1.06l-1.5-1.5a.75.75 0 0 1 0-1.06Zm-4.95-3.536a.75.75 0 0 1 1.06 0l1.5 1.5a.75.75 0 0 1-1.06 1.06l-1.5-1.5a.75.75 0 0 1 0-1.06Zm3.536 4.95a.75.75 0 0 1 1.06 0l1.5 1.5a.75.75 0 1 1-1.06 1.06l-1.5-1.5a.75.75 0 0 1 0-1.06Zm-3.182 3.182a.75.75 0 0 1 .53 1.28l-1.5 1.5a.75.75 0 0 1-1.06-1.06l1.5-1.5a.75.75 0 0 1 .53-.22Zm-4.242-1.06a.75.75 0 0 1 1.06 0l1.5 1.5a.75.75 0 0 1-1.06 1.06l-1.5-1.5a.75.75 0 0 1 0-1.06Zm-1.414 4.95a.75.75 0 0 1 1.06 0l1.5 1.5a.75.75 0 0 1-1.06 1.06l-1.5-1.5a.75.75 0 0 1 0-1.06Z" /></svg>;
const GridIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3A1.5 1.5 0 0 1 13 3.5v3A1.5 1.5 0 0 1 11.5 8h-3A1.5 1.5 0 0 1 7 6.5v-3Zm-5 0A1.5 1.5 0 0 1 3.5 2h3A1.5 1.5 0 0 1 8 3.5v3A1.5 1.5 0 0 1 6.5 8h-3A1.5 1.5 0 0 1 2 6.5v-3Zm13 0A1.5 1.5 0 0 1 16.5 2h3A1.5 1.5 0 0 1 21 3.5v3A1.5 1.5 0 0 1 19.5 8h-3A1.5 1.5 0 0 1 15 6.5v-3ZM7 12A1.5 1.5 0 0 1 8.5 10.5h3a1.5 1.5 0 0 1 1.5 1.5v3A1.5 1.5 0 0 1 11.5 15h-3A1.5 1.5 0 0 1 7 13.5v-3Zm-5 0A1.5 1.5 0 0 1 3.5 10.5h3A1.5 1.5 0 0 1 8 12v3A1.5 1.5 0 0 1 6.5 15h-3A1.5 1.5 0 0 1 2 13.5v-3Zm13 0A1.5 1.5 0 0 1 16.5 10.5h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 15 13.5v-3Z" transform="scale(0.9) translate(0.5,0.5)"/></svg>;

const BeatMaker: React.FC<BeatMakerProps> = ({ onClose, onBeatCreated, bpm }) => {
  const drumSamples = useMemo(() => sampleLibrary.getSamplesFor('drums'), []);
  const [grid, setGrid] = useState<boolean[][]>(() =>
    Array(drumSamples.length).fill(null).map(() => Array(STEPS).fill(false))
  );
  const [mode, setMode] = useState<'sequencer' | 'ai'>('sequencer');
  const [isComposing, setIsComposing] = useState(false);
  const [taps, setTaps] = useState<number[]>([]);
  const tapStartTimeRef = React.useRef<number>(0);

  const handleStepClick = (sampleIndex: number, stepIndex: number) => {
    const newGrid = grid.map(row => [...row]);
    newGrid[sampleIndex][stepIndex] = !newGrid[sampleIndex][stepIndex];
    setGrid(newGrid);
  };

  const handleCreateBeat = async () => {
    setIsComposing(true);
    let events: BeatEvent[];

    if (mode === 'sequencer') {
      events = [];
      const stepDuration = (60.0 / bpm) / (STEPS / 4); // Duration of one 16th note
      grid.forEach((row, sampleIndex) => {
        row.forEach((isActive, stepIndex) => {
          if (isActive) {
            events.push({
              sample: drumSamples[sampleIndex].name,
              time: stepIndex * stepDuration,
              velocity: 1.0, // Constant velocity for sequencer
            });
          }
        });
      });
    } else { // AI mode
      if (taps.length < 2) {
        alert("Please tap a rhythm first (at least 2 taps).");
        setIsComposing(false);
        return;
      }
      const composer = new ProfessionalBeatComposer({
        userOnsets: taps,
        bpm: bpm,
        drumSamples: drumSamples.map(s => s.name),
      });
      events = await composer.compose();
    }
    
    if (events.length > 0) {
      const newTrack: Omit<BeatTrack, 'id'> = {
        name: mode === 'ai' ? 'AI Drum Beat' : 'Drum Beat',
        type: TrackType.BEAT,
        events,
        volume: 1.0,
        muted: false,
        loop: true,
      };
      onBeatCreated(newTrack);
      onClose();
    } else {
        if(mode === 'ai') alert("The AI couldn't generate a beat from your taps. Please try again.");
    }
    setIsComposing(false);
  };

  const startTapping = () => {
    setTaps([]);
    tapStartTimeRef.current = performance.now();
  };
  
  const handleTap = () => {
    if (tapStartTimeRef.current === 0) { // Auto-start on first tap
        startTapping();
    }
    const tapTime = (performance.now() - tapStartTimeRef.current) / 1000;
    setTaps(prev => [...prev, tapTime]);
  };
  
  const SequencerView = () => (
    <>
      <div className="grid gap-1 p-2 bg-gray-900 rounded-md" style={{ gridTemplateColumns: `120px repeat(${STEPS}, 1fr)` }}>
        {drumSamples.map((sample, sampleIndex) => (
          <React.Fragment key={sample.path}>
            <div className="text-xs font-bold p-2 text-right bg-gray-800 rounded-l-md truncate flex items-center justify-end">{sample.name}</div>
            {Array(STEPS).fill(0).map((_, stepIndex) => (
              <button
                key={stepIndex}
                onClick={() => handleStepClick(sampleIndex, stepIndex)}
                className={`h-10 w-full rounded transition-colors ${
                  grid[sampleIndex][stepIndex] ? 'bg-indigo-500' : 'bg-gray-700 hover:bg-gray-600'
                } ${(stepIndex % 4 === 0) ? 'border-l-2 border-gray-600' : ''}`}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
    </>
  );

  const AiTapView = () => (
     <div className="flex flex-col items-center space-y-4 p-8">
        <p className="text-center text-gray-400">Tap a rhythm on the pad below. The AI will create a full beat based on your idea.</p>
        <div
            onMouseDown={handleTap}
            className="w-64 h-64 bg-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold select-none cursor-pointer transition-transform duration-100 active:scale-95 shadow-2xl"
        >
            TAP
        </div>
        <p className="text-lg">Taps: {taps.length}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-95 z-50 flex flex-col items-center justify-center">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
        <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">Create a Beat</h2>
          <div className="flex items-center bg-gray-900 rounded-full p-1">
            <button onClick={() => setMode('sequencer')} className={`px-3 py-1 text-sm font-semibold rounded-full flex items-center gap-1 ${mode === 'sequencer' ? 'bg-indigo-600' : ''}`}><GridIcon/> Sequencer</button>
            <button onClick={() => setMode('ai')} className={`px-3 py-1 text-sm font-semibold rounded-full flex items-center gap-1 ${mode === 'ai' ? 'bg-purple-600' : ''}`}><TapIcon /> AI Tap</button>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <main className="flex-grow p-4 overflow-auto">
          {mode === 'sequencer' ? <SequencerView /> : <AiTapView />}
        </main>
        
        <footer className="flex-shrink-0 flex justify-end p-4 border-t border-gray-700">
          <button
            onClick={handleCreateBeat}
            disabled={isComposing}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isComposing ? 'Composing...' : 'Create Beat Track'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default BeatMaker;
