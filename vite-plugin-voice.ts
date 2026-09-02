import type { Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Server-side ElevenLabs bridge: /api/voice
//
// Two reasons this lives on the server rather than in the browser:
// the API key never reaches the client, and generated audio is CACHED
// to disk keyed by (text + voice + model). A line already spoken is
// served from the cache forever after — you pay for each line once, no
// matter how many times a scene replays.

const CACHE_DIR = 'voice-cache';

export interface VoiceRequest {
  text: string;
  voiceId: string;
  modelId?: string;
}

export function voicePlugin(env: Record<string, string>): Plugin {
  const apiKey = env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY || '';

  return {
    name: 'dramaton-voice-bridge',
    configureServer(server) {
      server.middlewares.use('/api/voice', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end('POST only');
        }
        if (!apiKey) {
          res.statusCode = 501;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({
            error: 'No ELEVENLABS_API_KEY in .env.local — falling back to browser speech.',
          }));
        }

        let body = '';
        for await (const chunk of req) body += chunk;

        let parsed: VoiceRequest;
        try {
          parsed = JSON.parse(body);
        } catch {
          res.statusCode = 400;
          return res.end('bad json');
        }

        const { text, voiceId } = parsed;
        const modelId = parsed.modelId || 'eleven_multilingual_v2';
        if (!text?.trim() || !voiceId) {
          res.statusCode = 400;
          return res.end('text and voiceId required');
        }

        // Cache key covers everything that changes the audio.
        const key = createHash('sha256')
          .update(`${voiceId}|${modelId}|${text}`)
          .digest('hex');
        mkdirSync(CACHE_DIR, { recursive: true });
        const cached = join(CACHE_DIR, `${key}.mp3`);

        if (existsSync(cached)) {
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('X-Voice-Cache', 'hit');
          return res.end(readFileSync(cached));
        }

        try {
          const r = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            {
              method: 'POST',
              headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
              body: JSON.stringify({ text, model_id: modelId }),
            },
          );
          if (!r.ok) {
            const detail = await r.text();
            console.warn(`[voice] ElevenLabs ${r.status}: ${detail.slice(0, 160)}`);
            res.statusCode = r.status;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: `ElevenLabs ${r.status}`, detail }));
          }
          const audio = Buffer.from(await r.arrayBuffer());
          writeFileSync(cached, audio);
          console.log(`[voice] generated ${audio.length}b -> ${key.slice(0, 8)}`);
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('X-Voice-Cache', 'miss');
          return res.end(audio);
        } catch (e) {
          console.warn('[voice] request failed:', e);
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: 'voice request failed' }));
        }
      });
    },
  };
}
