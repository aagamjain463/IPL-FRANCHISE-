import React from 'react';
import { Play, Trophy, Users, Wallet, Shield, ArrowRight } from 'lucide-react';

export const SEOLandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#05070a] text-[#e2e8f0] font-sans">
      {/* Header */}
      <header className="border-b border-[#1e293b] bg-[#0a0c12]">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-5 flex items-center justify-between">
          <div className="font-black tracking-tight text-white">
            IPL FRANCHISE <span className="text-[#D4AF37]">SIMULATOR</span>
          </div>

          <a
            href="/"
            className="px-5 py-2.5 rounded-full bg-[#D4AF37] text-black font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-transform"
          >
            <Play className="w-4 h-4 fill-black" />
            Play Now
          </a>
        </div>
      </header>

      {/* Hero */}
      <main>
        <section className="max-w-6xl mx-auto px-4 md:px-8 py-16 md:py-24">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-bold uppercase tracking-widest mb-6">
              <Trophy className="w-4 h-4" />
              IPL Cricket Management Game
            </div>

            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white">
              IPL Auction Game – Build Your Dream IPL Franchise
            </h1>

            <p className="mt-6 text-lg md:text-xl text-[#94a3b8] leading-relaxed max-w-3xl">
              Experience an immersive IPL-style auction game where you take
              control of a cricket franchise, bid for players, manage your
              auction purse, build your squad and develop your team across
              multiple seasons.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="/"
                className="px-7 py-4 rounded-full bg-[#D4AF37] text-black font-black text-sm uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-transform"
              >
                Start IPL Auction
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-y border-[#1e293b] bg-[#0a0c12]">
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-14">
            <h2 className="text-2xl md:text-3xl font-black text-white">
              What Is the IPL Auction Game?
            </h2>

            <p className="mt-4 text-[#94a3b8] leading-relaxed max-w-4xl">
              This cricket auction simulator puts you in charge of an IPL-style
              franchise. Your decisions during the player auction determine
              how your squad develops and how much of your franchise budget
              remains for future moves.
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
              <div className="p-5 rounded-xl border border-[#1e293b] bg-[#0f172a]">
                <Trophy className="w-6 h-6 text-[#D4AF37] mb-3" />
                <h3 className="font-bold text-white">Player Auctions</h3>
                <p className="text-sm text-[#94a3b8] mt-2">
                  Make strategic decisions while bidding for players.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-[#1e293b] bg-[#0f172a]">
                <Wallet className="w-6 h-6 text-[#D4AF37] mb-3" />
                <h3 className="font-bold text-white">Budget Management</h3>
                <p className="text-sm text-[#94a3b8] mt-2">
                  Manage your franchise purse and make every bid count.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-[#1e293b] bg-[#0f172a]">
                <Users className="w-6 h-6 text-[#D4AF37] mb-3" />
                <h3 className="font-bold text-white">Squad Building</h3>
                <p className="text-sm text-[#94a3b8] mt-2">
                  Build a balanced squad and shape your franchise identity.
                </p>
              </div>

              <div className="p-5 rounded-xl border border-[#1e293b] bg-[#0f172a]">
                <Shield className="w-6 h-6 text-[#D4AF37] mb-3" />
                <h3 className="font-bold text-white">Franchise Management</h3>
                <p className="text-sm text-[#94a3b8] mt-2">
                  Manage your franchise and develop your team across seasons.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="max-w-6xl mx-auto px-4 md:px-8 py-14">
          <h2 className="text-2xl md:text-3xl font-black text-white">
            How the IPL Auction Simulator Works
          </h2>

          <div className="mt-8 grid md:grid-cols-3 gap-5">
            <div>
              <div className="text-[#D4AF37] font-black text-3xl">01</div>
              <h3 className="mt-2 font-bold text-white">Choose a Franchise</h3>
              <p className="mt-2 text-sm text-[#94a3b8] leading-relaxed">
                Select your franchise and take control as its manager.
              </p>
            </div>

            <div>
              <div className="text-[#D4AF37] font-black text-3xl">02</div>
              <h3 className="mt-2 font-bold text-white">Build Your Squad</h3>
              <p className="mt-2 text-sm text-[#94a3b8] leading-relaxed">
                Evaluate players, manage your purse and make strategic auction
                decisions.
              </p>
            </div>

            <div>
              <div className="text-[#D4AF37] font-black text-3xl">03</div>
              <h3 className="mt-2 font-bold text-white">Build Your Dynasty</h3>
              <p className="mt-2 text-sm text-[#94a3b8] leading-relaxed">
                Develop your franchise and make decisions across multiple
                seasons.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <a
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#D4AF37] text-black font-black text-sm uppercase tracking-widest hover:scale-105 transition-transform"
            >
              Play the IPL Auction Game
              <Play className="w-5 h-5 fill-black" />
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#1e293b] py-8 text-center text-xs text-[#64748b]">
        IPL Franchise Simulator • Independent IPL-style cricket simulation game
      </footer>
    </div>
  );
};
