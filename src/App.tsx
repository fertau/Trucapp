// Trucapp - Build Trigger edcb59c
import { useState, useEffect, useRef } from 'react';
import { MatchScreen } from './components/MatchScreen';
import { SplashScreen } from './components/SplashScreen';
import { PlayerSelection } from './components/PlayerSelection';
import { TeamConfiguration } from './components/TeamConfiguration';
import { HistoryScreen } from './components/HistoryScreen';
import { ProfileScreen } from './components/ProfileScreen';
// import { AccountSelector } from './components/AccountSelector';
import { HomeScreen } from './components/HomeScreen';
import { PicaPicaSetup } from './components/PicaPicaSetup';
import { PicaPicaHub } from './components/PicaPicaHub';
import { Leaderboard } from './components/Leaderboard';

import { useMatchStore } from './store/useMatchStore';
import { useHistoryStore } from './store/useHistoryStore';
import { useAuthStore } from './store/useAuthStore';
import { usePicaPicaStore } from './store/usePicaPicaStore';
import { usePairStore } from './store/usePairStore';
import { useUserStore } from './store/useUserStore';
import type { Player } from './types';
import './index.css';

// Updated Flow:
// 1. Account Selection (if no auth)
// 2. Home Screen
// 3. Setup Flow
// 4. Match OR PicaPica Setup -> Hub -> SubMatch
// 5. Returns to PicaHub -> Home

type AppStep = 'AUTH' | 'HOME' | 'SETUP_PLAYERS_COUNT' | 'SETUP_PLAYERS_SELECT' | 'SETUP_TEAMS' |
  'MATCH' | 'HISTORY' | 'LEADERBOARD' | 'SOCIAL' | 'PROFILE' |
  'PICAPICA_SETUP' | 'PICAPICA_HUB';
type HistoryTab = 'SUMMARY' | 'MATCHES' | 'H2H' | 'RANKING';

import { SocialHub } from './components/SocialHub';
import { AccountSelector } from './components/AccountSelector';

function App() {
  const currentUserId = useAuthStore(state => state.currentUserId);

  const [step, setStep] = useState<AppStep>(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedMatchId = params.get('matchId');
    if (sharedMatchId) return 'MATCH';

    const savedStep = localStorage.getItem('trucapp-app-step');
    if (savedStep === 'MATCH' && !useMatchStore.getState().id) return 'HOME';
    if (savedStep === 'STATS') return 'HOME'; // Migration: STATS is now part of HISTORY
    return (savedStep as AppStep) || 'HOME';
  });

  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('trucapp-splash-seen'));
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [teamsConfig, setTeamsConfig] = useState<{ nosotros: Player[], ellos: Player[] } | null>(null);
  const [activeSubMatchId, setActiveSubMatchId] = useState<string | null>(null);
  const [historyInitialTab, setHistoryInitialTab] = useState<HistoryTab>('SUMMARY');
  const isFinishingMatchRef = useRef(false);

  // --- HOOKS (Must be at top level) ---

  useEffect(() => {
    localStorage.setItem('trucapp-app-step', step);
  }, [step]);

  useEffect(() => {
    useHistoryStore.getState().fetchMatches();
    useUserStore.getState().fetchPlayers();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedMatchId = params.get('matchId');
    if (sharedMatchId) {
      useMatchStore.getState().listenToMatch(sharedMatchId);
    }
  }, []);

  // --- ACTIONS ---

  const resetMatch = useMatchStore(state => state.resetMatch);
  const setPlayers = useMatchStore(state => state.setPlayers);
  const setTargetScore = useMatchStore(state => state.setTargetScore);
  const addMatchToHistory = useHistoryStore(state => state.addMatch);

  const picaPicaActive = usePicaPicaStore(state => state.isActive);
  const picaPicaMatches = usePicaPicaStore(state => state.matches);
  const picaPicaUpdate = usePicaPicaStore(state => state.updateMatchResult);
  const picaPicaReset = usePicaPicaStore(state => state.reset);

  const setMetadata = useMatchStore(state => state.setMetadata);
  const setPairId = useMatchStore(state => state.setPairId);
  const recordPairResult = usePairStore(state => state.recordMatchResult);

  const startMatch = (
    teams: { nosotros: Player[], ellos: Player[] },
    metadata?: { location: string, date: number, teamNames?: { nosotros: string, ellos: string } },
    pairIds?: { nosotros?: string, ellos?: string },
    targetScore?: number
  ) => {
    if (playerCount === 6) {
      setTeamsConfig(teams);
      setStep('PICAPICA_SETUP');
    } else {
      resetMatch(playerCount === 2 ? '1v1' : '2v2');
      if (targetScore) {
        useMatchStore.getState().setTargetScore(targetScore);
      }
      const generateTeamName = (players: Player[]) => {
        if (players.length === 0) return 'Equipo';
        return players.map(p => p.name).join(' / ');
      };
      const nosotrosName = metadata?.teamNames?.nosotros || generateTeamName(teams.nosotros);
      const ellosName = metadata?.teamNames?.ellos || generateTeamName(teams.ellos);
      useMatchStore.getState().setTeamName('nosotros', nosotrosName);
      useMatchStore.getState().setTeamName('ellos', ellosName);
      setPlayers('nosotros', teams.nosotros.map(p => p.id));
      setPlayers('ellos', teams.ellos.map(p => p.id));
      if (metadata) {
        setMetadata(metadata.location, metadata.date);
      }
      if (pairIds) {
        if (pairIds.nosotros) setPairId('nosotros', pairIds.nosotros);
        if (pairIds.ellos) setPairId('ellos', pairIds.ellos);
      }
      setStep('MATCH');
    }
  };

  const handleSplashFinish = () => {
    sessionStorage.setItem('trucapp-splash-seen', 'true');
    setShowSplash(false);
  };

  const handleFinishMatch = async (next: 'home' | 'rematch' = 'home') => {
    if (isFinishingMatchRef.current) return;
    isFinishingMatchRef.current = true;

    const matchState = useMatchStore.getState();
    try {
      if (!activeSubMatchId) {
        await addMatchToHistory(matchState);
      }

      if (activeSubMatchId && picaPicaActive) {
        if (matchState.winner) {
          picaPicaUpdate(activeSubMatchId, matchState.winner, matchState.teams.nosotros.score, matchState.teams.ellos.score);
          await addMatchToHistory(matchState);
        }
        setActiveSubMatchId(null);
        setStep('PICAPICA_HUB');
      } else {
        if (matchState.pairs) {
          if (matchState.pairs.nosotros && matchState.winner) {
            recordPairResult(matchState.pairs.nosotros, matchState.winner === 'nosotros');
          }
          if (matchState.pairs.ellos && matchState.winner) {
            recordPairResult(matchState.pairs.ellos, matchState.winner === 'ellos');
          }
        }
        setStep(next === 'rematch' ? 'SETUP_PLAYERS_COUNT' : 'HOME');
      }
    } finally {
      isFinishingMatchRef.current = false;
    }
  };

  // --- RENDERERS ---

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }


  if (!currentUserId) {
    return <AccountSelector onLoginSuccess={() => setStep('HOME')} />;
  }

  const effectiveStep: AppStep = !currentUserId && step !== 'HOME' ? 'AUTH' : step;

  if (effectiveStep === 'MATCH') {
    return <MatchScreen onFinish={handleFinishMatch} />;
  }

  if (effectiveStep === 'HISTORY') {
    return <HistoryScreen onBack={() => setStep('HOME')} initialTab={historyInitialTab} />;
  }

  if (effectiveStep === 'LEADERBOARD') {
    return <Leaderboard onBack={() => setStep('HOME')} />;
  }

  if (effectiveStep === 'SOCIAL') {
    return <SocialHub onBack={() => setStep('HOME')} />;
  }

  if (effectiveStep === 'PROFILE') {
    return <ProfileScreen onBack={() => setStep('HOME')} />;
  }

  if (effectiveStep === 'SETUP_TEAMS') {
    return <TeamConfiguration players={selectedPlayers} onStartMatch={startMatch} />;
  }

  if (effectiveStep === 'PICAPICA_SETUP' && teamsConfig) {
    return (
      <PicaPicaSetup
        nosotros={teamsConfig.nosotros}
        ellos={teamsConfig.ellos}
        onStart={() => setStep('PICAPICA_HUB')}
      />
    );
  }

  if (effectiveStep === 'PICAPICA_HUB') {
    return (
      <PicaPicaHub
        onPlayMatch={(id) => {
          setActiveSubMatchId(id);
          const subMatch = picaPicaMatches.find(m => m.id === id);
          if (subMatch) {
            // Init ScoreBoard for this match
            const target = usePicaPicaStore.getState().targetScore;

            resetMatch('1v1');
            setTargetScore(target);

            setPlayers('nosotros', [subMatch.playerNosotrosId]);
            setPlayers('ellos', [subMatch.playerEllosId]);
            setStep('MATCH');
          }
        }}
        onFinishPicaPica={() => {
          picaPicaReset();
          setStep('HOME');
        }}
      />
    );
  }

  if (effectiveStep === 'SETUP_PLAYERS_SELECT') {
    return (
      <PlayerSelection
        requiredCount={playerCount}
        onSelect={(players) => {
          setSelectedPlayers(players);
          setStep('SETUP_TEAMS');
        }}
      />
    );
  }

  if (effectiveStep === 'SETUP_PLAYERS_COUNT') {
    return (
      <div className="flex flex-col h-full bg-[var(--color-bg)] p-8 justify-center items-center relative">
        <h2 className="text-2xl font-bold mb-8">¿Cuántos juegan?</h2>

        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button
            onClick={() => { setPlayerCount(2); setStep('SETUP_PLAYERS_SELECT'); }}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-lg font-bold text-xl hover:bg-[var(--color-surface-hover)] transition-colors text-center"
          >
            2 jugadores (1v1)
          </button>
          <button
            onClick={() => { setPlayerCount(4); setStep('SETUP_PLAYERS_SELECT'); }}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-lg font-bold text-xl hover:bg-[var(--color-surface-hover)] transition-colors text-center"
          >
            4 jugadores (2v2)
          </button>
          <button
            onClick={() => { setPlayerCount(6); setStep('SETUP_PLAYERS_SELECT'); }}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-lg font-bold text-xl hover:bg-[var(--color-surface-hover)] transition-colors text-center"
          >
            6 jugadores (3v3 Pica-Pica)
          </button>

          <button
            onClick={() => setStep('HOME')}
            className="mt-8 text-[var(--color-text-muted)]"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // default: HOME
  return (
    <HomeScreen
      onNewMatch={() => setStep('SETUP_PLAYERS_COUNT')}
      onHistory={() => { setHistoryInitialTab('SUMMARY'); setStep('HISTORY'); }}
      onLeaderboard={() => { setHistoryInitialTab('RANKING'); setStep('HISTORY'); }}
      onSocial={() => setStep('SOCIAL')}
      onProfile={() => setStep('PROFILE')}
    />
  );
}

export default App;
