'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';

const ChatPanel  = dynamic(() => import('./ChatPanel'),  { ssr: false });
const VoiceAgent = dynamic(() => import('./VoiceAgent'), { ssr: false });

const SLUG = 'leisureville-sigiriya';

export default function BookPageClient({ guestEmail = null }) {
  const [voiceOpen, setVoiceOpen] = useState(false);

  return (
    <>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: 720, height: 'calc(100dvh - 240px)', minHeight: 480 }}>
          <ChatPanel
            slug={SLUG}
            fill={true}
            onOpenVoice={() => setVoiceOpen(true)}
            guestEmail={guestEmail}
          />
        </div>
      </div>

      {voiceOpen && (
        <VoiceAgent
          slug={SLUG}
          onClose={() => setVoiceOpen(false)}
        />
      )}
    </>
  );
}
