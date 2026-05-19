// Violetta Beauty — main App, router, tweaks

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": ["#14091a", "#7d3a6f", "#c9a96e"],
  "fonts": "cormorant",
  "anim": "moderate",
  "dark": true,
  "density": "comfy"
}/*EDITMODE-END*/;

// ── Palette mapping ────────────────────────────────────────────────────────
// Each palette = [bg, plum/accent-secondary, gold/accent-primary]. Selecting
// one rewrites the CSS custom properties live; dark/light flip is layered
// on top via [data-theme].
const PALETTES = {
  "aubergine": ["#14091a", "#7d3a6f", "#c9a96e"],
  "rose":      ["#1e0d18", "#a8456d", "#e8b08c"],
  "lilac":     ["#1a1226", "#8a6cc4", "#e0c4f3"],
  "mono":      ["#0d0a0f", "#3a2a3a", "#d4c9b8"],
};

function applyPalette([bg, plum, gold]) {
  const r = document.documentElement.style;
  r.setProperty("--bg", bg);
  // Adjust secondary background slightly lighter
  r.setProperty("--bg-2", shade(bg, 0.08));
  r.setProperty("--surface", shade(bg, 0.12));
  r.setProperty("--surface-2", shade(bg, 0.18));
  r.setProperty("--plum", plum);
  r.setProperty("--accent", gold);
  r.setProperty("--accent-2", shade(gold, 0.18));
}

// Lighten a hex color by `amt` (0–1) toward white
function shade(hex, amt) {
  const h = hex.replace("#", "");
  const x = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(x.slice(0, 6), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.round(r + (255 - r) * amt * 0.25);
  g = Math.round(g + (255 - g) * amt * 0.25);
  b = Math.round(b + (255 - b) * amt * 0.25);
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

// ── Router ─────────────────────────────────────────────────────────────────
// A simple stack-based router. `go(name, params)` pushes a screen, `go(-1)`
// pops. Some screens (the four tab roots) live at a single index — switching
// tabs resets the stack to that root so back-navigation in a sub-screen feels
// natural ("back" returns up the stack, the tab bar returns to a root).

const TAB_ROOTS = new Set(["home", "services", "gallery", "profile"]);

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Apply tweak values to <html> dataset + CSS vars
  React.useEffect(() => {
    document.documentElement.dataset.theme = t.dark ? "dark" : "light";
    document.documentElement.dataset.fonts = t.fonts;
    document.documentElement.dataset.anim = t.anim;
    document.documentElement.dataset.density = t.density;
  }, [t.dark, t.fonts, t.anim, t.density]);

  React.useEffect(() => {
    applyPalette(t.palette);
  }, [t.palette]);

  React.useEffect(() => {
    document.getElementById("app").classList.add("ready");
  }, []);

  const [stack, setStack] = React.useState([{ id: "welcome", params: {} }]);
  const [direction, setDirection] = React.useState("forward");

  const current = stack[stack.length - 1];

  const go = React.useCallback((target, params = {}) => {
    if (target === -1) {
      if (stack.length > 1) {
        setDirection("back");
        setStack((s) => s.slice(0, -1));
      }
      return;
    }
    if (TAB_ROOTS.has(target)) {
      setDirection("forward");
      // Reset to root tab — but if it's already current, do nothing
      setStack((s) => {
        const last = s[s.length - 1];
        if (last && last.id === target) return s;
        return [{ id: target, params }];
      });
      return;
    }
    setDirection("forward");
    setStack((s) => [...s, { id: target, params }]);
  }, [stack]);

  const setParams = (params) => {
    setStack((s) => {
      const copy = s.slice();
      copy[copy.length - 1] = { ...copy[copy.length - 1], params };
      return copy;
    });
  };

  const renderScreen = (entry) => {
    switch (entry.id) {
      case "welcome":         return <WelcomeScreen go={go} />;
      case "onboarding":      return <OnboardingScreen go={go} />;
      case "home":            return <HomeScreen go={go} />;
      case "services":        return <ServicesScreen go={go} />;
      case "service-detail":  return <ServiceDetailScreen go={go} params={entry.params} />;
      case "booking":         return <BookingScreen go={go} params={entry.params} setParams={setParams} />;
      case "confirmation":    return <ConfirmationScreen go={go} params={entry.params} />;
      case "gallery":         return <GalleryScreen go={go} />;
      case "master":          return <MasterScreen go={go} />;
      case "membership":      return <MembershipScreen go={go} />;
      case "profile":         return <ProfileScreen go={go} />;
      default:                return <WelcomeScreen go={go} />;
    }
  };

  const showTabBar = TAB_ROOTS.has(current.id);

  return (
    <div className="violetta-stage">
      {/* Decorative columns (visible on wide viewports) */}
      <div className="stage-deco-l">
        <div className="deco-plume" style={{ width: 360, height: 360, top: "10%", right: "-20%", background: "radial-gradient(circle, var(--plum), transparent 70%)" }} />
        <div className="deco-plume" style={{ width: 280, height: 280, bottom: "10%", left: "10%", background: "radial-gradient(circle, var(--violet), transparent 70%)" }} />
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%) rotate(-90deg)",
          fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.4em",
          textTransform: "uppercase", color: "var(--text-3)", whiteSpace: "nowrap",
        }}>
          VIOLETTA · BY APPOINTMENT · EST 2014
        </div>
      </div>

      <main className="violetta-app">
        <ScreenTransition keyId={current.id + JSON.stringify(current.params)} direction={direction}>
          {renderScreen(current)}
        </ScreenTransition>
        {showTabBar && (
          <TabBar
            active={current.id}
            onChange={(id) => go(id)}
          />
        )}
      </main>

      <div className="stage-deco-r">
        <div className="deco-plume" style={{ width: 300, height: 300, top: "20%", left: "-10%", background: "radial-gradient(circle, var(--plum), transparent 70%)" }} />
        <div className="deco-plume" style={{ width: 360, height: 360, bottom: "5%", right: "-15%", background: "radial-gradient(circle, var(--accent), transparent 70%)", opacity: 0.18 }} />
        <div style={{
          position: "absolute", top: 30, right: 30,
          fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.3em",
          textTransform: "uppercase", color: "var(--text-3)",
        }}>
          № 24
        </div>
        <div style={{
          position: "absolute", bottom: 30, right: 30, textAlign: "right",
        }}>
          <div className="display italic" style={{ fontSize: 22, color: "var(--text-2)" }}>
            Atelier
          </div>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.3em",
            textTransform: "uppercase", color: "var(--text-3)", marginTop: 4,
          }}>
            MMXIV · MMXXVI
          </div>
        </div>
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme">
          <TweakColor
            label="Palette"
            value={t.palette}
            options={Object.values(PALETTES)}
            onChange={(v) => setTweak("palette", v)}
          />
          <TweakToggle label="Dark mode" value={t.dark} onChange={(v) => setTweak("dark", v)} />
        </TweakSection>

        <TweakSection label="Type">
          <TweakRadio
            label="Pairing"
            value={t.fonts}
            options={[
              { value: "cormorant", label: "Editorial" },
              { value: "italiana",  label: "Vogue" },
              { value: "playfair",  label: "Couture" },
            ]}
            onChange={(v) => setTweak("fonts", v)}
          />
        </TweakSection>

        <TweakSection label="Layout">
          <TweakRadio
            label="Density"
            value={t.density}
            options={[
              { value: "compact", label: "Tight" },
              { value: "comfy",   label: "Comfy" },
              { value: "roomy",   label: "Roomy" },
            ]}
            onChange={(v) => setTweak("density", v)}
          />
        </TweakSection>

        <TweakSection label="Motion">
          <TweakRadio
            label="Animation"
            value={t.anim}
            options={[
              { value: "off",      label: "Off" },
              { value: "subtle",   label: "Subtle" },
              { value: "moderate", label: "Mid" },
              { value: "showy",    label: "Showy" },
            ]}
            onChange={(v) => setTweak("anim", v)}
          />
        </TweakSection>

        <TweakSection label="Navigate">
          <TweakSelect
            label="Jump to"
            value={current.id}
            options={[
              { value: "welcome",        label: "Welcome" },
              { value: "onboarding",     label: "Onboarding" },
              { value: "home",           label: "Home" },
              { value: "services",       label: "Services" },
              { value: "service-detail", label: "Service detail" },
              { value: "booking",        label: "Booking flow" },
              { value: "confirmation",   label: "Confirmation" },
              { value: "gallery",        label: "Gallery" },
              { value: "master",         label: "Master profile" },
              { value: "membership",     label: "Membership" },
              { value: "profile",        label: "You" },
            ]}
            onChange={(v) => {
              const params =
                v === "service-detail" ? { serviceId: "signature" } :
                v === "booking" ? { serviceId: "signature", step: 0 } :
                v === "confirmation" ? { serviceId: "signature", date: 22, time: "16:30" } :
                {};
              if (TAB_ROOTS.has(v)) {
                setStack([{ id: v, params }]);
              } else {
                setStack([{ id: "home", params: {} }, { id: v, params }]);
              }
              setDirection("forward");
            }}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("app"));
root.render(<App />);
