// Violetta Beauty — shared components & data

// ────────────────────────────────────────────────────────────────────────────
// DATA
// ────────────────────────────────────────────────────────────────────────────

const VIOLETTA_DATA = {
  studio: {
    name: "Violetta Beauty",
    tagline: "A private nail atelier",
    address: "By appointment · Verbena Lane 14, Studio B",
    hours: "Tue – Sat · 10:00 – 19:00",
    instagram: "@violetta.atelier",
  },
  artist: {
    name: "Violetta Marchenko",
    role: "Master nail artist & founder",
    years: 11,
    bio:
      "Trained in Milan and Kyiv, Violetta runs a one-chair atelier — one guest at a time, "
      + "by appointment only. Specialising in editorial nail design, glass shapes and Japanese gel.",
    quote:
      "A manicure is the smallest piece of jewellery a woman wears every day.",
  },
  services: [
    {
      id: "signature",
      name: "Signature Manicure",
      category: "Care",
      duration: "75 min",
      price: 95,
      blurb: "Russian dry technique, cuticle work, hydration ritual & gloss finish.",
      includes: ["Hand soak in rose & milk", "Russian e-file manicure", "Cuticle reconstruction", "Bespoke gloss"],
      hero: "manicure",
    },
    {
      id: "gel",
      name: "Couture Gel",
      category: "Gel",
      duration: "120 min",
      price: 145,
      blurb: "Long-wear Japanese gel in a single tone or a curated nude palette.",
      includes: ["Signature prep", "Japanese gel application", "Edge sculpt & shape", "Two-week guarantee"],
      hero: "gel",
    },
    {
      id: "editorial",
      name: "Editorial Art",
      category: "Design",
      duration: "150 min",
      price: 195,
      blurb: "Bespoke nail design — chrome, lace, hand-painted miniatures.",
      includes: ["Mood consultation", "Hand-painted artwork", "3D detailing on request", "Photography of the set"],
      hero: "editorial",
    },
    {
      id: "extensions",
      name: "Glass Extensions",
      category: "Form",
      duration: "180 min",
      price: 240,
      blurb: "Sculpted soft-gel extensions in glass, almond or ballerina silhouettes.",
      includes: ["Form sculpting", "Architectural shape", "Strength layer", "Mirror buff & seal"],
      hero: "extensions",
    },
    {
      id: "pedi",
      name: "Spa Pedicure",
      category: "Care",
      duration: "90 min",
      price: 110,
      blurb: "Foot bath in violet salts, gentle exfoliation and lacquered finish.",
      includes: ["Violet salt bath", "Heel restoration", "Massage with cassis oil", "Lacquer or gel finish"],
      hero: "pedi",
    },
    {
      id: "removal",
      name: "Gentle Removal",
      category: "Care",
      duration: "45 min",
      price: 40,
      blurb: "Soak-off, nail rehab and a single coat of strengthener.",
      includes: ["Soak-off", "Nail rehab", "Strengthener", "Cuticle oil"],
      hero: "removal",
    },
  ],
  galleryTags: ["All", "Editorial", "Gel", "Chrome", "Lace", "Bridal"],
  gallery: [
    { tag: "Chrome",    palette: ["#c9a96e", "#7d3a6f"], h: 220 },
    { tag: "Editorial", palette: ["#d9a3b6", "#1a0f1f"], h: 280 },
    { tag: "Gel",       palette: ["#9d7bc7", "#3a2050"], h: 200 },
    { tag: "Lace",      palette: ["#f3ead8", "#7d3a6f"], h: 260 },
    { tag: "Chrome",    palette: ["#e8cf99", "#2a1a30"], h: 240 },
    { tag: "Editorial", palette: ["#7d3a6f", "#14091a"], h: 300 },
    { tag: "Bridal",    palette: ["#f3ead8", "#d9a3b6"], h: 220 },
    { tag: "Gel",       palette: ["#9d7bc7", "#c9a96e"], h: 250 },
  ],
  testimonials: [
    { name: "Lara K.", text: "It's a ritual, not a manicure. The studio smells of fig and amber. I never go anywhere else.", role: "Member · 3y" },
    { name: "Iris M.", text: "Violetta's hands are a museum. I came for nails and left with art on my fingertips.", role: "Member · 1y" },
    { name: "Joelle P.", text: "Quiet, private, exquisite. The kind of hour you don't share — you keep.", role: "Member · 2y" },
  ],
  membership: [
    {
      tier: "Petale",
      price: 0,
      cadence: "Open",
      perks: ["Online booking", "Two reminders", "Gallery access"],
      featured: false,
    },
    {
      tier: "Violette",
      price: 180,
      cadence: "/ month",
      perks: ["Two visits per month", "Priority calendar", "Welcome flute & ritual", "10% on art & extensions"],
      featured: true,
    },
    {
      tier: "Atelier",
      price: 420,
      cadence: "/ month",
      perks: ["Unlimited visits", "After-hours access", "Travel kit & home care", "First look at collections"],
      featured: false,
    },
  ],
  account: {
    name: "Eloise R.",
    member: "Violette · since 2024",
    next: { service: "Couture Gel", date: "Fri 22 May", time: "16:30" },
    history: [
      { service: "Editorial Art", date: "Apr 28", price: 195 },
      { service: "Couture Gel",   date: "Apr 02", price: 145 },
      { service: "Signature",     date: "Mar 14", price: 95 },
    ],
  },
};

// ────────────────────────────────────────────────────────────────────────────
// PRIMITIVES
// ────────────────────────────────────────────────────────────────────────────

const StatusBar = () => (
  <div className="statusbar">
    <span>9:41</span>
    <span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}>
      <span className="dot pulse-dot" />
      <span>VIOLETTA · OPEN</span>
    </span>
    <span>5G</span>
  </div>
);

const Wordmark = ({ size = 28, accent = false }) => (
  <span
    className="display"
    style={{
      fontSize: size,
      letterSpacing: "-0.015em",
      fontStyle: "italic",
      fontWeight: 400,
      color: accent ? "var(--accent)" : "var(--text)",
      lineHeight: 1,
    }}
  >
    Violetta<span style={{ fontStyle: "normal", letterSpacing: "0.18em", fontSize: size * 0.32, marginLeft: 8, opacity: 0.6, textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>BEAUTY</span>
  </span>
);

const Eyebrow = ({ children, gold }) => (
  <div className="label-eyebrow" style={{ color: gold ? "var(--accent)" : "var(--text-3)" }}>
    {children}
  </div>
);

// Editorial section break — · ◇ · between hairline rules.
const Ornament = ({ style }) => (
  <div className="hairline-ornament" style={style}>
    <svg width="10" height="10" viewBox="0 0 10 10">
      <path d="M5 0 L10 5 L5 10 L0 5 Z" fill="currentColor" opacity="0.85" />
    </svg>
  </div>
);

// Plate number — magazine-style page reference
const Plate = ({ number, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <span className="plate-mark">PLATE</span>
    <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 18, color: "var(--accent)", lineHeight: 1 }}>
      {String(number).padStart(2, "0")}
    </span>
    {label && <span className="plate-mark" style={{ borderLeft: "0.5px solid var(--line-strong)", paddingLeft: 10 }}>{label}</span>}
  </div>
);

const SectionHeader = ({ eyebrow, title, action, accent }) => (
  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18 }}>
    <div>
      {eyebrow && <Eyebrow gold={accent}>{eyebrow}</Eyebrow>}
      <h2 className="display" style={{ fontSize: 28, margin: "8px 0 0", fontWeight: 400 }}>
        {title}
      </h2>
    </div>
    {action}
  </div>
);

// ────────────────────────────────────────────────────────────────────────────
// IMAGERY — abstract nail-art placeholders rendered with CSS/SVG. No iconography.
// ────────────────────────────────────────────────────────────────────────────

// Luxe product-photography style placeholders. Each variant is a multi-layer
// composition designed to feel like a still life shot on a soft-lit set: deep
// shadow, a hero gradient with depth-of-field, a soft specular highlight, an
// edge vignette, and a film-grain overlay. No CSS stripes, no fake hands.
const NailTile = ({ palette = ["#c9a96e", "#7d3a6f"], variant = 0, style }) => {
  const [a, b] = palette;
  // Each composition is a stack of background-image layers (top → bottom)
  const compositions = [
    // 0 — still life: domed jewel with soft glow
    [
      `radial-gradient(ellipse 22% 14% at 32% 28%, rgba(255,255,255,0.55), transparent 60%)`,
      `radial-gradient(ellipse 45% 32% at 55% 60%, ${a} 0%, transparent 80%)`,
      `radial-gradient(ellipse 80% 90% at 50% 60%, ${b} 0%, color-mix(in oklab, ${b} 50%, #000) 70%, #000 100%)`,
    ].join(", "),

    // 1 — satin drape (diagonal soft fold)
    [
      `radial-gradient(ellipse 30% 20% at 70% 20%, rgba(255,255,255,0.28), transparent 65%)`,
      `linear-gradient(125deg, color-mix(in oklab, ${a} 90%, #fff) 0%, ${a} 30%, ${b} 70%, color-mix(in oklab, ${b} 60%, #000) 100%)`,
    ].join(", "),

    // 2 — atelier still: lifted vignette with floating shadow
    [
      `radial-gradient(ellipse 40% 20% at 50% 92%, rgba(0,0,0,0.5), transparent 70%)`,
      `radial-gradient(ellipse 22% 12% at 40% 30%, rgba(255,255,255,0.5), transparent 55%)`,
      `radial-gradient(ellipse 55% 80% at 50% 45%, ${a} 0%, ${b} 65%, color-mix(in oklab, ${b} 40%, #000) 100%)`,
    ].join(", "),

    // 3 — marble swirl (subtle veined)
    [
      `radial-gradient(ellipse 25% 15% at 25% 25%, rgba(255,255,255,0.32), transparent 60%)`,
      `radial-gradient(ellipse 60% 40% at 70% 75%, color-mix(in oklab, ${a} 70%, #fff) 0%, transparent 60%)`,
      `linear-gradient(170deg, ${b} 0%, color-mix(in oklab, ${a} 50%, ${b}) 50%, ${b} 100%)`,
    ].join(", "),

    // 4 — chrome bevel
    [
      `radial-gradient(ellipse 30% 8% at 50% 10%, rgba(255,255,255,0.7), transparent 70%)`,
      `linear-gradient(180deg, color-mix(in oklab, ${a} 85%, #fff) 0%, ${a} 25%, color-mix(in oklab, ${a} 70%, ${b}) 50%, ${a} 75%, color-mix(in oklab, ${a} 80%, #fff) 100%)`,
    ].join(", "),

    // 5 — ink wash (deep tonal study)
    [
      `radial-gradient(ellipse 18% 10% at 35% 22%, rgba(255,255,255,0.4), transparent 60%)`,
      `radial-gradient(ellipse 100% 70% at 50% 100%, ${b} 0%, color-mix(in oklab, ${b} 30%, #000) 60%, #000 100%)`,
      `radial-gradient(ellipse 60% 40% at 55% 35%, color-mix(in oklab, ${a} 80%, ${b}) 0%, transparent 70%)`,
    ].join(", "),
  ];
  return (
    <div
      style={{
        position: "relative",
        background: compositions[variant % compositions.length],
        overflow: "hidden",
        boxShadow: "inset 0 0 60px rgba(0,0,0,0.35)",
        ...style,
      }}
    >
      {/* edge vignette */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 90% 90% at 50% 50%, transparent 55%, rgba(0,0,0,0.35) 100%)",
        pointerEvents: "none",
      }} />
      {/* film grain */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.08, mixBlendMode: "overlay",
        backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence baseFrequency='0.95' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        pointerEvents: "none",
      }} />
    </div>
  );
};

// A vertical fan of five tiles, like a tipped-over swatch tray. Used as the
// signature hero motif throughout the app.
const NailFan = ({ palette, style, count = 5, lift = 6 }) => (
  <div style={{ display: "flex", gap: 6, alignItems: "flex-end", ...style }}>
    {Array.from({ length: count }).map((_, i) => (
      <NailTile
        key={i}
        palette={palette}
        variant={i}
        style={{
          flex: 1,
          height: `calc(100% - ${(count - 1 - i) * lift}px)`,
          borderRadius: "999px 999px 6px 6px",
          minHeight: 40,
        }}
      />
    ))}
  </div>
);

// ────────────────────────────────────────────────────────────────────────────
// CONTROLS
// ────────────────────────────────────────────────────────────────────────────

const Btn = ({ children, variant = "solid", onClick, style, block, gold, icon }) => {
  const cls = ["btn"];
  if (variant === "outline") cls.push("outline");
  if (variant === "ghost") cls.push("ghost");
  if (gold) cls.push("gold");
  if (block) cls.push("block");
  return (
    <button className={cls.join(" ")} onClick={onClick} style={style}>
      <span>{children}</span>
      {icon && <span style={{ display: "inline-flex" }}>{icon}</span>}
    </button>
  );
};

const ArrowRight = ({ size = 14 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.4">
    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ArrowLeft = ({ size = 14 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.4">
    <path d="M19 12H5M11 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Tag = ({ children, gold, active }) => (
  <span
    className={"tag" + (gold ? " gold" : "")}
    style={active ? { background: "var(--text)", color: "var(--bg)", borderColor: "var(--text)" } : null}
  >
    {children}
  </span>
);

// ────────────────────────────────────────────────────────────────────────────
// HEADER / TAB BAR
// ────────────────────────────────────────────────────────────────────────────

const AppHeader = ({ onBack, title, action }) => (
  <header style={{
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 22px 14px", gap: 12, flexShrink: 0,
  }}>
    {onBack ? (
      <button
        onClick={onBack}
        style={{
          width: 38, height: 38, borderRadius: 999,
          border: "0.5px solid var(--line-strong)",
          background: "color-mix(in oklab, var(--surface) 70%, transparent)",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          color: "var(--text)",
        }}
        aria-label="Back"
      >
        <ArrowLeft size={16} />
      </button>
    ) : (
      <div style={{ width: 38 }} />
    )}
    <div style={{ flex: 1, textAlign: "center", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>
      {title || <span style={{ color: "var(--accent)" }}>VIOLETTA</span>}
    </div>
    {action || <div style={{ width: 38 }} />}
  </header>
);

const TAB_ITEMS = [
  { id: "home", label: "Atelier" },
  { id: "services", label: "Services" },
  { id: "gallery", label: "Gallery" },
  { id: "profile", label: "You" },
];

const TabBar = ({ active, onChange }) => {
  // Compute thumb position
  const i = Math.max(0, TAB_ITEMS.findIndex((t) => t.id === active));
  return (
    <nav style={{
      position: "sticky", bottom: 0, zIndex: 5,
      padding: "12px 18px 18px",
      background: "linear-gradient(to top, var(--bg) 60%, transparent)",
      flexShrink: 0,
    }}>
      <div style={{
        position: "relative",
        display: "flex",
        gap: 0,
        padding: 6,
        background: "color-mix(in oklab, var(--surface) 80%, transparent)",
        border: "0.5px solid var(--line-strong)",
        borderRadius: 999,
        backdropFilter: "blur(20px)",
      }}>
        <div
          style={{
            position: "absolute",
            top: 6, bottom: 6,
            left: `calc(6px + ${i} * ((100% - 12px) / ${TAB_ITEMS.length}))`,
            width: `calc((100% - 12px) / ${TAB_ITEMS.length})`,
            background: "var(--text)",
            borderRadius: 999,
            transition: "left var(--dur) var(--ease-out)",
          }}
        />
        {TAB_ITEMS.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              position: "relative",
              flex: 1, padding: "10px 0",
              border: "none", background: "transparent",
              fontSize: 11, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase",
              color: t.id === active ? "var(--bg)" : "var(--text-2)",
              transition: "color var(--dur-fast) var(--ease-out)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
    </nav>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// SCREEN TRANSITION WRAPPER
// ────────────────────────────────────────────────────────────────────────────

// Slides between screens with a directional fade/slide. We key by screen id so
// React unmounts + remounts cleanly (resets scroll, restarts intro animations).
const ScreenTransition = ({ keyId, direction = "forward", children }) => {
  const [renderKey, setRenderKey] = React.useState(keyId);
  const [phase, setPhase] = React.useState("in"); // "in" | "out"
  const lastDir = React.useRef(direction);

  React.useEffect(() => {
    if (renderKey === keyId) return;
    lastDir.current = direction;
    setPhase("out");
    const t = setTimeout(() => {
      setRenderKey(keyId);
      setPhase("in");
    }, 220);
    return () => clearTimeout(t);
  }, [keyId, renderKey, direction]);

  const dx = lastDir.current === "back" ? 24 : -24;
  const enter = lastDir.current === "back" ? -24 : 24;

  return (
    <div
      style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        opacity: phase === "in" ? 1 : 0,
        transform: phase === "in" ? "translateX(0)" : `translateX(${dx}px)`,
        transition: "opacity 220ms var(--ease-out), transform 280ms var(--ease-out)",
      }}
    >
      {React.Children.map(children, (c) => c && React.cloneElement(c, { _enter: enter }))}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ────────────────────────────────────────────────────────────────────────────

Object.assign(window, {
  VIOLETTA_DATA,
  StatusBar, Wordmark, Eyebrow, Ornament, Plate, SectionHeader,
  NailTile, NailFan,
  Btn, ArrowRight, ArrowLeft, Tag,
  AppHeader, TabBar, TAB_ITEMS,
  ScreenTransition,
});
