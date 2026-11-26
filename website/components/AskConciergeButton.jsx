'use client';

export default function AskConciergeButton({ message, label = 'Ask our concierge →', className = 'btn-primary', style = {} }) {
  function handleClick() {
    window.dispatchEvent(new CustomEvent('openChatWidget', { detail: { message } }));
  }

  return (
    <button onClick={handleClick} className={className} style={style}>
      {label}
    </button>
  );
}
