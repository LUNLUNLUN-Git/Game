import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './GameEngine';
import { GameState } from './types';
import { RenderSystem } from './RenderSystem';
import { audioManager } from './AudioManager';

export const GameCanvas: React.FC<{
  onStateChange: (state: GameState, engine: GameEngine) => void;
}> = ({ onStateChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const joystickRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
  const touchOffset = useRef<{ x: number, y: number } | null>(null);
  const touchStartPos = useRef<{ x: number, y: number } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const engine = new GameEngine(() => {
      // Don't call react state on every frame to avoid lag, only when important things happen?
      // Actually doing it on frame might be too heavy? We will throttle the UI sync.
    });
    engineRef.current = engine;

    let uiUpdateTimer = 0;
    
    // UI update throttle
    const handleUiSync = () => {
        const now = performance.now();
        if (now - uiUpdateTimer > 100 || engine.state.status !== 'playing') {
          uiUpdateTimer = now;
          onStateChange({ ...engine.state }, engine);
        }
    };
    engine.onStateChange = handleUiSync;

    // Initial sync
    onStateChange({ ...engine.state }, engine);

    const render = new RenderSystem(canvasRef.current, ctx);

    let animationFrameId: number;

    const loop = (time: number) => {
      // Calculate Input
      let dx = 0;
      let dy = 0;
      if (keysRef.current['w'] || keysRef.current['ArrowUp']) dy -= 1;
      if (keysRef.current['s'] || keysRef.current['ArrowDown']) dy += 1;
      if (keysRef.current['a'] || keysRef.current['ArrowLeft']) dx -= 1;
      if (keysRef.current['d'] || keysRef.current['ArrowRight']) dx += 1;

      // Add touch/joystick input
      if (touchStartPos.current && touchOffset.current) {
         dx = touchOffset.current.x;
         dy = touchOffset.current.y;
         engine.state.joystick.active = true;
         engine.state.joystick.origin.x = touchStartPos.current.x;
         engine.state.joystick.origin.y = touchStartPos.current.y;
         engine.state.joystick.current.x = touchStartPos.current.x + dx * 50;
         engine.state.joystick.current.y = touchStartPos.current.y + dy * 50;
      } else {
         engine.state.joystick.active = false;
      }

      engine.setInput(dx, dy);
      engine.update(time);
      render.draw(engine.state);

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    // Initial resize
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        engine.setViewport(canvasRef.current.width, canvasRef.current.height);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    // Key listeners
    const onKeyDown = (e: KeyboardEvent) => {
        audioManager.init();
        keysRef.current[e.key.toLowerCase()] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => keysRef.current[e.key.toLowerCase()] = false;
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Touch handlers for full screen drag
  const onTouchStart = (e: React.TouchEvent) => {
    // Init audio gracefully
    audioManager.init();
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    touchOffset.current = { x: 0, y: 0 };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const dx = e.touches[0].clientX - touchStartPos.current.x;
    const dy = e.touches[0].clientY - touchStartPos.current.y;
    const maxDist = 50;
    const dist = Math.hypot(dx, dy);
    
    if (dist > maxDist) {
        touchOffset.current = { x: (dx/dist), y: (dy/dist) };
    } else {
        touchOffset.current = { x: dx / maxDist, y: dy / maxDist };
    }
  };

  const onTouchEnd = () => {
    touchStartPos.current = null;
    touchOffset.current = null;
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full block bg-[#7fbf45] touch-none"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    />
  );
};
