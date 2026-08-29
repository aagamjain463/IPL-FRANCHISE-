import React from 'react';
import { ArrowRight, Brain, Coins, Gavel, Trophy, Users } from 'lucide-react';

export const IPLAuctionSimulatorPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#05070a] text-[#e2e8f0] font-sans">

      <header className="border-b border-[#1e293b] bg-[#0a0c12]">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-5 flex items-center justify-between">
          <a href="/" className="font-black tracking-tight text-white">
            IPL FRANCHISE <span className="text-[#D4AF37]">SIMULATOR</span>
          </a>

          <a
            href="/"
            className="px-5 py-2.5 rounded-full bg-[#D4AF37] text-black font-black text-xs uppercase tracking-widest"
          >
            Play Now
          </a>
        </div>
      </header>

      <main>

        {/* HERO */}
        <section className="max-w-6xl mx-auto px-4 md:px-8 py-16 md:py-24">
          <div className="max-w-4xl">

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-bold uppercase tracking-widest mb-6">
              <Gavel className="w-4 h-4" />
              Cricket Auction Simulation
            </div>

            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white">
              IPL Auction Simulator
            </h1>

            <p className="mt-6 text-lg md:text-xl text-[#94a3b8] leading-relaxed max-w-3xl">
              Run your own IPL-style player auction, manage your franchise
              budget, compete for players and build a squad designed to win
              across multiple seasons.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="/"
                className="px-7 py-4 rounded-full bg-[#D4AF37] text-black font-black text-sm uppercase tracking-widest flex items-center gap-2"
              >
                Start the Simulator
                <ArrowRight className="w-5 h-5" />
              </a>

              <a
                href="/ipl-auction-game"
                className="px-7 py-4 rounded-full border border-[#334155] text-white font-bold text-sm"
              >
                What Is the IPL Auction Game?
              </a>
            </div>

          </div>
        </section>

        {/* WHAT IS IT */}
        <section className="border-y border-[#1e293b] bg-[#0a0c12]">
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-14">

            <h2 className="text-2xl md:text-3xl font-black text-white">
              What Is an IPL Auction Simulator?
            </h2>

            <p className="mt-4 text-[#94a3b8] leading-relaxed max-w-4xl">
              An IPL auction simulator recreates the strategic decisions of a
              cricket franchise auction. Instead of simply selecting players,
              you must decide how much to spend, which roles to prioritize and
              when to stop bidding.
            </p>

            <p className="mt-4 text-[#94a3b8] leading-relaxed max-w-4xl">
              This simulator combines player bidding, purse management,
              franchise planning and squad building into a browser-based
              cricket management experience.
            </p>

          </div>
        </section>

        {/* FEATURES */}
        <section className="max-w-6xl mx-auto px-4 md:px-8 py-14">

          <h2 className="text-2xl md:text-3xl font-black text-white">
            Key IPL Auction Simulator Features
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">

            <div className="p-5 rounded-xl border border-[#1e293b] bg-[#0f172a]">
              <Gavel className="w-6 h-6 text-[#D4AF37] mb-3" />
              <h3 className="font-bold text-white">Player Bidding</h3>
              <p className="text-sm text-[#94a3b8] mt-2">
                Compete for players and decide when each bid is worth the
                investment.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-[#1e293b] bg-[#0f172a]">
              <Coins className="w-6 h-6 text-[#D4AF37] mb-3" />
              <h3 className="font-bold text-white">Purse Management</h3>
              <p className="text-sm text-[#94a3b8] mt-2">
                Balance expensive signings with enough budget for the rest of
                your squad.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-[#1e293b] bg-[#0f172a]">
              <Users className="w-6 h-6 text-[#D4AF37] mb-3" />
              <h3 className="font-bold text-white">Squad Building</h3>
              <p className="text-sm text-[#94a3b8] mt-2">
                Build a balanced team instead of spending your entire purse on
                a few star players.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-[#1e293b] bg-[#0f172a]">
              <Brain className="w-6 h-6 text-[#D4AF37] mb-3" />
              <h3 className="font-bold text-white">Strategic Decisions</h3>
              <p className="text-sm text-[#94a3b8] mt-2">
                Adapt your auction strategy as players become available and
                your remaining budget changes.
              </p>
            </div>

          </div>
        </section>

        {/* STRATEGY */}
        <section className="border-y border-[#1e293b] bg-[#0a0c12]">
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-14">

            <h2 className="text-2xl md:text-3xl font-black text-white">
              IPL Auction Strategy
            </h2>

            <div className="mt-8 grid md:grid-cols-3 gap-6">

              <div>
                <div className="text-[#D4AF37] text-3xl font-black">01</div>
                <h3 className="mt-2 font-bold text-white">
                  Protect Your Purse
                </h3>
                <p className="mt-2 text-sm text-[#94a3b8] leading-relaxed">
                  Spending aggressively early can leave major gaps later.
                  Keep enough budget for important roles.
                </p>
              </div>

              <div>
                <div className="text-[#D4AF37] text-3xl font-black">02</div>
                <h3 className="mt-2 font-bold text-white">
                  Build Role Balance
                </h3>
                <p className="mt-2 text-sm text-[#94a3b8] leading-relaxed">
                  A strong franchise needs more than star names. Think about
                  batting, bowling, all-rounders and squad depth.
                </p>
              </div>

              <div>
                <div className="text-[#D4AF37] text-3xl font-black">03</div>
                <h3 className="mt-2 font-bold text-white">
                  Know When to Walk Away
                </h3>
                <p className="mt-2 text-sm text-[#94a3b8] leading-relaxed">
                  Every player has a price. Overpaying for one player can
                  weaken your entire franchise.
                </p>
              </div>

            </div>

          </div>
        </section>

        {/* FRANCHISE MANAGEMENT */}
        <section className="max-w-6xl mx-auto px-4 md:px-8 py-14">

          <h2 className="text-2xl md:text-3xl font-black text-white">
            More Than an IPL Auction
          </h2>

          <p className="mt-4 text-[#94a3b8] leading-relaxed max-w-4xl">
            The franchise simulator goes beyond the auction itself. After
            building your squad, you can manage your franchise through a
            broader multi-season cricket simulation with squad management,
            Playing XI decisions, trades, challenges and other franchise
            systems.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">

            <a
              href="/"
              className="px-7 py-4 rounded-full bg-[#D4AF37] text-black font-black text-sm uppercase tracking-widest flex items-center gap-2"
            >
              Build My Franchise
              <Trophy className="w-5 h-5" />
            </a>

            <a
              href="/ipl-auction-game"
              className="px-7 py-4 rounded-full border border-[#334155] text-white font-bold text-sm"
            >
              Explore IPL Auction Game
            </a>

          </div>

        </section>

        {/* FAQ */}
        <section className="border-t border-[#1e293b] bg-[#0a0c12]">
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-14">

            <h2 className="text-2xl md:text-3xl font-black text-white">
              IPL Auction Simulator FAQ
            </h2>

            <div className="mt-8 space-y-6 max-w-4xl">

              <div>
                <h3 className="font-bold text-white">
                  What is an IPL auction simulator?
                </h3>
                <p className="mt-2 text-sm text-[#94a3b8] leading-relaxed">
                  It is a browser-based simulation where you manage a cricket
                  franchise, bid for players and build a squad within a limited
                  auction budget.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-white">
                  Can I play the IPL auction game in a browser?
                </h3>
                <p className="mt-2 text-sm text-[#94a3b8] leading-relaxed">
                  Yes. The game runs directly in the browser, so you can start
                  your franchise without installing a separate desktop game.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-white">
                  What makes a good IPL auction strategy?
                </h3>
                <p className="mt-2 text-sm text-[#94a3b8] leading-relaxed">
                  Good auction strategy combines budget discipline, squad
                  balance, role planning and knowing when a player is too
                  expensive to pursue.
                </p>
              </div>

            </div>

          </div>
        </section>

      </main>

      <footer className="border-t border-[#1e293b] py-8 text-center text-xs text-[#64748b]">
        IPL Franchise Simulator • Independent cricket management simulation
      </footer>

    </div>
  );
};
