import { Icon } from '../components/icons';
import { SiteHeader } from '../components/layout/SiteHeader';
import type { IconName } from '../components/icons';
import { backendConfig } from '../services/api';

const STEPS: { title: string; text: string; icon: IconName }[] = [
  {
    title: 'Upload sources',
    text: 'Add PDFs, reading notes or pasted text. Everything stays inside the project you add it to.',
    icon: 'upload',
  },
  {
    title: 'Discover connections',
    text: 'MatrixIQ finds the ideas in each source and shows which ones appear in more than one document.',
    icon: 'link',
  },
  {
    title: 'Explore insights',
    text: 'Open the surprising links, the disagreements and the questions your sources leave unanswered.',
    icon: 'sparkles',
  },
];

const TECHNOLOGY: { title: string; text: string; icon: IconName }[] = [
  {
    title: 'Source analysis',
    text: 'Each source is reduced to the concepts worth comparing. Every concept stays tied to the document it came from.',
    icon: 'file',
  },
  {
    title: 'Cross-source comparison',
    text: 'Concepts are compared across the project and scored for relatedness, direction and confidence — not just shared keywords.',
    icon: 'layers',
  },
  {
    title: 'Evidence-first presentation',
    text: 'The graph, connections and discoveries all lead back to the ideas and supporting sources behind them.',
    icon: 'target',
  },
];

const FEATURES: { title: string; text: string; icon: IconName }[] = [
  {
    title: 'A map of your ideas',
    text: 'Move from the whole project to a single concept, with themes, labels and connection types kept in view.',
    icon: 'graph',
  },
  {
    title: 'Five ways into Insights',
    text: 'Unexpected connections, recurring patterns, contradictions, knowledge gaps and broader conclusions.',
    icon: 'sparkles',
  },
  {
    title: 'A project-level source library',
    text: 'Sources remain inside the project you add them to. Nothing is mixed into another project.',
    icon: 'library',
  },
];

const BENEFITS = [
  {
    title: 'Read across sources',
    text: 'See what several documents say together, without holding all of them in your head at once.',
  },
  {
    title: 'Find the missing piece',
    text: 'Notice the question your sources keep approaching but never quite answer.',
  },
  {
    title: 'Keep the evidence attached',
    text: 'Every discovery keeps its reasoning, its ideas and its sources within reach.',
  },
];

const AUDIENCES = [
  {
    title: 'Students & Academics',
    text: 'Connect concepts across subjects, deepen your understanding, and uncover new perspectives.',
  },
  {
    title: 'Researchers & Analysts',
    text: 'Explore relationships across studies, identify knowledge gaps, and discover new research directions.',
  },
  {
    title: 'Writers & Creators',
    text: 'Connect scattered ideas, uncover recurring themes, and find inspiration in unexpected relationships.',
  },
  {
    title: 'Businesses & Teams',
    text: 'Reveal patterns across documents, connect information, and develop a broader understanding of complex challenges.',
  },
];

export function AboutPage() {
  return (
    <div className="home about">
      <SiteHeader />

      <main className="home__main about__main">
        <section className="about__hero">
          <p className="eyebrow">About MatrixIQ</p>
          <h1 className="home__title">Built to show how ideas connect.</h1>
          <p className="home__lede">
            MatrixIQ is a reading workspace for people working across more than one source. It
            turns documents, notes and pasted text into a map of ideas — so the relationships,
            disagreements and open questions become visible.
          </p>
        </section>

        <section className="about__section" aria-labelledby="purpose-title">
          <div className="home__section-head">
            <div>
              <h2 id="purpose-title" className="home__h2">
                Why it exists
              </h2>
            </div>
          </div>
          <div className="about__purpose">
            <p className="about__statement">
              Collecting sources is easy. Knowing what they add up to is the hard part.
            </p>
            <div className="about__copy">
              <p>
                Most reading tools are built to store and search. They are good at finding a
                document again, but they leave the understanding to you: which ideas echo across
                sources, where two authors disagree, and what nobody has covered.
              </p>
              <p>
                MatrixIQ treats those relationships as the useful part of research. It keeps the
                sources, the ideas and the evidence together in one project, so a conclusion can
                always be traced back to what produced it.
              </p>
            </div>
          </div>
        </section>

        <section className="home__audience" aria-labelledby="audience-title">
          <div className="home__section-head">
            <div>
              <h2 id="audience-title" className="home__h2">
                Built for Curious Minds
              </h2>
              <p className="home__sub">
                For anyone who reads widely and wants the connections to stay with them.
              </p>
            </div>
          </div>
          <div className="audience-grid">
            {AUDIENCES.map((audience) => (
              <div key={audience.title} className="audience">
                <h3 className="audience__title">{audience.title}</h3>
                <p className="audience__text">{audience.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="about__section" aria-labelledby="how-title">
          <div className="home__section-head">
            <div>
              <h2 id="how-title" className="home__h2">
                How it works
              </h2>
              <p className="home__sub">Three steps, repeated for every project you start.</p>
            </div>
          </div>
          <ol className="steps">
            {STEPS.map((step, index) => (
              <li key={step.title} className="step">
                <span className="step__index mono">{String(index + 1).padStart(2, '0')}</span>
                <span className="step__icon">
                  <Icon name={step.icon} size={17} />
                </span>
                <h3 className="step__title">{step.title}</h3>
                <p className="step__text">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="about__section" aria-labelledby="technology-title">
          <div className="home__section-head">
            <div>
              <h2 id="technology-title" className="home__h2">
                Core technology
              </h2>
              <p className="home__sub">
                A small set of ideas, compared carefully, with the evidence kept intact.
              </p>
            </div>
          </div>
          <div className="about__grid">
            {TECHNOLOGY.map((item) => (
              <article key={item.title} className="about-card">
                <span className="about-card__icon">
                  <Icon name={item.icon} size={17} />
                </span>
                <h3 className="about-card__title">{item.title}</h3>
                <p className="about-card__text">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="about__section" aria-labelledby="features-title">
          <div className="home__section-head">
            <div>
              <h2 id="features-title" className="home__h2">
                Key features
              </h2>
              <p className="home__sub">Ways to move through the material, from overview to detail.</p>
            </div>
          </div>
          <div className="about__grid">
            {FEATURES.map((item) => (
              <article key={item.title} className="about-card">
                <span className="about-card__icon">
                  <Icon name={item.icon} size={17} />
                </span>
                <h3 className="about-card__title">{item.title}</h3>
                <p className="about-card__text">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="about__section" aria-labelledby="benefits-title">
          <div className="home__section-head">
            <div>
              <h2 id="benefits-title" className="home__h2">
                What you get
              </h2>
            </div>
          </div>
          <div className="about__benefits">
            {BENEFITS.map((benefit) => (
              <article key={benefit.title} className="about-benefit">
                <h3 className="about-benefit__title">{benefit.title}</h3>
                <p className="about-benefit__text">{benefit.text}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="home__foot">
          <Icon name="info" size={14} />
          <span>
            {backendConfig.configured
              ? 'Local projects and preferences stay in this browser. Uploaded sources are sent only to the temporary backend session; cross-document analysis runs on the server with a validated AI response.'
              : 'This build saves projects, sources and discoveries in this browser, along with your appearance preference. Nothing is sent to a server.'}
          </span>
        </footer>
      </main>
    </div>
  );
}
