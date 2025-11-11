import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { v4 as uuidv4 } from 'uuid';
import Composer from './components/Composer';
import BeatMaker from './components/BeatMaker';
import Waveform from './components/Waveform';
import { Track, TrackType, InstrumentTrack, BeatTrack } from './types';
import { QUANTIZE_OPTIONS } from './constants';
import { sampleLibrary } from './services/sampleLibrary';

// --- Icon Components ---
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.647c1.295.742 1.295 2.545 0 3.286L7.279 20.99c-1.25.717-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" /></svg>;
const StopIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z" clipRule="evenodd" /></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" /></svg>;
const MuteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.66 1.905H6.44l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06ZM18.584 12c0-1.857-.87-3.534-2.274-4.583a.75.75 0 0 0-1.04 1.08c1.02.76 1.564 1.93 1.564 3.003s-.545 2.242-1.565 3.003a.75.75 0 1 0 1.04 1.08c1.403-1.05 2.274-2.726 2.274-4.583Z" /><path d="M21.5 12c0-3.373-1.67-6.33-4.225-8.118a.75.75 0 1 0-.85 1.218C18.594 6.55 20 9.13 20 12s-1.406 5.45-3.575 6.9a.75.75 0 1 0 .85 1.218C19.83 18.33 21.5 15.373 21.5 12Z" /></svg>;
const UnmuteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.66 1.905H6.44l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06Z" clipRule="evenodd" /><path d="M17.72 12.03a.75.75 0 0 1 0-1.06l1.25-1.25a.75.75 0 1 1 1.06 1.06L18.78 12l1.25 1.25a.75.75 0 1 1-1.06 1.06l-1.25-1.25a.75.75 0 0 1 0-1.06Z" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.006a.75.75 0 0 1-.749.658h-7.5a.75.75 0 0 1-.749-.658L5.165 6.663l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.9h1.368c1.603 0 2.816 1.336 2.816 2.9Z" clipRule="evenodd" /><path fillRule="evenodd" d="M3.054 5.923a.75.75 0 1 0 .892-1.288l-.133.092a49.6 49.6 0 0 0-2.67 1.415a.75.75 0 1 0 .893 1.288c.036-.024.07-.05.105-.075Zm17.892 0c.035.025.07.05.105.075a.75.75 0 1 0 .892-1.288a49.6 49.6 0 0 0-2.67-1.415l-.133.092a.75.75 0 0 0 .892 1.288Z" clipRule="evenodd" /></svg>;


// --- Track Lane Component ---
interface TrackLaneProps {
  track: Track;
  onUpdate: (updatedTrack: Track) => void;
  onDelete: (trackId: string) => void;
}
const TrackLane: React.FC<TrackLaneProps> = ({ track, onUpdate, onDelete }) => {
    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdate({ ...track, volume: parseFloat(e.target.value) });
    };

    const toggleMute = () => {
        onUpdate({ ...track, muted: !track.muted });
    };
    
    const renderTrackContent = () => {
        switch (track.type) {
            case TrackType.INSTRUMENT:
                return <Waveform filePath={(track as InstrumentTrack).filePath} />;
            case TrackType.BEAT:
                const beatTrack = track as BeatTrack;
                const duration = beatTrack.events.reduce((max, e) => Math.max(max, e.time), 0) + 0.5;
                return (
                    <div className="w-full h-full relative bg-gray-700/50 overflow-hidden">
                        {beatTrack.events.map((event, index) => (
                            <div key={index}
                                 className="absolute bg-indigo-400 rounded-sm"
                                 style={{
                                     left: `${(event.time / duration) * 100}%`,
                                     bottom: '2px',
                                     width: '4px',
                                     height: `${event.velocity * 90}%`,
                                     minHeight: '4px',
                                     opacity: track.muted ? 0.5 : 1,
                                 }}
                                 title={`${event.sample} @ ${event.time.toFixed(2)}s`}
                            />
                        ))}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex items-center space-x-4 p-2 bg-gray-800 rounded-lg">
            <div className="flex-shrink-0 w-48 p-2 bg-gray-900 rounded-md">
                <p className="text-sm font-bold truncate">{track.name}</p>
                 <div className="flex items-center space-x-2 mt-2">
                    <button onClick={toggleMute} className="p-1 hover:bg-gray-700 rounded-full">{track.muted ? <UnmuteIcon /> : <MuteIcon />}</button>
                    <input type="range" min="0" max="1" step="0.01" value={track.volume} onChange={handleVolumeChange} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                    <button onClick={() => onDelete(track.id)} className="p-1 text-red-500 hover:bg-gray-700 rounded-full"><TrashIcon /></button>
                </div>
            </div>
            <div className="flex-grow h-24 rounded-md overflow-hidden">
                {renderTrackContent()}
            </div>
        </div>
    );
};


// --- Main App Component ---
const App: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [quantizeValue, setQuantizeValue] = useState(0.25);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isBeatMakerOpen, setIsBeatMakerOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const playersRef = useRef<Map<string, any>>(new Map());
  const partsRef = useRef<Map<string, Tone.Part>>(new Map());
  const instrumentSynthsRef = useRef<Map<string, Tone.ToneAudioNode>>(new Map());
  const drumSynthsRef = useRef<Map<string, Tone.ToneAudioNode>>(new Map());
  const drumVoicePoolsRef = useRef<Map<string, Tone.ToneAudioNode[]>>(new Map());
  const drumVoiceIndexRef = useRef<Map<string, number>>(new Map());

  // Fix: Per user request, add a one-time event listener to start the audio context.
  useEffect(() => {
    const unlockAudio = () => {
      if (Tone.context.state === 'suspended') {
        Tone.start();
        console.log("Tone.js Audio context started");
      }
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("touchend", unlockAudio);
    };

    window.addEventListener("click", unlockAudio);
    window.addEventListener("touchend", unlockAudio);
    
    return () => {
        window.removeEventListener("click", unlockAudio);
        window.removeEventListener("touchend", unlockAudio);
    }
  }, []);
  
  // Update BPM
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  const getInstrumentSynth = (family: string): Tone.ToneAudioNode => {
    if (instrumentSynthsRef.current.has(family)) return instrumentSynthsRef.current.get(family)!;
    let synth: Tone.ToneAudioNode;
    switch (family) {
      case 'piano':
        synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.005, decay: 0.3, sustain: 0.6, release: 1.5 }
        });
        break;
      case 'guitar':
        synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 1.2 }
        });
        break;
      case 'violin':
        synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sine' },
          envelope: { attack: 0.1, decay: 0.1, sustain: 0.8, release: 1.8 }
        });
        break;
      case 'flute':
        synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sine' },
          envelope: { attack: 0.02, decay: 0.15, sustain: 0.7, release: 1.5 }
        });
        break;
      case 'sax':
        synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.03, decay: 0.2, sustain: 0.6, release: 1.6 }
        });
        break;
      case 'synth':
        synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'square' },
          envelope: { attack: 0.005, decay: 0.25, sustain: 0.7, release: 1.2 }
        });
        break;
      case 'bass':
      case 'synthbass':
        synth = new Tone.PolySynth(Tone.MonoSynth, {
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.6 }
        });
        break;
      default:
        synth = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 1.0 }
        });
    }
    instrumentSynthsRef.current.set(family, synth);
    return synth;
  };

  const getDrumSynth = (type: string): Tone.ToneAudioNode => {
    if (drumSynthsRef.current.has(type)) return drumSynthsRef.current.get(type)!;
    let synth: Tone.ToneAudioNode;
    switch (type) {
      case 'kick':
        synth = new Tone.MembraneSynth({
          pitchDecay: 0.05,
          octaves: 4,
          envelope: { attack: 0.001, decay: 0.2, sustain: 0.0, release: 0.5 }
        });
        break;
      case 'snare':
        synth = new Tone.NoiseSynth({
          noise: { type: 'white' },
          envelope: { attack: 0.001, decay: 0.2, sustain: 0 }
        });
        break;
      case 'hihat':
        synth = new Tone.MetalSynth({
          frequency: 250,
          envelope: { attack: 0.001, decay: 0.1, release: 0.1 }
        });
        break;
      case 'clap':
        synth = new Tone.NoiseSynth({
          noise: { type: 'white' },
          envelope: { attack: 0.001, decay: 0.15, sustain: 0 }
        });
        break;
      case 'tom':
        synth = new Tone.MembraneSynth({
          pitchDecay: 0.08,
          octaves: 2,
          envelope: { attack: 0.005, decay: 0.3, sustain: 0.0, release: 0.6 }
        });
        break;
      default:
        synth = new Tone.NoiseSynth();
    }
    drumSynthsRef.current.set(type, synth);
    return synth;
  };

  const createToneWrapper = (id: string): any => {
    // id formats:
    // tone:instrument:<family>:<note>
    // tone:drum:<type>
    const parts = id.split(':');
    const kind = parts[1];
    const gain = new Tone.Gain(1).toDestination();
    const wrapper: any = {
      volume: { value: 0 },
      loaded: true,
      load: () => Promise.resolve(),
      start: (time: number, offset: number = 0) => {
        const t = typeof time === 'number' ? time : Tone.now();
        const volumeDb = wrapper.volume.value || 0;
        gain.gain.value = Tone.dbToGain(volumeDb);
        if (kind === 'instrument') {
          const family = parts[2];
          const note = parts[3] || 'C4';
          const instrument = getInstrumentSynth(family);
          instrument.connect(gain);
          if ((instrument as any).triggerAttackRelease) {
            (instrument as any).triggerAttackRelease(note, '8n', t + offset);
          } else {
            const synth = new Tone.Synth();
            synth.connect(gain);
            synth.triggerAttackRelease(note, '8n', t + offset);
          }
        } else if (kind === 'drum') {
          const type = parts[2];
          const drum = getDrumVoice(type);
          drum.connect(gain);
          // Trigger with the correct signature per drum type
          if (drum instanceof Tone.MembraneSynth) {
            (drum as Tone.MembraneSynth).triggerAttackRelease('C2', '16n', t);
          } else if (drum instanceof Tone.MetalSynth) {
            (drum as Tone.MetalSynth).triggerAttackRelease('16n', t);
          } else if (drum instanceof Tone.NoiseSynth) {
            (drum as Tone.NoiseSynth).triggerAttackRelease('16n', t);
          } else if ((drum as any).triggerAttackRelease) {
            (drum as any).triggerAttackRelease('16n', t);
          } else if ((drum as any).trigger) {
            (drum as any).trigger(t);
          }
        }
      }
    };
    return wrapper;
  };

  const getPlayer = useCallback((url: string): any => {
      if (!playersRef.current.has(url)) {
          let player: any;
          if (sampleLibrary.isToneIdentifier(url)) {
            player = createToneWrapper(url);
          } else {
            player = new Tone.Player(url).toDestination();
          }
          playersRef.current.set(url, player);
          return player;
      }
      return playersRef.current.get(url)!;
  }, []);

  // Sync Tone.js transport with tracks state
  useEffect(() => {
    const syncTone = async () => {
      setIsSyncing(true);
      try {
        // 1. Stop transport and clear all previous events and parts
        const wasPlaying = Tone.Transport.state === 'started';
        if (wasPlaying) Tone.Transport.stop();
        Tone.Transport.cancel(0);
        partsRef.current.forEach(part => part.dispose());
        partsRef.current.clear();
        
        // 2. Collect all unique audio URLs
        const allUrls = new Set<string>();
        tracks.forEach(track => {
            if (track.type === TrackType.INSTRUMENT) {
                allUrls.add(track.filePath);
            } else if (track.type === TrackType.BEAT) {
                track.events.forEach(event => {
                    const sampleInfo = sampleLibrary.getSampleByName(event.sample);
                    if (sampleInfo) allUrls.add(sampleInfo.path);
                });
            }
        });

        // 3. Explicitly load all required players and wait for them to be ready.
        const validUrls = Array.from(allUrls).filter(Boolean);
        if (validUrls.length > 0) {
            const loadingPromises = validUrls.map(url => {
                const player = getPlayer(url);
                if (sampleLibrary.isToneIdentifier(url)) {
                  // synthetic players are already "loaded"
                  return Promise.resolve();
                }
                return player.loaded ? Promise.resolve() : player.load(url);
            });
            await Promise.all(loadingPromises);
        }

        // 4. Now that all buffers are loaded, create and schedule the new parts
        let maxLoopDuration = 0;
        tracks.forEach(track => {
            if (track.type === TrackType.INSTRUMENT) {
                const player = getPlayer((track as InstrumentTrack).filePath);
                const part = new Tone.Part(((time) => {
                    if (!track.muted) {
                        // volume handled inside wrapper for synthetic or on player for samples
                        if (!sampleLibrary.isToneIdentifier((track as InstrumentTrack).filePath)) {
                          player.volume.value = Tone.gainToDb(track.volume);
                        } else {
                          player.volume.value = Tone.gainToDb(track.volume);
                        }
                        player.start(time, (track as InstrumentTrack).offset || 0);
                    }
                }), (track as InstrumentTrack).onsets.map(t => t));
                part.loop = (track as InstrumentTrack).loop;
                const trackDuration = (track as InstrumentTrack).onsets.reduce((max, t) => Math.max(max, t), 0) + 1; // Add buffer
                if(part.loop) part.loopEnd = trackDuration;
                maxLoopDuration = Math.max(maxLoopDuration, trackDuration);
                part.start(0);
                partsRef.current.set(track.id, part);
            } else if (track.type === TrackType.BEAT) {
                const trackEvents = (track as BeatTrack).events.map(event => {
                    const sampleInfo = sampleLibrary.getSampleByName(event.sample);
                    if (!sampleInfo) return null;
                    const player = getPlayer(sampleInfo.path);
                    return {
                        time: event.time,
                        velocity: event.velocity,
                        player
                    };
                }).filter(Boolean) as {time: number, velocity: number, player: any}[];

                const part = new Tone.Part(((time, value) => {
                    if (!track.muted) {
                        // Set volume (wrapper handles applying gain)
                        value.player.volume.value = Tone.gainToDb((track as BeatTrack).volume * value.velocity);
                        value.player.start(time);
                    }
                }), trackEvents);
                part.loop = (track as BeatTrack).loop;
                const trackDuration = (track as BeatTrack).events.reduce((max, e) => Math.max(max, e.time), 0) + 1; // Add buffer
                if(part.loop) part.loopEnd = trackDuration;
                maxLoopDuration = Math.max(maxLoopDuration, trackDuration);
                part.start(0);
                partsRef.current.set(track.id, part);
            }
        });
        
        // 5. Adjust global loop and restart transport if it was playing
        if(maxLoopDuration > 0) {
            const measures = Math.ceil(maxLoopDuration / (240 / bpm));
            Tone.Transport.loopEnd = `${measures}m`;
        } else {
            Tone.Transport.loopEnd = '4m';
        }

        if(isPlaying) {
            Tone.Transport.start();
        }

      } catch (error) {
          console.error("Failed to sync with Tone.js:", error);
      } finally {
          setIsSyncing(false);
      }
    };
    
    syncTone();

  }, [tracks, bpm, getPlayer, isPlaying]);


  const handlePlayPause = () => {
    if (isSyncing) return;
    if (Tone.context.state !== 'running') {
        Tone.start();
    }
    
    if (isPlaying) {
        Tone.Transport.stop();
    } else {
        Tone.Transport.start();
    }
    setIsPlaying(!isPlaying);
  };
  
  useEffect(() => {
     // Ensure isPlaying state is in sync with transport
     const id = Tone.Transport.on('start stop', () => {
         setIsPlaying(Tone.Transport.state === 'started');
     });
     return () => {
        if(typeof id === 'number') Tone.Transport.clear(id);
     }
  }, []);

  const handleAddTrack = (trackData: Omit<Track, 'id'>) => {
    const newTrack: Track = { ...trackData, id: uuidv4() } as Track;
    setTracks(prev => [...prev, newTrack]);
  };
  
  const handleUpdateTrack = (updatedTrack: Track) => {
      setTracks(prev => prev.map(t => t.id === updatedTrack.id ? updatedTrack : t));
  };
  
  const handleDeleteTrack = (trackId: string) => {
      setTracks(prev => prev.filter(t => t.id !== trackId));
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col font-sans">
      <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-700">
        <h1 className="text-2xl font-bold">AI Music Studio</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label htmlFor="bpm" className="text-sm font-medium">BPM</label>
            <input
              type="number"
              id="bpm"
              value={bpm}
              onChange={(e) => setBpm(parseInt(e.target.value, 10))}
              className="w-20 bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-center"
            />
          </div>
          <div className="flex items-center space-x-2">
             <label htmlFor="quantize" className="text-sm font-medium">Quantize</label>
             <select
                id="quantize"
                value={quantizeValue}
                onChange={(e) => setQuantizeValue(parseFloat(e.target.value))}
                className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1"
             >
                {QUANTIZE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
             </select>
          </div>
          <button 
            onClick={handlePlayPause} 
            disabled={isSyncing}
            className={`p-3 rounded-full transition-all ${isSyncing ? 'bg-gray-600 animate-pulse' : isPlaying ? 'bg-red-600' : 'bg-green-600'} disabled:cursor-not-allowed`}
          >
            {isSyncing ? <StopIcon /> : (isPlaying ? <StopIcon /> : <PlayIcon />)}
          </button>
        </div>
      </header>

      <main className="flex-grow p-4 space-y-4 overflow-y-auto">
        {tracks.length === 0 ? (
            <div className="text-center text-gray-500 py-20">
                <h2 className="text-3xl font-bold">Your canvas is empty.</h2>
                <p className="mt-2">Add an instrument or a beat to get started.</p>
            </div>
        ) : (
            tracks.map(track => <TrackLane key={track.id} track={track} onUpdate={handleUpdateTrack} onDelete={handleDeleteTrack} />)
        )}
      </main>

      <footer className="flex-shrink-0 p-4 border-t border-gray-700 flex items-center justify-center space-x-4">
        <button 
            onClick={() => setIsComposerOpen(true)} 
            disabled={isSyncing}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
          <PlusIcon /> Add Instrument
        </button>
        <button 
            onClick={() => setIsBeatMakerOpen(true)}
            disabled={isSyncing}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
          <PlusIcon /> Add Beat
        </button>
      </footer>

      {isComposerOpen && (
        <Composer
          onClose={() => setIsComposerOpen(false)}
          onCompose={handleAddTrack}
          bpm={bpm}
          quantizeValue={quantizeValue}
        />
      )}
      {isBeatMakerOpen && (
        <BeatMaker
          onClose={() => setIsBeatMakerOpen(false)}
          onBeatCreated={handleAddTrack}
          bpm={bpm}
        />
      )}
    </div>
  );
};

export default App;


const createDrumVoice = (type: string): Tone.ToneAudioNode => {
  switch (type) {
    case 'kick':
      return new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 4,
        envelope: { attack: 0.001, decay: 0.2, sustain: 0.0, release: 0.5 }
      });
    case 'snare':
      return new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.2, sustain: 0 }
      });
    case 'hihat':
      return new Tone.MetalSynth({
        frequency: 250,
        envelope: { attack: 0.001, decay: 0.1, release: 0.1 }
      });
    case 'clap':
      return new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.15, sustain: 0 }
      });
    case 'tom':
      return new Tone.MembraneSynth({
        pitchDecay: 0.08,
        octaves: 2,
        envelope: { attack: 0.005, decay: 0.3, sustain: 0.0, release: 0.6 }
      });
    default:
      return new Tone.NoiseSynth();
  }
};

const getDrumVoice = (type: string): Tone.ToneAudioNode => {
    if (!drumVoicePoolsRef.current.has(type)) {
      // create a small voice pool to avoid overlapping start times on the same voice
      const poolSize = 4;
      const pool: Tone.ToneAudioNode[] = Array.from({ length: poolSize }, () => createDrumVoice(type));
      drumVoicePoolsRef.current.set(type, pool);
      drumVoiceIndexRef.current.set(type, 0);
    }
    const pool = drumVoicePoolsRef.current.get(type)!;
    const idx = drumVoiceIndexRef.current.get(type)!;
    const voice = pool[idx % pool.length];
    drumVoiceIndexRef.current.set(type, (idx + 1) % pool.length);
    return voice;
  };