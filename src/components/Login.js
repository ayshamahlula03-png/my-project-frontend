import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [greeting, setGreeting] = useState('')
  const [waved, setWaved] = useState(false)
  const [particles, setParticles] = useState([])
  const { login } = useAuth()

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening')
    setParticles(Array.from({ length: 14 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 8 + 4,
      dur: Math.random() * 7 + 5,
      delay: Math.random() * 5,
      op: Math.random() * 0.25 + 0.08,
    })))
    setTimeout(() => setWaved(true), 500)
    setTimeout(() => setWaved(false), 2400)
  }, [])

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!email || !password) return
    setLoading(true)
    setApiError('')
    const result = await login(email, password)
    if (!result.success) setApiError(result.error || 'Invalid credentials. Please try again.')
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Outfit', sans-serif", overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Fraunces:wght@700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideRight {
          from { opacity: 0; transform: translateX(36px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes float {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          50%      { transform: translateY(-22px) rotate(180deg); }
        }
        @keyframes bodyBob {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-6px); }
        }
        @keyframes wave {
          0%   { transform: rotate(-10deg) translateY(0); }
          15%  { transform: rotate(25deg) translateY(-6px); }
          30%  { transform: rotate(-10deg) translateY(0); }
          45%  { transform: rotate(25deg) translateY(-6px); }
          60%  { transform: rotate(-10deg) translateY(0); }
          100% { transform: rotate(-10deg) translateY(0); }
        }
        @keyframes typingArm {
          0%,100% { transform: rotate(-6deg) translateY(0); }
          50%      { transform: rotate(6deg) translateY(-2px); }
        }
        @keyframes screenPulse {
          0%,94%,100% { opacity: 1; }
          96%  { opacity: 0.75; }
        }
        @keyframes blob {
          0%   { transform: translate(0,0) scale(1); }
          33%  { transform: translate(18px,-18px) scale(1.05); }
          66%  { transform: translate(-12px,12px) scale(0.97); }
          100% { transform: translate(0,0) scale(1); }
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes popIn {
          0%   { opacity: 0; transform: scale(0.6) translateY(8px); }
          70%  { transform: scale(1.08) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }

        .inp {
          width: 100%;
          padding: 14px 16px 14px 46px;
          border: 2px solid #e8edf4;
          border-radius: 14px;
          font-size: 15px;
          font-family: inherit;
          font-weight: 500;
          color: #1a1a2e;
          background: #fafbff;
          outline: none;
          transition: border 0.22s, box-shadow 0.22s, transform 0.22s, background 0.22s;
          letter-spacing: 0.1px;
        }
        .inp::placeholder { color: #c8d0dd; font-weight: 400; }
        .inp:focus {
          border-color: #F5A623;
          background: #FFFDF7;
          box-shadow: 0 0 0 4px rgba(245,166,35,0.13), 0 4px 18px rgba(245,166,35,0.08);
          transform: translateY(-1px);
        }

        .login-btn {
          width: 100%;
          padding: 15px;
          background: linear-gradient(100deg, #F5A623 0%, #ffbe4f 45%, #F5A623 90%);
          background-size: 200% auto;
          color: #fff;
          border: none;
          border-radius: 14px;
          font-size: 15.5px;
          font-weight: 800;
          font-family: inherit;
          cursor: pointer;
          letter-spacing: 0.3px;
          transition: transform 0.22s, box-shadow 0.22s;
          box-shadow: 0 6px 24px rgba(245,166,35,0.4);
          position: relative;
          overflow: hidden;
          margin-top: 6px;
          animation: shimmer 2.4s linear infinite;
        }
        .login-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 14px 36px rgba(245,166,35,0.5);
        }
        .login-btn:active:not(:disabled) { transform: translateY(0); }
        .login-btn:disabled { opacity: 0.6; cursor: not-allowed; animation: none; }

        @media(max-width: 820px) {
          .left-panel { display: none !important; }
          .right-panel { width: 100% !important; }
        }
      `}</style>

      {/* ── LEFT PANEL ── */}
      <div className="left-panel" style={{
        flex: 1,
        background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 45%, #0f3460 80%, #1a2a4a 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 32px', position: 'relative', overflow: 'hidden',
      }}>

        {/* Blobs */}
        {[
          { w:500,h:500,t:'-140px',l:'-120px', c:'245,166,35', dur:'12s', dir:'normal' },
          { w:380,h:380,b:'-80px',r:'-60px',   c:'245,166,35', dur:'16s', dir:'reverse' },
          { w:260,h:260,t:'45%',l:'65%',        c:'255,200,80', dur:'10s', dir:'normal', delay:'2s' },
        ].map((b,i) => (
          <div key={i} style={{
            position:'absolute', width:b.w, height:b.h, borderRadius:'50%',
            top:b.t, left:b.l, bottom:b.b, right:b.r,
            background:`radial-gradient(circle, rgba(${b.c},0.18) 0%, transparent 70%)`,
            animation:`blob ${b.dur} ease-in-out infinite ${b.delay||''}`,
            animationDirection: b.dir, pointerEvents:'none',
          }}/>
        ))}

        {/* Particles */}
        {particles.map(p => (
          <div key={p.id} style={{
            position:'absolute', left:`${p.x}%`, top:`${p.y}%`,
            width:p.size, height:p.size, borderRadius:'50%',
            background:`rgba(245,166,35,${p.op})`,
            animation:`float ${p.dur}s ease-in-out infinite ${p.delay}s`,
            pointerEvents:'none',
          }}/>
        ))}

        {/* Spinning deco ring */}
        <div style={{
          position:'absolute', width:320, height:320, borderRadius:'50%',
          border:'1.5px dashed rgba(245,166,35,0.2)',
          top:'50%', left:'50%', transform:'translate(-50%,-50%)',
          animation:'spinSlow 30s linear infinite', pointerEvents:'none',
        }}/>

        {/* Brand */}
        <div style={{ zIndex:1, textAlign:'center', marginBottom:24, animation:'fadeUp 0.7s ease both' }}>
          <div style={{
            width:58, height:58, borderRadius:18,
            background:'linear-gradient(135deg, #F5A623, #ffbe4f)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:26, margin:'0 auto 12px',
            boxShadow:'0 8px 28px rgba(245,166,35,0.55)',
          }}>📋</div>
          <div style={{ fontFamily:"'Fraunces',serif", fontSize:25, fontWeight:800, color:'#fff', letterSpacing:'-0.3px' }}>
            Agency Automation
          </div>
          <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.42)', marginTop:5, fontWeight:500 }}>
            Creative workflow management
          </div>
        </div>

        {/* ── ANIMATED PERSON ── */}
        <div style={{ zIndex:1, animation:'bodyBob 3s ease-in-out infinite', width:310 }}>
          <svg viewBox="0 0 320 280" width="310" fill="none" xmlns="http://www.w3.org/2000/svg">

            {/* Shadow */}
            <ellipse cx="160" cy="268" rx="115" ry="9" fill="rgba(0,0,0,0.18)"/>

            {/* Desk */}
            <rect x="48" y="186" width="224" height="11" rx="5.5" fill="#0f1f3d"/>
            <rect x="68" y="197" width="9" height="44" rx="4.5" fill="#0a1628"/>
            <rect x="243" y="197" width="9" height="44" rx="4.5" fill="#0a1628"/>

            {/* LAPTOP ON LAP */}
            {/* Base */}
            <rect x="102" y="175" width="116" height="13" rx="5" fill="#1e293b" transform="rotate(-2 102 175)"/>
            {/* Screen */}
            <rect x="106" y="104" width="108" height="73" rx="7" fill="#1e293b" transform="rotate(-2 106 104)"/>
            {/* Glass */}
            <rect x="111" y="109" width="98" height="63" rx="4.5" fill="#0d1b2e"
              style={{ animation:'screenPulse 7s ease-in-out infinite' }}
              transform="rotate(-2 111 109)"/>
            {/* Content */}
            <g transform="rotate(-2 160 140)">
              <rect x="117" y="117" width="60" height="5.5" rx="2.75" fill="#F5A623" opacity="0.95"/>
              <rect x="117" y="127" width="88" height="3.5" rx="1.75" fill="rgba(255,255,255,0.22)"/>
              <rect x="117" y="134" width="72" height="3.5" rx="1.75" fill="rgba(255,255,255,0.17)"/>
              <rect x="117" y="141" width="80" height="3.5" rx="1.75" fill="rgba(255,255,255,0.14)"/>
              <rect x="117" y="148" width="52" height="3.5" rx="1.75" fill="rgba(99,102,241,0.55)"/>
              <rect x="117" y="155" width="66" height="3.5" rx="1.75" fill="rgba(255,255,255,0.1)"/>
              <rect x="117" y="163" width="2" height="9" rx="1" fill="#F5A623">
                <animate attributeName="opacity" values="1;0;1" dur="1.1s" repeatCount="indefinite"/>
              </rect>
            </g>
            {/* Hinge */}
            <rect x="106" y="176" width="108" height="4" rx="2" fill="#0f172a" transform="rotate(-2 106 176)"/>

            {/* Chair */}
            <rect x="130" y="197" width="60" height="9" rx="4.5" fill="#1a2a4a"/>
            <rect x="152" y="206" width="16" height="32" rx="4" fill="#0f1f3d"/>
            <rect x="130" y="235" width="60" height="7" rx="3.5" fill="#1a2a4a"/>
            <circle cx="140" cy="248" r="5" fill="#0a1628"/>
            <circle cx="160" cy="250" r="5" fill="#0a1628"/>
            <circle cx="180" cy="248" r="5" fill="#0a1628"/>

            {/* Legs */}
            <rect x="145" y="196" width="15" height="28" rx="6" fill="#1e293b"/>
            <rect x="162" y="196" width="15" height="28" rx="6" fill="#1e293b"/>
            <ellipse cx="152" cy="226" rx="11" ry="5" fill="#0f172a"/>
            <ellipse cx="169" cy="226" rx="11" ry="5" fill="#0f172a"/>

            {/* Body / shirt */}
            <rect x="140" y="152" width="40" height="48" rx="14" fill="#F5A623"/>
            <path d="M155 152 L160 163 L165 152" stroke="#E09610" strokeWidth="2" fill="none"/>

            {/* RIGHT ARM — typing */}
            <g style={{ transformOrigin:'178px 165px', animation:'typingArm 0.55s ease-in-out infinite' }}>
              <rect x="176" y="160" width="34" height="10" rx="5" fill="#F5A623"/>
              <ellipse cx="214" cy="165" rx="8" ry="6" fill="#fde68a"/>
            </g>

            {/* LEFT ARM — wave or type */}
            <g style={{
              transformOrigin:'143px 163px',
              animation: waved ? 'wave 1.8s ease-in-out' : 'typingArm 0.55s ease-in-out infinite 0.27s',
            }}>
              <rect x="110" y="160" width="34" height="10" rx="5" fill="#F5A623"/>
              <ellipse cx="108" cy="165" rx="8" ry="6" fill="#fde68a"/>
            </g>

            {/* Neck */}
            <rect x="154" y="136" width="12" height="18" rx="6" fill="#fde68a"/>

            {/* Head */}
            <ellipse cx="160" cy="122" rx="24" ry="26" fill="#fde68a"/>
            {/* Hair */}
            <path d="M136 114 Q137 93 160 90 Q183 93 184 114 Q178 99 160 97 Q142 99 136 114Z" fill="#1a1a2e"/>
            <rect x="136" y="114" width="6" height="9" rx="3" fill="#1a1a2e"/>
            <rect x="178" y="114" width="6" height="9" rx="3" fill="#1a1a2e"/>

            {/* Glasses */}
            <rect x="147" y="118" width="12" height="9" rx="4" fill="none" stroke="#1a1a2e" strokeWidth="1.8"/>
            <rect x="161" y="118" width="12" height="9" rx="4" fill="none" stroke="#1a1a2e" strokeWidth="1.8"/>
            <line x1="159" y1="122" x2="161" y2="122" stroke="#1a1a2e" strokeWidth="1.8"/>
            <line x1="145" y1="122" x2="142" y2="121" stroke="#1a1a2e" strokeWidth="1.8"/>
            <line x1="173" y1="122" x2="176" y2="121" stroke="#1a1a2e" strokeWidth="1.8"/>
            <circle cx="153" cy="122" r="2.2" fill="#1a1a2e"/>
            <circle cx="167" cy="122" r="2.2" fill="#1a1a2e"/>
            <circle cx="154" cy="121" r="0.8" fill="#fff"/>
            <circle cx="168" cy="121" r="0.8" fill="#fff"/>

            {/* Eyebrows */}
            <path d="M148 116 Q153 113 158 115" stroke="#1a1a2e" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            <path d="M162 115 Q167 113 172 116" stroke="#1a1a2e" strokeWidth="1.5" strokeLinecap="round" fill="none"/>

            {/* Smile */}
            <path d="M152 131 Q160 138 168 131" stroke="#c87941" strokeWidth="2" strokeLinecap="round" fill="none"/>
            {/* Blush */}
            <ellipse cx="145" cy="129" rx="5" ry="3" fill="rgba(255,140,90,0.2)"/>
            <ellipse cx="175" cy="129" rx="5" ry="3" fill="rgba(255,140,90,0.2)"/>
            {/* Ears */}
            <ellipse cx="136" cy="123" rx="4.5" ry="5.5" fill="#f0c080"/>
            <ellipse cx="184" cy="123" rx="4.5" ry="5.5" fill="#f0c080"/>

            {/* Hi bubble — shows on wave */}
            {waved && (
              <g style={{ animation:'popIn 0.35s cubic-bezier(0.16,1,0.3,1) both' }}>
                <rect x="176" y="76" width="58" height="34" rx="10" fill="#fff"
                  style={{ filter:'drop-shadow(0 4px 12px rgba(0,0,0,0.18))' }}/>
                <path d="M190 110 L194 120 L198 110Z" fill="#fff"/>
                <text x="205" y="97" fill="#F5A623" fontSize="14" fontWeight="900" textAnchor="middle" fontFamily="Outfit,sans-serif">Hi! 👋</text>
                <text x="205" y="111" fill="#94a3b8" fontSize="9.5" textAnchor="middle" fontFamily="Outfit,sans-serif">Welcome back</text>
              </g>
            )}

            {/* Floating notification cards */}
            <g style={{ animation:'float 5s ease-in-out infinite' }}>
              <rect x="222" y="80" width="86" height="44" rx="10" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.18)" strokeWidth="1"/>
              <circle cx="238" cy="100" r="7" fill="#10b981"/>
              <text x="238" y="104" fill="white" fontSize="8" textAnchor="middle">✓</text>
              <rect x="250" y="92" width="50" height="4" rx="2" fill="rgba(255,255,255,0.6)"/>
              <rect x="250" y="100" width="38" height="3.5" rx="1.75" fill="rgba(255,255,255,0.35)"/>
              <rect x="250" y="108" width="46" height="3" rx="1.5" fill="rgba(255,255,255,0.2)"/>
            </g>
            <g style={{ animation:'float 6.5s ease-in-out infinite 1.8s' }}>
              <rect x="16" y="100" width="82" height="38" rx="10" fill="rgba(245,166,35,0.2)" stroke="rgba(245,166,35,0.38)" strokeWidth="1"/>
              <rect x="27" y="111" width="46" height="4" rx="2" fill="rgba(255,255,255,0.6)"/>
              <rect x="27" y="119" width="62" height="3.5" rx="1.75" fill="rgba(255,255,255,0.35)"/>
            </g>

            {/* Coffee */}
            <rect x="44" y="170" width="22" height="18" rx="5" fill="white" opacity="0.9"/>
            <path d="M66 175 Q74 175 74 181 Q74 187 66 187" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" fill="none"/>
            <rect x="47" y="173" width="16" height="6" rx="2" fill="#F5A623" opacity="0.5"/>
            <path d="M50 168 Q52 162 50 155" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round">
              <animate attributeName="d" values="M50 168 Q52 162 50 155;M50 168 Q54 162 52 155;M50 168 Q52 162 50 155" dur="2s" repeatCount="indefinite"/>
            </path>
            <path d="M56 168 Q58 162 56 155" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round">
              <animate attributeName="d" values="M56 168 Q58 162 56 155;M56 168 Q62 162 60 155;M56 168 Q58 162 56 155" dur="2.7s" repeatCount="indefinite"/>
            </path>
          </svg>
        </div>

        {/* Tagline */}
        <p style={{
          zIndex:1, fontSize:13, color:'rgba(255,255,255,0.42)', fontWeight:500,
          textAlign:'center', marginTop:14, lineHeight:1.75, letterSpacing:'0.15px',
          animation:'fadeUp 0.8s 0.5s ease both', opacity:0, animationFillMode:'forwards',
        }}>
          Streamline your creative workflow —<br/>assign tasks, track progress, all in one place
        </p>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="right-panel" style={{
        width:490, flexShrink:0, background:'#fff',
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:'52px 54px', position:'relative',
        animation:'slideRight 0.7s cubic-bezier(0.16,1,0.3,1) both',
      }}>
        {/* Corner accent */}
        <div style={{
          position:'absolute', top:0, right:0, width:130, height:130,
          background:'radial-gradient(circle at top right, rgba(245,166,35,0.07) 0%, transparent 70%)',
          pointerEvents:'none',
        }}/>

        <div style={{ width:'100%' }}>

          {/* Greeting badge + Title */}
          <div style={{ marginBottom:30, animation:'fadeUp 0.6s 0.1s ease both', opacity:0, animationFillMode:'forwards' }}>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:7,
              background:'#FFF8EC', border:'1.5px solid #FFE4A0',
              borderRadius:100, padding:'5px 15px', marginBottom:16,
            }}>
              <span style={{ fontSize:15 }}>👋</span>
              <span style={{ fontSize:12.5, fontWeight:700, color:'#B07D10', letterSpacing:'0.2px' }}>{greeting}!</span>
            </div>
            <h1 style={{
              fontFamily:"'Fraunces',serif",
              fontSize:34, fontWeight:800, color:'#0f172a',
              lineHeight:1.12, marginBottom:10, letterSpacing:'-0.4px',
            }}>
              Sign in to your<br/>workspace
            </h1>
            <p style={{ fontSize:14, color:'#94a3b8', fontWeight:500, lineHeight:1.65, letterSpacing:'0.1px' }}>
              Enter your credentials to continue
            </p>
          </div>

          {/* Role pills */}
          <div style={{
            display:'flex', gap:8, marginBottom:28, flexWrap:'wrap',
            animation:'fadeUp 0.6s 0.2s ease both', opacity:0, animationFillMode:'forwards',
          }}>
            {[['👑','Admin','#FEF3C7','#92400E'],['📋','Planner','#EFF6FF','#1D4ED8'],['🎨','Designer','#F0FDF4','#166534']].map(([icon,label,bg,col])=>(
              <span key={label} style={{
                display:'inline-flex', alignItems:'center', gap:5,
                padding:'5px 13px', borderRadius:100,
                background:bg, color:col,
                fontSize:12, fontWeight:700, letterSpacing:'0.15px',
              }}>{icon} {label}</span>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ animation:'fadeUp 0.6s 0.3s ease both', opacity:0, animationFillMode:'forwards' }}>

            <div style={{ marginBottom:18 }}>
              <label style={{ display:'block', fontSize:11.5, fontWeight:700, color:'#64748b', letterSpacing:'0.6px', textTransform:'uppercase', marginBottom:8 }}>
                Email Address
              </label>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:16, pointerEvents:'none' }}>✉️</span>
                <input
                  type="email"
                  className="inp"
                  placeholder="you@agency.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setApiError('') }}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom:20 }}>
              <label style={{ display:'block', fontSize:11.5, fontWeight:700, color:'#64748b', letterSpacing:'0.6px', textTransform:'uppercase', marginBottom:8 }}>
                Password
              </label>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:16, pointerEvents:'none' }}>🔒</span>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="inp"
                  style={{ paddingRight:46 }}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setApiError('') }}
                  required
                />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{
                  position:'absolute', right:14, top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', cursor:'pointer', fontSize:15,
                  color:'#94a3b8', padding:4, fontFamily:'inherit', transition:'color 0.2s',
                }}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {apiError && (
              <div style={{
                background:'#fef2f2', border:'1.5px solid #fecaca', borderRadius:12,
                padding:'11px 15px', marginBottom:16,
                fontSize:13, color:'#dc2626', fontWeight:600,
                display:'flex', alignItems:'center', gap:8,
                animation:'fadeUp 0.3s ease both',
              }}>
                ⚠️ {apiError}
              </div>
            )}

            <button type="submit" className="login-btn" disabled={loading || !email || !password}>
              {loading ? (
                <span style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" style={{ animation:'spinSlow 0.85s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                    <path d="M12 2 A10 10 0 0 1 22 12" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign In →'}
            </button>
          </form>

          <p style={{
            marginTop:26, textAlign:'center', fontSize:12, color:'#dde3ec', fontWeight:500,
            letterSpacing:'0.15px',
            animation:'fadeUp 0.6s 0.5s ease both', opacity:0, animationFillMode:'forwards',
          }}>
            Role-based access • Secure login • Agency Automation v1.0
          </p>
        </div>
      </div>
    </div>
  )
}