// Trucapp - Build Trigger edcb59c
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { SplashScreen } from './components/SplashScreen';
import { HomeScreen } from './components/HomeScreen';

import { useMatchStore } from './store/useMatchStore';
import { useHistoryStore } from './store/useHistoryStore';
import { useAuthStore } from './store/useAuthStore';
import { usePairStore } from './store/usePairStore';
import { useUserStore } from './store/useUserStore';
import type { MatchPicaPicaConfig, MatchState, Player } from './types';
import { ensureFirebaseSession } from './firebase';
import './index.css';

type AppStep = 'AUTH' | 'HOME' | 'SETUP_PLAYERS_COUNT' | 'SETUP_PLAYERS_SELECT' | 'SETUP_TEAMS' |
  'MATCH' | 'HISTORY' | 'PROFILE';
type HistoryTab = 'SUMMARY' | 'MATCHES';

import { AccountSelector } from './components/AccountSelector';

const MatchScreen = lazy(() => import('./components/MatchScreen').then(m => ({ default: m.MatchScreen })));
const TeamConfiguration = lazy(() => import('./components/TeamConfiguration').then(m => ({ default: m.TeamConfiguration })));
const HistoryScreen = lazy(() => import('./components/HistoryScreen').then(m => ({ default: m.HistoryScreen })));
const ProfileScreen = lazy(() => import('./components/ProfileScreen').then(m => ({ default: m.ProfileScreen })));

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
  const currentUser = useMemo(
    () => players.find((player) => player.id === currentUserId) ?? null,
    [players, currentUserId]
  );

  const [step, setStep] = useState<AppStep>(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedMatchId = params.get('matchId');
    if (sharedMatchId) return 'MATCH';
    // UX request: al reabrir PWA, arrancar siempre en inicio.
    return 'HOME';
  });

  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('trucapp-splash-seen'));
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [historyInitialTab, setHistoryInitialTab] = useState<HistoryTab>('SUMMARY');
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [isDirectScorerMode, setIsDirectScorerMode] = useState(false);
  const isFinishingMatchRef = useRef(false);
  const selectablePlayers = useMemo(() => (
    players
      .filter((player) => {
        if (player.id === currentUserId) return true;
        if (currentUser?.friends.includes(player.id)) return true;
        return player.visibility === 'PUBLIC';
      })
      .sort((a, b) => {
        if (a.id === currentUserId) return -1;
        if (b.id === currentUserId) return 1;
        const aIsFriend = Boolean(currentUser?.friends.includes(a.id));
        const bIsFriend = Boolean(currentUser?.friends.includes(b.id));
        if (aIsFriend !== bIsFriend) return aIsFriend ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
  ), [players, currentUserId, currentUser]);

  useEffect(() => {
    localStorage.setItem('trucapp-app-step', step);
  }, [step]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        await ensureFirebaseSession();
      } catch (error) {
        console.error('Firebase session bootstrap failed:', error);
      } finally {
        if (!cancelled) {
          setIsFirebaseReady(true);
        }
      }

      try {
        await Promise.all([
          useHistoryStore.getState().fetchMatches(),
          useUserStore.getState().fetchPlayers(),
        ]);
      } catch (error) {
        console.error('Initial data bootstrap failed:', error);
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isFirebaseReady) return;
    const unsubscribe = useUserStore.getState().subscribeToPlayers();
    return () => unsubscribe();
  }, [isFirebaseReady]);

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
    if (!isFirebaseReady) return;
    const params = new URLSearchParams(window.location.search);
    const sharedMatchId = params.get('matchId');
    if (sharedMatchId) {
      useMatchStore.getState().listenToMatch(sharedMatchId);
    }
  }, [isFirebaseReady]);

  const resetMatch = useMatchStore(state => state.resetMatch);
  const setPlayers = useMatchStore(state => state.setPlayers);
  const setTargetScore = useMatchStore(state => state.setTargetScore);
  const addMatchToHistory = useHistoryStore(state => state.addMatch);
  const setMetadata = useMatchStore(state => state.setMetadata);
  const setPairId = useMatchStore(state => state.setPairId);
  const setSeries = useMatchStore(state => state.setSeries);
  const setPicaPica = useMatchStore(state => state.setPicaPica);
  const recordPairResult = usePairStore(state => state.recordMatchResult);

  const startMatch = (
    teams: { nosotros: Player[], ellos: Player[] },
    metadata?: { location: string, date: number, teamNames?: { nosotros: string, ellos: string } },
    pairIds?: { nosotros?: string, ellos?: string },
    targetScore?: number,
    options?: { startBestOf3?: boolean; picaPica?: MatchPicaPicaConfig | null }
  ) => {
    const expectedPlayersPerTeam = playerCount === 2 ? 1 : playerCount === 4 ? 2 : 3;
    if (teams.nosotros.length !== expectedPlayersPerTeam || teams.ellos.length !== expectedPlayersPerTeam) {
      alert(`Para ${playerCount === 2 ? '1v1' : playerCount === 4 ? '2v2' : '3v3'} debés tener ${expectedPlayersPerTeam} jugador(es) por equipo antes de comenzar.`);
      return;
    }

    const mode = playerCount === 2 ? '1v1' : playerCount === 4 ? '2v2' : '3v3';
    resetMatch(mode);
    setIsDirectScorerMode(false);
    if (targetScore) {
      useMatchStore.getState().setTargetScore(targetScore);
    }

    const generateTeamName = (teamPlayers: Player[]) => {
      if (teamPlayers.length === 0) return 'Equipo';
      return teamPlayers.map((p) => p.name).join(' / ');
    };

    const nosotrosName = metadata?.teamNames?.nosotros || generateTeamName(teams.nosotros);
    const ellosName = metadata?.teamNames?.ellos || generateTeamName(teams.ellos);
    useMatchStore.getState().setTeamName('nosotros', nosotrosName);
    useMatchStore.getState().setTeamName('ellos', ellosName);
    setPlayers('nosotros', teams.nosotros.map((p) => p.id));
    setPlayers('ellos', teams.ellos.map((p) => p.id));

    if (metadata) {
      setMetadata(metadata.location, metadata.date);
    }
    if (pairIds) {
      if (pairIds.nosotros) setPairId('nosotros', pairIds.nosotros);
      if (pairIds.ellos) setPairId('ellos', pairIds.ellos);
    }
    setPicaPica(options?.picaPica ?? null);

    if (options?.startBestOf3 && playerCount === 4) {
      setSeries({
        id: crypto.randomUUID(),
        targetWins: 2,
        gameNumber: 1,
        name: `${nosotrosName} vs ${ellosName}`,
        closedManually: false,
        closedAt: null
      });
    } else {
      setSeries(null);
    }

    setStep('MATCH');
  };

  const startDirectScorer = () => {
    resetMatch('1v1');
    setIsDirectScorerMode(true);
    setTargetScore(30);
    useMatchStore.getState().setTeamName('nosotros', 'Nosotros');
    useMatchStore.getState().setTeamName('ellos', 'Ellos');
    setPlayers('nosotros', []);
    setPlayers('ellos', []);
    setSeries(null);
    setPicaPica(null);
    setStep('MATCH');
  };

  const handleSplashFinish = () => {
    sessionStorage.setItem('trucapp-splash-seen', 'true');
    setShowSplash(false);
  };

  const handleFinishMatch = async (next: 'home' | 'rematch' | 'series-next' | 'direct-save' | 'direct-cancel' = 'home') => {
    if (isFinishingMatchRef.current) return;
    isFinishingMatchRef.current = true;

    const matchState = useMatchStore.getState();
    try {
      if (next === 'direct-cancel') {
        setSeries(null);
        setIsDirectScorerMode(false);
        setStep('HOME');
        return;
      }

      const mustPersist = !isDirectScorerMode || next === 'direct-save';
      if (mustPersist) {
        const snapshot: MatchState = {
          id: matchState.id,
          mode: matchState.mode,
          startDate: matchState.startDate,
          createdByUserId: matchState.createdByUserId ?? null,
          createdAt: matchState.createdAt,
          updatedAt: matchState.updatedAt,
          isDeleted: matchState.isDeleted ?? false,
          deletedAt: matchState.deletedAt ?? null,
          deletedByUserId: matchState.deletedByUserId ?? null,
          metadata: matchState.metadata,
          targetScore: matchState.targetScore,
          teams: matchState.teams,
          pairs: matchState.pairs,
          teamRefs: matchState.teamRefs,
          series: matchState.series,
          picaPica: matchState.picaPica,
          history: matchState.history,
          isFinished: matchState.isFinished,
          winner: matchState.winner ?? null,
          editedFlags: matchState.editedFlags,
          edits: matchState.edits
        };

        const persistable = next === 'direct-save'
          ? {
            ...snapshot,
            isFinished: true,
            winner: matchState.teams.nosotros.score > matchState.teams.ellos.score ? ('nosotros' as const) : ('ellos' as const)
          }
          : snapshot;
        await addMatchToHistory(persistable);
      }

      if (next === 'series-next' && matchState.series && matchState.winner && !isDirectScorerMode) {
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
            date: matchState.metadata?.date ?? Date.now()
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
          setPicaPica(matchState.picaPica ?? null);
          setSeries({
            id: currentSeriesId,
            targetWins: matchState.series.targetWins,
            gameNumber: nextGameNumber,
            name: matchState.series.name ?? `${matchState.teams.nosotros.name} vs ${matchState.teams.ellos.name}`,
            closedManually: false,
            closedAt: null
          });
          setStep('MATCH');
          return;
        }
      }

      if (!isDirectScorerMode && matchState.pairs && matchState.winner) {
        if (matchState.pairs.nosotros) {
          recordPairResult(matchState.pairs.nosotros, matchState.winner === 'nosotros');
        }
        if (matchState.pairs.ellos) {
          recordPairResult(matchState.pairs.ellos, matchState.winner === 'ellos');
        }
      }

      setSeries(null);

      if (next === 'rematch') {
        if (isDirectScorerMode) {
          const target = matchState.targetScore;
          resetMatch(matchState.mode);
          setTargetScore(target);
          useMatchStore.getState().setTeamName('nosotros', matchState.teams.nosotros.name);
          useMatchStore.getState().setTeamName('ellos', matchState.teams.ellos.name);
          setPicaPica(matchState.picaPica ?? null);
          setStep('MATCH');
        } else {
          setStep('SETUP_PLAYERS_COUNT');
        }
        return;
      }

      setIsDirectScorerMode(false);
      setStep('HOME');
    } finally {
      isFinishingMatchRef.current = false;
    }
  };

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
        <MatchScreen onFinish={handleFinishMatch} isDirectScorerMode={isDirectScorerMode} />
      </Suspense>
    );
  }

  if (effectiveStep === 'HISTORY') {
    return (
      <Suspense fallback={<ScreenLoader />}>
        <HistoryScreen
          onBack={() => setStep('HOME')}
          initialTab={historyInitialTab}
          onStartSeriesFromHistory={(baseMatch, mode) => {
            resetMatch(baseMatch.mode);
            setTargetScore(baseMatch.targetScore);
            useMatchStore.getState().setTeamName('nosotros', baseMatch.teams.nosotros.name);
            useMatchStore.getState().setTeamName('ellos', baseMatch.teams.ellos.name);
            setPlayers('nosotros', baseMatch.teams.nosotros.players);
            setPlayers('ellos', baseMatch.teams.ellos.players);
            setMetadata(baseMatch.metadata?.location ?? 'Sin ubicación', baseMatch.metadata?.date ?? Date.now());
            if (baseMatch.pairs?.nosotros) setPairId('nosotros', baseMatch.pairs.nosotros);
            if (baseMatch.pairs?.ellos) setPairId('ellos', baseMatch.pairs.ellos);
            setPicaPica(baseMatch.picaPica ?? null);

            if (mode === 'continue' && baseMatch.series?.id) {
              const historyMatches = useHistoryStore.getState().matches
                .filter((m) => m.series?.id === baseMatch.series?.id);
              const nextGameNumber = historyMatches.length + 1;
              setSeries({
                id: baseMatch.series.id,
                targetWins: baseMatch.series.targetWins,
                gameNumber: nextGameNumber,
                name: baseMatch.series.name ?? `${baseMatch.teams.nosotros.name} vs ${baseMatch.teams.ellos.name}`,
                closedManually: false,
                closedAt: null
              });
            } else {
              setSeries({
                id: crypto.randomUUID(),
                targetWins: 2,
                gameNumber: 1,
                name: `${baseMatch.teams.nosotros.name} vs ${baseMatch.teams.ellos.name}`,
                closedManually: false,
                closedAt: null
              });
            }

            setIsDirectScorerMode(false);
            setStep('MATCH');
          }}
        />
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
        <TeamConfiguration
          players={selectedPlayers.length > 0 ? selectedPlayers : selectablePlayers}
          requiredCount={playerCount}
          onBack={() => setStep('SETUP_PLAYERS_COUNT')}
          onStartMatch={startMatch}
        />
      </Suspense>
    );
  }

  if (effectiveStep === 'SETUP_PLAYERS_SELECT') {
    return (
      <Suspense fallback={<ScreenLoader />}>
        <TeamConfiguration
          players={selectedPlayers.length > 0 ? selectedPlayers : selectablePlayers}
          requiredCount={playerCount}
          onBack={() => setStep('SETUP_PLAYERS_COUNT')}
          onStartMatch={startMatch}
        />
      </Suspense>
    );
  }

  if (effectiveStep === 'SETUP_PLAYERS_COUNT') {
    return (
      <div className="flex flex-col h-full bg-[var(--color-bg)] p-8 justify-center items-center relative safe-px safe-pt safe-pb">
        <button
          onClick={() => setStep('HOME')}
          className="absolute top-6 left-6 text-[var(--color-text-muted)] font-black text-[10px] uppercase tracking-[0.3em] bg-white/5 py-2 px-4 rounded-full active:scale-95 transition-all z-20"
        >
          ← VOLVER
        </button>

        <h2 className="text-2xl font-bold mb-8">¿Cuántos juegan?</h2>

        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button
            onClick={() => {
              const nextCount = 2;
              if (selectablePlayers.length < nextCount) {
                alert(`Necesitás al menos ${nextCount} jugadores visibles para iniciar 1v1.`);
                return;
              }
              setPlayerCount(nextCount);
              setSelectedPlayers(selectablePlayers);
              setStep('SETUP_TEAMS');
            }}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-lg font-bold text-xl hover:bg-[var(--color-surface-hover)] transition-colors text-center"
          >
            2 jugadores (1v1)
          </button>
          <button
            onClick={() => {
              const nextCount = 4;
              if (selectablePlayers.length < nextCount) {
                alert(`Necesitás al menos ${nextCount} jugadores visibles para iniciar 2v2.`);
                return;
              }
              setPlayerCount(nextCount);
              setSelectedPlayers(selectablePlayers);
              setStep('SETUP_TEAMS');
            }}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-lg font-bold text-xl hover:bg-[var(--color-surface-hover)] transition-colors text-center"
          >
            4 jugadores (2v2)
          </button>
          <button
            onClick={() => {
              const nextCount = 6;
              if (selectablePlayers.length < nextCount) {
                alert(`Necesitás al menos ${nextCount} jugadores visibles para iniciar 3v3.`);
                return;
              }
              setPlayerCount(nextCount);
              setSelectedPlayers(selectablePlayers);
              setStep('SETUP_TEAMS');
            }}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] p-6 rounded-lg font-bold text-xl hover:bg-[var(--color-surface-hover)] transition-colors text-center"
          >
            6 jugadores (3v3)
          </button>

          <button onClick={() => setStep('HOME')} className="mt-8 text-[var(--color-text-muted)]">
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <HomeScreen
      onNewMatch={() => {
        setSelectedPlayers([]);
        setStep('SETUP_PLAYERS_COUNT');
      }}
      onQuickScore={startDirectScorer}
      onHistory={() => {
        setHistoryInitialTab('SUMMARY');
        setStep('HISTORY');
      }}
      onProfile={() => setStep('PROFILE')}
    />
  );
}

export default App;
