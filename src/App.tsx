// Trucapp - Build Trigger edcb59c
import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { SplashScreen } from './components/SplashScreen';
import { HomeScreen } from './components/HomeScreen';

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
  'MATCH' | 'HISTORY' | 'PROFILE' |
  'PICAPICA_SETUP' | 'PICAPICA_HUB';
type HistoryTab = 'SUMMARY' | 'MATCHES' | 'H2H' | 'RANKING';

import { AccountSelector } from './components/AccountSelector';

const MatchScreen = lazy(() => import('./components/MatchScreen').then(m => ({ default: m.MatchScreen })));
const PlayerSelection = lazy(() => import('./components/PlayerSelection').then(m => ({ default: m.PlayerSelection })));
const TeamConfiguration = lazy(() => import('./components/TeamConfiguration').then(m => ({ default: m.TeamConfiguration })));
const HistoryScreen = lazy(() => import('./components/HistoryScreen').then(m => ({ default: m.HistoryScreen })));
const ProfileScreen = lazy(() => import('./components/ProfileScreen').then(m => ({ default: m.ProfileScreen })));
const PicaPicaSetup = lazy(() => import('./components/PicaPicaSetup').then(m => ({ default: m.PicaPicaSetup })));
const PicaPicaHub = lazy(() => import('./components/PicaPicaHub').then(m => ({ default: m.PicaPicaHub })));

const ScreenLoader = () => (
  <div className="full-screen bg-[var(--color-bg)] flex items-center justify-center">
    <div className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--color-text-muted)]">
      Cargando...
    </div>
  </div>
);

function App() {
  const currentUserId = useAuthStore(state => state.currentUserId);
  const players = useUserStore(state => state.players);

  const [step, setStep] = useState<AppStep>(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedMatchId = params.get('matchId');
    if (sharedMatchId) return 'MATCH';

    const savedStep = localStorage.getItem('trucapp-app-step');
    if (savedStep === 'MATCH' && !useMatchStore.getState().id) return 'HOME';
    if (savedStep === 'STATS') return 'HOME'; // Migration: STATS is now part of HISTORY
    if (savedStep === 'LEADERBOARD' || savedStep === 'SOCIAL') return 'HISTORY';
    return (savedStep as AppStep) || 'HOME';
  });

  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('trucapp-splash-seen'));
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [teamsConfig, setTeamsConfig] = useState<{ nosotros: Player[], ellos: Player[] } | null>(null);
  const [activeSubMatchId, setActiveSubMatchId] = useState<string | null>(null);
  const [historyInitialTab, setHistoryInitialTab] = useState<HistoryTab>('SUMMARY');
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const isFinishingMatchRef = useRef(false);

  // --- HOOKS (Must be at top level) ---

  useEffect(() => {
    localStorage.setItem('trucapp-app-step', step);
  }, [step]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      await Promise.all([
        useHistoryStore.getState().fetchMatches(),
        useUserStore.getState().fetchPlayers(),
      ]);
      if (!cancelled) {
        setIsBootstrapping(false);
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isBootstrapping) return;
    if (!currentUserId) return;

    const hasValidUser = players.some((p) => p.id === currentUserId);
    if (!hasValidUser) {
      useAuthStore.getState().logout();
      localStorage.removeItem('trucapp-app-step');
      setStep('AUTH');
    }
  }, [isBootstrapping, currentUserId, players]);

  useEffect(() => {
    if (isBootstrapping || !currentUserId) return;
    const w = globalThis as typeof globalThis & {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (idleId: number) => void;
    };

    const prefetch = () => {
      void import('./components/HistoryScreen');
      void import('./components/ProfileScreen');
      void import('./components/MatchScreen');
    };

    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(prefetch);
      return () => {
        w.cancelIdleCallback?.(id);
      };
    }

    const timeoutId = setTimeout(prefetch, 800);
    return () => clearTimeout(timeoutId);
  }, [isBootstrapping, currentUserId]);

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
  const setSeries = useMatchStore(state => state.setSeries);
  const recordPairResult = usePairStore(state => state.recordMatchResult);

  const startMatch = (
    teams: { nosotros: Player[], ellos: Player[] },
    metadata?: { location: string, date: number, teamNames?: { nosotros: string, ellos: string } },
    pairIds?: { nosotros?: string, ellos?: string },
    targetScore?: number,
    options?: { startBestOf3?: boolean }
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
      if (options?.startBestOf3 && playerCount === 4) {
        setSeries({
          id: crypto.randomUUID(),
          targetWins: 2,
          gameNumber: 1
        });
      } else {
        setSeries(null);
      }
      setStep('MATCH');
    }
  };

  const handleSplashFinish = () => {
    sessionStorage.setItem('trucapp-splash-seen', 'true');
    setShowSplash(false);
  };

  const handleFinishMatch = async (next: 'home' | 'rematch' | 'series-next' = 'home') => {
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
        if (next === 'series-next' && matchState.series && matchState.winner) {
          const all = useHistoryStore.getState().matches.filter((m) => m.series?.id === matchState.series?.id);
          const winsNos = all.filter((m) => m.winner === 'nosotros').length;
          const winsEll = all.filter((m) => m.winner === 'ellos').length;
          const isSeriesFinished = winsNos >= matchState.series.targetWins || winsEll >= matchState.series.targetWins;

          if (!isSeriesFinished) {
            const target = matchState.targetScore;
            const currentSeriesId = matchState.series.id;
            const nextGameNumber = all.length + 1;
            const nextMetadata = {
              location: matchState.metadata?.location ?? 'Sin ubicación',
              date: Date.now()
            };

            resetMatch(matchState.mode);
            setTargetScore(target);
            useMatchStore.getState().setTeamName('nosotros', matchState.teams.nosotros.name);
            useMatchStore.getState().setTeamName('ellos', matchState.teams.ellos.name);
            setPlayers('nosotros', matchState.teams.nosotros.players);
            setPlayers('ellos', matchState.teams.ellos.players);
            setMetadata(nextMetadata.location, nextMetadata.date);
            if (matchState.pairs?.nosotros) setPairId('nosotros', matchState.pairs.nosotros);
            if (matchState.pairs?.ellos) setPairId('ellos', matchState.pairs.ellos);
            setSeries({
              id: currentSeriesId,
              targetWins: matchState.series.targetWins,
              gameNumber: nextGameNumber
            });
            setStep('MATCH');
            return;
          }
        }

        if (matchState.pairs) {
          if (matchState.pairs.nosotros && matchState.winner) {
            recordPairResult(matchState.pairs.nosotros, matchState.winner === 'nosotros');
          }
          if (matchState.pairs.ellos && matchState.winner) {
            recordPairResult(matchState.pairs.ellos, matchState.winner === 'ellos');
          }
        }
        setSeries(null);
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

  if (isBootstrapping) {
    return (
      <div className="full-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--color-text-muted)]">
          Cargando...
        </div>
      </div>
    );
  }


  if (!currentUserId) {
    return <AccountSelector onLoginSuccess={() => setStep('HOME')} />;
  }

  const effectiveStep: AppStep = !currentUserId && step !== 'HOME' ? 'AUTH' : step;

  if (effectiveStep === 'MATCH') {
    return (
      <Suspense fallback={<ScreenLoader />}>
        <MatchScreen onFinish={handleFinishMatch} />
      </Suspense>
    );
  }

  if (effectiveStep === 'HISTORY') {
    return (
      <Suspense fallback={<ScreenLoader />}>
        <HistoryScreen onBack={() => setStep('HOME')} initialTab={historyInitialTab} />
      </Suspense>
    );
  }

  if (effectiveStep === 'PROFILE') {
    return (
      <Suspense fallback={<ScreenLoader />}>
        <ProfileScreen onBack={() => setStep('HOME')} />
      </Suspense>
    );
  }

  if (effectiveStep === 'SETUP_TEAMS') {
    return (
      <Suspense fallback={<ScreenLoader />}>
        <TeamConfiguration players={selectedPlayers} onStartMatch={startMatch} />
      </Suspense>
    );
  }

  if (effectiveStep === 'PICAPICA_SETUP' && teamsConfig) {
    return (
      <Suspense fallback={<ScreenLoader />}>
        <PicaPicaSetup
          nosotros={teamsConfig.nosotros}
          ellos={teamsConfig.ellos}
          onStart={() => setStep('PICAPICA_HUB')}
        />
      </Suspense>
    );
  }

  if (effectiveStep === 'PICAPICA_HUB') {
    return (
      <Suspense fallback={<ScreenLoader />}>
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
      </Suspense>
    );
  }

  if (effectiveStep === 'SETUP_PLAYERS_SELECT') {
    return (
      <Suspense fallback={<ScreenLoader />}>
        <PlayerSelection
          requiredCount={playerCount}
          onSelect={(players) => {
            setSelectedPlayers(players);
            setStep('SETUP_TEAMS');
          }}
        />
      </Suspense>
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
      onProfile={() => setStep('PROFILE')}
    />
  );
}

export default App;
