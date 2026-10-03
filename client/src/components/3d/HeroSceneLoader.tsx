import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

const HeroScene = lazy(() => import('@/components/3d/HeroScene'));

/**
 * Progressive 3D loader.
 *
 * The scene is only downloaded and mounted when all of these hold:
 *   • the viewport is desktop-sized (phones get the static artwork)
 *   • the user has not asked for reduced motion
 *   • the hero has scrolled into view
 *
 * Until then — and permanently on low-powered devices — a static, CSS-only
 * composition with the same silhouette is shown, so the section never looks
 * unfinished or causes a layout shift.
 */
export function HeroSceneLoader({ className }: { className?: string }) {
  const prefersReduced = useReducedMotion();
  const isDesktop = useIsDesktop();
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [failed, setFailed] = useState(false);

  const shouldRender3d = isDesktop && !prefersReduced && !failed;

  useEffect(() => {
    if (!shouldRender3d) return;
    const element = containerRef.current;
    if (!element) return;

    // Start the download slightly before the hero is fully visible.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [shouldRender3d]);

  return (
    <div ref={containerRef} className={cn('relative', className)} aria-hidden="true">
      <StaticCore visible={!shouldRender3d || !inView} />

      {shouldRender3d && inView && (
        <Suspense fallback={<StaticCore visible />}>
          <ErrorCatcher onError={() => setFailed(true)}>
            <div className="absolute inset-0">
              <HeroScene />
            </div>
          </ErrorCatcher>
        </Suspense>
      )}
    </div>
  );
}

/**
 * WebGL can be unavailable (blocked, software-rendered, out of memory).
 * A failed scene must degrade to the static artwork, never to a blank box.
 */
function ErrorCatcher({
  children,
  onError,
}: {
  children: React.ReactNode;
  onError: () => void;
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = () => {
      setHasError(true);
      onError();
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [onError]);

  if (hasError) return null;
  return <>{children}</>;
}

/**
 * CSS-only stand-in with the same composition as the WebGL scene:
 * concentric rings around a faceted core.
 */
function StaticCore({ visible }: { visible: boolean }) {
  return (
    <div
      className={cn(
        'absolute inset-0 flex items-center justify-center transition-opacity duration-slower ease-soft',
        visible ? 'opacity-100' : 'opacity-0'
      )}
    >
      <div className="relative aspect-square w-[min(28rem,80%)]">
        {/* Soft brand glow */}
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_45%,rgba(79,91,245,0.28),transparent_62%)] blur-2xl" />

        {/* Outer instrument ring */}
        <div className="absolute inset-0 rounded-full border border-secondary/25" />
        <div className="absolute inset-[9%] rounded-full border border-primary/30" />
        <div className="absolute inset-[22%] rounded-full border border-secondary/20" />

        {/* Faceted core */}
        <div className="absolute inset-[33%] rotate-45 rounded-[22%] border border-primary/50 bg-gradient-to-br from-primary/35 to-secondary/25 shadow-glow-primary backdrop-blur-[1px]" />

        {/* Orbiting nodes */}
        <div className="absolute inset-0 animate-[spin_38s_linear_infinite] motion-reduce:animate-none">
          <span className="absolute start-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-secondary shadow-glow-secondary" />
          <span className="absolute end-[8%] top-[22%] h-1 w-1 rounded-full bg-primary" />
          <span className="absolute bottom-[12%] start-[16%] h-1.5 w-1.5 rounded-full bg-secondary/70" />
          <span className="absolute bottom-[24%] end-[10%] h-1 w-1 rounded-full bg-foreground-subtle" />
        </div>
      </div>
    </div>
  );
}
