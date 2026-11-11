import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'deck'; deckId: string }
  | { name: 'study'; deckId?: string }
  | { name: 'quiz'; deckId?: string }
  | { name: 'stats' }
  | { name: 'settings' }
  | { name: 'import' };

interface NavContextValue {
  route: Route;
  tab: string;
  navigate: (route: Route) => void;
  goBack: () => void;
  canGoBack: boolean;
}

const NavContext = createContext<NavContextValue | null>(null);

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const parts = hash.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'home' };
  switch (parts[0]) {
    case 'deck':
      return parts[1] ? { name: 'deck', deckId: parts[1] } : { name: 'home' };
    case 'study':
      return { name: 'study', deckId: parts[1] ? decodeURIComponent(parts[1]) : undefined };
    case 'quiz':
      return { name: 'quiz', deckId: parts[1] ? decodeURIComponent(parts[1]) : undefined };
    case 'stats':
      return { name: 'stats' };
    case 'settings':
      return { name: 'settings' };
    case 'import':
      return { name: 'import' };
    default:
      return { name: 'home' };
  }
}

function routeToHash(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/';
    case 'deck':
      return `#/deck/${route.deckId}`;
    case 'study':
      return route.deckId ? `#/study/${encodeURIComponent(route.deckId)}` : '#/study';
    case 'quiz':
      return route.deckId ? `#/quiz/${encodeURIComponent(route.deckId)}` : '#/quiz';
    case 'stats':
      return '#/stats';
    case 'settings':
      return '#/settings';
    case 'import':
      return '#/import';
  }
}

function routeTab(route: Route): string {
  if (route.name === 'deck') return 'home';
  return route.name;
}

export function NavProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(() => parseHash());
  const [history, setHistory] = useState<Route[]>([]);

  useEffect(() => {
    const onHashChange = () => {
      setRoute(parseHash());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((newRoute: Route) => {
    setHistory((h) => [...h, parseHash()]);
    window.location.hash = routeToHash(newRoute);
    setRoute(newRoute);
    window.scrollTo(0, 0);
  }, []);

  const goBack = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) {
        window.location.hash = '#/';
        setRoute({ name: 'home' });
        return h;
      }
      const prev = h[h.length - 1];
      window.location.hash = routeToHash(prev);
      setRoute(prev);
      return h.slice(0, -1);
    });
  }, []);

  return (
    <NavContext.Provider value={{ route, tab: routeTab(route), navigate, goBack, canGoBack: history.length > 0 }}>
      {children}
    </NavContext.Provider>
  );
}

export function useNav(): NavContextValue {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav must be used within NavProvider');
  return ctx;
}
