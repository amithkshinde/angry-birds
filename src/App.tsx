import { useState } from 'react';
import { GameCanvas } from './canvas/GameCanvas';
import { LevelSelectScreen } from './app/screens/LevelSelectScreen';
import './App.css';

function App() {
  const [currentLevelId, setCurrentLevelId] = useState<string | null>(null);

  return (
    <div className="app-root">
      {currentLevelId ? (
        <GameCanvas levelId={currentLevelId} onFinish={setCurrentLevelId} />
      ) : (
        <LevelSelectScreen onSelectLevel={setCurrentLevelId} />
      )}
    </div>
  );
}

export default App;
