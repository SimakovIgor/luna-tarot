
// ═══════════════════════════════════════════════
// Luna Tarot — Landing Page Designs
// ═══════════════════════════════════════════════

function injectLandingStyles() {
  if (document.getElementById('luna-landing-styles')) return;
  const s = document.createElement('style');
  s.id = 'luna-landing-styles';
  s.textContent = `
    @keyframes ll-float {
      0%, 100% { transform: translateY(0px); }
      50%       { transform: translateY(-14px); }
    }
    @keyframes ll-pulse {
      0%, 100% { opacity: .35; transform: scale(1); }
      50%       { opacity: .7;  transform: scale(1.04); }
    }
    @keyframes ll-twinkle {
      0%, 100% { opacity: .2; }
      50%       { opacity: .9; }
    }
    @keyframes ll-shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position:  200% 0; }
    }
    @keyframes ll-glow {
      0%, 100% { box-shadow: 0 0 40px rgba(139,92,246,.3), 0 0 80px rgba(139,92,246,.1); }
      50%       { box-shadow: 0 0 70px rgba(139,92,246,.55), 0 0 130px rgba(139,92,246,.2); }
    }
    @keyframes ll-orbit {
      from { transform: rotate(0deg) translateX(160px) rotate(0deg); }
      to   { transform: rotate(360deg) translateX(160px) rotate(-360deg); }
    }
    .ll-star { position: absolute; border-radius: 50%; background: white; animation: ll-twinkle linear infinite; }
  `;
  document.head.appendChild(s);
}

// ── Stars background helper ───────────────────────────────────────────
function Stars({ count = 60, width, height }) {
  const stars = React.useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      const size = Math.random() < 0.15 ? 3 : Math.random() < 0.4 ? 2 : 1;
      arr.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size,
        dur: 2 + Math.random() * 4,
        delay: Math.random() * 4,
      });
    }
    return arr;
  }, []);
  return (
    <>
      {stars.map((s, i) => (
        <div key={i} className="ll-star" style={{
          left: s.x, top: s.y,
          width: s.size, height: s.size,
          animationDuration: `${s.dur}s`,
          animationDelay: `${s.delay}s`,
        }}/>
      ))}
    </>
  );
}

// ── Sample reading card (mini) ────────────────────────────────────────
const SAMPLE_CARDS = [
  { name: 'Луна', symbol: '☽', numeral: 'XVIII', pos: 'Прошлое', colors: ['#160530','#4a1582'] },
  { name: 'Влюблённые', symbol: '♡', numeral: 'VI', pos: 'Настоящее', colors: ['#3d0416','#9f1239'] },
  { name: 'Звезда', symbol: '✦', numeral: 'XVII', pos: 'Будущее', colors: ['#031040','#1e3a8a'] },
];

function MiniCard({ card, delay = 0 }) {
  return (
    <div style={{
      width: 108, flexShrink: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 11,
    }}>
      <div style={{
        width: 108, height: 174,
        background: `linear-gradient(155deg,${card.colors[0]},${card.colors[1]})`,
        borderRadius: 11,
        border: '1px solid rgba(255,255,255,.16)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 6px',
        boxShadow: '0 20px 56px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.06)',
        animation: `ll-float ${3.5 + delay * 0.5}s ease-in-out ${delay * 0.3}s infinite`,
      }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', fontFamily: 'DM Sans' }}>{card.numeral}</span>
        <span style={{ fontSize: 42 }}>{card.symbol}</span>
        <span style={{ fontSize: 13, fontFamily: "'Cormorant Garamond',serif", color: 'rgba(255,255,255,.92)', fontWeight: 600 }}>{card.name}</span>
      </div>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{card.pos}</span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// VARIANT A — Dark & Mystical
// ════════════════════════════════════════════════════════════════════
function LandingMystical() {
  injectLandingStyles();
  const W = 1440;

  return (
    <div style={{
      width: W, fontFamily: "'DM Sans', sans-serif",
      background: '#070512', color: 'white', position: 'relative',
      overflowX: 'hidden',
    }}>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', minHeight: 900, display: 'flex', alignItems: 'center' }}>
        <Stars count={80} width={W} height={900}/>

        {/* Moon orb */}
        <div style={{
          position: 'absolute', right: 160, top: 100,
          width: 340, height: 340, borderRadius: '50%',
          background: 'radial-gradient(circle at 38% 35%, #c084fc 0%, #7c3aed 40%, #2d0f6e 75%, #0a0520 100%)',
          animation: 'll-glow 4s ease-in-out infinite, ll-float 7s ease-in-out infinite',
          boxShadow: '0 0 50px rgba(139,92,246,.4), 0 0 100px rgba(139,92,246,.15)',
        }}>
          {/* Craters */}
          <div style={{ position: 'absolute', width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,.15)', top: 80, left: 100 }}/>
          <div style={{ position: 'absolute', width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,.12)', top: 160, left: 60 }}/>
          <div style={{ position: 'absolute', width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,.1)', top: 60, left: 200 }}/>
        </div>

        {/* Orbiting star */}
        <div style={{
          position: 'absolute', right: 330, top: 270,
          width: 8, height: 8, borderRadius: '50%',
          background: '#c084fc',
          boxShadow: '0 0 12px rgba(192,132,252,.8)',
          animation: 'll-orbit 8s linear infinite',
          transformOrigin: '-150px 0',
        }}/>

        {/* Hero text */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 680, padding: '0 0 0 120px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(139,92,246,.15)', border: '1px solid rgba(139,92,246,.3)',
            borderRadius: 20, padding: '6px 16px', marginBottom: 32,
            fontSize: 12.5, color: 'rgba(192,132,252,.9)', letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            ✦ ИИ-таролог нового поколения
          </div>

          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 88, fontWeight: 600, lineHeight: 1.0,
            margin: '0 0 28px', letterSpacing: '-0.01em',
            background: 'linear-gradient(135deg, #fff 0%, #c084fc 55%, #818cf8 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Загляни<br/>в своё<br/>будущее
          </h1>

          <p style={{
            fontSize: 18, lineHeight: 1.65, color: 'rgba(255,255,255,.6)',
            margin: '0 0 44px', maxWidth: 480,
          }}>
            Luna — ИИ-таролог, который понимает контекст твоей жизни. Задай вопрос и получи персональный расклад на основе 78 карт Таро.
          </p>

          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <button style={{
              background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
              border: 'none', borderRadius: 32, padding: '18px 40px',
              color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer',
              fontFamily: "'DM Sans',sans-serif",
              boxShadow: '0 8px 32px rgba(124,58,237,.5)',
              display: 'flex', alignItems: 'center', gap: 10, letterSpacing: '.01em',
            }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M11 2C6.03 2 2 6.03 2 11C2 15.97 6.03 20 11 20C15.97 20 20 15.97 20 11C20 6.03 15.97 2 11 2ZM14.93 8.04L13.54 14.76C13.43 15.31 13.1 15.44 12.64 15.18L10.64 13.72L9.68 14.65C9.57 14.76 9.47 14.86 9.23 14.86L9.38 12.82L13.28 9.3C13.46 9.13 13.23 9.04 12.98 9.21L8.17 12.3L6.2 11.7C5.67 11.53 5.66 11.17 6.3 10.92L14.4 7.76C14.84 7.59 15.23 7.85 14.93 8.04Z" fill="white"/>
              </svg>
              Открыть в Telegram
            </button>
            <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 13 }}>
              Бесплатно · Без регистрации
            </div>
          </div>
        </div>
      </div>

      {/* ── SAMPLE READING ──────────────────────────────────────── */}
      <div style={{ padding: '80px 120px', background: 'rgba(139,92,246,.04)', borderTop: '1px solid rgba(139,92,246,.12)', borderBottom: '1px solid rgba(139,92,246,.12)' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 48, fontWeight: 600, marginBottom: 12,
            background: 'linear-gradient(135deg,#fff,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Пример расклада
          </div>
          <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 16 }}>Три карты — прошлое, настоящее и будущее</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 60, alignItems: 'flex-start' }}>
          {SAMPLE_CARDS.map((c, i) => <MiniCard key={i} card={c} delay={i} />)}
        </div>
        {/* Interpretation preview */}
        <div style={{ maxWidth: 700, margin: '60px auto 0', background: 'rgba(124,58,237,.1)', borderRadius: 20, padding: '28px 36px', border: '1px solid rgba(139,92,246,.2)' }}>
          <div style={{ fontSize: 11, color: '#c9a14a', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>✦ Интерпретация Luna</div>
          <p style={{ fontSize: 16, lineHeight: 1.65, color: 'rgba(255,255,255,.75)', margin: 0 }}>
            Карты указывают на переходный момент в отношениях. За иллюзиями прошлого скрывался важный урок — и сейчас, стоя перед выбором, ты уже намного мудрее. Звезда впереди обещает ясность и обновление.
          </p>
        </div>
      </div>

      {/* ── HOW IT WORKS ────────────────────────────────────────── */}
      <div style={{ padding: '100px 120px' }}>
        <div style={{ textAlign: 'center', marginBottom: 72 }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 48, fontWeight: 600, marginBottom: 12,
            background: 'linear-gradient(135deg,#fff,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Как это работает
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 32 }}>
          {[
            { n: '01', icon: '✍️', title: 'Задай вопрос', text: 'Напиши свой вопрос в чат. Luna адаптирует расклад под контекст твоей жизни.' },
            { n: '02', icon: '🃏', title: 'Luna тянет карты', text: 'ИИ выбирает три карты и генерирует персональную интерпретацию специально под твой запрос.' },
            { n: '03', icon: '✨', title: 'Получи расклад', text: 'Детальный анализ прошлого, настоящего и будущего — с советом и ключевыми словами.' },
          ].map(step => (
            <div key={step.n} style={{
              background: 'rgba(139,92,246,.06)', borderRadius: 20,
              padding: '36px 32px', border: '1px solid rgba(139,92,246,.14)',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: 20, right: 24,
                fontFamily: "'Cormorant Garamond',serif", fontSize: 52, fontWeight: 600,
                color: 'rgba(139,92,246,.12)', lineHeight: 1,
              }}>{step.n}</div>
              <div style={{ fontSize: 36, marginBottom: 20 }}>{step.icon}</div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 600, color: 'white', marginBottom: 12 }}>{step.title}</div>
              <div style={{ fontSize: 15, color: 'rgba(255,255,255,.55)', lineHeight: 1.65 }}>{step.text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES ────────────────────────────────────────────── */}
      <div style={{ padding: '0 120px 100px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
          {[
            { icon: '🧠', title: 'ИИ-интерпретация', text: 'Персональный анализ под каждый вопрос, а не шаблонные тексты' },
            { icon: '🌙', title: 'Память раскладов', text: 'Luna помнит всю твою историю и учитывает контекст' },
            { icon: '🌀', title: 'Эзотерика', text: 'Лунный цикл, число судьбы и энергия дня встроены в каждый расклад' },
            { icon: '🔮', title: '78 карт Таро', text: 'Полная колода Райдера-Уэйта — Старшие и Младшие Арканы' },
          ].map(f => (
            <div key={f.title} style={{
              background: 'rgba(255,255,255,.03)', borderRadius: 16,
              padding: '28px 24px', border: '1px solid rgba(255,255,255,.07)',
            }}>
              <div style={{ fontSize: 30, marginBottom: 14 }}>{f.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'white', marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,.45)', lineHeight: 1.6 }}>{f.text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FOOTER CTA ──────────────────────────────────────────── */}
      <div style={{ padding: '100px 120px', textAlign: 'center', position: 'relative' }}>
        <Stars count={40} width={W} height={340}/>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 64, fontWeight: 600, lineHeight: 1.1, marginBottom: 24,
            background: 'linear-gradient(135deg,#fff,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Готова узнать,<br/>что тебя ждёт?
          </div>
          <button style={{
            background: 'linear-gradient(135deg,#7c3aed,#a855f7)', border: 'none', borderRadius: 32,
            padding: '20px 56px', color: 'white', fontSize: 18, fontWeight: 700,
            cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
            boxShadow: '0 8px 40px rgba(124,58,237,.55)',
          }}>
            Начать бесплатно →
          </button>
          <div style={{ marginTop: 20, color: 'rgba(255,255,255,.3)', fontSize: 13 }}>
            Luna Tarot · Telegram Bot · 2026
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// VARIANT B — Editorial / Light
// ════════════════════════════════════════════════════════════════════
function LandingEditorial() {
  injectLandingStyles();
  const W = 1440;
  const ACC = '#6d28d9';
  const ACCDIM = 'rgba(109,40,217,.12)';

  return (
    <div style={{
      width: W, fontFamily: "'DM Sans', sans-serif",
      background: '#f7f5f2', color: '#1a1020', position: 'relative',
    }}>
      {/* ── NAV ──────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '28px 100px', borderBottom: '1px solid rgba(0,0,0,.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: `linear-gradient(135deg,${ACC},#a855f7)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>☽</div>
          <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 600, color: '#1a1020' }}>Luna Tarot</span>
        </div>
        <div style={{ display: 'flex', gap: 36, alignItems: 'center' }}>
          {['Как работает', 'Возможности', 'О проекте'].map(l => (
            <span key={l} style={{ fontSize: 14, color: 'rgba(26,16,32,.5)', cursor: 'pointer' }}>{l}</span>
          ))}
          <button style={{
            background: '#1a1020', border: 'none', borderRadius: 24,
            padding: '11px 24px', color: 'white', fontSize: 14,
            fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
          }}>Открыть бот →</button>
        </div>
      </div>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <div style={{ padding: '100px 100px 80px', display: 'flex', alignItems: 'center', gap: 80 }}>
        <div style={{ flex: 1 }}>
          <div style={{
            display: 'inline-block', background: ACCDIM, borderRadius: 20,
            padding: '6px 16px', fontSize: 12, color: ACC,
            fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 32,
          }}>
            ИИ-таролог нового поколения
          </div>
          <h1 style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: 96, fontWeight: 600, lineHeight: 0.92,
            margin: '0 0 36px', letterSpacing: '-0.02em', color: '#1a1020',
          }}>
            Спроси<br/>
            <span style={{ color: ACC }}>карты</span>
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.7, color: 'rgba(26,16,32,.55)', margin: '0 0 48px', maxWidth: 440 }}>
            Персональный расклад на основе твоего вопроса, знака зодиака и истории. ИИ читает карты — ты принимаешь решения.
          </p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button style={{
              background: '#1a1020', border: 'none', borderRadius: 30,
              padding: '17px 38px', color: 'white', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                <path d="M11 2C6.03 2 2 6.03 2 11C2 15.97 6.03 20 11 20C15.97 20 20 15.97 20 11C20 6.03 15.97 2 11 2ZM14.93 8.04L13.54 14.76C13.43 15.31 13.1 15.44 12.64 15.18L10.64 13.72L9.68 14.65C9.57 14.76 9.47 14.86 9.23 14.86L9.38 12.82L13.28 9.3C13.46 9.13 13.23 9.04 12.98 9.21L8.17 12.3L6.2 11.7C5.67 11.53 5.66 11.17 6.3 10.92L14.4 7.76C14.84 7.59 15.23 7.85 14.93 8.04Z" fill="white"/>
              </svg>
              Telegram
            </button>
            <button style={{
              background: 'transparent', border: '1.5px solid rgba(26,16,32,.2)', borderRadius: 30,
              padding: '16px 32px', color: '#1a1020', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
            }}>Смотреть пример</button>
          </div>
          <div style={{ marginTop: 24, fontSize: 13, color: 'rgba(26,16,32,.35)' }}>
            Бесплатно · Работает в Telegram · Без регистрации
          </div>
        </div>

        {/* Cards visual */}
        <div style={{ position: 'relative', width: 380, height: 460, flexShrink: 0 }}>
          {SAMPLE_CARDS.map((card, i) => {
            const offsets = [[-20, 30, -8], [0, 0, 0], [20, 30, 8]];
            return (
              <div key={i} style={{
                position: 'absolute',
                left: '50%', top: '50%',
                transform: `translate(calc(-50% + ${offsets[i][0]}px), calc(-50% + ${offsets[i][1]}px)) rotate(${offsets[i][2]}deg)`,
                width: 120, height: 192,
                background: `linear-gradient(155deg,${card.colors[0]},${card.colors[1]})`,
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,.15)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 8px',
                boxShadow: '0 20px 50px rgba(0,0,0,.25)',
                animation: `ll-float ${4 + i * 0.6}s ease-in-out ${i * 0.4}s infinite`,
              }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', fontFamily: 'DM Sans' }}>{card.numeral}</span>
                <span style={{ fontSize: 46 }}>{card.symbol}</span>
                <span style={{ fontSize: 13, fontFamily: "'Cormorant Garamond',serif", color: 'rgba(255,255,255,.9)', fontWeight: 600, textAlign: 'center' }}>{card.name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── STATS STRIP ──────────────────────────────────────────── */}
      <div style={{
        background: '#1a1020', padding: '40px 100px',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      }}>
        {[
          { n: '78', label: 'карт в колоде' },
          { n: '3', label: 'карты в раскладе' },
          { n: '∞', label: 'вопросов без лимита' },
          { n: 'ИИ', label: 'интерпретация' },
        ].map(s => (
          <div key={s.n} style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 56, fontWeight: 600, color: 'white', lineHeight: 1 }}>{s.n}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── HOW IT WORKS ────────────────────────────────────────── */}
      <div style={{ padding: '100px 100px' }}>
        <div style={{ display: 'flex', gap: 80, alignItems: 'flex-start' }}>
          <div style={{ width: 260, flexShrink: 0 }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 48, fontWeight: 600, lineHeight: 1.1, color: '#1a1020' }}>
              Как работает Luna Tarot
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[
              { n: '01', title: 'Задай вопрос', text: 'Напиши, что тебя волнует. Luna адаптирует расклад под конкретный контекст.' },
              { n: '02', title: 'ИИ тянет карты', text: 'Алгоритм выбирает три карты и составляет персональную интерпретацию.' },
              { n: '03', title: 'Читай расклад', text: 'Прошлое, настоящее, будущее — с ключевыми словами и советом от Luna.' },
            ].map((s, i) => (
              <div key={s.n} style={{
                display: 'flex', gap: 32, padding: '36px 0',
                borderBottom: i < 2 ? '1px solid rgba(0,0,0,.08)' : 'none',
                alignItems: 'flex-start',
              }}>
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: 'rgba(109,40,217,.5)', fontWeight: 600, flexShrink: 0, paddingTop: 4 }}>{s.n}</span>
                <div>
                  <div style={{ fontSize: 22, fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, color: '#1a1020', marginBottom: 10 }}>{s.title}</div>
                  <div style={{ fontSize: 15, color: 'rgba(26,16,32,.5)', lineHeight: 1.65 }}>{s.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FOOTER CTA ──────────────────────────────────────────── */}
      <div style={{
        background: '#1a1020', padding: '100px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 56, fontWeight: 600, color: 'white', lineHeight: 1.1, marginBottom: 20 }}>
            Начни прямо<br/>сейчас
          </div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,.4)' }}>Бесплатно. Telegram. Без регистрации.</div>
        </div>
        <button style={{
          background: 'linear-gradient(135deg,#7c3aed,#a855f7)', border: 'none', borderRadius: 32,
          padding: '22px 52px', color: 'white', fontSize: 17, fontWeight: 700,
          cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
          boxShadow: '0 8px 40px rgba(124,58,237,.45)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M11 2C6.03 2 2 6.03 2 11C2 15.97 6.03 20 11 20C15.97 20 20 15.97 20 11C20 6.03 15.97 2 11 2ZM14.93 8.04L13.54 14.76C13.43 15.31 13.1 15.44 12.64 15.18L10.64 13.72L9.68 14.65C9.57 14.76 9.47 14.86 9.23 14.86L9.38 12.82L13.28 9.3C13.46 9.13 13.23 9.04 12.98 9.21L8.17 12.3L6.2 11.7C5.67 11.53 5.66 11.17 6.3 10.92L14.4 7.76C14.84 7.59 15.23 7.85 14.93 8.04Z" fill="white"/>
          </svg>
          Открыть Luna в Telegram
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { LandingMystical, LandingEditorial });
