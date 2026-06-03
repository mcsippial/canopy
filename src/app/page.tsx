import Link from 'next/link'
import { Shield, CheckCircle, Zap, Users, FileText, ChevronRight, Star } from 'lucide-react'
import { LogoWhite } from '@/components/ui/Logo'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="bg-[#1a1a2e] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <LogoWhite />
            <div className="flex items-center gap-6">
              <a href="#how-it-works" className="text-white/70 hover:text-white text-sm transition-colors">How it works</a>
              <a href="#pricing" className="text-white/70 hover:text-white text-sm transition-colors">Pricing</a>
              <Link href="/login" className="text-white/70 hover:text-white text-sm transition-colors">Log in</Link>
              <Link
                href="/signup"
                className="bg-[#5DCAA5] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#4ab894] transition-colors"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-[#1a1a2e] text-white py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#5DCAA5]/10 border border-[#5DCAA5]/30 rounded-full px-4 py-1.5 text-[#5DCAA5] text-sm font-medium mb-8">
            <Shield size={14} />
            Protection for the agentic era
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold leading-tight mb-6">
            Your AI agents will make mistakes.{' '}
            <span className="text-[#5DCAA5]">Canopy makes sure your users don&apos;t pay for them.</span>
          </h1>
          <p className="text-xl text-white/70 mb-10 max-w-2xl mx-auto">
            Liability coverage infrastructure for companies deploying autonomous AI agents. Includes real-time MCP monitoring, deterministic underwriting, and AI-assisted claims triage.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-[#5DCAA5] text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-[#4ab894] transition-colors inline-flex items-center justify-center gap-2"
            >
              Get covered <ChevronRight size={20} />
            </Link>
            <a
              href="#how-it-works"
              className="border border-white/20 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white/5 transition-colors"
            >
              See how it works
            </a>
          </div>

          {/* Trust badge preview */}
          <div className="mt-16 inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-6 py-4">
            <div className="bg-[#5DCAA5]/20 p-2 rounded-lg">
              <Shield size={24} className="text-[#5DCAA5]" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-white">Protected by Canopy</div>
              <div className="text-xs text-white/60">Up to $100,000 per incident</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-[#1a1a2e] mb-4">How Canopy works</h2>
            <p className="text-xl text-gray-600">From agent registration to claim resolution — automated and auditable.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: '01',
                icon: <Zap size={28} className="text-[#5DCAA5]" />,
                title: 'Register your agents',
                desc: 'Tell us what your agents do, which model they use, and how they are deployed.',
              },
              {
                step: '02',
                icon: <Shield size={28} className="text-[#5DCAA5]" />,
                title: 'Get underwritten',
                desc: 'Our deterministic rules engine evaluates each agent and issues coverage terms.',
              },
              {
                step: '03',
                icon: <Users size={28} className="text-[#5DCAA5]" />,
                title: 'Monitor in real time',
                desc: 'The Canopy MCP server logs every tool call against your policy parameters.',
              },
              {
                step: '04',
                icon: <FileText size={28} className="text-[#5DCAA5]" />,
                title: 'Claims handled with evidence',
                desc: 'When something goes wrong, the logs are already there. No relying on the customer to produce them.',
              },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-2xl p-8 border border-gray-200 relative">
                <div className="text-5xl font-bold text-gray-100 absolute top-6 right-6">{item.step}</div>
                <div className="bg-[#5DCAA5]/10 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                  {item.icon}
                </div>
                <h3 className="text-xl font-semibold text-[#1a1a2e] mb-3">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Real-time agent monitoring */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-[#1a1a2e] mb-4">Real-time agent monitoring</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Every tool call. Every action. Every anomaly. Logged before a claim is ever filed.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {[
              {
                title: 'Transparent proxy',
                desc: 'The Canopy MCP server sits between your agent and its tools. No code changes required — just one config line.',
              },
              {
                title: 'Policy enforcement',
                desc: 'Every action is checked against your registered parameters in real time. Violations are flagged, logged, and escalated automatically.',
              },
              {
                title: 'Evidence-first claims',
                desc: 'When a claim is filed, the evidence is already in the system. No relying on the customer to produce logs.',
              },
            ].map((col) => (
              <div key={col.title} className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
                <div className="bg-[#5DCAA5]/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                  <Shield size={20} className="text-[#5DCAA5]" />
                </div>
                <h3 className="text-lg font-semibold text-[#1a1a2e] mb-3">{col.title}</h3>
                <p className="text-gray-600 leading-relaxed">{col.desc}</p>
              </div>
            ))}
          </div>

          {/* Code block */}
          <div className="rounded-2xl overflow-hidden shadow-xl border border-[#0d1b2a]">
            <div className="bg-[#0d1b2a] px-5 py-3 flex items-center gap-2 border-b border-white/10">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-amber-500/70" />
              <div className="w-3 h-3 rounded-full bg-green-500/70" />
              <span className="ml-3 text-xs text-white/40 font-mono">claude_desktop_config.json</span>
            </div>
            <pre className="bg-[#0d1b2a] text-white/90 text-sm font-mono p-6 overflow-x-auto leading-relaxed">
              <code>{`{
  "mcpServers": {
    `}<span className="text-[#5DCAA5]">&quot;my-tools&quot;</span>{`: {
      `}<span className="text-[#5DCAA5]">&quot;command&quot;</span>{`: "canopy-mcp",
      `}<span className="text-[#5DCAA5]">&quot;env&quot;</span>{`: {
        `}<span className="text-[#5DCAA5]">&quot;CANOPY_AGENT_ID&quot;</span>{`: "your-agent-id",
        `}<span className="text-[#5DCAA5]">&quot;CANOPY_API_KEY&quot;</span>{`: "your-api-key",
        `}<span className="text-[#5DCAA5]">&quot;UPSTREAM_MCP_COMMAND&quot;</span>{`: "npx",
        `}<span className="text-[#5DCAA5]">&quot;UPSTREAM_MCP_ARGS&quot;</span>{`: "-y @modelcontextprotocol/server-filesystem"
      }
    }
  }
}`}
              </code>
            </pre>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-[#1a1a2e] mb-4">Why teams choose Canopy</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: 'AI-specific liability exposure is emerging faster than traditional coverage language.',
                author: 'Enterprise Risk Team',
              },
              {
                quote: 'Autonomous agents create new categories of operational and financial risk.',
                author: 'AI Governance Advisory',
              },
              {
                quote: 'Canopy helps teams turn agent risk into a managed, auditable workflow.',
                author: 'Platform Engineering Lead',
              },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} size={16} className="text-[#5DCAA5] fill-current" />
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed mb-4 italic">&ldquo;{item.quote}&rdquo;</p>
                <p className="text-sm font-medium text-gray-500">— {item.author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-[#1a1a2e] mb-4">Usage-based coverage pricing</h2>
            <p className="text-xl text-gray-600">Your premium scales with your deployment. Pay for what you use.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Starter */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-[#1a1a2e] mb-1">Starter</h3>
                <div className="text-4xl font-bold text-[#1a1a2e]">$299<span className="text-lg font-normal text-gray-500">/mo base</span></div>
                <p className="text-sm text-gray-500 mt-2">+ $0.10 per 1K tokens over limit</p>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  'Up to 2 AI agents',
                  '1M tokens/mo included',
                  '10,000 actions/mo included',
                  '$500K aggregate coverage',
                  '$50K per incident limit',
                  'Trust badge embed',
                  'Claims dashboard',
                  'Email support',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-gray-600 text-sm">
                    <CheckCircle size={16} className="text-[#5DCAA5] flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="block text-center border border-[#5DCAA5] text-[#5DCAA5] px-6 py-3 rounded-lg font-semibold hover:bg-[#5DCAA5]/5 transition-colors"
              >
                Get started
              </Link>
            </div>

            {/* Growth - Featured */}
            <div className="bg-[#1a1a2e] rounded-2xl p-8 border-2 border-[#5DCAA5] relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-[#5DCAA5] text-white text-xs font-bold px-4 py-1.5 rounded-full">MOST POPULAR</span>
              </div>
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-1">Growth</h3>
                <div className="text-4xl font-bold text-white">$899<span className="text-lg font-normal text-white/60">/mo base</span></div>
                <p className="text-sm text-white/50 mt-2">+ $0.08 per 1K tokens over limit</p>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  'Up to 5 AI agents',
                  '10M tokens/mo included',
                  '100,000 actions/mo included',
                  '$2M aggregate coverage',
                  '$250K per incident limit',
                  'Trust badge embed',
                  'Claims dashboard + AI triage',
                  'Usage analytics',
                  'Priority support',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-white/80 text-sm">
                    <CheckCircle size={16} className="text-[#5DCAA5] flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="block text-center bg-[#5DCAA5] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#4ab894] transition-colors"
              >
                Get started
              </Link>
            </div>

            {/* Enterprise */}
            <div className="bg-white rounded-2xl p-8 border border-gray-200">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-[#1a1a2e] mb-1">Enterprise</h3>
                <div className="text-4xl font-bold text-[#1a1a2e]">Custom</div>
                <p className="text-sm text-gray-500 mt-2">Negotiated based on usage profile</p>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  'Unlimited AI agents',
                  'Custom token/action limits',
                  '$5M+ aggregate coverage',
                  'Custom per-incident limits',
                  'Dedicated underwriter',
                  'Custom policy terms',
                  'SLA guarantee',
                  '24/7 support',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-gray-600 text-sm">
                    <CheckCircle size={16} className="text-[#5DCAA5] flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="mailto:enterprise@canopy.ai"
                className="block text-center border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Contact us
              </a>
            </div>
          </div>

          {/* Usage-based note */}
          <div className="mt-12 bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <h3 className="text-lg font-bold text-[#1a1a2e] mb-2">Why usage-based pricing?</h3>
            <p className="text-gray-600 max-w-2xl mx-auto text-sm leading-relaxed">
              AI agent liability scales with usage. A single bad decision looping for 6 hours is categorically different from a single bad response.
              Our pricing model reflects this reality — your coverage premium accounts for token consumption, action frequency, and deployment patterns.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#1a1a2e] py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to protect your users?</h2>
          <p className="text-xl text-white/70 mb-10">
            Join forward-thinking teams deploying AI responsibly with Canopy coverage.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-[#5DCAA5] text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-[#4ab894] transition-colors"
          >
            Get covered today <ChevronRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#111122] text-white/60 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <LogoWhite />
          <p className="text-sm">© 2024 Canopy. All rights reserved.</p>
          <div className="flex gap-6 text-sm">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="mailto:support@canopy.ai" className="hover:text-white transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
