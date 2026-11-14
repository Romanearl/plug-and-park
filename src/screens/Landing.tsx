import { Icon } from '../components/Icon'
import { useStatusBar } from '../components/PhoneFrame'
import { Wordmark } from '../components/Wordmark'
import { navigate } from '../lib/router'

export function Landing() {
  useStatusBar('dark')
  return (
    <div className="screen-view dark">
      <div className="scroll">
        <div className="landing">
          <div className="landing-top rise">
            <Wordmark size="sm" />
            <span className="glass-badge">
              <Icon name="pin" size={16} />
              Hong Kong
            </span>
          </div>

          <NightMap />

          <h1 className="display rise-2">
            Charge where
            <br />
            others park.
          </h1>
          <p className="sub rise-2">Book idle private EV chargers across Hong Kong by the hour — from HK$20.</p>

          <div className="stats rise-3">
            <div className="stat">
              <b>130k+</b>
              <span>EVs on HK roads</span>
            </div>
            <div className="stat">
              <b>~15k</b>
              <span>public chargers</span>
            </div>
            <div className="stat">
              <b>8–10h</b>
              <span>private bays sit idle</span>
            </div>
          </div>

          <div className="landing-ctas rise-4">
            <button className="btn btn-inverse block" onClick={() => navigate('/register')}>
              Get started →
            </button>
            <button className="btn btn-ghost-light block" onClick={() => navigate('/login')}>
              I already have an account
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Stylised night map of Hong Kong with glowing charger pins. Pure SVG — no images. */
function NightMap() {
  const pins: [number, number][] = [
    [62, 70],
    [128, 112],
    [252, 66],
    [292, 150],
    [92, 190],
  ]
  return (
    <svg className="night-map" viewBox="0 0 350 240" role="img" aria-label="Map of Hong Kong with available chargers">
      <defs>
        <radialGradient id="nm-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#4EE4B6" stopOpacity=".5" />
          <stop offset="1" stopColor="#4EE4B6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="nm-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#102A43" stopOpacity="0" />
          <stop offset=".8" stopColor="#102A43" stopOpacity="0" />
          <stop offset="1" stopColor="#102A43" stopOpacity="1" />
        </linearGradient>
        <clipPath id="nm-clip">
          <rect x="0" y="0" width="350" height="240" rx="20" />
        </clipPath>
      </defs>
      <g clipPath="url(#nm-clip)">
        <rect width="350" height="240" fill="#0C2238" />
        {/* Harbour / sea */}
        <path
          d="M0 150 C40 138 70 152 108 146 C150 139 176 120 214 126 C252 132 268 160 308 158 C326 157 340 150 350 146 L350 186 C320 196 290 182 256 188 C222 194 196 214 156 210 C118 206 92 190 52 196 C30 199 12 206 0 210 Z"
          fill="#17395A"
        />
        <path d="M262 0 C276 30 300 44 350 40 L350 0 Z" fill="#17395A" />
        <path d="M0 240 L0 226 C40 216 80 226 120 240 Z" fill="#17395A" />
        {/* Roads */}
        <g fill="none" stroke="#2A4A68" strokeLinecap="round">
          <path d="M-10 92 C60 84 110 104 170 96 S280 70 360 92" strokeWidth="5" />
          <path d="M40 -10 C52 40 70 90 64 140" strokeWidth="4" />
          <path d="M150 -10 C140 40 150 70 132 140" strokeWidth="4" />
          <path d="M226 -10 C230 40 248 90 290 150" strokeWidth="4" />
          <path d="M-10 46 C80 50 160 36 240 44" strokeWidth="3" />
          <path d="M20 230 C70 222 130 228 200 236" strokeWidth="3" />
          <path d="M310 100 C318 150 330 200 360 236" strokeWidth="3" />
          <path d="M184 140 C200 170 196 200 214 240" strokeWidth="3" />
        </g>
        <g fill="none" stroke="#1B3A57" strokeWidth="1.5">
          <path d="M0 120 C60 116 100 124 150 118" />
          <path d="M190 20 C210 60 200 100 240 120" />
          <path d="M100 0 C96 30 110 60 100 90" />
          <path d="M270 120 C290 116 320 120 350 112" />
        </g>
        {/* Small charger pins */}
        {pins.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="18" fill="url(#nm-glow)" />
            <circle
              className="pulse"
              cx={x}
              cy={y}
              r="6"
              fill="none"
              stroke="#4EE4B6"
              strokeWidth="1.5"
              style={{ animationDelay: `${i * 0.45}s` }}
            />
            <circle cx={x} cy={y} r="5" fill="#4EE4B6" stroke="#0C2238" strokeWidth="2" />
          </g>
        ))}
        {/* Selected spot */}
        <circle cx="186" cy="106" r="40" fill="url(#nm-glow)" />
        <ellipse cx="186" cy="120" rx="9" ry="3" fill="#071A2B" opacity=".7" />
        <path d="M186 120 C186 120 166 100 166 84 A20 20 0 0 1 206 84 C206 100 186 120 186 120 Z" fill="#4EE4B6" />
        <path d="M188.5 71 179 86h6l-1.5 11 9.5-15h-6l1.5-11Z" fill="#102A43" />
        <rect width="350" height="240" fill="url(#nm-fade)" />
      </g>
    </svg>
  )
}
