'use client';

import { useEffect, useRef } from 'react';
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
import ArchitectureFlow from './architecture-flow';
import './demo.css';

// --- Data ---

const FEATURES = [
  {
    icon: BarChart3,
    title: 'Real-time Market Data',
    desc: '업비트, 바이낸스, 바이비트 실시간 시세를 WebSocket으로 수신',
  },
  {
    icon: BrainCircuit,
    title: 'Strategy Automation',
    desc: 'RSI, MACD, 볼린저밴드 등 지표 기반 자동매매 전략 실행',
  },
  {
    icon: Workflow,
    title: 'Visual Flow Builder',
    desc: '노드 기반 비주얼 에디터로 트레이딩 로직을 드래그앤드롭으로 구성',
  },
  {
    icon: LineChart,
    title: 'Backtesting',
    desc: '과거 데이터 기반 전략 시뮬레이션과 성과 분석',
  },
  {
    icon: Globe,
    title: 'Multi-Exchange',
    desc: 'Upbit, Binance, Bybit 멀티 거래소 통합 지원',
  },
  {
    icon: PieChart,
    title: 'Portfolio Management',
    desc: '보유 자산, 실현/미실현 손익, 일별 수익률 추적',
  },
];

// Tech logos — devicons CDN with wordmark variants
const TECH_LOGOS: { name: string; src: string; invert?: boolean }[] = [
  {
    name: 'React',
    src: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original-wordmark.svg',
  },
  {
    name: 'Next.js',
    src: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nextjs/nextjs-original-wordmark.svg',
    invert: true,
  },
  {
    name: 'TypeScript',
    src: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/typescript/typescript-plain.svg',
  },
  {
    name: 'NestJS',
    src: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nestjs/nestjs-original-wordmark.svg',
  },
  {
    name: 'TailwindCSS',
    src: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/tailwindcss/tailwindcss-original.svg',
  },
  {
    name: 'Prisma',
    src: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/prisma/prisma-original-wordmark.svg',
    invert: true,
  },
  {
    name: 'PostgreSQL',
    src: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/postgresql/postgresql-original-wordmark.svg',
  },
  {
    name: 'Docker',
    src: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/docker/docker-original-wordmark.svg',
  },
  {
    name: 'Kafka',
    src: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/apachekafka/apachekafka-original-wordmark.svg',
    invert: true,
  },
  {
    name: 'Redis',
    src: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/redis/redis-original-wordmark.svg',
  },
  {
    name: 'Nginx',
    src: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nginx/nginx-original.svg',
  },
  {
    name: 'Socket.IO',
    src: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/socketio/socketio-original-wordmark.svg',
    invert: true,
  },
];

// --- Hooks ---

function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add('visible');
          obs.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

// --- Components ---

function TechMarquee() {
  const items = [...TECH_LOGOS, ...TECH_LOGOS];
  return (
    <div className="demo-marquee">
      <div className="demo-marquee-track">
        {items.map((tech, i) => (
          <div
            key={`${tech.name}-${i}`}
            className="shrink-0 flex items-center justify-center"
            style={{ height: 80, padding: '0 28px' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={tech.src}
              alt={tech.name}
              style={{
                height: 64,
                width: 'auto',
                ...(tech.invert ? { filter: 'brightness(0) invert(1)' } : {}),
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Page ---

export default function DemoLandingPage() {
  const heroRef = useFadeIn();
  const overviewRef = useFadeIn();
  const archRef = useFadeIn();
  const techRef = useFadeIn();
  const featRef = useFadeIn();
  const ctaRef = useFadeIn();

  return (
    <div className="demo-landing min-h-screen">
      {/* Header */}
      <header
        className="sticky top-0 z-50 backdrop-blur-sm"
        style={{
          background: 'rgba(5,5,7,0.8)',
          borderBottom: '1px solid var(--demo-border)',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div
            className="flex items-center gap-2 font-semibold text-lg"
            style={{ color: 'var(--demo-text)' }}
          >
            <Coins size={22} style={{ color: 'var(--demo-accent)' }} />
            Coin Platform
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/fray-cloud/coin"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors"
              style={{ color: 'var(--demo-muted)', border: '1px solid var(--demo-border)' }}
            >
              <ExternalLink size={14} />
              GitHub
            </a>
            <Link
              href="/markets"
              className="demo-btn-glow inline-flex items-center gap-2 px-5 py-2 text-sm"
            >
              데모 체험하기
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden demo-dots py-28 sm:py-40 px-6">
        <div className="demo-glow-orb absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div
          ref={heroRef}
          className="demo-fade-section relative z-10 max-w-3xl mx-auto text-center"
        >
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight" style={{ color: '#fff' }}>
            Real-time Crypto
            <br />
            <span style={{ color: 'var(--demo-accent)' }}>Trading Platform</span>
          </h1>
          <p
            className="mt-6 text-lg sm:text-xl max-w-xl mx-auto"
            style={{ color: 'var(--demo-muted)' }}
          >
            멀티 거래소 암호화폐 자동매매 플랫폼.
            <br />
            실시간 시세, 전략 자동화, 비주얼 플로우 빌더.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/markets"
              className="demo-btn-glow inline-flex items-center gap-2 px-8 py-3 text-base"
            >
              데모 체험하기
              <ArrowRight size={18} />
            </Link>
            <a
              href="https://github.com/fray-cloud/coin"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-colors"
              style={{ border: '1px solid var(--demo-border)', color: 'var(--demo-text)' }}
            >
              <ExternalLink size={18} />
              GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Overview */}
      <section className="py-20 px-6" style={{ background: 'var(--demo-surface)' }}>
        <div ref={overviewRef} className="demo-fade-section max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: '#fff' }}>
            Overview
          </h2>
          <p className="mt-6 leading-relaxed" style={{ color: 'var(--demo-muted)' }}>
            Turborepo 기반 모노레포로 구성된 풀스택 암호화폐 트레이딩 플랫폼입니다. NestJS API
            서버와 Next.js 프론트엔드, Kafka 기반 워커 서비스로 이루어진 MSA 아키텍처로, 실시간 시세
            수신부터 전략 실행, 주문 처리까지 자동화된 파이프라인을 제공합니다.
          </p>
        </div>
      </section>

      {/* Architecture Flow */}
      <section className="py-20 px-6 demo-dots">
        <div ref={archRef} className="demo-fade-section max-w-4xl mx-auto">
          <h2
            className="text-2xl sm:text-3xl font-bold tracking-tight text-center mb-16"
            style={{ color: '#fff' }}
          >
            Architecture
          </h2>
          <ArchitectureFlow />
        </div>
      </section>

      {/* Tech Stack Marquee */}
      <section className="py-20 px-6" style={{ background: 'var(--demo-surface)' }}>
        <div ref={techRef} className="demo-fade-section">
          <h2
            className="text-2xl sm:text-3xl font-bold tracking-tight text-center mb-12"
            style={{ color: '#fff' }}
          >
            Tech Stack
          </h2>
          <TechMarquee />
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 demo-dots">
        <div ref={featRef} className="demo-fade-section max-w-4xl mx-auto">
          <h2
            className="text-2xl sm:text-3xl font-bold tracking-tight text-center mb-12"
            style={{ color: '#fff' }}
          >
            Features
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="demo-glow-card p-6">
                <Icon size={24} className="mb-3" style={{ color: 'var(--demo-accent)' }} />
                <h3 className="font-semibold mb-2" style={{ color: '#fff' }}>
                  {title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--demo-muted)' }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden py-24 px-6 demo-dots">
        <div className="demo-glow-orb absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div ref={ctaRef} className="demo-fade-section relative z-10 max-w-xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: '#fff' }}>
            직접 체험해보세요
          </h2>
          <p className="mt-4" style={{ color: 'var(--demo-muted)' }}>
            페이퍼 트레이딩 모드로 실제 시세 기반 데모를 제공합니다.
          </p>
          <Link
            href="/markets"
            className="demo-btn-glow mt-8 inline-flex items-center gap-2 px-8 py-3 text-base"
          >
            데모 체험하기
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--demo-border)' }} className="py-8 px-6">
        <div
          className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm"
          style={{ color: 'var(--demo-muted)' }}
        >
          <span>&copy; 2026 Woohyun Kim</span>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/fray-cloud/coin"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-white"
            >
              GitHub
            </a>
            <a
              href="https://portfolio-fray-cloud.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-white"
            >
              Portfolio
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
