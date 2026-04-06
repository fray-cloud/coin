import Link from 'next/link';
import {
  BarChart3,
  BrainCircuit,
  Workflow,
  LineChart,
  Globe,
  PieChart,
  Coins,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

const FEATURES = [
  {
    icon: BarChart3,
    title: 'Real-time Market Data',
    description: '업비트, 바이낸스, 바이비트 실시간 시세를 WebSocket으로 수신',
  },
  {
    icon: BrainCircuit,
    title: 'Strategy Automation',
    description: 'RSI, MACD, 볼린저밴드 등 지표 기반 자동매매 전략 실행',
  },
  {
    icon: Workflow,
    title: 'Visual Flow Builder',
    description: '노드 기반 비주얼 에디터로 트레이딩 로직을 드래그앤드롭으로 구성',
  },
  {
    icon: LineChart,
    title: 'Backtesting',
    description: '과거 데이터 기반 전략 시뮬레이션과 성과 분석',
  },
  {
    icon: Globe,
    title: 'Multi-Exchange',
    description: 'Upbit, Binance, Bybit 멀티 거래소 통합 지원',
  },
  {
    icon: PieChart,
    title: 'Portfolio Management',
    description: '보유 자산, 실현/미실현 손익, 일별 수익률 추적',
  },
];

const TECH_STACK = {
  Frontend: [
    'Next.js 15',
    'React 19',
    'TanStack Query',
    'Zustand',
    'TailwindCSS 4',
    'lightweight-charts',
  ],
  Backend: ['NestJS 11', 'Prisma 6', 'PostgreSQL 16', 'Passport JWT'],
  Infra: ['Docker', 'Kafka', 'Redis', 'Nginx', 'Turborepo', 'pnpm'],
};

const ARCH_LAYERS = [
  { label: 'Web (Next.js)', items: ['SSR/CSR', 'Socket.IO Client', 'TanStack Query'] },
  { label: 'API Server (NestJS)', items: ['REST API', 'WebSocket Gateway', 'CQRS/Saga'] },
  { label: 'Worker Service', items: ['Kafka Consumer', 'Strategy Engine', 'Exchange Adapters'] },
  { label: 'Infrastructure', items: ['PostgreSQL', 'Redis', 'Kafka', 'Nginx'] },
];

export default function DemoLandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <Coins size={22} />
            Coin Platform
          </div>
          <Link
            href="/markets"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            데모 체험하기
            <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="py-24 sm:py-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight">
            Real-time Crypto
            <br />
            Trading Platform
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto">
            멀티 거래소 암호화폐 자동매매 플랫폼.
            <br />
            실시간 시세, 전략 자동화, 비주얼 플로우 빌더.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/markets"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
            >
              데모 체험하기
              <ArrowRight size={18} />
            </Link>
            <a
              href="https://github.com/fray-cloud/coin"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              <ExternalLink size={18} />
              GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Overview */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Overview</h2>
          <p className="mt-6 text-muted-foreground leading-relaxed">
            Turborepo 기반 모노레포로 구성된 풀스택 암호화폐 트레이딩 플랫폼입니다. NestJS API
            서버와 Next.js 프론트엔드, Kafka 기반 워커 서비스로 이루어진 MSA 아키텍처로, 실시간 시세
            수신부터 전략 실행, 주문 처리까지 자동화된 파이프라인을 제공합니다. 페이퍼 트레이딩으로
            리스크 없이 전략을 검증할 수 있습니다.
          </p>
        </div>
      </section>

      {/* Architecture */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-center">
            Architecture
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {ARCH_LAYERS.map((layer, i) => (
              <div key={layer.label} className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {i + 1}
                  </span>
                  <h3 className="font-semibold">{layer.label}</h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {layer.items.map((item) => (
                    <span
                      key={item}
                      className="rounded-full px-2.5 py-0.5 text-xs bg-muted text-muted-foreground"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Web → API Server (REST/WebSocket) → Kafka → Worker → Exchange APIs
          </p>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-center">Tech Stack</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {Object.entries(TECH_STACK).map(([category, techs]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">
                  {category}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {techs.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-full px-3 py-1 text-xs font-medium border border-border bg-card"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-center">Features</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-xl border border-border bg-card p-6 hover:border-primary/30 transition-colors"
              >
                <Icon size={24} className="text-primary mb-3" />
                <h3 className="font-semibold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">직접 체험해보세요</h2>
          <p className="mt-4 text-muted-foreground">
            페이퍼 트레이딩 모드로 실제 시세 기반 데모를 제공합니다.
          </p>
          <Link
            href="/markets"
            className="mt-8 inline-flex items-center gap-2 px-8 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
          >
            데모 체험하기
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>&copy; 2026 Woohyun Kim</span>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/fray-cloud/coin"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://portfolio-fray-cloud.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Portfolio
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
