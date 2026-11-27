/**
 * Original vector art: the drowned keep of the titans.
 * Barely visible behind the interface, it supplies depth without competing
 * with content. No third-party silhouette is referenced.
 */
export function TitanMonolith() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center overflow-hidden"
      style={{ height: '78vh', opacity: 0.55 }}
    >
      <svg
        viewBox="0 0 1440 760"
        preserveAspectRatio="xMidYMax slice"
        className="h-full w-full"
        role="presentation"
      >
        <defs>
          <linearGradient id="monolith-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2A0F45" stopOpacity="0.85" />
            <stop offset="55%" stopColor="#140B22" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#05030A" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="monolith-edge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C9A227" stopOpacity="0.55" />
            <stop offset="45%" stopColor="#7B2FBE" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#C9A227" stopOpacity="0.06" />
          </linearGradient>
          <radialGradient id="monolith-glow" cx="50%" cy="10%" r="60%">
            <stop offset="0%" stopColor="#7B2FBE" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#7B2FBE" stopOpacity="0" />
          </radialGradient>
          <filter id="monolith-blur" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
        </defs>

        <g filter="url(#monolith-blur)">
          <ellipse cx="720" cy="150" rx="520" ry="300" fill="url(#monolith-glow)" />

          {/* central spire */}
          <path
            d="M700 760V236l20-46 20 46v524Z"
            fill="url(#monolith-body)"
            stroke="url(#monolith-edge)"
            strokeWidth="1.2"
          />
          <path d="M720 118v120" stroke="#C9A227" strokeOpacity="0.35" strokeWidth="1" />

          {/* shoulder towers */}
          <path
            d="M520 760V344l14-34 14 34v416ZM892 760V344l14-34 14 34v416Z"
            fill="url(#monolith-body)"
            stroke="url(#monolith-edge)"
            strokeWidth="1"
          />

          {/* arch */}
          <path
            d="M566 760V508c0-86 70-152 154-152s154 66 154 152v252h-34V512c0-68-54-120-120-120s-120 52-120 120v248Z"
            fill="#0B0713"
            stroke="url(#monolith-edge)"
            strokeWidth="1.2"
          />

          {/* colossal shoulder silhouette */}
          <path
            d="M300 760c22-132 104-212 200-238 46-12 74-46 74-96l8-84c4-44 28-78 66-96 48-24 96 4 112 52l18 56c10 32 36 56 70 66 86 28 140 106 158 240 8 60 12 100 14 100h-96c-10-116-40-186-96-216-40-20-92-14-128 12-64 44-96 112-106 204Z"
            fill="url(#monolith-body)"
            stroke="url(#monolith-edge)"
            strokeWidth="1.4"
          />

          {/* crown prongs */}
          <path
            d="M624 232l18-64 12 42 20-58 14 56 18-40 10 64Z"
            fill="#140B22"
            stroke="#C9A227"
            strokeOpacity="0.4"
            strokeWidth="1"
          />

          {/* chest gem */}
          <polygon
            points="720,392 748,414 748,452 720,474 692,452 692,414"
            fill="#4B1D7A"
            stroke="#C9A227"
            strokeOpacity="0.55"
            strokeWidth="1.2"
          />
          <polygon points="720,404 736,416 720,428 704,416" fill="#A768E8" opacity="0.5" />

          {/* strata lines */}
          <g stroke="#C9A227" strokeOpacity="0.09" strokeWidth="1">
            <path d="M0 640h1440M0 690h1440M0 735h1440" />
            <path d="M120 600h1200M240 560h960" />
          </g>

          {/* steps */}
          <path d="M600 760v-26h240v26Z" fill="#0B0713" stroke="url(#monolith-edge)" strokeWidth="1" />
          <path d="M660 734v-20h120v20Z" fill="#0B0713" stroke="url(#monolith-edge)" strokeWidth="1" />
        </g>
      </svg>
    </div>
  );
}
