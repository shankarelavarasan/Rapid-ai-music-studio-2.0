// Fix: Created types.ts to define shared data structures for the application.
export interface SampleInfo {
  name: string;
  path: string;
}

export enum TrackType {
  INSTRUMENT = 'instrument',
  BEAT = 'beat',
  AUDIO = 'audio',
}

export enum PitchType {
    HIGH = 'high',
    LOW = 'low',
    MID = 'mid',
}

export interface ExpressiveNote {
    time: number;
    duration: number;
    pitch: PitchType;
}

export interface BeatEvent {
  sample: string;
  time: number;
  velocity: number;
}

interface BaseTrack {
  id: string;
  name: string;
  volume: number;
  muted: boolean;
  loop: boolean;
}

export interface InstrumentTrack extends BaseTrack {
  type: TrackType.INSTRUMENT;
  filePath: string;
  onsets: number[];
  trimStart: number;
  trimEnd: number;
  offset: number;
}

export interface BeatTrack extends BaseTrack {
  type: TrackType.BEAT;
  events: BeatEvent[];
}

export interface AudioTrack extends BaseTrack {
    type: TrackType.AUDIO;
    filePath: string;
    onsets: number[];
}

export type Track = InstrumentTrack | BeatTrack | AudioTrack;
