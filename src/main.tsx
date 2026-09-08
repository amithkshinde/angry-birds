import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { SpriteAtlas } from './game/render/SpriteAtlas';
import { SpriteManifest } from './game/config/SpriteManifest';
import './index.css';

// Kick off sprite loading once, at startup — non-blocking (the flat-color
// fallback means there's no loading screen to gate on) and idempotent, so
// levels never need to think about it.
for (const { key, src } of SpriteManifest) {
  SpriteAtlas.preload(key, src);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
