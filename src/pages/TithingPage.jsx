import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useBillingInfo } from '../hooks/useBillingInfo'
import { useBasket } from '../hooks/useBasket'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import BillingInfoForm from '@/components/BillingInfoForm'
import PaymentModal from '@/components/PaymentModal'
import { MidnightShell, MidnightCard } from '@/components/shell/MidnightShell'
import { motion } from 'framer-motion'
import {
  Heart, DollarSign, User, Gift, Star, Sparkles, HandHeart,
} from "lucide-react"

const SUGGESTED = [50, 100, 200, 500, 1000]
const FREQS = ['weekly', 'monthly', 'yearly']

function PillButton({ active, onClick, children, accent = 'cyan' }) {
  const ring = active
    ? accent === 'amber'
      ? 'border-amber-400/70 text-amber-200 bg-gradient-to-br from-amber-500/25 to-amber-600/10 shadow-[0_0_24px_rgba(245,158,11,0.35)]'
      : 'border-cyan-400/70 text-cyan-100 bg-gradient-to-br from-cyan-500/25 to-cyan-700/10 shadow-[0_0_24px_rgba(34,211,238,0.35)]'
    : 'border-white/10 text-slate-300 bg-white/5 hover:bg-white/10 hover:border-white/20'
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={`px-4 py-3 rounded-2xl border font-semibold text-sm transition-all backdrop-blur ${ring}`}
    >
      {children}
    </motion.button>
  )
}

export default function TithingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { addToBasket } = useBasket()
  const [amount, setAmount] = useState("")
  const [frequency, setFrequency] = useState("monthly")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [showBillingForm, setShowBillingForm] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [pendingTithingData] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      addToBasket({
        orchardId: 'platform-fee', orchardTitle: 'Platform Fee Contribution',
        amount: parseFloat(amount), currency: 'USDC', pockets: [],
        type: 'platform_fee', frequency,
      })
      setMessage("Contribution added to basket! Please proceed to checkout.")
      setAmount("")
    } catch {
      setMessage("There was an error adding your contribution to basket.")
    } finally { setLoading(false) }
  }

  return (
    <MidnightShell
      icon={<HandHeart className="h-6 w-6" />}
      title="Platform Fee"
      subtitle="Support Sow2Grow operations · settled in USDC"
    >
      {/* Profile / intro banner */}
      <MidnightCard accent="amber">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-amber-400/40 shadow-[0_0_24px_rgba(245,158,11,0.25)] shrink-0">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-amber-500/30 to-cyan-500/20 flex items-center justify-center">
                <User className="h-7 w-7 text-amber-200" />
              </div>
            )}
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            Your contribution helps keep Sow2Grow running — covering platform operations, the community support fund, and referral payouts to the people who brought you here.
          </p>
        </div>
      </MidnightCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contribution Form */}
        <MidnightCard accent="cyan">
          <div className="flex items-center gap-2 mb-5">
            <HandHeart className="h-5 w-5 text-cyan-300" />
            <h2 className="text-lg font-bold text-white">Set Up Your Contribution</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="amount" className="text-slate-300">Contribution Amount (USDC)</Label>
              <Input
                id="amount" type="number" value={amount}
                onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount"
                className="mt-2 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-cyan-400/40 focus-visible:border-cyan-400/50"
              />
            </div>

            <div>
              <Label className="text-slate-300">Suggested Amounts</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {SUGGESTED.map((s) => (
                  <PillButton key={s} active={amount === String(s)} onClick={() => setAmount(String(s))}>
                    ${s}
                  </PillButton>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-slate-300">Frequency</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {FREQS.map((f) => (
                  <PillButton key={f} active={frequency === f} onClick={() => setFrequency(f)} accent="amber">
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </PillButton>
                ))}
              </div>
            </div>

            <motion.button
              type="submit" disabled={loading || !amount}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              className="w-full py-4 rounded-2xl font-bold text-base text-white border border-amber-400/50 bg-gradient-to-r from-amber-500/30 via-amber-500/20 to-cyan-500/20 hover:from-amber-500/40 hover:to-cyan-500/30 shadow-[0_0_30px_rgba(245,158,11,0.25)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-amber-300 border-t-transparent" />
                  Processing…
                </span>
              ) : (
                <span className="inline-flex items-center gap-2"><Heart className="h-4 w-4" /> Contribute</span>
              )}
            </motion.button>

            {message && (
              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-100 text-sm text-center">
                {message}
              </div>
            )}
          </form>
        </MidnightCard>

        {/* Side info */}
        <div className="space-y-6">
          <MidnightCard accent="violet">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-violet-300" />
              <h3 className="text-base font-bold text-white">What Your Contribution Funds</h3>
            </div>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex gap-2"><Heart className="h-4 w-4 mt-0.5 text-rose-400 shrink-0" /> Platform operations &mdash; hosting, payments, security</li>
              <li className="flex gap-2"><Gift className="h-4 w-4 mt-0.5 text-amber-300 shrink-0" /> The community support fund for member projects</li>
              <li className="flex gap-2"><Star className="h-4 w-4 mt-0.5 text-cyan-300 shrink-0" /> Referral payouts to people who invite new members</li>
              <li className="flex gap-2"><HandHeart className="h-4 w-4 mt-0.5 text-emerald-300 shrink-0" /> Tools and improvements that help the whole tribe grow</li>
            </ul>
          </MidnightCard>

          <MidnightCard accent="amber">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-amber-300" />
              <h3 className="text-base font-bold text-white">Your Contributions</h3>
            </div>
            <div className="space-y-3">
              {[['This Month','$0'],['This Year','$0'],['Total Given','$0']].map(([k,v]) => (
                <div key={k} className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">{k}</span>
                  <span className="px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-200 font-semibold">{v}</span>
                </div>
              ))}
            </div>
          </MidnightCard>

          <MidnightCard accent="rose">
            <blockquote className="text-sm text-slate-300 text-center leading-relaxed">
              Every contribution &mdash; large or small &mdash; helps keep the platform open, safe, and growing for the whole community. Thank you.
            </blockquote>
          </MidnightCard>
        </div>
      </div>

      {showBillingForm && (
        <BillingInfoForm isOpen={showBillingForm} onClose={() => setShowBillingForm(false)} onComplete={() => setShowBillingForm(false)} />
      )}
      {showPaymentModal && pendingTithingData && (
        <PaymentModal
          isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)}
          paymentDetails={{ orchardTitle: 'Platform Fee Contribution', amount: pendingTithingData.amount, currency: 'USDC', pockets: [], type: 'platform_fee' }}
          onPaymentComplete={() => setShowPaymentModal(false)}
        />
      )}
    </MidnightShell>
  )
}
