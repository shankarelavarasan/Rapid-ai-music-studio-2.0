import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { BeatEvent } from '../types';

// Initialize with API Key from environment variables if available; otherwise, fall back to local composition.
const apiKey = (process.env.API_KEY ?? process.env.GEMINI_API_KEY ?? '').trim();
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

function pickSample(drumSamples: string[], keywords: string[]): string | null {
  const lower = drumSamples.map(s => ({ s, l: s.toLowerCase() }));
  for (const kw of keywords) {
    const found = lower.find(x => x.l.includes(kw));
    if (found) return found.s;
  }
  return drumSamples.length > 0 ? drumSamples[0] : null;
}

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

function quantizeToGrid(t: number, grid: number) { return Math.round(t / grid) * grid; }

export class ProfessionalBeatComposer {
  private userOnsets: number[];
  private bpm: number;
  private drumSamples: string[];

  constructor(config: { userOnsets: number[]; bpm: number; drumSamples: string[] }) {
    this.userOnsets = config.userOnsets;
    this.bpm = config.bpm;
    this.drumSamples = config.drumSamples;
  }

  public async compose(): Promise<BeatEvent[]> {
    const twoBarDuration = (60.0 / this.bpm) * 8;

    // If AI key is unavailable, synthesize a musical beat locally.
    if (!ai) {
      const quarter = 60.0 / this.bpm;
      const eighth = quarter / 2.0;

      const kick = pickSample(this.drumSamples, ['kick', 'bd', 'bass drum']);
      const snare = pickSample(this.drumSamples, ['snare', 'sd']);
      const hat = pickSample(this.drumSamples, ['hihat', 'hh', 'hat']);

      const events: BeatEvent[] = [];

      // Hi-hats on 8th notes
      if (hat) {
        for (let t = 0; t < twoBarDuration - 1e-6; t += eighth) {
          events.push({ sample: hat, time: clamp(t, 0, twoBarDuration), velocity: 0.35 });
        }
      }

      // Snares on 2 and 4 of each bar (i.e., quarter*[1,3,5,7])
      if (snare) {
        const snTimes = [1, 3, 5, 7].map(n => n * quarter);
        for (const t of snTimes) {
          if (t < twoBarDuration) events.push({ sample: snare, time: t, velocity: 0.6 });
        }
      }

      // Kicks from user taps, quantized to 8th grid
      if (kick) {
        for (const t of this.userOnsets) {
          const tq = clamp(quantizeToGrid(t % twoBarDuration, eighth), 0, twoBarDuration - 1e-6);
          events.push({ sample: kick, time: tq, velocity: 0.7 });
        }
        // If user didn't tap, add a basic four-on-the-floor
        if (this.userOnsets.length === 0) {
          const base = [0, 2, 4, 6].map(n => n * quarter);
          for (const t of base) {
            if (t < twoBarDuration) events.push({ sample: kick, time: t, velocity: 0.75 });
          }
        }
      }

      // Sort by time
      events.sort((a, b) => a.time - b.time);
      return events;
    }

    // AI path
    const prompt = `
      Create a professional 2-bar drum beat in a JSON array format.
      The BPM is ${this.bpm}. The available drum samples are: ${this.drumSamples.join(', ')}.
      The user tapped a rhythm with these timings in seconds: ${this.userOnsets.join(', ')}.
      Analyze the user's rhythm for its density and feel (e.g., simple, busy, swing, straight) and create a suitable, professional-sounding beat that enhances the user's idea.
      Each object in the array should be a "BeatEvent" with three properties:
      1. "sample": string (one of [${this.drumSamples.map(s => `"${s}"`).join(', ')}])
      2. "time": number (the time in seconds from the start of the loop)
      3. "velocity": number (from 0.0 to 1.0)
      The 2-bar loop duration is ${twoBarDuration} seconds. All event times should be within this duration.
      Return only the JSON array of BeatEvent objects.
    `;

    try {
      const response: GenerateContentResponse = await ai!.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sample: { type: Type.STRING, enum: this.drumSamples },
                time: { type: Type.NUMBER },
                velocity: { type: Type.NUMBER },
              },
              required: ["sample", "time", "velocity"],
            }
          }
        }
      });

      const jsonStr = response.text.trim();
      const generatedEvents = JSON.parse(jsonStr);
      if (Array.isArray(generatedEvents) && generatedEvents.every(e => 'sample' in e && 'time' in e && 'velocity' in e)) {
        return generatedEvents as BeatEvent[];
      }
      console.error("AI response was not in the expected format:", jsonStr);
      return [];
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      return [];
    }
  }
}

export class ProfessionalInstrumentComposer {
  private userOnsets: number[];
  private bpm: number;

  constructor(config: { userOnsets: number[]; bpm: number; }) {
    this.userOnsets = config.userOnsets;
    this.bpm = config.bpm;
  }

  public async compose(): Promise<number[]> {
    const twoBarDuration = (60.0 / this.bpm) * 8;

    if (!ai) {
      const quarter = 60.0 / this.bpm;
      const eighth = quarter / 2.0;
      const base = this.userOnsets.length > 0 ? this.userOnsets : [0, 2 * quarter, 4 * quarter, 6 * quarter];
      const quantized = base.map(t => clamp(quantizeToGrid(t % twoBarDuration, eighth), 0, twoBarDuration - 1e-6));
      // Add simple variations: duplicate with slight offset on some steps
      const withGhosts: number[] = [...quantized];
      for (const t of quantized) {
        const ghost = t + 0.125 * quarter;
        if (ghost < twoBarDuration) withGhosts.push(ghost);
      }
      withGhosts.sort((a, b) => a - b);
      return withGhosts;
    }

    const prompt = `
      You are a rhythm generator for a single musical instrument.
      The BPM is ${this.bpm}.
      A user tapped a rhythm with these timings in seconds: ${this.userOnsets.join(', ')}.
      Analyze the user's rhythm for its density and feel and create a new, interesting, professional-sounding rhythm based on it.
      The new rhythm should last for at least 2 bars (a duration of ${twoBarDuration} seconds).
      Return a JSON array of numbers, where each number is the time in seconds for a note to be played.
      Return only the JSON array.
    `;

    try {
      const response = await ai!.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: { type: Type.ARRAY, items: { type: Type.NUMBER } }
        }
      });
      const jsonStr = response.text.trim();
      const generatedOnsets = JSON.parse(jsonStr);

      if (Array.isArray(generatedOnsets) && generatedOnsets.every(o => typeof o === 'number')) {
        return generatedOnsets as number[];
      }
      console.error("AI response was not in the expected format:", jsonStr);
      return this.userOnsets;
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      return this.userOnsets;
    }
  }
}