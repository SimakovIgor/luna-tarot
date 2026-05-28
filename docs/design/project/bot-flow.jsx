
// ═══════════════════════════════════════════════
// Luna Tarot — Bot Flow Components
// ═══════════════════════════════════════════════

const DEMO_NAME = 'Алиса';
const DEMO_QUESTION = 'Что меня ждёт в личных отношениях?';

const DEMO_CARDS = [
  {
    position: 'Прошлое', numeral: 'XVIII', name: 'Луна', symbol: '☽',
    colors: ['#160530', '#4a1582'],
    keywords: ['Иллюзии', 'Подсознание', 'Скрытое'],
    text: 'В прошлом тебя окружали иллюзии. Ты видела лишь то, что хотела видеть, подсознание брало верх над разумом.',
  },
  {
    position: 'Настоящее', numeral: 'VI', name: 'Влюблённые', symbol: '♡',
    colors: ['#3d0416', '#9f1239'],
    keywords: ['Выбор', 'Связь', 'Честность'],
    text: 'Перед тобой важный выбор в отношениях. Карта призывает к честности — с собой и с близкими.',
  },
  {
    position: 'Будущее', numeral: 'XVII', name: 'Звезда', symbol: '✦',
    colors: ['#031040', '#1e3a8a'],
    keywords: ['Надежда', 'Обновление', 'Ясность'],
    text: 'Впереди — свет и обновление. После периода сомнений придут вдохновение и уверенность в своих чувствах.',
  },
];

const STEPS = [
  {
    msgs: [
      { from: 'bot', text: '✨ Добро пожаловать! Я — Luna, твой персональный ИИ-таролог.' },
      { from: 'bot', text: 'Задай вопрос о жизни, отношениях или будущем — карты откроют ответ.' },
    ],
    action: { label: 'Начать ✨', kind: 'cta' },
  },
  {
    msgs: [
      { from: 'user', text: 'Начать ✨' },
      { from: 'bot', text: 'Как тебя зовут? Имя помогает настроить расклад лично под тебя.' },
    ],
    action: { label: DEMO_NAME, kind: 'quick' },
  },
  {
    msgs: [
      { from: 'user', text: DEMO_NAME },
      { from: 'bot', text: `${DEMO_NAME}, рада знакомству 🌙\nКогда ты родилась? Дата раскрывает твой эзотерический профиль.` },
    ],
    action: { label: '15.03.1995', kind: 'quick' },
  },
  {
    msgs: [
      { from: 'user', text: '15.03.1995' },
      { from: 'bot', tag: 'profile', text: '♓ Рыбы · Число судьбы 7 · Луна убывает\nЭзотерический профиль создан ✓' },
      { from: 'bot', text: 'Что хочешь узнать сегодня?' },
    ],
    action: { kind: 'menu' },
  },
  {
    msgs: [
      { from: 'user', text: '🔮 Расклад на вопрос' },
      { from: 'bot', text: 'Сформулируй свой вопрос. Чем точнее намерение — тем глубже расклад.' },
    ],
    action: { label: DEMO_QUESTION, kind: 'typed' },
  },
  // Step 5: user "sent" the question — auto-triggers thinking via useEffect
  {
    msgs: [{ from: 'user', text: DEMO_QUESTION }],
    action: { kind: 'thinking' },
  },
  { msgs: [], action: { kind: 'cards' } },
  { msgs: [], action: { kind: 'reading' } },
];

// ── Palette ───────────────────────────────────────────────────────────
const C = {
  bg: '#090613', bgChat: '#0c0820', surface: '#110a28', surface2: '#180f38',
  purple: '#8b5cf6', purpleMid: '#7c3aed',
  purpleBtn: 'linear-gradient(135deg,#7c3aed,#a855f7)',
  gold: '#c9a14a', text: '#ede7ff', dim: 'rgba(237,231,255,.5)',
  border: 'rgba(139,92,246,.22)', userBg: '#4c25a0', botBg: '#18103a',
};

// ── CSS ───────────────────────────────────────────────────────────────
function injectBotStyles() {
  if (document.getElementById('luna-bot-styles')) return;
  const s = document.createElement('style');
  s.id = 'luna-bot-styles';
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
    @keyframes luna-fadeup { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
    @keyframes luna-dot { 0%,80%,100%{opacity:.2;transform:scale(.75)} 40%{opacity:1;transform:scale(1)} }
    @keyframes luna-glow { 0%,100%{box-shadow:0 0 14px rgba(139,92,246,.35)} 50%{box-shadow:0 0 30px rgba(139,92,246,.7)} }
    @keyframes luna-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
    @keyframes luna-cardin { from{opacity:0;transform:translateY(20px) scale(.93)} to{opacity:1;transform:none} }
    @keyframes luna-pulse { 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.06)} }
    .luna-msg { animation: luna-fadeup .3s ease both; }
    .luna-card-wrap { perspective: 800px; }
    .luna-card-inner {
      position: relative; width: 86px; height: 140px;
      transition: transform .7s cubic-bezier(.4,.2,.2,1);
      transform-style: preserve-3d;
    }
    .luna-card-inner.flipped { transform: rotateY(180deg); }
    .luna-card-side {
      position: absolute; inset: 0; border-radius: 10px;
      backface-visibility: hidden; -webkit-backface-visibility: hidden; overflow: hidden;
    }
    .luna-card-face { transform: rotateY(180deg); }
    .luna-card-appear { animation: luna-cardin .5s ease both; }
    .luna-tap-hint { animation: luna-pulse 1.8s ease-in-out infinite; }
  `;
  document.head.appendChild(s);
}

// ── Beautiful Card Back SVG ───────────────────────────────────────────
function CardBackSVG({ width = 86, height = 140, uid = '0' }) {
  const cx = width / 2, cy = height * 0.44;
  const mr = width * 0.172; // moon radius
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <defs>
        <radialGradient id={`cbg${uid}`} cx={cx} cy={cy * 0.8} r={width * 0.85} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#33117a"/>
          <stop offset="45%" stopColor="#1a063e"/>
          <stop offset="100%" stopColor="#060115"/>
        </radialGradient>
      </defs>
      {/* BG */}
      <rect width={width} height={height} rx="10" fill={`url(#cbg${uid})`}/>
      {/* Outer border */}
      <rect x="3" y="3" width={width-6} height={height-6} rx="7.5" fill="none" stroke="#c9a14a" strokeWidth="0.75" strokeOpacity="0.65"/>
      {/* Inner border */}
      <rect x="7.5" y="7.5" width={width-15} height={height-15} rx="4.5" fill="none" stroke="#c9a14a" strokeWidth="0.35" strokeOpacity="0.3"/>
      {/* Corner ornaments */}
      {[
        [`M7.5,${7.5+11} L7.5,7.5 L${7.5+11},7.5`, 7.5, 7.5],
        [`M${width-18.5},7.5 L${width-7.5},7.5 L${width-7.5},${18.5}`, width-7.5, 7.5],
        [`M7.5,${height-18.5} L7.5,${height-7.5} L${18.5},${height-7.5}`, 7.5, height-7.5],
        [`M${width-18.5},${height-7.5} L${width-7.5},${height-7.5} L${width-7.5},${height-18.5}`, width-7.5, height-7.5],
      ].map(([d, dotX, dotY], i) => (
        <g key={i}>
          <path d={d} fill="none" stroke="#c9a14a" strokeWidth="1" strokeOpacity="0.6" strokeLinecap="round"/>
          <circle cx={dotX} cy={dotY} r="1.4" fill="#c9a14a" fillOpacity="0.55"/>
        </g>
      ))}
      {/* Stars */}
      {[
        [cx*0.58, cy*0.3, 1.1, 0.6], [cx*1.45, cy*0.3, 1.4, 0.45],
        [cx*0.35, cy*0.68, 0.75, 0.28], [cx*1.65, cy*0.68, 0.75, 0.28],
        [cx, cy*0.14, 1.2, 0.65], [cx*0.5, height*0.86, 1.1, 0.5],
        [cx*1.5, height*0.86, 1.4, 0.4], [cx*0.38, height*0.55, 0.7, 0.22],
        [cx*1.62, height*0.55, 0.7, 0.22],
      ].map(([x, y, r, op], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#c9a14a" opacity={op}/>
      ))}
      {/* Dashed orbit ring */}
      <circle cx={cx} cy={cy} r={mr * 1.75} fill="none" stroke="#8b5cf6" strokeWidth="0.4" strokeOpacity="0.35" strokeDasharray={`${mr*0.45} ${mr*0.22}`}/>
      <circle cx={cx} cy={cy} r={mr * 2.25} fill="none" stroke="#c9a14a" strokeWidth="0.25" strokeOpacity="0.18"/>
      {/* Crescent moon: gold circle, then bg circle offset creates crescent */}
      <circle cx={cx} cy={cy} r={mr} fill="#c9a14a" fillOpacity="0.92"/>
      <circle cx={cx + mr*0.46} cy={cy - mr*0.1} r={mr * 0.77} fill={`url(#cbg${uid})`}/>
      {/* Diamond accent below moon */}
      <polygon
        points={`${cx},${cy+mr+7} ${cx+3.5},${cy+mr+11} ${cx},${cy+mr+15} ${cx-3.5},${cy+mr+11}`}
        fill="#c9a14a" fillOpacity="0.55"
      />
      {/* LUNA text */}
      <text x={cx} y={height - 11} textAnchor="middle" fontSize="6.5" fill="#c9a14a"
        fillOpacity="0.45" fontFamily="Cormorant Garamond, serif" letterSpacing="3">LUNA</text>
    </svg>
  );
}

// ── Phone Frame ───────────────────────────────────────────────────────
function PhoneFrame({ children }) {
  injectBotStyles();
  return (
    <div style={{
      width: 375, height: 812, background: '#0d0d12', borderRadius: 54,
      boxShadow: '0 0 0 1.5px rgba(255,255,255,.1), 0 40px 90px rgba(0,0,0,.9)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Notch */}
      <div style={{ height: 50, background: C.surface, flexShrink: 0, position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 24px 8px' }}>
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 126, height: 34, background: '#0d0d12', borderRadius: '0 0 24px 24px' }}/>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'white', zIndex: 1 }}>9:41</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', zIndex: 1 }}>
          <svg width="17" height="12" viewBox="0 0 17 12" fill="white" opacity="0.8">
            <rect x="0" y="5" width="3" height="7" rx="1"/><rect x="4.5" y="3" width="3" height="9" rx="1"/>
            <rect x="9" y="1" width="3" height="11" rx="1"/><rect x="13.5" y="0" width="3" height="12" rx="1" opacity="0.3"/>
          </svg>
          <svg width="26" height="12" viewBox="0 0 26 12" fill="none">
            <rect x="0.5" y="0.5" width="22" height="11" rx="2" stroke="white" strokeOpacity="0.6" strokeWidth="1"/>
            <rect x="23" y="3.5" width="2.5" height="5" rx="1" fill="white" fillOpacity="0.5"/>
            <rect x="2" y="2" width="16" height="8" rx="1.5" fill="white"/>
          </svg>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
      <div style={{ height: 30, background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <div style={{ width: 130, height: 5, background: 'rgba(255,255,255,.22)', borderRadius: 3 }}/>
      </div>
    </div>
  );
}

// ── Bot Header ────────────────────────────────────────────────────────
function BotHeader() {
  return (
    <div style={{ height: 58, background: C.surface, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10, flexShrink: 0 }}>
      <svg width="10" height="18" viewBox="0 0 10 18" fill="none">
        <path d="M9 1L1 9L9 17" stroke="rgba(139,92,246,.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#c084fc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, animation: 'luna-glow 3s ease-in-out infinite', flexShrink: 0 }}>☽</div>
      <div style={{ flex: 1 }}>
        <div style={{ color: C.text, fontSize: 15, fontWeight: 600 }}>Luna Tarot</div>
        <div style={{ color: C.dim, fontSize: 11.5 }}>онлайн · ИИ-таролог</div>
      </div>
    </div>
  );
}

// ── Chat Message ──────────────────────────────────────────────────────
function ChatMsg({ msg }) {
  const isBot = msg.from === 'bot';
  if (msg.tag === 'profile') {
    return (
      <div className="luna-msg" style={{
        alignSelf: 'center', margin: '6px 0',
        background: 'linear-gradient(135deg,rgba(124,58,237,.18),rgba(168,85,247,.1))',
        border: '1px solid rgba(139,92,246,.3)', borderRadius: 14, padding: '10px 18px',
        fontSize: 12.5, color: C.gold, textAlign: 'center',
        fontFamily: "'Cormorant Garamond', serif", letterSpacing: '0.06em',
        whiteSpace: 'pre-line', lineHeight: 1.6,
      }}>{msg.text}</div>
    );
  }
  return (
    <div className="luna-msg" style={{ display: 'flex', justifyContent: isBot ? 'flex-start' : 'flex-end', alignItems: 'flex-end', gap: 6, margin: '2px 0' }}>
      {isBot && (
        <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#7c3aed,#c084fc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>☽</div>
      )}
      <div style={{
        maxWidth: '73%',
        background: isBot ? C.botBg : C.userBg,
        borderRadius: isBot ? '4px 18px 18px 18px' : '18px 4px 18px 18px',
        padding: '9px 14px', fontSize: 13.5, lineHeight: 1.5, color: C.text,
        whiteSpace: 'pre-line', border: isBot ? `1px solid ${C.border}` : 'none',
      }}>{msg.text}</div>
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────
function Typing({ label = 'Luna тянет карты...' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0' }}>
      <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#7c3aed,#c084fc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>☽</div>
      <div style={{ background: C.botBg, border: `1px solid ${C.border}`, borderRadius: '4px 18px 18px 18px', padding: '11px 16px', display: 'flex', gap: 5 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: C.purple, animation: `luna-dot 1.3s ease-in-out ${i*0.2}s infinite` }}/>
        ))}
      </div>
      <span style={{ color: C.dim, fontSize: 11, marginLeft: 2 }}>{label}</span>
    </div>
  );
}

// ── Tarot Card Deck (3 flip cards) ────────────────────────────────────
function CardsDeck({ flipped, onFlip, onReadMore }) {
  const allFlipped = flipped.length === 3;
  return (
    <div className="luna-msg" style={{ margin: '8px 0 4px 32px' }}>
      <div style={{ fontSize: 11, color: C.dim, marginBottom: 10, letterSpacing: '0.05em' }}>
        ✦ Нажми на каждую карту, чтобы открыть
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        {DEMO_CARDS.map((card, i) => {
          const isFlipped = flipped.includes(i);
          return (
            <div key={i} className="luna-card-wrap luna-card-appear"
              style={{ cursor: isFlipped ? 'default' : 'pointer', animationDelay: `${i * 0.13}s`, flexShrink: 0 }}
              onClick={() => !isFlipped && onFlip(i)}
            >
              <div className={`luna-card-inner${isFlipped ? ' flipped' : ''}`}>
                {/* Back */}
                <div className="luna-card-side">
                  <CardBackSVG width={86} height={140} uid={`main${i}`}/>
                </div>
                {/* Face */}
                <div className="luna-card-side luna-card-face" style={{
                  background: `linear-gradient(155deg,${card.colors[0]},${card.colors[1]})`,
                  border: '1px solid rgba(255,255,255,.14)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px',
                }}>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,.5)', fontFamily: 'DM Sans' }}>{card.numeral}</span>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 34 }}>{card.symbol}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 11, color: 'rgba(255,255,255,.95)', fontWeight: 600 }}>{card.name}</div>
                    <div style={{ fontSize: 8, color: 'rgba(255,255,255,.45)', marginTop: 2 }}>{card.position}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {allFlipped && (
        <button onClick={onReadMore} className="luna-msg" style={{
          marginTop: 14, display: 'block', width: '100%',
          background: C.purpleBtn, border: 'none', borderRadius: 24,
          padding: '11px 0', color: 'white', fontSize: 13.5, fontWeight: 600,
          cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
          boxShadow: '0 4px 18px rgba(124,58,237,.45)',
        }}>Читать полный расклад ✨</button>
      )}
    </div>
  );
}

// ── Full Reading ──────────────────────────────────────────────────────
function FullReading() {
  return (
    <div style={{ padding: '4px 0 12px' }}>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", color: C.gold, fontSize: 15, fontWeight: 600, textAlign: 'center', marginBottom: 12, letterSpacing: '0.12em', textTransform: 'uppercase' }}>✦ Твой расклад</div>
      {DEMO_CARDS.map((card, i) => (
        <div key={i} className="luna-msg" style={{ marginBottom: 9, background: C.surface2, borderRadius: 14, padding: '11px 12px', border: `1px solid ${C.border}`, animationDelay: `${i * 0.15}s` }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 44, height: 68, borderRadius: 6, flexShrink: 0, background: `linear-gradient(155deg,${card.colors[0]},${card.colors[1]})`, border: '1px solid rgba(255,255,255,.12)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '6px 2px' }}>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,.4)' }}>{card.numeral}</span>
              <span style={{ fontSize: 20 }}>{card.symbol}</span>
              <span style={{ fontSize: 7, fontFamily: "'Cormorant Garamond',serif", color: 'rgba(255,255,255,.8)', fontWeight: 600 }}>{card.name}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: C.gold, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{card.position}</div>
              <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.5 }}>{card.text}</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 7 }}>
                {card.keywords.map(kw => (
                  <span key={kw} style={{ fontSize: 10, color: C.purple, background: 'rgba(139,92,246,.12)', padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(139,92,246,.28)' }}>{kw}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
      <div className="luna-msg" style={{ background: 'linear-gradient(135deg,rgba(124,58,237,.15),rgba(168,85,247,.08))', borderRadius: 14, padding: '12px 14px', border: `1px solid rgba(139,92,246,.28)`, animationDelay: '0.45s' }}>
        <div style={{ fontSize: 10, color: C.gold, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>✦ Совет Luna</div>
        <div style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.55 }}>Карты указывают на переходный момент. Твоё прошлое — опыт, настоящее — выбор, а будущее открыто. Будь честна — и путь прояснится.</div>
      </div>
    </div>
  );
}

// ── Input Area ────────────────────────────────────────────────────────
function InputArea({ action, onAdvance, showHint }) {
  const { kind, label } = action;

  if (kind === 'reading') {
    return (
      <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, padding: '10px 14px 12px', flexShrink: 0, textAlign: 'center' }}>
        <div style={{ color: C.dim, fontSize: 12 }}>✦ Новый расклад — нажми ниже</div>
      </div>
    );
  }
  if (kind === 'cards') {
    return (
      <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, padding: '10px 14px 12px', flexShrink: 0, textAlign: 'center' }}>
        <div style={{ color: C.dim, fontSize: 12 }}>✦ Нажимай на карты выше, чтобы открыть</div>
      </div>
    );
  }
  if (kind === 'thinking') {
    return (
      <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, padding: '10px 14px 12px', flexShrink: 0 }}>
        <div style={{ textAlign: 'center', color: C.dim, fontSize: 12, background: 'linear-gradient(90deg,transparent,rgba(139,92,246,.3),transparent)', backgroundSize: '200% 100%', animation: 'luna-shimmer 1.5s linear infinite', padding: '8px', borderRadius: 10 }}>
          Луна раскладывает карты...
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, padding: '10px 12px 14px', flexShrink: 0 }}>
      {kind === 'menu' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {['🔮 Расклад на вопрос', '🌙 Карта дня', '📜 История'].map((opt, i) => (
            <button key={opt} onClick={i === 0 ? onAdvance : undefined} style={{
              background: i === 0 ? 'rgba(139,92,246,.18)' : 'transparent',
              border: `1px solid ${i === 0 ? C.purple : C.border}`, borderRadius: 22,
              padding: '8px 14px', color: i === 0 ? C.text : C.dim,
              fontSize: 12.5, cursor: i === 0 ? 'pointer' : 'default',
              fontFamily: "'DM Sans',sans-serif",
            }}>{opt}</button>
          ))}
        </div>
      )}
      {kind === 'typed' && (
        <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 22, padding: '10px 14px', marginBottom: 10, color: 'rgba(237,231,255,.65)', fontSize: 13, fontStyle: 'italic' }}>
          {DEMO_QUESTION}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {kind !== 'typed' && (
          <div style={{ flex: 1, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 22, padding: '10px 14px', color: C.dim, fontSize: 13 }}>
            Сообщение...
          </div>
        )}
        <button onClick={onAdvance} style={{
          background: C.purpleBtn, border: 'none', borderRadius: '50%',
          width: 44, height: 44, cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(124,58,237,.45)',
          fontSize: kind === 'typed' ? 16 : 18, color: 'white',
        }}>
          {kind === 'typed' ? '🔮' : '›'}
        </button>
      </div>
      {(kind === 'cta' || kind === 'quick') && (
        <button onClick={onAdvance} className="luna-tap-hint" style={{
          width: '100%', marginTop: 9,
          background: kind === 'cta' ? C.purpleBtn : 'transparent',
          border: `1px solid ${C.purple}`, borderRadius: 24, padding: '11px 0',
          color: 'white', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
          fontFamily: "'DM Sans',sans-serif",
          boxShadow: kind === 'cta' ? '0 4px 18px rgba(124,58,237,.4)' : 'none',
        }}>{label}</button>
      )}
    </div>
  );
}

// ── Main Bot Flow ─────────────────────────────────────────────────────
function BotFlow() {
  const [step, setStep]         = React.useState(0);
  const [flipped, setFlipped]   = React.useState([]);
  const [thinking, setThinking] = React.useState(false);
  const chatRef                 = React.useRef(null);

  // ✅ FIX: Auto-trigger thinking animation when step reaches 5
  React.useEffect(() => {
    if (step !== 5) return;
    setThinking(true);
    const t = setTimeout(() => { setThinking(false); setStep(6); }, 2500);
    return () => clearTimeout(t);
  }, [step]);

  // Auto-scroll chat
  React.useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [step, flipped, thinking]);

  // Accumulate messages from all steps up to current
  let allMsgs = [];
  for (let i = 0; i <= Math.min(step, STEPS.length - 1); i++) {
    allMsgs = allMsgs.concat(STEPS[i].msgs);
  }

  const currentAction = STEPS[Math.min(step, STEPS.length - 1)].action;

  const advance = React.useCallback(() => {
    if (step === 5) return; // auto-handled by useEffect
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  }, [step]);

  const isCards   = currentAction.kind === 'cards';
  const isReading = currentAction.kind === 'reading';

  return (
    <PhoneFrame>
      <BotHeader/>
      <div ref={chatRef} style={{
        flex: 1, background: C.bgChat, overflowY: 'auto',
        padding: '14px 10px 8px', display: 'flex', flexDirection: 'column', gap: 2,
      }}>
        {allMsgs.map((msg, i) => <ChatMsg key={i} msg={msg}/>)}
        {thinking && <Typing/>}
        {isCards && !thinking && (
          <CardsDeck
            flipped={flipped}
            onFlip={i => setFlipped(p => [...p, i])}
            onReadMore={() => setStep(7)}
          />
        )}
        {isReading && <FullReading/>}
      </div>
      <InputArea action={currentAction} onAdvance={advance}/>
    </PhoneFrame>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// CARD OF DAY SCREEN
// ═══════════════════════════════════════════════════════════════════════
const COD_CARD = { numeral: 'XIX', name: 'Солнце', symbol: '☀', colors: ['#3d2a00', '#c97d00'], keywords: ['Радость', 'Ясность', 'Успех'] };
const COD_MSGS = [
  { from: 'bot', text: 'Доброе утро, Алиса ☀️' },
  { from: 'bot', text: 'Сегодня 16 мая — особенный день.\nЯ вытянула для тебя карту дня:' },
];
const COD_INTERP = 'Солнце освещает твой путь сегодня. Это день ясности, открытых возможностей и подлинного контакта с собой. Доверяй своей интуиции — она сейчас особенно чиста.';

function CardOfDay() {
  const [revealed, setRevealed] = React.useState(false);
  const chatRef = React.useRef(null);
  React.useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [revealed]);

  return (
    <PhoneFrame>
      <BotHeader/>
      <div ref={chatRef} style={{ flex: 1, background: C.bgChat, overflowY: 'auto', padding: '14px 10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {COD_MSGS.map((m, i) => <ChatMsg key={i} msg={m}/>)}

        {/* Big single card */}
        <div className="luna-msg" style={{ margin: '8px 0 4px 32px' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {/* Card */}
            <div style={{
              width: 100, height: 162, borderRadius: 12, flexShrink: 0,
              background: `linear-gradient(155deg,${COD_CARD.colors[0]},${COD_CARD.colors[1]})`,
              border: '1px solid rgba(255,255,255,.15)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 6px',
              boxShadow: '0 8px 32px rgba(201,125,0,.3), 0 0 0 1px rgba(201,161,74,.2)',
              animation: 'luna-cardin .6s ease both',
            }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>{COD_CARD.numeral}</span>
              <span style={{ fontSize: 44 }}>{COD_CARD.symbol}</span>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 12, color: 'rgba(255,255,255,.95)', fontWeight: 600 }}>{COD_CARD.name}</div>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>Карта дня</div>
              </div>
            </div>
            {/* Keywords */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Энергия дня</div>
              {COD_CARD.keywords.map(kw => (
                <div key={kw} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.gold, flexShrink: 0 }}/>
                  <span style={{ fontSize: 13, color: C.text }}>{kw}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Interpretation (revealed on click) */}
        {!revealed && (
          <div className="luna-msg" style={{ margin: '4px 0 4px 32px' }}>
            <button onClick={() => setRevealed(true)} className="luna-tap-hint" style={{
              background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 24,
              padding: '9px 18px', color: C.dim, fontSize: 13, cursor: 'pointer',
              fontFamily: "'DM Sans',sans-serif",
            }}>Читать интерпретацию →</button>
          </div>
        )}
        {revealed && (
          <>
            <ChatMsg msg={{ from: 'bot', text: COD_INTERP }}/>
            <ChatMsg msg={{ from: 'bot', text: 'Хочешь узнать больше или задать вопрос?' }}/>
          </>
        )}
      </div>
      {/* Input area */}
      <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, padding: '10px 12px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {['🔮 Расклад на вопрос', '📜 История раскладов'].map((opt, i) => (
            <button key={opt} style={{
              background: i === 0 ? 'rgba(139,92,246,.18)' : 'transparent',
              border: `1px solid ${i === 0 ? C.purple : C.border}`, borderRadius: 22,
              padding: '8px 14px', color: i === 0 ? C.text : C.dim,
              fontSize: 12.5, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
            }}>{opt}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: 1, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 22, padding: '10px 14px', color: C.dim, fontSize: 13 }}>Сообщение...</div>
          <button style={{ background: C.purpleBtn, border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: 'white', boxShadow: '0 4px 16px rgba(124,58,237,.45)' }}>›</button>
        </div>
      </div>
    </PhoneFrame>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// READING HISTORY SCREEN
// ═══════════════════════════════════════════════════════════════════════
const HISTORY = [
  { date: '13 мая', question: 'Когда я встречу нужного человека?', card: { name: 'Колесо', symbol: '⊗', numeral: 'X', colors: ['#1a2a0a','#2d5a1a'] }, preview: 'Судьба делает поворот. Встреча ближе, чем кажется...' },
  { date: '7 мая', question: 'Стоит ли менять работу?', card: { name: 'Сила', symbol: '♾', numeral: 'XI', colors: ['#2a1a00','#7a4200'] }, preview: 'Внутренняя сила — твой главный ресурс сейчас...' },
  { date: '28 апреля', question: 'Что мешает мне двигаться вперёд?', card: { name: 'Повешенный', symbol: '🔻', numeral: 'XII', colors: ['#001a2a','#004a6a'] }, preview: 'Пауза — не поражение, а время переосмысления...' },
];

function ReadingHistory() {
  const [expanded, setExpanded] = React.useState(null);

  return (
    <PhoneFrame>
      <BotHeader/>
      <div style={{ flex: 1, background: C.bgChat, overflowY: 'auto', padding: '14px 10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <ChatMsg msg={{ from: 'bot', text: `Вот твои последние расклады, ${DEMO_NAME} 📜` }}/>

        {HISTORY.map((item, i) => (
          <div key={i} className="luna-msg" style={{
            margin: '4px 0', background: C.surface2, borderRadius: 14,
            border: `1px solid ${expanded === i ? 'rgba(139,92,246,.4)' : C.border}`,
            overflow: 'hidden', animationDelay: `${i * 0.12}s`,
            cursor: 'pointer', transition: 'border-color .2s',
          }} onClick={() => setExpanded(expanded === i ? null : i)}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 14px' }}>
              {/* Mini card */}
              <div style={{
                width: 42, height: 66, borderRadius: 6, flexShrink: 0,
                background: `linear-gradient(155deg,${item.card.colors[0]},${item.card.colors[1]})`,
                border: '1px solid rgba(255,255,255,.12)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '5px 2px',
              }}>
                <span style={{ fontSize: 7.5, color: 'rgba(255,255,255,.4)' }}>{item.card.numeral}</span>
                <span style={{ fontSize: 18 }}>{item.card.symbol}</span>
                <span style={{ fontSize: 6.5, fontFamily: "'Cormorant Garamond',serif", color: 'rgba(255,255,255,.8)', fontWeight: 600 }}>{item.card.name}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: C.gold, marginBottom: 4, letterSpacing: '0.04em' }}>{item.date}</div>
                <div style={{ fontSize: 13, color: C.text, fontWeight: 500, lineHeight: 1.4, marginBottom: 4 }}>{item.question}</div>
                <div style={{ fontSize: 11.5, color: C.dim, lineHeight: 1.4 }}>{item.preview}</div>
              </div>
              <div style={{ color: C.dim, fontSize: 16, flexShrink: 0, transform: expanded === i ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>›</div>
            </div>
            {expanded === i && (
              <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${C.border}` }}>
                <div style={{ paddingTop: 12, display: 'flex', gap: 10 }}>
                  {[{ pos: 'Прош.', sym: '☽', col: ['#160530','#4a1582'] }, { pos: 'Наст.', sym: '♡', col: ['#3d0416','#9f1239'] }, { pos: 'Буд.', sym: '✦', col: ['#031040','#1e3a8a'] }].map((c, j) => (
                    <div key={j} style={{ textAlign: 'center' }}>
                      <div style={{ width: 34, height: 52, borderRadius: 5, margin: '0 auto 5px', background: `linear-gradient(155deg,${c.col[0]},${c.col[1]})`, border: '1px solid rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{c.sym}</div>
                      <div style={{ fontSize: 8.5, color: C.dim }}>{c.pos}</div>
                    </div>
                  ))}
                </div>
                <button style={{ marginTop: 12, width: '100%', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 22, padding: '8px', color: C.dim, fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                  Открыть полный расклад →
                </button>
              </div>
            )}
          </div>
        ))}

        <ChatMsg msg={{ from: 'bot', text: 'Нажми на расклад, чтобы раскрыть детали.' }}/>
      </div>
      <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, padding: '10px 12px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <button style={{ background: 'rgba(139,92,246,.18)', border: `1px solid ${C.purple}`, borderRadius: 22, padding: '8px 14px', color: C.text, fontSize: 12.5, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>🔮 Новый расклад</button>
          <button style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 22, padding: '8px 14px', color: C.dim, fontSize: 12.5, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>🌙 Карта дня</button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 22, padding: '10px 14px', color: C.dim, fontSize: 13 }}>Сообщение...</div>
          <button style={{ background: C.purpleBtn, border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: 'white', boxShadow: '0 4px 16px rgba(124,58,237,.45)' }}>›</button>
        </div>
      </div>
    </PhoneFrame>
  );
}

Object.assign(window, { BotFlow, CardOfDay, ReadingHistory, CardBackSVG });
