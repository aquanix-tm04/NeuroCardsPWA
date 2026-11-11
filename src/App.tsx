import { useEffect } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { NavProvider, useNav, type Route } from '@/context/NavContext';
import { TabBar } from '@/components/TabBar';
import { Loading } from '@/components/Loading';
import { HomeScreen } from '@/screens/HomeScreen';
import { DeckDetailScreen } from '@/screens/DeckDetailScreen';
import { StudyScreen } from '@/screens/StudyScreen';
import { QuizScreen } from '@/screens/QuizScreen';
import { StatsScreen } from '@/screens/StatsScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { ImportScreen } from '@/screens/ImportScreen';
import { startReminderWatcher } from '@/lib/reminder';

const TAB_ROUTES = new Set<Route['name']>(['home', 'study', 'quiz', 'stats', 'settings']);

function routeKey(route: Route): string {
  switch (route.name) {
    case 'deck':
      return `deck:${route.deckId}`;
    case 'study':
    case 'quiz':
      return `${route.name}:${route.deckId ?? 'all'}`;
    default:
      return route.name;
  }
}

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'home':
      return <HomeScreen />;
    case 'deck':
      return <DeckDetailScreen deckId={route.deckId} />;
    case 'study':
      return <StudyScreen deckId={route.deckId} />;
    case 'quiz':
      return <QuizScreen deckId={route.deckId} />;
    case 'stats':
      return <StatsScreen />;
    case 'settings':
      return <SettingsScreen />;
    case 'import':
      return <ImportScreen />;
  }
}

function Shell() {
  const { ready } = useApp();
  const { route } = useNav();

  useEffect(() => {
    if (!ready) return;
    return startReminderWatcher();
  }, [ready]);

  return (
    <div className="min-h-[100dvh] bg-ink-50 text-ink-900 dark:bg-ink-950 dark:text-ink-100">
      <main className="app-shell">
        {ready ? (
          <div key={routeKey(route)} className="animate-fade-in">
            <Screen route={route} />
          </div>
        ) : (
          <Loading label="NeuroCards" />
        )}
      </main>
      {ready && TAB_ROUTES.has(route.name) && <TabBar />}
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <NavProvider>
        <Shell />
      </NavProvider>
    </AppProvider>
  );
}

export default App;
