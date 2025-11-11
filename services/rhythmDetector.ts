
// A TypeScript implementation of the simple energy-based onset detector
export const detectOnsets = (audioBuffer: AudioBuffer): number[] => {
  const samples = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const onsets: number[] = [];

  // ~10ms frame size
  const frameSize = Math.max(1024, Math.round(sampleRate / 100));
  const energies: number[] = [];

  // Calculate energy for each frame
  for (let i = 0; i < samples.length; i += frameSize) {
    let sum = 0;
    const end = Math.min(i + frameSize, samples.length);
    for (let j = i; j < end; j++) {
      sum += Math.abs(samples[j]);
    }
    energies.push(sum / (end - i));
  }

  if (energies.length === 0) {
    return [];
  }

  // Compute adaptive threshold (mean + k*std)
  const mean = energies.reduce((a, b) => a + b) / energies.length;
  const variance = energies.map((e) => (e - mean) ** 2).reduce((a, b) => a + b) / energies.length;
  const std = Math.sqrt(variance);
  const sensitivity = 1.0;
  const threshold = mean + std * sensitivity;

  // Find peaks above the threshold
  for (let i = 1; i < energies.length - 1; i++) {
    if (
      energies[i] > threshold &&
      energies[i] > energies[i - 1] &&
      energies[i] >= energies[i + 1]
    ) {
      const timeSec = (i * frameSize) / sampleRate;
      onsets.push(timeSec);
    }
  }

  return onsets;
};
