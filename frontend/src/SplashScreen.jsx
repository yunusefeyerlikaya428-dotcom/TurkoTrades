import { useEffect, useState } from "react";

const messages = [
  "Connecting to market...",
  "Loading liquidity...",
  "Syncing journal data...",
  "Preparing dashboard...",
];

export default function SplashScreen() {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        const next = prev + Math.floor(Math.random() * 12) + 6;
        return next > 100 ? 100 : next;
      });
    }, 180);

    const textTimer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 700);

    return () => {
      clearInterval(progressTimer);
      clearInterval(textTimer);
    };
  }, []);

  return (
    <div className="splash-root">
      <div className="splash-glow" />

      <img
        src="/logo-icon.png"
        alt="TurkoTrades Logo"
        className="splash-logo"
      />

      <div className="splash-bottom">
        <p className="splash-text">{messages[messageIndex]}</p>

        <div className="splash-bar">
          <div
            className="splash-bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="splash-percent">%{progress}</div>
      </div>
    </div>
  );
}