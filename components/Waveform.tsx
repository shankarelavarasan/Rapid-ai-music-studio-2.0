// Fix: Created Waveform.tsx component to visualize audio tracks.
import React, { useEffect, useRef, memo } from 'react';

interface WaveformProps {
  filePath: string;
}

const isToneIdentifier = (path: string) => path.startsWith('tone:');

const drawWaveform = (
  canvas: HTMLCanvasElement,
  audioBuffer: AudioBuffer,
  color: string = '#a78bfa' // purple-400
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const data = audioBuffer.getChannelData(0);
  const step = Math.ceil(data.length / width);
  const amp = height / 2;

  ctx.clearRect(0, 0, width, height);
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.beginPath();
  
  // Set origin to the vertical center
  ctx.translate(0, height / 2);

  for (let i = 0; i < width; i++) {
    let min = 1.0;
    let max = -1.0;

    for (let j = 0; j < step; j++) {
      const idx = i * step + j;
      if (idx >= data.length) break;
      const datum = data[idx];
      if (datum < min) min = datum;
      if (datum > max) max = datum;
    }
    
    ctx.moveTo(i, min * amp);
    ctx.lineTo(i, max * amp);
  }
  
  ctx.stroke();
  // Reset transform
  ctx.setTransform(1, 0, 0, 1, 0, 0);
};

const drawProceduralWaveform = (
  canvas: HTMLCanvasElement,
  color: string = '#a78bfa'
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const width = canvas.width;
  const height = canvas.height;
  const amp = height / 2;
  ctx.clearRect(0, 0, width, height);
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.translate(0, height / 2);
  // Generate a pseudo waveform (sine + noise)
  for (let x = 0; x < width; x++) {
    const t = x / width;
    const sine = Math.sin(2 * Math.PI * (t * 4));
    const noise = (Math.random() - 0.5) * 0.2;
    const y = (sine * 0.8 + noise) * amp;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
};

const audioBufferCache: { [key: string]: Promise<AudioBuffer> } = {};
const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

const Waveform: React.FC<WaveformProps> = ({ filePath }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    }
    
    let isCancelled = false;
    
    const loadAndDraw = async () => {
        try {
            if (isToneIdentifier(filePath)) {
                // Draw a procedural waveform for synthetic identifiers
                if (!isCancelled && canvas) {
                    drawProceduralWaveform(canvas);
                }
                return;
            }
            if (!audioBufferCache[filePath]) {
                 audioBufferCache[filePath] = fetch(filePath, { mode: 'cors' })
                    .then(response => {
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        return response.arrayBuffer();
                    })
                    .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer));
            }
            const audioBuffer = await audioBufferCache[filePath];
            if (!isCancelled && canvas) {
                drawWaveform(canvas, audioBuffer);
            }
        } catch (error) {
            console.warn('Waveform: fetch/decode failed, drawing placeholder. Reason:', error);
            if (!isCancelled && canvas) {
                drawProceduralWaveform(canvas);
            }
            delete audioBufferCache[filePath];
        }
    };

    loadAndDraw();
    
    return () => {
        isCancelled = true;
    };
  }, [filePath]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
};

export default memo(Waveform);
