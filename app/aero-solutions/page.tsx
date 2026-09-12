import type { Metadata } from "next";
import Link from "next/link";
import { Unbounded, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import styles from "./aero-solutions.module.css";
import MailCta from "./MailCta";

const unbounded = Unbounded({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-unbounded",
});
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "Aero Solutions — software, web apps and games",
  description:
    "Aero Solutions builds web apps, business software, mobile-friendly tools and games for small and growing businesses. A four-person team, real code, no templates.",
  alternates: { canonical: "/aero-solutions" },
  openGraph: {
    type: "website",
    siteName: "Aero Solutions",
    title: "Aero Solutions — software, web apps and games",
    description:
      "Web apps, business software, mobile-friendly tools and games for small and growing businesses.",
    url: "https://www.aeroparkdirect.co.uk/aero-solutions",
    locale: "en_GB",
  },
};

const services = [
  {
    n: "01",
    title: "Web apps & sites",
    body: "Fast, professional sites with a real admin panel behind them — menu, prices, photos, shop details, all editable by you, without calling us every time something changes.",
  },
  {
    n: "02",
    title: "Business tools & software",
    body: "Ordering systems, booking flows, day-sheet automation, admin dashboards — the operational software that actually runs a business day to day, not just a brochure site.",
  },
  {
    n: "03",
    title: "Mobile-friendly apps",
    body: "Phone-first tools your team can actually use on the yard, at the counter, or on the move — built as fast web apps, with no app-store approval process to wait on.",
  },
  {
    n: "04",
    title: "Games & interactive",
    body: "Small interactive builds and games — from a rough idea through to something people can actually open and play.",
  },
];

const work = [
  {
    title: "AeroPark Direct",
    body: "Our own airport parking booking platform — live payments, driver dispatch, SMS confirmations, and the operations behind it. Built and run end to end by us.",
    tag: "Own · Live",
    live: true,
    href: "https://www.aeroparkdirect.co.uk",
  },
  {
    title: "Turnaround",
    body: "Real-time day-sheet and driver-dispatch platform for an airport valet parking operator — live flight tracking, driver assignment and yard management, replacing a paper day sheet. Client confidential, so no public link.",
    tag: "Confidential · Live",
    live: false,
    href: null,
  },
  {
    title: "Continuum",
    body: "The same platform built for Turnaround, deployed separately for a second, round-the-clock airport parking operator — driver app, yard management and live flight tracking, running 24/7. Client confidential, so no public link.",
    tag: "Confidential · Live",
    live: false,
    href: null,
  },
  {
    title: "Sahasra Home Foods",
    body: "Full ordering site for a home-food business in Manikonda, Hyderabad — live menu, prices and photos, all editable through an admin panel with no code involved.",
    tag: "Live",
    live: true,
    href: "https://sahasra-home-foods.vercel.app",
  },
  {
    title: "Auto Parts Retailer",
    body: "A working concept build for an independent car-parts shop — put together to show what a real site could look like for them, not just mocked up. Not yet commissioned, so no name and no public link.",
    tag: "Confidential · Concept",
    live: false,
    href: null,
  },
];

const process = [
  { n: "01", title: "Talk it through", body: "A quick call or chat about what the business actually needs — no jargon, no sales deck." },
  { n: "02", title: "Build", body: "A working version, usually within days — real software you can click through, not a slide." },
  { n: "03", title: "Review together", body: "You see it live, tell us what's wrong, it gets fixed — no waiting for a monthly release." },
  { n: "04", title: "Launch & support", body: "It goes live, and we're still around after — this isn't a handoff-and-disappear job." },
];

export default function AeroSolutions() {
  return (
    <div className={`${unbounded.variable} ${plexSans.variable} ${plexMono.variable} ${styles.page}`}>
      <header className={styles.header}>
        <div className={styles.wrap}>
          <nav className={styles.nav}>
            <div className={styles.logo}>AERO<b>·</b>SOLUTIONS</div>
            <div className={styles.navlinks}>
              <a href="#work">Work</a>
              <a href="#services">Services</a>
              <a href="#process">Process</a>
              <MailCta className={styles.cta}>Start a project</MailCta>
            </div>
          </nav>
        </div>
      </header>

      <main className={styles.wrap}>
        <section className={styles.sectionFirst}>
          <div className={styles.dial} aria-hidden="true" />
          <span className={styles.eyebrow}>Software · Web Apps · Business Tools · Games</span>
          <h1>We build the software your business actually needs — not a template with your logo on it.</h1>
          <p className={styles.lede}>
            A small team of four, real code. Ordering systems with admin panels behind them, booking flows,
            internal tools, business sites, and the odd game — built around how your business actually runs,
            not how a page builder wants it to.
          </p>
          <div className={styles.heroCtas}>
            <a className={styles.btnPrimary} href="#work">See the work</a>
            <MailCta className={styles.btnGhost}>info@aeroparkdirect.co.uk</MailCta>
          </div>
        </section>

        <section id="services" className={styles.section}>
          <div className={styles.secHead}>
            <span className={styles.kicker}>Services</span>
            <h2>Four kinds of build. All of them real software, not a template.</h2>
          </div>
          <div className={styles.services}>
            {services.map((s) => (
              <div className={styles.svc} key={s.n}>
                <span className={styles.svcNum}>{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="work" className={styles.section}>
          <div className={styles.secHead}>
            <span className={styles.kicker}>Selected work</span>
            <h2>What&rsquo;s actually been built, not a mockup gallery.</h2>
          </div>
          <div className={styles.work}>
            {work.map((w) =>
              w.href ? (
                <a
                  className={styles.workItem}
                  href={w.href}
                  target="_blank"
                  rel="noopener"
                  key={w.title}
                >
                  <div className={styles.workLeft}>
                    <h3>{w.title}</h3>
                    <p>{w.body}</p>
                  </div>
                  <span className={`${styles.tag} ${w.live ? styles.tagLive : ""}`}>{w.tag}</span>
                  <span className={styles.arrow}>↗</span>
                </a>
              ) : (
                <div className={styles.workItem} style={{ cursor: "default" }} key={w.title}>
                  <div className={styles.workLeft}>
                    <h3>{w.title}</h3>
                    <p>{w.body}</p>
                  </div>
                  <span className={styles.tag}>{w.tag}</span>
                </div>
              )
            )}
          </div>
        </section>

        <section id="process" className={styles.section}>
          <div className={styles.secHead}>
            <span className={styles.kicker}>How it works</span>
            <h2>Four steps. A four-person team, no agency layers in between.</h2>
          </div>
          <div className={styles.process}>
            {process.map((p) => (
              <div className={styles.step} key={p.n}>
                <span className={styles.stepNum}>{p.n}</span>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.sectionLast}>
          <div className={styles.contact}>
            <div>
              <h2>Got something that needs building?</h2>
              <p>
                A four-person team based in the UK, happy to work with businesses anywhere. Tell us what
                you&rsquo;re trying to do — we&rsquo;ll tell you honestly whether it&rsquo;s a good fit.
              </p>
            </div>
            <MailCta className={`${styles.cta} ${styles.contactCta}`}>
              Email info@aeroparkdirect.co.uk
            </MailCta>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={`${styles.wrap} ${styles.fbar}`}>
          <div className={styles.fmono}>AERO&nbsp;SOLUTIONS</div>
          <p className={styles.legal}>
            Aero Solutions is a trading name of AeroPark Direct Ltd, company no. 17211973, registered in
            England &amp; Wales. <Link href="/">AeroPark Direct</Link> is our own airport parking booking service.
          </p>
        </div>
      </footer>
    </div>
  );
}
