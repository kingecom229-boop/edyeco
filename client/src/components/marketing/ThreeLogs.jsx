import { Component, Suspense, lazy, useRef, useState, useEffect } from 'react';
import { RotateCw } from 'lucide-react';

const CanvasScene = lazy(() => import('./ThreeLogsScene'));

class SceneBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    /* WebGL unavailable: the branded fallback is displayed instead. */
  }
  render() {
    return this.state.failed ? <Fallback /> : this.props.children;
  }
}

export default function ThreeLogs() {
  const [enabled, setEnabled] = useState(false);
  const [failed, setFailed] = useState(false);
  const wrapper = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return undefined;
    const node = wrapper.current;
    if (!node || !('IntersectionObserver' in window)) {
      setEnabled(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setEnabled(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapper} className="relative aspect-square w-full overflow-hidden rounded-[2rem] border border-white/10 bg-forest-900/60">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_65%,rgba(242,121,27,0.35),transparent_60%)]" />
      {enabled && !failed ? (
        <SceneBoundary>
          <Suspense fallback={<Fallback />}>
            <CanvasScene />
          </Suspense>
        </SceneBoundary>
      ) : (
        <Fallback />
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between px-5 py-4 text-[10px] uppercase tracking-[0.2em] text-white/50">
        <span>Chêne · Hêtre · Charme</span>
        <span className="flex items-center gap-1"><RotateCw className="h-3 w-3" /> Faites tourner</span>
      </div>
    </div>
  );
}

function Fallback() {
  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <div className="relative">
        <div className="absolute -inset-10 rounded-full bg-ember-500/20 blur-3xl" />
        <img src="/brand/logo-mark.png" alt="Bois de chauffage EdyEco" className="relative h-48 w-48 object-contain drop-shadow-2xl" loading="lazy" />
      </div>
    </div>
  );
}
