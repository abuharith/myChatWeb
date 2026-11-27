import { useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import { BackgroundScene } from './components/effects/BackgroundScene';
import { AppShell } from './components/layout/AppShell';
import { LoadingVeil } from './components/layout/LoadingVeil';
import { AuthScreen } from './screens/AuthScreen';
import { useAuthStore } from './store/auth';
import { useUiStore } from './store/ui';

export default function App() {
  const status = useAuthStore((state) => state.status);
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const lowPower = useUiStore((state) => state.lowPower);
  const forceReducedMotion = useUiStore((state) => state.forceReducedMotion);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('low-power', lowPower);
    root.classList.toggle('reduce-motion', forceReducedMotion);
  }, [lowPower, forceReducedMotion]);

  return (
    <MotionConfig reducedMotion="user">
      <BackgroundScene />

      {status === 'booting' ? <LoadingVeil /> : null}
      {status === 'anonymous' ? <AuthScreen /> : null}
      {status === 'authenticated' ? <AppShell /> : null}
    </MotionConfig>
  );
}
