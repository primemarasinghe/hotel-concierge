'use client';

export default function AskConciergeButton({ message, label = 'Ask our concierge →' }) {
  function handleClick() {
    window.dispatchEvent(new CustomEvent('openChatWidget', { detail: { message } }));
  }

  return (
    <button
      onClick={handleClick}
      style={{
        display: 'inline-block', padding: '10px 16px', background: 'transparent',
        border: '1.5px solid #E8DCC8', borderRadius: 10, fontSize: '0.82rem',
        fontWeight: 600, color: '#8B6914', cursor: 'pointer',
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        transition: 'background 0.15s, border-color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = '#faf7f2'; e.currentTarget.style.borderColor = '#C8B89A'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#E8DCC8'; }}
    >
      {label}
    </button>
  );
}
