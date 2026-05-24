// Violetta Beauty — screens

// ────────────────────────────────────────────────────────────────────────────
// WELCOME / SPLASH
// ────────────────────────────────────────────────────────────────────────────

function WelcomeScreen({ go }) {
  const [phase, setPhase] = React.useState(0); // 0 → splash, 1 → wordmark, 2 → cta
  React.useEffect(() => {
    const a = setTimeout(() => setPhase(1), 350);
    const b = setTimeout(() => setPhase(2), 1900);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);

  // Letter-by-letter for the wordmark — each letter masks up independently
  const letters = "Violetta".split("");

  return (
    <div className="screen grain" style={{ position: "relative", padding: "0 22px" }}>
      {/* Ambient plumes */}
      <div className="deco-plume" style={{
        width: 360, height: 360, top: -100, right: -120,
        background: "radial-gradient(circle, var(--plum), transparent 70%)",
        opacity: phase >= 1 ? 0.55 : 0,
        transition: "opacity 1400ms var(--ease-out)",
      }} />
      <div className="deco-plume" style={{
        width: 420, height: 420, bottom: -180, left: -140,
        background: "radial-gradient(circle, var(--violet), transparent 70%)",
        opacity: phase >= 1 ? 0.35 : 0,
        transition: "opacity 1800ms var(--ease-out) 200ms",
      }} />

      <StatusBar />

      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "calc(100vh - 44px)" }}>
        <div style={{ paddingTop: 48 }}>
          <div style={{
            opacity: phase >= 1 ? 1 : 0,
            transition: "opacity 800ms var(--ease-out)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span className="plate-mark">EST · MMXIV</span>
            <span className="plate-mark" style={{ color: "var(--accent)" }}>VOL · 24</span>
            <span className="plate-mark">Nº 001</span>
          </div>
          <Ornament style={{ marginTop: 22 }} />
        </div>

        {/* Center wordmark */}
        <div style={{ textAlign: "center", padding: "30px 0" }}>
          <div style={{ overflow: "hidden", lineHeight: 0.95 }}>
            <div
              className="display"
              style={{
                fontSize: "clamp(72px, 22vw, 110px)",
                fontStyle: "italic",
                fontWeight: 300,
                letterSpacing: "-0.025em",
                display: "inline-flex",
              }}
            >
              {letters.map((c, i) => (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    transform: phase >= 1 ? "translateY(0)" : "translateY(110%)",
                    opacity: phase >= 1 ? 1 : 0,
                    transition: `transform 1100ms cubic-bezier(0.22,1,0.36,1) ${80 + i * 70}ms, opacity 800ms ease ${80 + i * 70}ms`,
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.48em",
              textTransform: "uppercase",
              opacity: phase >= 1 ? 1 : 0,
              transition: "opacity 1200ms var(--ease-out) 900ms",
            }}
          >
            <span className="shimmer-gold">B · E · A · U · T · Y</span>
          </div>

          {/* hairline ornament */}
          <div style={{
            margin: "34px auto 0",
            width: phase >= 1 ? 180 : 0,
            transition: "width 1500ms var(--ease-out) 600ms",
            overflow: "hidden",
          }}>
            <Ornament />
          </div>

          {/* nail fan motif */}
          <div style={{
            margin: "30px auto 0",
            width: 240,
            height: 150,
            opacity: phase >= 2 ? 0.92 : 0,
            transform: phase >= 2 ? "translateY(0)" : "translateY(30px)",
            transition: "all 1200ms var(--ease-out)",
          }}>
            <NailFan palette={["#c9a96e", "#7d3a6f"]} style={{ width: "100%", height: "100%" }} />
          </div>

          <p
            className="display italic"
            style={{
              fontSize: 22, color: "var(--text-2)",
              marginTop: 32, maxWidth: 320, marginLeft: "auto", marginRight: "auto",
              opacity: phase >= 2 ? 1 : 0,
              transition: "opacity 900ms var(--ease-out) 300ms",
              fontWeight: 300,
              lineHeight: 1.3,
            }}
          >
            A private nail atelier &mdash; one chair, one hour, one quiet ritual at a time.
          </p>
        </div>

        {/* CTAs */}
        <div style={{
          padding: "0 0 36px",
          display: "flex", flexDirection: "column", gap: 12,
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? "translateY(0)" : "translateY(20px)",
          transition: "all 900ms var(--ease-out) 500ms",
        }}>
          <Btn gold block icon={<ArrowRight />} onClick={() => go("onboarding")}>
            Enter the atelier
          </Btn>
          <Btn variant="ghost" block onClick={() => go("home")}>
            I already have an account
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ONBOARDING — 3-page horizontal pager
// ────────────────────────────────────────────────────────────────────────────

const ONBOARD = [
  {
    eyebrow: "01 / ATELIER",
    title: "A studio of one",
    body: "Only one guest is in the studio at a time. No queues, no overhearing, no rush — just your hour.",
    palette: ["#c9a96e", "#7d3a6f"],
  },
  {
    eyebrow: "02 / RITUAL",
    title: "Designed like couture",
    body: "Every set begins with a mood conversation. Every finish ends with photography of your hands.",
    palette: ["#d9a3b6", "#3a2050"],
  },
  {
    eyebrow: "03 / MEMBERSHIP",
    title: "Yours, by appointment",
    body: "Become a Violette member for two visits a month, priority access, and the after-hours calendar.",
    palette: ["#9d7bc7", "#c9a96e"],
  },
];

function OnboardingScreen({ go }) {
  const [i, setI] = React.useState(0);
  const next = () => (i < ONBOARD.length - 1 ? setI(i + 1) : go("home"));
  const skip = () => go("home");

  return (
    <div className="screen" style={{ position: "relative", padding: "0 22px" }}>
      <StatusBar />
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0 24px" }}>
        <Wordmark size={20} />
        <button onClick={skip} style={{ background: "none", border: "none", color: "var(--text-3)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
          Skip
        </button>
      </header>

      {/* Slides */}
      <div style={{
        position: "relative", overflow: "hidden",
        borderRadius: "var(--radius-lg)",
        height: 480,
        border: "0.5px solid var(--line-strong)",
      }}>
        {ONBOARD.map((slide, idx) => (
          <div
            key={idx}
            style={{
              position: "absolute", inset: 0,
              transform: `translateX(${(idx - i) * 100}%)`,
              transition: "transform 700ms var(--ease-in-out)",
              display: "flex", flexDirection: "column",
              padding: 0,
            }}
          >
            <div style={{ height: "60%", position: "relative", overflow: "hidden" }}>
              <NailTile palette={slide.palette} variant={idx + 1} style={{ width: "100%", height: "100%" }} />
              {/* Parallax floating fan */}
              <div style={{
                position: "absolute",
                bottom: "-20%", right: "-10%",
                width: "70%", height: "60%",
                transform: idx === i ? "translateY(0) rotate(-8deg)" : "translateY(40px) rotate(-8deg)",
                transition: "transform 900ms var(--ease-out)",
                opacity: 0.92,
              }}>
                <NailFan palette={[slide.palette[0], "#14091a"]} style={{ width: "100%", height: "100%" }} count={4} />
              </div>
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(180deg, transparent 50%, color-mix(in oklab, var(--surface) 80%, transparent))",
              }} />
            </div>
            <div style={{ padding: 24, background: "var(--surface)", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <Eyebrow gold>{slide.eyebrow}</Eyebrow>
              <h2 className="display" style={{ fontSize: 36, fontStyle: "italic", margin: "10px 0 12px", fontWeight: 400 }}>
                {slide.title}
              </h2>
              <p style={{ color: "var(--text-2)", margin: 0, fontSize: 15, lineHeight: 1.55 }}>
                {slide.body}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Dots + CTA */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "26px 0 0" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {ONBOARD.map((_, idx) => (
            <div
              key={idx}
              style={{
                height: 4, borderRadius: 2,
                width: idx === i ? 22 : 6,
                background: idx === i ? "var(--accent)" : "var(--line-strong)",
                transition: "all 400ms var(--ease-out)",
              }}
            />
          ))}
        </div>
        <Btn gold onClick={next} icon={<ArrowRight />}>
          {i < ONBOARD.length - 1 ? "Continue" : "Begin"}
        </Btn>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// HOME / DISCOVER
// ────────────────────────────────────────────────────────────────────────────

function HomeScreen({ go }) {
  const { studio, services, artist, gallery, testimonials } = VIOLETTA_DATA;
  const [scrollY, setScrollY] = React.useState(0);
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrollY(el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Parallax — hero moves slower than scroll
  const heroOffset = Math.min(scrollY * 0.4, 200);
  const fadeOpacity = Math.max(1 - scrollY / 320, 0);

  return (
    <div ref={scrollRef} className="screen">
      <StatusBar />

      {/* HERO */}
      <section style={{ position: "relative", padding: "10px 22px 36px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Wordmark size={20} />
          <button style={{
            width: 38, height: 38, borderRadius: 999,
            border: "0.5px solid var(--line-strong)",
            background: "transparent", color: "var(--text)",
          }}>
            <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M6 8h12M6 12h12M6 16h8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Editorial header strip */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          marginTop: 22, paddingBottom: 14,
          borderBottom: "0.5px solid var(--line-strong)",
        }}>
          <span className="plate-mark">VOL XXIV · No 24</span>
          <span className="plate-mark" style={{ color: "var(--accent)" }}>SS · MMXXVI</span>
          <span className="plate-mark">VERBENA · 14</span>
        </div>

        <div style={{ marginTop: 36, transform: `translateY(${-heroOffset * 0.4}px)`, opacity: fadeOpacity }}>
          <span className="plate-mark">—— COVER STORY</span>
          <h1 className="display" style={{
            fontSize: "clamp(56px, 16vw, 76px)",
            fontStyle: "italic",
            margin: "16px 0 0",
            fontWeight: 300, letterSpacing: "-0.025em", lineHeight: 0.94,
          }}>
            The hands<br/>
            <span style={{ fontStyle: "normal", fontWeight: 400, color: "var(--text-2)" }}>are a </span>
            <span className="shimmer-gold" style={{ fontWeight: 400 }}>portrait.</span>
          </h1>
          <p style={{ color: "var(--text-2)", margin: "24px 0 0", maxWidth: 320, fontSize: 14.5, lineHeight: 1.55 }}>
            Editorial nail design from Violetta's one-chair studio. Sundays at 20:00, the calendar opens — we recommend punctuality.
          </p>

          <div style={{ display: "flex", gap: 10, marginTop: 30 }}>
            <Btn gold onClick={() => go("services")} icon={<ArrowRight />}>Book a chair</Btn>
            <Btn variant="outline" onClick={() => go("gallery")}>Gallery</Btn>
          </div>
        </div>

        {/* Floating nail fan — parallax */}
        <div style={{
          position: "absolute", right: -40, top: 60,
          width: 190, height: 250,
          transform: `translateY(${heroOffset * 0.25}px) rotate(10deg)`,
          opacity: fadeOpacity * 0.65,
          pointerEvents: "none",
        }}>
          <NailFan palette={["#c9a96e", "#7d3a6f"]} style={{ width: "100%", height: "100%" }} count={5} />
        </div>
      </section>

      {/* MARQUEE — featured note */}
      <div style={{
        background: "var(--surface)", margin: "0 22px", borderRadius: "var(--radius)",
        padding: "18px 22px", display: "flex", alignItems: "center", gap: 16,
        border: "0.5px solid var(--line-strong)",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
          background: "var(--gold-grad)",
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="plate-mark" style={{ color: "var(--accent)" }}>THIS WEEK · LIMITED CAPSULE</span>
          <div className="display italic" style={{ fontSize: 19, margin: "4px 0 0", color: "var(--text)" }}>
            Mauve &amp; Garnet — six hands only.
          </div>
        </div>
        <ArrowRight size={16} />
      </div>

      {/* SIGNATURE SERVICES — menu card with dot leaders */}
      <section style={{ padding: "48px 22px 24px" }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          marginBottom: 8,
        }}>
          <Plate number={1} label="THE MENU" />
          <button onClick={() => go("services")} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", fontFamily: "var(--font-mono)", display: "inline-flex", alignItems: "center", gap: 6 }}>
            All six <ArrowRight size={12} />
          </button>
        </div>
        <h2 className="display" style={{ fontSize: 40, fontWeight: 400, fontStyle: "italic", margin: "4px 0 22px", letterSpacing: "-0.02em" }}>
          Signatures.
        </h2>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {services.slice(0, 4).map((s, i) => (
            <button
              key={s.id}
              onClick={() => go("service-detail", { serviceId: s.id })}
              data-card-source={s.id}
              className="float-in"
              style={{
                animationDelay: `${i * 90}ms`,
                display: "flex", textAlign: "left", padding: "18px 0", gap: 16,
                background: "transparent",
                borderTop: i === 0 ? "0.5px solid var(--line-strong)" : "none",
                borderBottom: "0.5px solid var(--line)",
                color: "var(--text)",
                transition: "transform var(--dur-fast) var(--ease-out)",
                alignItems: "center",
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateX(4px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateX(0)"}
            >
              <div style={{ width: 68, height: 84, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
                <NailTile palette={["#c9a96e", "#7d3a6f"]} variant={i} style={{ width: "100%", height: "100%" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <div className="display" style={{ fontSize: 22, fontStyle: "italic", fontWeight: 400, lineHeight: 1.1, flexShrink: 0 }}>
                    {s.name}
                  </div>
                  <div style={{
                    flex: 1, height: 0,
                    borderBottom: "0.5px dotted var(--line-strong)",
                    marginBottom: 4,
                  }} />
                  <div className="gold" style={{ fontFamily: "var(--font-mono)", fontSize: 13, flexShrink: 0 }}>
                    €{s.price}
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <div style={{ color: "var(--text-2)", fontSize: 12, lineHeight: 1.4, maxWidth: "75%" }}>
                    {s.blurb}
                  </div>
                  <div style={{ color: "var(--text-3)", fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", flexShrink: 0 }}>
                    {s.duration}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* MASTER STRIP */}
      <section style={{ padding: "30px 22px 16px" }}>
        <Plate number={2} label="THE MASTER" />
        <button
          onClick={() => go("master")}
          style={{
            marginTop: 14,
            display: "flex", gap: 18, padding: 18, width: "100%", textAlign: "left",
            background: "linear-gradient(120deg, var(--surface), var(--surface-2))",
            border: "0.5px solid var(--line)", borderRadius: "var(--radius-lg)",
            color: "var(--text)",
            position: "relative", overflow: "hidden",
          }}
        >
          <div style={{
            width: 72, height: 72, borderRadius: 999, flexShrink: 0,
            background: "radial-gradient(circle at 35% 30%, #f3ead8 0%, #c9a96e 40%, #7d3a6f 100%)",
            position: "relative", overflow: "hidden",
            border: "0.5px solid var(--accent)",
          }}>
            <div style={{
              position: "absolute", inset: 6, borderRadius: 999,
              background: "radial-gradient(ellipse at 35% 35%, rgba(255,255,255,0.4), transparent 60%)",
            }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="plate-mark" style={{ color: "var(--accent)" }}>11 YEARS · 600+ SETS</div>
            <div className="display italic" style={{ fontSize: 24, margin: "6px 0 6px", fontWeight: 400 }}>{artist.name}</div>
            <div style={{ color: "var(--text-2)", fontSize: 12, lineHeight: 1.5, fontStyle: "italic" }}>
              &ldquo;{artist.quote}&rdquo;
            </div>
          </div>
          <ArrowRight size={16} />
        </button>
      </section>

      {/* GALLERY STRIP */}
      <section style={{ padding: "20px 0 30px" }}>
        <div style={{ padding: "0 22px", display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
          <div>
            <Plate number={4} label="PORTFOLIO" />
            <h2 className="display" style={{ fontSize: 34, margin: "6px 0 0", fontWeight: 400, fontStyle: "italic", letterSpacing: "-0.02em" }}>
              Recent <em>work</em>.
            </h2>
          </div>
          <button onClick={() => go("gallery")} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", fontFamily: "var(--font-mono)", display: "inline-flex", alignItems: "center", gap: 6 }}>
            View all <ArrowRight size={12} />
          </button>
        </div>
        <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "0 22px 8px", scrollbarWidth: "none" }}>
          {gallery.slice(0, 5).map((g, i) => (
            <button
              key={i}
              onClick={() => go("gallery")}
              style={{
                width: 150, height: 220, flexShrink: 0,
                borderRadius: "var(--radius)", overflow: "hidden",
                border: "0.5px solid var(--line)", padding: 0,
                position: "relative",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <NailTile palette={g.palette} variant={i + 1} style={{ width: "100%", height: "100%" }} />
              <div style={{
                position: "absolute", left: 10, top: 10,
                fontFamily: "var(--font-mono)",
                fontSize: 9, color: "var(--text)",
                letterSpacing: "0.2em", textTransform: "uppercase",
                background: "rgba(20,9,26,0.45)", padding: "3px 8px",
                borderRadius: 999, backdropFilter: "blur(8px)",
              }}>
                Nº {String(i + 1).padStart(2, "0")}
              </div>
              <div style={{
                position: "absolute", left: 10, bottom: 10,
                background: "rgba(20,9,26,0.55)",
                backdropFilter: "blur(8px)",
                borderRadius: 999, padding: "4px 10px",
                fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase",
                color: "var(--text)", fontFamily: "var(--font-mono)",
              }}>
                {g.tag}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section style={{ padding: "30px 22px 30px" }}>
        <Plate number={3} label="WORD OF MOUTH" />
        <div style={{
          marginTop: 16, padding: "36px 28px", borderRadius: "var(--radius-lg)",
          background: "linear-gradient(140deg, color-mix(in oklab, var(--plum) 38%, var(--surface)) 0%, var(--surface) 70%)",
          border: "0.5px solid var(--line)",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: -50, right: -10, fontSize: 200,
            fontFamily: "var(--font-display)", fontStyle: "italic", fontWeight: 300,
            color: "color-mix(in oklab, var(--accent) 22%, transparent)",
            lineHeight: 1, pointerEvents: "none",
          }}>&ldquo;</div>
          <p className="display italic" style={{ fontSize: 24, margin: "0 0 20px", lineHeight: 1.3, fontWeight: 400 }}>
            {testimonials[0].text}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 999,
              background: "radial-gradient(circle at 35% 30%, var(--rose), var(--plum))",
              border: "0.5px solid var(--accent)" }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{testimonials[0].name}</div>
              <div className="plate-mark" style={{ marginTop: 2 }}>
                {testimonials[0].role.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MEMBERSHIP CTA */}
      <section style={{ padding: "10px 22px 30px" }}>
        <button
          onClick={() => go("membership")}
          style={{
            width: "100%", textAlign: "left", padding: "32px 26px",
            background: "linear-gradient(140deg, #2a1632 0%, #1a0f1f 60%, #1a0f1f 100%)",
            borderRadius: "var(--radius-lg)",
            border: "0.5px solid color-mix(in oklab, var(--accent) 40%, transparent)",
            color: "var(--text)", position: "relative", overflow: "hidden",
          }}
        >
          <div style={{
            position: "absolute", right: -50, top: -50, width: 220, height: 220, borderRadius: 999,
            background: "radial-gradient(circle, color-mix(in oklab, var(--accent) 28%, transparent), transparent 70%)",
            pointerEvents: "none",
          }} />
          <Plate number={5} label="INVITATION" />
          <h3 className="display italic" style={{ fontSize: 32, margin: "14px 0 10px", fontWeight: 400, letterSpacing: "-0.01em" }}>
            Become a <span className="shimmer-gold">Violette</span>.
          </h3>
          <p style={{ color: "var(--text-2)", margin: 0, fontSize: 13.5, lineHeight: 1.55, maxWidth: 300 }}>
            Two visits a month, priority calendar, the welcome ritual, and ten percent on extensions &amp; art.
          </p>
          <div style={{ display: "inline-flex", marginTop: 22, gap: 8, alignItems: "center", color: "var(--accent)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
            See the tiers <ArrowRight size={12} />
          </div>
        </button>
      </section>

      {/* Footer */}
      <footer style={{ padding: "40px 22px 30px", textAlign: "center", color: "var(--text-3)" }}>
        <Ornament />
        <div className="display italic" style={{ fontSize: 22, marginTop: 24, fontWeight: 300 }}>Violetta.</div>
        <div className="plate-mark" style={{ marginTop: 10 }}>
          {studio.address}
        </div>
        <div className="plate-mark" style={{ marginTop: 6, color: "var(--text-3)" }}>
          © MMXXVI · ALL RIGHTS RESERVED
        </div>
      </footer>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// SERVICES CATALOG
// ────────────────────────────────────────────────────────────────────────────

function ServicesScreen({ go }) {
  const { services } = VIOLETTA_DATA;
  const categories = ["All", ...Array.from(new Set(services.map((s) => s.category)))];
  const [cat, setCat] = React.useState("All");
  const filtered = cat === "All" ? services : services.filter((s) => s.category === cat);

  return (
    <div className="screen">
      <StatusBar />
      <AppHeader title="PLATE · 02" />

      <div style={{ padding: "0 22px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 14, borderBottom: "0.5px solid var(--line-strong)" }}>
          <span className="plate-mark">A LA CARTE</span>
          <span className="plate-mark" style={{ color: "var(--accent)" }}>06 RITUALS</span>
        </div>
        <h1 className="display" style={{ fontSize: 56, margin: "24px 0 6px", fontWeight: 300, fontStyle: "italic", letterSpacing: "-0.025em", lineHeight: 0.95 }}>
          The menu.
        </h1>
        <p style={{ color: "var(--text-2)", fontSize: 14, margin: "14px 0 0", maxWidth: 320 }}>
          Six rituals, each shaped over years. Prices include consultation, refreshment and aftercare.
        </p>
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 8, padding: "18px 22px 6px", overflowX: "auto", scrollbarWidth: "none" }}>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            style={{
              padding: "9px 16px", borderRadius: 999, flexShrink: 0,
              border: "0.5px solid " + (c === cat ? "var(--text)" : "var(--line-strong)"),
              background: c === cat ? "var(--text)" : "transparent",
              color: c === cat ? "var(--bg)" : "var(--text-2)",
              fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase",
              fontFamily: "var(--font-mono)", fontWeight: 500,
              transition: "all var(--dur-fast) var(--ease-out)",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Items — menu-card with dot leaders */}
      <div style={{ padding: "22px 22px 30px" }}>
        {filtered.map((s, i) => (
          <button
            key={s.id}
            onClick={() => go("service-detail", { serviceId: s.id })}
            className="float-in"
            style={{
              animationDelay: `${i * 60}ms`,
              display: "block", width: "100%", textAlign: "left",
              padding: "22px 0",
              borderTop: i === 0 ? "0.5px solid var(--line-strong)" : "none",
              borderBottom: "0.5px solid var(--line-strong)",
              background: "transparent", color: "var(--text)",
              transition: "transform var(--dur-fast) var(--ease-out)",
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "translateX(4px)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "translateX(0)"}
          >
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ width: 78, height: 98, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
                <NailTile palette={["#c9a96e", "#7d3a6f"]} variant={i} style={{ width: "100%", height: "100%" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span className="plate-mark" style={{ color: "var(--accent)" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div style={{
                    flex: 1, height: 0,
                    borderBottom: "0.5px dotted var(--line-strong)",
                    marginBottom: 4,
                  }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginTop: 6 }}>
                  <div className="display italic" style={{ fontSize: 28, fontWeight: 400, lineHeight: 1.05, letterSpacing: "-0.01em" }}>
                    {s.name}
                  </div>
                  <div className="gold" style={{ fontFamily: "var(--font-mono)", fontSize: 15, flexShrink: 0 }}>
                    €{s.price}
                  </div>
                </div>
                <div className="plate-mark" style={{ marginTop: 6 }}>
                  {s.duration} · {s.category}
                </div>
                <div style={{ color: "var(--text-2)", fontSize: 13, lineHeight: 1.5, marginTop: 10 }}>
                  {s.blurb}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// SERVICE DETAIL
// ────────────────────────────────────────────────────────────────────────────

function ServiceDetailScreen({ go, params }) {
  const { services, gallery } = VIOLETTA_DATA;
  const s = services.find((x) => x.id === params.serviceId) || services[0];
  const idx = services.findIndex((x) => x.id === s.id);
  const [scrollY, setScrollY] = React.useState(0);
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrollY(el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const heroOffset = scrollY * 0.45;

  return (
    <div ref={scrollRef} className="screen" style={{ paddingBottom: 100 }}>
      <StatusBar />

      {/* Hero image — full bleed, parallax */}
      <div style={{ position: "relative", height: 440, overflow: "hidden" }}>
        <div
          style={{
            position: "absolute", inset: 0,
            transform: `translateY(${-heroOffset}px) scale(${1 + scrollY / 2200})`,
            transition: "none",
          }}
        >
          <NailTile palette={["#c9a96e", "#7d3a6f"]} variant={idx} style={{ width: "100%", height: "100%" }} />
        </div>
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, color-mix(in oklab, var(--bg) 40%, transparent) 0%, transparent 30%, var(--bg) 100%)",
        }} />

        {/* Back button overlay */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
          <AppHeader onBack={() => go(-1)} title={`PLATE · ${String(idx + 1).padStart(2, "0")}`} />
        </div>

        {/* Title overlay */}
        <div style={{ position: "absolute", left: 22, right: 22, bottom: 22 }}>
          <Plate number={idx + 1} label={s.category.toUpperCase()} />
          <h1 className="display" style={{
            fontSize: 56, fontStyle: "italic", margin: "12px 0 4px",
            fontWeight: 300, letterSpacing: "-0.025em", lineHeight: 0.95,
          }}>
            {s.name}.
          </h1>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 14, paddingTop: 14, borderTop: "0.5px solid var(--line-strong)" }}>
            <span className="plate-mark">{s.duration}</span>
            <span className="gold display italic" style={{ fontSize: 24, lineHeight: 1 }}>
              €{s.price}
            </span>
          </div>
        </div>
      </div>

      {/* Description — with drop cap */}
      <section style={{ padding: "36px 22px 20px" }}>
        <p style={{ fontSize: 16, color: "var(--text-2)", lineHeight: 1.65, margin: 0 }}>
          <span className="display italic" style={{
            float: "left", fontSize: 56, lineHeight: 0.85, marginRight: 10, marginTop: 4,
            color: "var(--accent)", fontWeight: 400,
          }}>
            {s.blurb.charAt(0)}
          </span>
          {s.blurb.slice(1)} {s.id === "editorial" && "Bring a reference, a film still, or a feeling \u2014 we'll work it onto ten miniature canvases."}
        </p>
      </section>

      {/* Includes */}
      <section style={{ padding: "20px 22px" }}>
        <Plate number={"—"} label="WHAT IT INCLUDES" />
        <ul style={{ listStyle: "none", padding: 0, margin: "18px 0 0" }}>
          {s.includes.map((line, i) => (
            <li key={i} style={{
              display: "flex", alignItems: "center", gap: 16,
              padding: "16px 0", borderBottom: "0.5px solid var(--line)",
            }}>
              <div className="display italic" style={{
                width: 32, color: "var(--accent)",
                fontSize: 18, flexShrink: 0,
              }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <span style={{ fontSize: 14.5 }}>{line}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Mini gallery */}
      <section style={{ padding: "30px 22px 30px" }}>
        <Plate number={"—"} label="RECENT IN THIS STYLE" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 16 }}>
          {gallery.slice(0, 3).map((g, i) => (
            <div key={i} style={{ height: 130, borderRadius: 10, overflow: "hidden", border: "0.5px solid var(--line)" }}>
              <NailTile palette={g.palette} variant={i + 2} style={{ width: "100%", height: "100%" }} />
            </div>
          ))}
        </div>
      </section>

      {/* Sticky CTA */}
      <div style={{
        position: "sticky", bottom: 0,
        padding: "14px 22px 24px",
        background: "linear-gradient(to top, var(--bg) 70%, transparent)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div>
            <div className="plate-mark">FROM</div>
            <div className="display italic gold" style={{ fontSize: 28, lineHeight: 1, fontWeight: 400 }}>€{s.price}</div>
          </div>
          <Btn gold block icon={<ArrowRight />} onClick={() => go("booking", { serviceId: s.id, step: 0 })}>
            Reserve a chair
          </Btn>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  WelcomeScreen, OnboardingScreen,
  HomeScreen, ServicesScreen, ServiceDetailScreen,
});
