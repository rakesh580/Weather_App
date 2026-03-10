interface Props {
  size?: number;
}

export default function SkyPulseLogo({ size = 28 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      {/* Sun behind cloud */}
      <circle cx="11" cy="10" r="4.5" stroke="var(--accent)" strokeWidth="1.8" fill="none" />
      {/* Sun rays */}
      <line x1="11" y1="3" x2="11" y2="1" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="15.5" y1="5.5" x2="17" y2="4" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="6.5" y1="5.5" x2="5" y2="4" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="4" y1="10" x2="2" y2="10" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />

      {/* Cloud body */}
      <path
        d="M10 24 C6 24 4 21.5 4 19 C4 16.5 6 14.5 8.5 14.5 C8.5 14 8.7 12.5 10 11.5 C11.3 10.5 13 10.5 14 11 C15 9 17 8 19.5 8 C23 8 25.5 10.5 26 13.5 C28 14 29.5 15.5 29.5 18 C29.5 20.5 27.5 22.5 25 23 C25 23.5 25 24 25 24 Z"
        fill="currentColor"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Pulse line through cloud */}
      <polyline
        points="7,19 12,19 14,14.5 16,22 18,16 20,19 26,19"
        stroke="var(--accent)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
