import { useState } from 'react';
import { ChatsScreen } from '../../screens/ChatsScreen';
import { PlaceholderScreen } from '../../screens/PlaceholderScreen';
import { GemDock } from './GemDock';

/**
 * The shell keeps the gem dock and gives it a gutter on desktop so it never
 * overlaps the conversation info panel.
 */
export function AppShell() {
  const [tab, setTab] = useState('chats');

  return (
    <div className="relative z-10 h-[100dvh] w-full overflow-hidden md:pr-[76px]">
      {tab === 'chats' ? <ChatsScreen /> : <PlaceholderScreen id={tab} />}
      <GemDock activeId={tab} onSelect={setTab} />
    </div>
  );
}
