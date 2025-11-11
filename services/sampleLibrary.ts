// Use reliable, CORS-enabled CDNs for all audio samples
import { SampleInfo } from '../types';

// Use stable UNPKG CDN for instruments to prevent future fetch errors
const SAMPLES_BASE_URL_INSTRUMENTS = 'https://unpkg.com/tonejs-instruments@4.5.0/samples/';

// Recommended Permanent Fix — All Drum Samples on Mixkit
// Use synthetic Tone.js identifiers for offline-safe playback
import { SampleInfo } from '../types';

// Offline-safe sample mappings using Tone.js synthetic identifiers
// Drum samples use tone:drum:<type>
// Instrument samples use tone:instrument:<family>:<note>

const DRUM_SAMPLES: Record<string, string> = {
  kick: 'tone:drum:kick',
  snare: 'tone:drum:snare',
  hihat: 'tone:drum:hihat',
  clap: 'tone:drum:clap',
  tom: 'tone:drum:tom',
};

const instrumentSampleMap: Record<string, SampleInfo[]> = {
  piano: [
    { name: 'Piano C4', path: 'tone:instrument:piano:C4' },
    { name: 'Piano E4', path: 'tone:instrument:piano:E4' },
    { name: 'Piano G4', path: 'tone:instrument:piano:G4' },
  ],
  guitar: [
    { name: 'Acoustic G3', path: 'tone:instrument:guitar:G3' },
    { name: 'Acoustic B3', path: 'tone:instrument:guitar:B3' },
    { name: 'Acoustic D4', path: 'tone:instrument:guitar:D4' },
  ],
  violin: [
    { name: 'Violin A4', path: 'tone:instrument:violin:A4' },
    { name: 'Violin C5', path: 'tone:instrument:violin:C5' },
    { name: 'Violin E5', path: 'tone:instrument:violin:E5' },
  ],
  flute: [
    { name: 'Flute C5', path: 'tone:instrument:flute:C5' },
    { name: 'Flute E5', path: 'tone:instrument:flute:E5' },
    { name: 'Flute G5', path: 'tone:instrument:flute:G5' },
  ],
  bass_guitar: [
    { name: 'Bass E2', path: 'tone:instrument:bass:E2' },
    { name: 'Bass G2', path: 'tone:instrument:bass:G2' },
    { name: 'Bass A2', path: 'tone:instrument:bass:A2' },
  ],
  saxophone: [
    { name: 'Sax C4', path: 'tone:instrument:sax:C4' },
    { name: 'Sax E4', path: 'tone:instrument:sax:E4' },
    { name: 'Sax G4', path: 'tone:instrument:sax:G4' },
  ],
  synth: [
    { name: 'Synth Pad C4', path: 'tone:instrument:synthpad:C4' },
    { name: 'Synth Lead G4', path: 'tone:instrument:synthlead:G4' },
    { name: 'Synth Bass A2', path: 'tone:instrument:synthbass:A2' },
  ],
  electric_flute: [
    { name: 'E-Flute C5', path: 'tone:instrument:flute:C5' },
    { name: 'E-Flute E5', path: 'tone:instrument:flute:E5' },
  ],
};

class SampleLibrary {
  public getSamplesFor(instrument: string): SampleInfo[] {
    if (instrument === 'drums') {
      return Object.keys(DRUM_SAMPLES).map(name => ({ name, path: DRUM_SAMPLES[name] }));
    }
    return instrumentSampleMap[instrument] || [];
  }

  public getSampleByName(name: string): SampleInfo | undefined {
    const lowerCaseName = name.toLowerCase();
    if (DRUM_SAMPLES[lowerCaseName]) {
      return { name: lowerCaseName, path: DRUM_SAMPLES[lowerCaseName] };
    }
    return undefined;
  }

  public isToneIdentifier(path: string): boolean {
    return path.startsWith('tone:');
  }
}

export const sampleLibrary = new SampleLibrary();