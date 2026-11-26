import Image from 'next/image'
import Link from 'next/link'
import { preload } from 'react-dom'
import { BrandLogo } from '@/components/layout/BrandLogo'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { Button } from '@/components/ui/Button'
import { LearningTour } from '@/components/home/LearningTour'
import { HomepageMotion } from '@/components/home/HomepageMotion'
import { BackToTop } from '@/components/motion/BackToTop'
import { defaultHomeCopy } from '@/lib/home/hero'
import { DEFAULT_HOME_CONTENT, type EditorialFeatureContent, type PathwaysContent } from '@/lib/home/sections'
import './homepage.css'

const facebook = 'https://www.facebook.com/hebaelsherifAcademy'
const navigation = [
  ['about', 'عن هبة'], ['tracks', 'المسارات'], ['courses', 'الدورات'], ['books', 'الكتب'], ['sessions', 'الجلسات'],
] as const

const photos = {
  hero: [1672, 941], pain: [1600, 900], audience: [1120, 630], tracks: [1600, 900],
  steps: [1120, 630], about: [896, 1120], courses: [1600, 900], books: [1120, 840],
  sessions: [1600, 900], cta: [1600, 686],
} as const

function HomePhoto({ name, alt = '', className = '' }: {
  name: keyof typeof photos
  alt?: string
  className?: string
}) {
  const [width, height] = photos[name]
  const file = `/images/home/${name}`
  return (
    <picture className={`home-photo ${className}`}>
      <source type="image/webp" media="(max-width: 767px)" srcSet={`${file}-small.webp`} />
      <source type="image/webp" srcSet={`${file}.webp`} />
      <Image src={`${file}.jpg`} width={width} height={height} alt={alt} unoptimized
        loading={name === 'hero' ? 'eager' : 'lazy'} fetchPriority={name === 'hero' ? 'high' : undefined} />
    </picture>
  )
}

function Arrow() {
  return <span className="home-arrow" aria-hidden>←</span>
}

function Heading({ children, id }: { children: React.ReactNode; id: string }) {
  return <h2 id={id} className="home-title home-mask"><span>{children}</span></h2>
}

function HomeHeader() {
  return (
    <header className="home-header">
      <div className="home-progress" aria-hidden><span /></div>
      <div className="home-wrap home-header-inner">
        <div className="home-brand">
          <BrandLogo className="!size-11 !rounded-xl sm:!size-13" />
          <span>هبة الشريف</span>
        </div>
        <nav className="home-desktop-nav" aria-label="أقسام الرئيسية">
          {navigation.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
        </nav>
        <div className="home-header-actions">
          <Link href="/search" className="home-search" prefetch={false}>البحث</Link>
          <ThemeToggle compact />
          <Button href="/booking" size="sm" className="home-header-booking">احجزي جلستك</Button>
          <details className="home-menu">
            <summary>القائمة</summary>
            <nav aria-label="أقسام الرئيسية على الهاتف">
              {navigation.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
              <Link href="/search" prefetch={false}>البحث في الموقع</Link>
              <Link href="/auth/login" prefetch={false}>دخول الحساب</Link>
              <Link href="/booking" prefetch={false}>احجزي جلستك <Arrow /></Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  )
}

// TODO: replace the draft pain copy with Heba's approved wording.
const concerns = [
  'أشعر أنني أتحرّك كثيرًا، لكنني لا أعرف إلى أين.',
  'أحاول أن أوازن بين ما أريده وما ينتظره الآخرون مني.',
  'أعرف أنني بحاجة إلى تغيير، لكن البداية تبدو بعيدة.',
]

// TODO: replace the draft audience list with Heba's approved wording.
const audiences = ['مفترق طرق في الحياة', 'بناء الثقة بالنفس', 'وضوح المسار المهني', 'توازن العلاقات', 'تنمية الذات']

// TODO: replace the draft steps with the approved description of Heba's process.
const steps = [
  ['جلسة تعارف', 'نتعرّف على ما يشغلكِ وما تأملين أن يتغيّر.'],
  ['تحديد الهدف', 'نختار هدفًا واضحًا يناسب احتياجكِ الآن.'],
  ['الخطة والتطبيق', 'نرتّب خطوة عملية تبدئين بها على إيقاعكِ.'],
  ['المتابعة والتثبيت', 'نراجع ما جرّبتِه ونحدّد ما تريدين الاستمرار فيه.'],
]

const courseLinks = [
  { title: 'خطوة هادئة نحو يوم أوضح', text: 'دورة نصية قصيرة لترتيب أفكاركِ واختيار خطوة صغيرة تناسب يومكِ.', href: '/courses/a-quiet-first-step', label: 'تفاصيل الدورة' },
  { title: 'برامج تمشي معك خطوة بخطوة', text: 'قارني موضوعات الدورات ومناهجها وطريقة تقديمها، واختاري ما يناسب وقتكِ وهدفكِ.', href: '/courses', label: 'تصفّحي الدورات' },
  { title: 'فكرة تفهمينها، وخطوة تختارينها', text: 'جرّبي نموذجًا قصيرًا: افهمي فكرة، طبّقيها على موقف، ثم راجعي الخطوة التي اخترتِها.', href: '#practice', label: 'جرّبي التطبيق' },
]

export default function HomePage() {
  preload('/fonts/amiri-arabic-700.woff2', { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' })
  preload('/fonts/ibm-plex-sans-arabic-400.woff2', { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' })
  const copy = defaultHomeCopy
  const tracks = (DEFAULT_HOME_CONTENT.pathways as PathwaysContent).items

  return (
    <div className="site-home bg-ivory text-ink">
      <HomepageMotion />
      <a href="#main-content" className="home-skip">تخطّي إلى المحتوى</a>
      <HomeHeader />
      <main id="main-content" tabIndex={-1}>
        <section className="home-hero home-dark home-cover" aria-labelledby="hero-title">
          <HomePhoto name="hero" className="home-backdrop home-hero-photo" />
          <div className="home-wrap home-hero-inner">
            <div className="home-hero-copy">
              <p className="home-kicker">كوتش حياة ومدرّبة · كاتبة وروائية</p>
              <h1 id="hero-title" className="home-mask">
                <span className="home-hero-line"><span>{copy.headlineStart} {copy.headlineAccent}</span></span>{' '}
                <span className="home-hero-line"><span>{copy.headlineMiddle} {copy.headlinePath}</span></span>{' '}
                <span className="home-hero-line"><span>{copy.headlineEnd} <em>{copy.headlineAwareness}</em></span></span>
              </h1>
              <p className="home-lead">{copy.lead}</p>
              <div className="home-actions">
                <Button href="/booking" className="home-primary">{copy.secondaryCta} <Arrow /></Button>
                <Button href="#tracks" variant="inverse">{copy.primaryCta} <Arrow /></Button>
              </div>
              <a href="#credentials" className="home-hero-credential" dir="ltr">ICF · ACC</a>
            </div>
            <a href="#credentials" className="home-scroll-cue" aria-label="انتقلي إلى الاعتمادات"><span aria-hidden>↓</span></a>
          </div>
        </section>

        <section id="credentials" className="home-credentials" aria-labelledby="credentials-title">
          <div className="home-wrap">
            {/* TODO: replace the empty slots only with approved credentials and supplied logos. */}
            <Heading id="credentials-title">اعتمادات وشراكات</Heading>
            <ul className="home-credential-grid" data-reveal-group>
              <li data-home-reveal className="home-credential-active"><strong dir="ltr">ICF · ACC</strong><small dir="ltr">Associate Certified Coach</small></li>
              {[1, 2, 3].map(slot => <li key={slot} data-home-reveal>مكان الاعتماد التالي</li>)}
            </ul>
          </div>
        </section>

        <section className="home-cover home-dark home-section home-pain" aria-labelledby="pain-title">
          <HomePhoto name="pain" className="home-backdrop" />
          <div className="home-wrap home-centered">
            {/* TODO: replace the draft pain heading and closing line with the final wording. */}
            <div data-home-reveal><Heading id="pain-title">هل تشعرين بهذا؟</Heading></div>
            <ul className="home-pain-cards" data-reveal-group>
              {concerns.map(concern => <li className="home-glass" key={concern} data-home-reveal>{concern}</li>)}
            </ul>
            <p className="home-closing" data-home-reveal>وهنا يبدأ الخيط في الاستقامة</p>
          </div>
        </section>

        <section className="home-section home-wrap home-split home-audience" aria-labelledby="audience-title">
          <HomePhoto name="audience" alt="مقعدان متقابلان في غرفة هادئة مضاءة من النافذة" className="home-arch" />
          <div data-home-reveal>
            {/* TODO: replace this draft heading and lead with approved copy. */}
            <Heading id="audience-title">لمن هذه الرحلة؟</Heading>
            <p className="home-lead">لكل امرأة تبحث عن مساحة تفهم فيها ما يشغلها وتختار الخطوة التي تناسبها.</p>
            <ul className="home-chips">{audiences.map(audience => <li key={audience}>{audience}</li>)}</ul>
          </div>
        </section>

        <section id="tracks" className="home-section home-tracks" aria-labelledby="tracks-title">
          <div className="home-wrap">
            <div className="home-centered" data-home-reveal>
              <Heading id="tracks-title">مسارات تتقدّمين فيها بطريقتك</Heading>
              <p className="home-lead">جلسة تخصّك، ومعرفة ترافقك، ومساحة تتسع لإيقاعك.</p>
            </div>
            <div className="home-track-panels">
              <HomePhoto name="tracks" className="home-backdrop" />
              {tracks.slice(0, 2).map(track => (
                <article className="home-track home-dark" key={track.href}>
                  <h3>{track.title}</h3>
                  <p className="home-track-description">{track.text}</p>
                  <Button href={track.href} variant="inverse">{track.cta}<Arrow /></Button>
                </article>
              ))}
            </div>
            <Link href="#books" className="home-text-link">الكتب والقراءات <Arrow /></Link>
          </div>
        </section>

        <section className="home-section home-wrap home-steps" aria-labelledby="steps-title">
          <HomePhoto name="steps" alt="درجات حجرية يصعد عبرها ضوء الشمس" className="home-sticky-photo" />
          <div>
            {/* TODO: replace this heading if Heba approves a different description of the steps. */}
            <div data-home-reveal><Heading id="steps-title">كيف نعمل معًا</Heading></div>
            <ol className="home-timeline">
              {steps.map(([title, description]) => (
                <li key={title} data-home-step>
                  <h3>{title}</h3><p>{description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="about" className="home-section home-about" aria-labelledby="about-title">
          <div className="home-wrap home-split">
            <HomePhoto name="about" alt="مكتب للكتابة تطلّ نافذته على المدينة" className="home-outlined-photo" />
            <div data-home-reveal>
              <p className="home-kicker">عن هبة</p>
              <Heading id="about-title">التغيير الحقيقي يبدأ بالفهم</Heading>
              <p className="home-lead">أنا هبة الشريف، لايف كوتش ومدرّبة وعي بالذات وكاتبة. أساندكِ في رحلة فهم نفسكِ، واستعادة الوضوح، واختيار خطوة تناسب حياتكِ؛ من خلال جلسات فردية وبرامج تعلّم وأدوات عملية.</p>
              <ul className="home-chips"><li><bdi>ICF · ACC</bdi> معتمدة دوليًا</li><li>كاتبة وروائية</li></ul>
              <div className="home-actions">
                <Button href="/about" variant="secondary">تعرّفي على هبة <Arrow /></Button>
                <a className="home-text-link" href={facebook}>صفحة هبة على فيسبوك <Arrow /></a>
              </div>
            </div>
          </div>
        </section>

        <section id="courses" className="home-section home-cover home-dark home-courses" aria-labelledby="courses-title">
          <HomePhoto name="courses" className="home-backdrop" />
          <div className="home-wrap">
            <div data-home-reveal><Heading id="courses-title">الدورات</Heading></div>
            <div className="home-course-grid" data-reveal-group>
              {courseLinks.map(course => (
                <div key={course.href} data-home-reveal>
                  <article className="home-course-card" data-home-tilt>
                    <h3>{course.title}</h3>
                    <p>{course.text}</p>
                    <Link href={course.href} prefetch={false}>{course.label}<Arrow /></Link>
                  </article>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="practice" className="home-wrap home-practice" aria-label="التجربة العملية">
          <LearningTour content={DEFAULT_HOME_CONTENT.editorial_feature as EditorialFeatureContent} />
        </section>

        <section id="books" className="home-section home-wrap home-split home-books" aria-labelledby="books-title">
          <HomePhoto name="books" className="home-book-photo" alt="ثلاثة كتب بأغلفة بترولية وعنابية وكريمية، موضوعة فوق بعضها" />
          <div data-home-reveal>
            <p className="home-kicker">الكتب</p>
            <Heading id="books-title">اقرئي ما يفتح لكِ بابًا جديدًا</Heading>
            <p className="home-lead">مساحات قصيرة للتأمل والفهم والتطبيق.</p>
            <Link className="home-text-link" href="/books/quiet-week-workbook" prefetch={false}>خطوة هادئة في أسبوعك <Arrow /></Link>
            <div className="home-actions"><Button href="/books">تصفّحي الكتب <Arrow /></Button></div>
          </div>
        </section>

        <section id="sessions" className="home-section home-cover home-dark home-sessions" aria-labelledby="sessions-title">
          <HomePhoto name="sessions" className="home-backdrop" />
          <div className="home-wrap">
            <div className="home-session-panel home-glass" data-home-reveal>
              <p className="home-kicker">الثقة والخصوصية</p>
              <Heading id="sessions-title">الجلسات الفردية</Heading>
              <p>لقاء فردي عن بُعد لمناقشة أهدافك وترتيب خطوات عملية تناسب احتياجك.</p>
              {/* TODO: replace these draft session points with the approved description. */}
              <ul>
                <li>خصوصية من بداية الحجز</li>
                <li>إنصات حقيقي وأسئلة تفتح الطريق</li>
                <li>خطوات عملية بعد كل جلسة</li>
              </ul>
              <div className="home-actions"><Button href="/booking" className="home-primary">احجزي جلستك <Arrow /></Button><Link href="/privacy" className="home-text-link">سياسة الخصوصية</Link></div>
            </div>
          </div>
        </section>

        <section className="home-section home-wrap home-testimonials home-centered" aria-labelledby="testimonials-title">
          <Heading id="testimonials-title">آراء المشاركات</Heading>
          {/* TODO: replace these slots only after obtaining permission for each testimonial. */}
          <ul className="home-testimonial-grid">
            {[1, 2, 3].map(slot => <li key={slot}>مكان تجربة مشاركة</li>)}
          </ul>
        </section>

        <section className="home-section home-cover home-dark home-final" aria-labelledby="cta-title">
          <HomePhoto name="cta" className="home-backdrop" />
          <div className="home-wrap home-centered" data-home-reveal>
            {/* TODO: replace the draft final CTA heading with approved text. */}
            <Heading id="cta-title">خطوتك الأولى تبدأ بكلمة</Heading>
            <p className="home-lead">ابدئي بالمسار الأقرب لكِ اليوم. خطوة واحدة تكفي للبداية.</p>
            <div className="home-actions"><Button href="/booking" className="home-primary">احجزي جلستك <Arrow /></Button></div>
          </div>
        </section>
      </main>
      <BackToTop />
      <PublicFooter homepageFacebook={facebook} />
    </div>
  )
}
