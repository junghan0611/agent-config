#!/usr/bin/env node

import { YoutubeTranscript } from 'youtube-transcript-plus';

const args = process.argv.slice(2);
let videoInput = null;
let lang = 'en';

// Parse args
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--lang' && args[i + 1]) {
    lang = args[++i];
  } else if (args[i] === '--list') {
    lang = '__list__';
  } else if (!args[i].startsWith('-')) {
    videoInput = args[i];
  }
}

if (!videoInput) {
  console.error('Usage: transcript.js <video-id-or-url> [--lang en] [--list]');
  console.error('');
  console.error('Options:');
  console.error('  --lang <code>  Language code (default: en)');
  console.error('  --list         List available subtitle languages');
  console.error('');
  console.error('Examples:');
  console.error('  transcript.js dQw4w9WgXcQ');
  console.error('  transcript.js dQw4w9WgXcQ --lang en');
  console.error('  transcript.js dQw4w9WgXcQ --list');
  console.error('  transcript.js https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  process.exit(1);
}

// Extract video ID if full URL is provided
let extractedId = videoInput;
if (videoInput.includes('youtube.com') || videoInput.includes('youtu.be')) {
  const match = videoInput.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (match) {
    extractedId = match[1];
  }
}

try {
  if (lang === '__list__') {
    // Trick: request impossible lang to get availableLangs from error
    try {
      await YoutubeTranscript.fetchTranscript(extractedId, { lang: 'xx-impossible' });
    } catch (e) {
      if (e.availableLangs) {
        console.log('Available languages:', e.availableLangs.join(', '));
      } else {
        console.error('Error:', e.message);
        process.exit(1);
      }
    }
  } else {
    const transcript = await YoutubeTranscript.fetchTranscript(extractedId, { lang });

    for (const entry of transcript) {
      const timestamp = formatTimestamp(entry.offset / 1000);
      const text = decodeEntities(entry.text);
      console.log(`[${timestamp}] ${text}`);
    }
  }
} catch (error) {
  if (error.availableLangs) {
    console.error(`Language "${lang}" not available.`);
    console.error('Available:', error.availableLangs.join(', '));
  } else {
    console.error('Error:', error.message);
  }
  process.exit(1);
}

function decodeEntities(str) {
  return str
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

function formatTimestamp(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}
