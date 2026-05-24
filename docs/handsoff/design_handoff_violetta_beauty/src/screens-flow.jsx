// Violetta Beauty — booking flow, confirmation, gallery, master, membership, profile

// ────────────────────────────────────────────────────────────────────────────
// BOOKING FLOW — 4 steps
// ────────────────────────────────────────────────────────────────────────────

const BOOKING_STEPS = ["Service", "Date", "Time", "Confirm"];

const TIMES = [
  "10:00", "11:30", "13:00", "14:30", "16:00", "17:30", "19:00",
];

function BookingScreen({ go, params, setParams }) {
  const { services, artist } = VIOLETTA_DATA;
  const step = params.step ?? 0;
  const setStep = (n) => setParams({ ...params, step: n });

  const selectedService = services.find((s) => s.id === params.serviceId) || services[0];
  const [date, setDate] = React.useState(params.date || 22);
  const [time, setTime] = React.useState(params.time || "16:30");

  const next = () => {
    if (step < 3) setStep(step + 1);
    else go("confirmation", { serviceId: selectedService.id, date, time });
  };
  const back = () => {
    if (step > 0) setStep(step - 1);
    else go(-1);
  };

  return (
    <div className="screen">
      <StatusBar />
      <AppHeader onBack={back} title={`STEP ${step + 1} OF ${BOOKING_STEPS.length}`} />

      {/* Progress */}
      <div style={{ padding: "0 22px 16px" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {BOOKING_STEPS.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 2,
              background: i <= step ? "var(--accent)" : "var(--line-strong)",
              transition: "background var(--dur) var(--ease-out)",
            }} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          {BOOKING_STEPS.map((label, i) => (
            <div key={i} style={{
              fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: i === step ? "var(--accent)" : "var(--text-3)",
              transition: "color var(--dur-fast)",
            }}>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="float-in" key={step} style={{ padding: "20px 22px 30px" }}>
        {step === 0 && (
          <div>
            <Eyebrow gold>STEP 01 / RITUAL</Eyebrow>
            <h2 className="display" style={{ fontSize: 36, margin: "10px 0 6px", fontWeight: 400, letterSpacing: "-0.02em" }}>
              Choose your <em>ritual</em>.
            </h2>
            <p style={{ color: "var(--text-2)", margin: "0 0 20px", fontSize: 14 }}>
              Pick one. You can change it any time before payment.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {services.map((s, i) => {
                const isActive = params.serviceId === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setParams({ ...params, serviceId: s.id })}
                    style={{
                      display: "flex", textAlign: "left", padding: 14, gap: 14,
                      background: isActive ? "var(--surface-2)" : "var(--surface)",
                      border: "0.5px solid " + (isActive ? "var(--accent)" : "var(--line)"),
                      borderRadius: "var(--radius)", color: "var(--text)",
                      transition: "all var(--dur-fast) var(--ease-out)",
                    }}
                  >
                    <div style={{ width: 56, height: 70, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
                      <NailTile palette={["#c9a96e", "#7d3a6f"]} variant={i} style={{ width: "100%", height: "100%" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="display italic" style={{ fontSize: 20, fontWeight: 400, lineHeight: 1.05 }}>
                        {s.name}
                      </div>
                      <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", color: "var(--text-3)", marginTop: 3, textTransform: "uppercase" }}>
                        {s.duration} · €{s.price}
                      </div>
                    </div>
                    <div style={{
                      width: 22, height: 22, borderRadius: 999,
                      border: "0.5px solid " + (isActive ? "var(--accent)" : "var(--line-strong)"),
                      background: isActive ? "var(--accent)" : "transparent",
                      flexShrink: 0, alignSelf: "center",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {isActive && (
                        <svg viewBox="0 0 14 14" width={12} height={12}>
                          <path d="M3 7.2 5.8 10 11 4.2" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" stroke="var(--bg)" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 1 && <BookingDate date={date} setDate={setDate} />}
        {step === 2 && <BookingTime time={time} setTime={setTime} date={date} />}
        {step === 3 && (
          <BookingConfirm service={selectedService} date={date} time={time} artist={artist} />
        )}
      </div>

      {/* Sticky CTA */}
      <div style={{
        position: "sticky", bottom: 0,
        padding: "12px 22px 22px",
        background: "linear-gradient(to top, var(--bg) 60%, transparent)",
        flexShrink: 0,
      }}>
        <Btn gold block icon={<ArrowRight />} onClick={next}>
          {step < 3 ? "Continue" : "Confirm appointment"}
        </Btn>
      </div>
    </div>
  );
}

// ── Date picker ────────────────────────────────────────────────────────────

function BookingDate({ date, setDate }) {
  // Render a 2-week strip starting today (May 19 → June 1)
  const month = "May 2026";
  const days = [];
  const start = 19;
  for (let i = 0; i < 14; i++) {
    const d = start + i;
    days.push({
      dow: ["Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon"][i % 7],
      date: d > 31 ? d - 31 : d,
      crossover: d > 31,
      disabled: ["Mon", "Sun"][0] === ["Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon"][i % 7] === "Sun"
                || ["Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon"][i % 7] === "Mon",
    });
  }
  // Recompute disabled flag correctly:
  days.forEach((d) => { d.disabled = d.dow === "Sun" || d.dow === "Mon"; });

  return (
    <div>
      <Eyebrow gold>STEP 02 / DATE</Eyebrow>
      <h2 className="display" style={{ fontSize: 36, margin: "10px 0 6px", fontWeight: 400, letterSpacing: "-0.02em" }}>
        Pick a <em>day</em>.
      </h2>
      <p style={{ color: "var(--text-2)", margin: "0 0 20px", fontSize: 14 }}>
        Studio open <span className="gold">Tuesday – Saturday</span>.
      </p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div className="display italic" style={{ fontSize: 22 }}>{month}</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={{ width: 30, height: 30, borderRadius: 999, border: "0.5px solid var(--line-strong)", background: "transparent", color: "var(--text)" }}>
            <ArrowLeft size={12} />
          </button>
          <button style={{ width: 30, height: 30, borderRadius: 999, border: "0.5px solid var(--line-strong)", background: "transparent", color: "var(--text)" }}>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6,
      }}>
        {days.map((d, i) => {
          const isSelected = d.date === date && !d.crossover;
          return (
            <button
              key={i}
              disabled={d.disabled}
              onClick={() => !d.disabled && setDate(d.date)}
              style={{
                aspectRatio: "1 / 1.15",
                borderRadius: 12,
                border: "0.5px solid " + (isSelected ? "var(--accent)" : d.disabled ? "transparent" : "var(--line)"),
                background: isSelected ? "var(--accent)" : d.disabled ? "color-mix(in oklab, var(--surface) 40%, transparent)" : "var(--surface)",
                color: isSelected ? "var(--bg)" : d.disabled ? "var(--text-3)" : "var(--text)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 2, opacity: d.disabled ? 0.4 : 1,
                transition: "all var(--dur-fast) var(--ease-out)",
              }}
            >
              <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.7 }}>
                {d.dow}
              </div>
              <div className="display" style={{ fontSize: 22, fontWeight: 400 }}>
                {d.date}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 20, padding: 14, background: "var(--surface)", border: "0.5px solid var(--line)", borderRadius: "var(--radius)" }}>
        <Eyebrow>STUDIO HOURS</Eyebrow>
        <div style={{ marginTop: 8, fontSize: 13, color: "var(--text-2)" }}>
          Tue – Sat · 10:00 – 19:00 · By appointment only
        </div>
      </div>
    </div>
  );
}

// ── Time picker ────────────────────────────────────────────────────────────

function BookingTime({ time, setTime, date }) {
  // Mark a couple as taken to feel real
  const taken = new Set(["11:30", "16:00"]);

  return (
    <div>
      <Eyebrow gold>STEP 03 / TIME</Eyebrow>
      <h2 className="display" style={{ fontSize: 36, margin: "10px 0 6px", fontWeight: 400, letterSpacing: "-0.02em" }}>
        Choose your <em>hour</em>.
      </h2>
      <p style={{ color: "var(--text-2)", margin: "0 0 20px", fontSize: 14 }}>
        Fri <span className="gold">{date} May</span> · Times in studio local time.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {TIMES.map((t) => {
          const isTaken = taken.has(t);
          const isSel = time === t && !isTaken;
          return (
            <button
              key={t}
              disabled={isTaken}
              onClick={() => !isTaken && setTime(t)}
              style={{
                padding: "20px 16px", borderRadius: "var(--radius)",
                border: "0.5px solid " + (isSel ? "var(--accent)" : isTaken ? "transparent" : "var(--line)"),
                background: isSel ? "color-mix(in oklab, var(--accent) 16%, var(--surface))" : isTaken ? "color-mix(in oklab, var(--surface) 50%, transparent)" : "var(--surface)",
                color: isSel ? "var(--accent)" : isTaken ? "var(--text-3)" : "var(--text)",
                opacity: isTaken ? 0.4 : 1,
                textAlign: "left",
                transition: "all var(--dur-fast) var(--ease-out)",
              }}
            >
              <div className="display italic" style={{ fontSize: 26, lineHeight: 1, fontWeight: 400 }}>
                {t}
              </div>
              <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 6, opacity: 0.7 }}>
                {isTaken ? "Reserved" : "Available"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Confirm step ───────────────────────────────────────────────────────────

function BookingConfirm({ service, date, time, artist }) {
  return (
    <div>
      <Eyebrow gold>STEP 04 / CONFIRM</Eyebrow>
      <h2 className="display" style={{ fontSize: 36, margin: "10px 0 6px", fontWeight: 400, letterSpacing: "-0.02em" }}>
        A quiet <em>review</em>.
      </h2>
      <p style={{ color: "var(--text-2)", margin: "0 0 20px", fontSize: 14 }}>
        Confirm and you'll receive an email invitation.
      </p>

      <div style={{ background: "var(--surface)", border: "0.5px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden" }}>
        <div style={{ padding: 20, borderBottom: "0.5px solid var(--line)", display: "flex", gap: 14 }}>
          <div style={{ width: 64, height: 80, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
            <NailTile palette={["#c9a96e", "#7d3a6f"]} variant={1} style={{ width: "100%", height: "100%" }} />
          </div>
          <div style={{ flex: 1 }}>
            <Eyebrow>RITUAL</Eyebrow>
            <div className="display italic" style={{ fontSize: 22, margin: "4px 0 4px", fontWeight: 400 }}>
              {service.name}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
              {service.duration.toUpperCase()} · €{service.price}
            </div>
          </div>
        </div>

        {[
          ["Master", artist.name],
          ["Date", `Fri ${date} May 2026`],
          ["Time", time],
          ["Location", "Verbena Lane 14 · Studio B"],
        ].map(([label, val], i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "16px 20px",
            borderBottom: i < 3 ? "0.5px solid var(--line)" : "none",
          }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)" }}>
              {label}
            </div>
            <div style={{ fontSize: 14, color: "var(--text)" }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, padding: "14px 18px", border: "0.5px dashed var(--line-strong)", borderRadius: "var(--radius)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)" }}>
              TOTAL
            </div>
            <div className="display italic gold" style={{ fontSize: 30, fontWeight: 400 }}>€{service.price}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)" }}>
              CHARGE
            </div>
            <div style={{ fontSize: 13 }}>At the studio</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// CONFIRMATION
// ────────────────────────────────────────────────────────────────────────────

function ConfirmationScreen({ go, params }) {
  const service = VIOLETTA_DATA.services.find((s) => s.id === params.serviceId) || VIOLETTA_DATA.services[0];
  const [phase, setPhase] = React.useState(0);

  React.useEffect(() => {
    const a = setTimeout(() => setPhase(1), 200);
    const b = setTimeout(() => setPhase(2), 900);
    const c = setTimeout(() => setPhase(3), 1500);
    return () => { clearTimeout(a); clearTimeout(b); clearTimeout(c); };
  }, []);

  return (
    <div className="screen grain" style={{ position: "relative", padding: "0 22px" }}>
      {/* Floating confetti — tiny gold dots */}
      {Array.from({ length: 18 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: `${10 + (i * 53) % 80}%`,
            left: `${(i * 71) % 100}%`,
            width: 3 + (i % 3), height: 3 + (i % 3),
            borderRadius: 999,
            background: i % 3 === 0 ? "var(--accent)" : i % 3 === 1 ? "var(--violet)" : "var(--rose)",
            opacity: phase >= 1 ? 0.6 : 0,
            transform: phase >= 1 ? `translateY(${-50 - (i % 4) * 20}px)` : "translateY(40px)",
            transition: `all ${1800 + (i % 4) * 200}ms var(--ease-out) ${i * 30}ms`,
            pointerEvents: "none",
          }}
        />
      ))}

      <StatusBar />

      <div style={{ paddingTop: 40, textAlign: "center" }}>
        {/* Animated golden seal */}
        <div style={{
          width: 130, height: 130, margin: "0 auto",
          position: "relative",
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? "scale(1) rotate(0)" : "scale(0.5) rotate(-40deg)",
          transition: "all 900ms var(--ease-out)",
        }}>
          <div style={{
            position: "absolute", inset: 0, borderRadius: 999,
            background: "radial-gradient(circle at 35% 30%, #f3ead8 0%, #c9a96e 50%, #7d3a6f 100%)",
            boxShadow: "0 20px 40px -10px color-mix(in oklab, var(--accent) 40%, transparent)",
          }} />
          <div style={{
            position: "absolute", inset: 12, borderRadius: 999,
            border: "0.5px solid rgba(255,255,255,0.45)",
          }} />
          <svg
            viewBox="0 0 60 60"
            style={{ position: "absolute", inset: 0, margin: "auto", width: 40, height: 40,
                     opacity: phase >= 2 ? 1 : 0, transition: "opacity 500ms var(--ease-out)" }}
          >
            <path d="M14 30 25 41 47 19" fill="none" stroke="#14091a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div style={{
          marginTop: 28,
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? "translateY(0)" : "translateY(16px)",
          transition: "all 700ms var(--ease-out)",
        }}>
          <Eyebrow gold>RESERVED · #VB-{Math.floor(Math.random() * 9000) + 1000}</Eyebrow>
          <h1 className="display" style={{
            fontSize: 44, fontStyle: "italic", margin: "12px 0 6px",
            fontWeight: 400, letterSpacing: "-0.02em",
          }}>
            Your chair<br />awaits.
          </h1>
          <p style={{ color: "var(--text-2)", maxWidth: 320, margin: "10px auto 0", fontSize: 14 }}>
            A small invitation is on its way. Bring nothing but your hands and a feeling.
          </p>
        </div>

        {/* Card */}
        <div style={{
          marginTop: 32, padding: 22,
          background: "linear-gradient(135deg, color-mix(in oklab, var(--plum) 30%, var(--surface)) 0%, var(--surface) 80%)",
          border: "0.5px solid var(--accent)",
          borderRadius: "var(--radius-lg)",
          textAlign: "left",
          opacity: phase >= 3 ? 1 : 0,
          transform: phase >= 3 ? "translateY(0)" : "translateY(20px)",
          transition: "all 800ms var(--ease-out)",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", right: -40, bottom: -40, width: 160, height: 160, borderRadius: 999,
            background: "radial-gradient(circle, color-mix(in oklab, var(--accent) 24%, transparent), transparent 70%)",
          }} />
          <Eyebrow gold>YOUR APPOINTMENT</Eyebrow>
          <h3 className="display italic" style={{ fontSize: 26, margin: "8px 0 14px", fontWeight: 400 }}>
            {service.name}
          </h3>
          {[
            ["DATE", `Fri ${params.date || 22} May 2026`],
            ["TIME", params.time || "16:30"],
            ["WHERE", "Verbena Lane 14 · Studio B"],
            ["DURATION", service.duration],
          ].map(([k, v], i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < 3 ? "0.5px solid var(--line)" : "none" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)", letterSpacing: "0.12em" }}>{k}</span>
              <span style={{ fontSize: 13 }}>{v}</span>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div style={{
          marginTop: 28, display: "flex", flexDirection: "column", gap: 10, paddingBottom: 30,
          opacity: phase >= 3 ? 1 : 0,
          transition: "opacity 800ms var(--ease-out) 200ms",
        }}>
          <Btn block onClick={() => go("profile")}>Add to calendar</Btn>
          <Btn variant="ghost" block onClick={() => go("home")}>Return to the atelier</Btn>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// GALLERY
// ────────────────────────────────────────────────────────────────────────────

function GalleryScreen({ go }) {
  const { gallery, galleryTags } = VIOLETTA_DATA;
  const [tag, setTag] = React.useState("All");
  const [focused, setFocused] = React.useState(null); // index of focused image

  const filtered = tag === "All" ? gallery : gallery.filter((g) => g.tag === tag);

  return (
    <div className="screen">
      <StatusBar />
      <AppHeader title="PORTFOLIO" />

      <div style={{ padding: "0 22px 12px" }}>
        <Eyebrow gold>FIVE YEARS · 600+ SETS</Eyebrow>
        <h1 className="display" style={{ fontSize: 44, margin: "10px 0 6px", fontWeight: 400, letterSpacing: "-0.02em" }}>
          The <em>gallery</em>.
        </h1>
        <p style={{ color: "var(--text-2)", fontSize: 14, margin: 0, maxWidth: 320 }}>
          A selection of recent work. Tap any image for the story behind it.
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "20px 22px 14px", overflowX: "auto", scrollbarWidth: "none" }}>
        {galleryTags.map((t) => (
          <button
            key={t}
            onClick={() => setTag(t)}
            style={{
              padding: "8px 14px", borderRadius: 999, flexShrink: 0,
              border: "0.5px solid " + (t === tag ? "var(--text)" : "var(--line-strong)"),
              background: t === tag ? "var(--text)" : "transparent",
              color: t === tag ? "var(--bg)" : "var(--text-2)",
              fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase",
              fontFamily: "var(--font-mono)", fontWeight: 500,
              transition: "all var(--dur-fast) var(--ease-out)",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Masonry — two columns with staggered heights */}
      <div style={{ padding: "8px 22px 30px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {filtered.map((g, i) => (
          <button
            key={i}
            onClick={() => setFocused(i)}
            className="float-in"
            style={{
              animationDelay: `${i * 60}ms`,
              height: g.h, borderRadius: "var(--radius)", overflow: "hidden",
              border: "0.5px solid var(--line)",
              padding: 0, background: "transparent",
              position: "relative",
              transition: "transform var(--dur-fast)",
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
          >
            <NailTile palette={g.palette} variant={i + 1} style={{ width: "100%", height: "100%" }} />
            <div style={{
              position: "absolute", left: 10, bottom: 10,
              background: "rgba(20,9,26,0.55)", backdropFilter: "blur(8px)",
              borderRadius: 999, padding: "4px 10px",
              fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase",
              color: "var(--text)", fontFamily: "var(--font-mono)",
            }}>{g.tag}</div>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {focused !== null && (
        <div
          onClick={() => setFocused(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(20,9,26,0.85)",
            backdropFilter: "blur(20px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 22,
            animation: "floatIn 400ms var(--ease-out)",
          }}
        >
          <div style={{ width: "100%", maxWidth: 420, position: "relative" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ aspectRatio: "3/4", borderRadius: "var(--radius-lg)", overflow: "hidden", border: "0.5px solid var(--accent)" }}>
              <NailTile palette={filtered[focused].palette} variant={focused + 2} style={{ width: "100%", height: "100%" }} />
            </div>
            <div style={{ marginTop: 16, color: "var(--text)" }}>
              <Eyebrow gold>{filtered[focused].tag.toUpperCase()} · SET № {String(focused + 1).padStart(2, "0")}</Eyebrow>
              <div className="display italic" style={{ fontSize: 26, margin: "8px 0 6px", fontWeight: 400 }}>
                A study in {filtered[focused].tag.toLowerCase()}.
              </div>
              <p style={{ color: "var(--text-2)", fontSize: 13, margin: 0 }}>
                Hand-painted on Japanese gel. Two-hour set. Photography by the studio.
              </p>
            </div>
            <button
              onClick={() => setFocused(null)}
              style={{
                position: "absolute", top: -14, right: -14, width: 36, height: 36, borderRadius: 999,
                background: "var(--text)", color: "var(--bg)", border: "none",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}
            >✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// MASTER PROFILE
// ────────────────────────────────────────────────────────────────────────────

function MasterScreen({ go }) {
  const { artist, testimonials } = VIOLETTA_DATA;
  return (
    <div className="screen">
      <StatusBar />
      <AppHeader onBack={() => go(-1)} title="THE MASTER" />

      {/* Hero portrait */}
      <div style={{ padding: "0 22px 0" }}>
        <div style={{
          position: "relative", aspectRatio: "1/1.2",
          borderRadius: "var(--radius-lg)", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(ellipse 65% 60% at 50% 35%, #f3ead8 0%, #c9a96e 30%, #7d3a6f 70%, #14091a 100%)",
          }} />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to bottom, transparent 40%, color-mix(in oklab, var(--bg) 90%, transparent))",
          }} />
          {/* Frame mark */}
          <div style={{ position: "absolute", top: 18, left: 18 }}>
            <Eyebrow gold>VIOLETTA · MMXIV</Eyebrow>
          </div>
          <div style={{ position: "absolute", bottom: 18, left: 18, right: 18 }}>
            <h1 className="display italic" style={{
              fontSize: 46, fontWeight: 300, letterSpacing: "-0.02em",
              margin: 0, lineHeight: 0.96,
            }}>
              {artist.name.split(" ")[0]}<br />
              <span style={{ fontStyle: "normal" }}>{artist.name.split(" ")[1]}.</span>
            </h1>
          </div>
        </div>
      </div>

      <section style={{ padding: "30px 22px 16px" }}>
        <Eyebrow gold>{artist.role.toUpperCase()}</Eyebrow>
        <p style={{ fontSize: 15, color: "var(--text-2)", lineHeight: 1.6, margin: "12px 0 0" }}>
          {artist.bio}
        </p>
      </section>

      {/* Pull quote */}
      <section style={{ padding: "10px 22px 30px" }}>
        <blockquote style={{
          margin: 0, padding: "22px 22px",
          borderLeft: "1px solid var(--accent)",
          background: "color-mix(in oklab, var(--surface) 70%, transparent)",
          borderRadius: "0 var(--radius) var(--radius) 0",
        }}>
          <p className="display italic" style={{ fontSize: 24, margin: 0, lineHeight: 1.25, fontWeight: 400 }}>
            "{artist.quote}"
          </p>
        </blockquote>
      </section>

      {/* Stats */}
      <section style={{ padding: "0 22px 30px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderTop: "0.5px solid var(--line-strong)", borderBottom: "0.5px solid var(--line-strong)" }}>
          {[
            ["11", "years"],
            ["1", "chair"],
            ["600+", "sets"],
          ].map(([n, l], i) => (
            <div key={i} style={{
              padding: "20px 4px", textAlign: "center",
              borderRight: i < 2 ? "0.5px solid var(--line)" : "none",
            }}>
              <div className="display italic gold" style={{ fontSize: 34, lineHeight: 1, fontWeight: 400 }}>{n}</div>
              <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-3)", marginTop: 6 }}>
                {l}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Voices */}
      <section style={{ padding: "0 22px 30px" }}>
        <Eyebrow>VOICES</Eyebrow>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
          {testimonials.map((t, i) => (
            <div key={i} style={{
              padding: 18, background: "var(--surface)", border: "0.5px solid var(--line)", borderRadius: "var(--radius)",
            }}>
              <p className="display italic" style={{ fontSize: 18, margin: "0 0 12px", lineHeight: 1.35, fontWeight: 400 }}>
                "{t.text}"
              </p>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ width: 22, height: 22, borderRadius: 999, background: "color-mix(in oklab, var(--rose) 60%, var(--accent))" }} />
                <div style={{ fontSize: 12 }}>
                  <span style={{ fontWeight: 500 }}>{t.name}</span>
                  <span style={{ color: "var(--text-3)", marginLeft: 8, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em" }}>
                    {t.role.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "0 22px 40px" }}>
        <Btn gold block icon={<ArrowRight />} onClick={() => go("services")}>
          Reserve with Violetta
        </Btn>
      </section>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// MEMBERSHIP
// ────────────────────────────────────────────────────────────────────────────

function MembershipScreen({ go }) {
  const { membership } = VIOLETTA_DATA;
  const [annual, setAnnual] = React.useState(false);

  return (
    <div className="screen">
      <StatusBar />
      <AppHeader onBack={() => go(-1)} title="MEMBERSHIP" />

      <section style={{ padding: "0 22px 16px" }}>
        <Eyebrow gold>BY INVITATION · LIMITED CIRCLE</Eyebrow>
        <h1 className="display" style={{ fontSize: 44, margin: "10px 0 8px", fontWeight: 400, letterSpacing: "-0.02em" }}>
          Become a <em>member</em>.
        </h1>
        <p style={{ color: "var(--text-2)", fontSize: 14, margin: 0, maxWidth: 320 }}>
          A small ring of regulars. Three tiers, one chair, complete attention.
        </p>
      </section>

      {/* Billing toggle */}
      <section style={{ padding: "10px 22px 4px" }}>
        <div style={{
          display: "inline-flex", padding: 4,
          border: "0.5px solid var(--line-strong)", borderRadius: 999,
          background: "var(--surface)",
        }}>
          {[
            { id: false, label: "Monthly" },
            { id: true, label: "Annual · 2 mo free" },
          ].map((o) => (
            <button
              key={String(o.id)}
              onClick={() => setAnnual(o.id)}
              style={{
                padding: "8px 16px", border: "none", borderRadius: 999,
                background: annual === o.id ? "var(--text)" : "transparent",
                color: annual === o.id ? "var(--bg)" : "var(--text-2)",
                fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase",
                fontFamily: "var(--font-mono)", fontWeight: 500,
                transition: "all var(--dur-fast)",
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </section>

      {/* Tiers */}
      <section style={{ padding: "20px 22px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        {membership.map((m, i) => {
          const price = annual && m.price ? Math.round(m.price * 10) : m.price;
          const cadence = annual && m.price ? "/ year" : m.cadence;
          return (
            <div
              key={m.tier}
              className="float-in"
              style={{
                animationDelay: `${i * 100}ms`,
                position: "relative", overflow: "hidden",
                padding: 22, borderRadius: "var(--radius-lg)",
                background: m.featured
                  ? "linear-gradient(135deg, color-mix(in oklab, var(--plum) 40%, var(--surface)) 0%, var(--surface) 80%)"
                  : "var(--surface)",
                border: "0.5px solid " + (m.featured ? "var(--accent)" : "var(--line)"),
              }}
            >
              {m.featured && (
                <>
                  <div style={{
                    position: "absolute", right: -50, top: -50, width: 180, height: 180, borderRadius: 999,
                    background: "radial-gradient(circle, color-mix(in oklab, var(--accent) 30%, transparent), transparent 70%)",
                  }} />
                  <div style={{
                    position: "absolute", top: 18, right: 18,
                    fontSize: 10, fontFamily: "var(--font-mono)", letterSpacing: "0.16em", textTransform: "uppercase",
                    color: "var(--accent)",
                    padding: "4px 10px", border: "0.5px solid var(--accent)", borderRadius: 999,
                  }}>
                    Most chosen
                  </div>
                </>
              )}
              <Eyebrow gold={m.featured}>{m.tier.toUpperCase()}</Eyebrow>
              <h3 className="display italic" style={{ fontSize: 36, margin: "8px 0 4px", fontWeight: 400 }}>
                {m.tier === "Petale" ? "Free" : `€${price}`}
                <span style={{ fontFamily: "var(--font-mono)", fontStyle: "normal", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", marginLeft: 8 }}>
                  {cadence !== "Open" ? cadence : ""}
                </span>
              </h3>

              <div style={{ marginTop: 18, marginBottom: 18 }}>
                {m.perks.map((p, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "8px 0", borderTop: "0.5px solid var(--line)" }}>
                    <div style={{ marginTop: 6 }}>
                      <svg viewBox="0 0 12 12" width="10" height="10">
                        <circle cx="6" cy="6" r="3" fill={m.featured ? "var(--accent)" : "var(--text-2)"} />
                      </svg>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-2)" }}>{p}</div>
                  </div>
                ))}
              </div>

              <Btn
                block
                gold={m.featured}
                variant={m.featured ? "solid" : "outline"}
                onClick={() => go("home")}
              >
                {m.price === 0 ? "Stay free" : `Join ${m.tier}`}
              </Btn>
            </div>
          );
        })}
      </section>

      <section style={{ padding: "10px 22px 40px", textAlign: "center" }}>
        <p style={{ color: "var(--text-3)", fontSize: 12, margin: 0, maxWidth: 280, marginLeft: "auto", marginRight: "auto" }}>
          Memberships pause anytime. Cancel by message — no calls, no forms.
        </p>
      </section>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// PROFILE / ACCOUNT
// ────────────────────────────────────────────────────────────────────────────

function ProfileScreen({ go }) {
  const { account } = VIOLETTA_DATA;
  return (
    <div className="screen">
      <StatusBar />
      <AppHeader title="YOU" action={
        <button style={{ width: 38, height: 38, borderRadius: 999, border: "0.5px solid var(--line-strong)", background: "transparent", color: "var(--text)" }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
          </svg>
        </button>
      } />

      {/* Identity card */}
      <section style={{ padding: "0 22px 22px" }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{
            width: 76, height: 76, borderRadius: 999,
            background: "radial-gradient(circle at 35% 30%, #f3ead8 0%, #d9a3b6 50%, #7d3a6f 100%)",
            border: "0.5px solid var(--accent)",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", inset: 6, borderRadius: 999,
              background: "radial-gradient(ellipse at 35% 35%, rgba(255,255,255,0.35), transparent 60%)",
            }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow gold>{account.member.toUpperCase()}</Eyebrow>
            <h2 className="display italic" style={{ fontSize: 30, margin: "4px 0 0", fontWeight: 400 }}>
              {account.name}
            </h2>
          </div>
        </div>
      </section>

      {/* Upcoming */}
      <section style={{ padding: "0 22px 26px" }}>
        <Eyebrow>NEXT VISIT</Eyebrow>
        <button
          onClick={() => go("service-detail", { serviceId: "gel" })}
          style={{
            display: "block", width: "100%", textAlign: "left",
            marginTop: 12, padding: 22,
            background: "linear-gradient(135deg, color-mix(in oklab, var(--accent) 18%, var(--surface)) 0%, var(--surface) 80%)",
            border: "0.5px solid var(--accent)", borderRadius: "var(--radius-lg)",
            color: "var(--text)", position: "relative", overflow: "hidden",
          }}
        >
          <div style={{
            position: "absolute", right: -10, bottom: -20, width: 120, height: 140, opacity: 0.5,
          }}>
            <NailFan palette={["#c9a96e", "#7d3a6f"]} style={{ width: "100%", height: "100%" }} count={4} />
          </div>
          <div style={{ position: "relative" }}>
            <div className="display italic" style={{ fontSize: 28, margin: "0 0 6px", fontWeight: 400 }}>
              {account.next.service}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-2)" }}>
              {account.next.date} · <span className="gold">{account.next.time}</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <span style={{ padding: "4px 10px", borderRadius: 999, background: "color-mix(in oklab, var(--accent) 25%, transparent)", color: "var(--accent)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
                IN 3 DAYS
              </span>
              <span style={{ padding: "4px 10px", borderRadius: 999, border: "0.5px solid var(--line-strong)", color: "var(--text-2)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
                Reschedule
              </span>
            </div>
          </div>
        </button>
      </section>

      {/* Quick links */}
      <section style={{ padding: "0 22px 26px" }}>
        <Eyebrow>YOUR ATELIER</Eyebrow>
        <div style={{ marginTop: 12, border: "0.5px solid var(--line)", borderRadius: "var(--radius)", background: "var(--surface)", overflow: "hidden" }}>
          {[
            { label: "Membership", value: "Violette", action: () => go("membership") },
            { label: "Saved styles", value: "12 looks", action: () => go("gallery") },
            { label: "Aftercare guide", value: "View", action: () => go("master") },
            { label: "Studio location", value: "Verbena Lane 14", action: () => go("home") },
          ].map((row, i, arr) => (
            <button
              key={i}
              onClick={row.action}
              style={{
                display: "flex", width: "100%", padding: "16px 18px", alignItems: "center",
                justifyContent: "space-between",
                background: "transparent", border: "none",
                borderBottom: i < arr.length - 1 ? "0.5px solid var(--line)" : "none",
                color: "var(--text)", textAlign: "left",
              }}
            >
              <span style={{ fontSize: 14 }}>{row.label}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-3)" }}>
                {row.value} <ArrowRight size={12} />
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* History */}
      <section style={{ padding: "0 22px 30px" }}>
        <Eyebrow>HISTORY</Eyebrow>
        <div style={{ marginTop: 12 }}>
          {account.history.map((h, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 0", borderBottom: "0.5px solid var(--line)",
            }}>
              <div>
                <div style={{ fontSize: 14 }}>{h.service}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)", marginTop: 3 }}>
                  {h.date}
                </div>
              </div>
              <div className="gold" style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>€{h.price}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: "0 22px 40px" }}>
        <Btn variant="outline" block onClick={() => go("welcome")}>Sign out</Btn>
      </section>
    </div>
  );
}

Object.assign(window, {
  BookingScreen, ConfirmationScreen,
  GalleryScreen, MasterScreen, MembershipScreen, ProfileScreen,
});
