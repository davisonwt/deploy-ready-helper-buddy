import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, BookOpen, Flame, ArrowLeft, Radio, Calendar, Clock, Lock, CreditCard, GraduationCap } from 'lucide-react'
import { scripturalTopics } from '@/data/scripturalTopics'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ScheduleSkillDropDialog } from '@/components/communication/ScheduleSkillDropDialog'
import { SkillDropHostApplicationForm } from '@/components/skilldrop/SkillDropHostApplicationForm'
import { useToast } from '@/hooks/use-toast'
import { useSabbathContext } from '@/contexts/SabbathContext'
import { useStudySubscription } from '@/hooks/useStudySubscription'
import { useSkillDropHostApplication } from '@/hooks/useSkillDropHostApplication'
import { SabbathGuard, SabbathRestMessage } from '@/components/SabbathGuard'

export default function ScripturalStudyQA() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { isSabbath } = useSabbathContext()
  const { isSubscribed, loading: subLoading } = useStudySubscription()
  const { application, isApprovedHost } = useSkillDropHostApplication()
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null)
  const [goLiveDialog, setGoLiveDialog] = useState<{ open: boolean; topicId?: string; topicTitle?: string }>({
    open: false,
  })
  const [hostAppDialog, setHostAppDialog] = useState(false)

  return (
    <div className="min-h-screen relative" style={{ background: 'linear-gradient(180deg, #2C1810 0%, #1A0F0A 50%, #0D0705 100%)' }}>
      {/* Hebrew watermark background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none overflow-hidden">
        <div className="text-[200px] leading-none font-serif text-amber-200 whitespace-nowrap rotate-[-15deg] translate-y-[-10%]">
          אבגדהוזחטיכלמנסעפצקרשת אבגדהוזחטיכלמנסעפצקרשת אבגדהוזחטיכלמנסעפצקרשת
        </div>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6 pb-32">
        {/* Back button */}
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-amber-400/80 hover:text-amber-300 mb-6 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back to Dashboard</span>
        </button>

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-3">
            <Flame className="w-8 h-8 text-amber-500" />
            <h1 className="text-3xl md:text-4xl font-bold text-amber-100 font-serif tracking-wide">
              Scriptural Study Q&A
            </h1>
            <Flame className="w-8 h-8 text-amber-500" />
          </div>
          <p className="text-amber-400/70 text-sm italic max-w-md mx-auto">
            A digital companion to "The Complete Study: Victory Already Won — Understanding the End Times Through Scripture"
          </p>
          <p className="text-amber-600/50 text-[10px] mt-2 uppercase tracking-widest">
            A GoSat Project — All proceeds support the ministry
          </p>
          <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-amber-600 to-transparent mx-auto mt-4" />
        </div>

        {/* Sabbath Banner */}
        {isSabbath && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <SabbathRestMessage className="border-emerald-700/30 from-emerald-900/20 to-stone-900/30" />
            <p className="text-emerald-400/70 text-xs text-center mt-2 italic">
              🕊️ All Sabbath studies are free — enjoy your rest
            </p>
          </motion.div>
        )}

        {/* Subscription Banner — GoSat session: 5 USDT goes to GoSat tithing wallet */}
        {!subLoading && !isSubscribed && !isSabbath && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-xl border border-amber-600/30 bg-gradient-to-br from-amber-900/30 to-stone-900/40 p-5 text-center"
          >
            <CreditCard className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <h3 className="text-amber-100 font-serif font-bold text-lg mb-1">
              Monthly Study Access
            </h3>
            <p className="text-amber-400/70 text-sm mb-3">
              Subscribe for <span className="font-bold text-amber-300">5 USDT/month</span> to attend live SkillDrop study sessions with chat, Q&A, and document sharing.
            </p>
            <p className="text-amber-500/50 text-xs mb-3">Cancel anytime • Sabbath studies always free</p>
            <SabbathGuard>
              <Button
                onClick={() => toast({
                  title: '💳 Subscription Coming Soon',
                  description: 'The 5 USDT/month subscription will be available shortly via NOWPayments & PayPal.',
                })}
                className="gap-2 rounded-xl font-semibold text-sm"
                style={{
                  background: 'linear-gradient(135deg, #B45309, #92400E)',
                  color: '#FDE68A',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                }}
              >
                <CreditCard className="w-4 h-4" />
                Subscribe — 5 USDT/month
              </Button>
            </SabbathGuard>
          </motion.div>
        )}

        {/* Become a SkillDrop Host CTA */}
        {!isSabbath && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8 rounded-xl border border-indigo-600/30 bg-gradient-to-br from-indigo-900/20 to-stone-900/30 p-5"
          >
            <div className="flex items-start gap-4">
              <GraduationCap className="w-10 h-10 text-indigo-400 shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-indigo-100 font-serif font-bold text-lg mb-1">
                  Host Your Own SkillDrop Sessions
                </h3>
                <p className="text-indigo-300/70 text-sm mb-1">
                  Sowers, Growers, Drivers, Whisperers, and Service Providers can apply to host their own SkillDrop sessions.
                </p>
                <p className="text-indigo-400/50 text-xs mb-3">
                  Earn <span className="font-bold text-indigo-300">85%</span> of each subscriber's 5 USDT/month • 10% tithing • 5% admin
                </p>
                <SabbathGuard>
                  {isApprovedHost ? (
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 text-sm font-semibold">✓ Approved Host</span>
                      <Button
                        size="sm"
                        onClick={() => setGoLiveDialog({ open: true })}
                        className="gap-1 text-xs"
                        style={{
                          background: 'linear-gradient(135deg, #4338CA, #3730A3)',
                          color: '#C7D2FE',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                        }}
                      >
                        <Radio className="w-3 h-3" />
                        Schedule Session
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setHostAppDialog(true)}
                      size="sm"
                      className="gap-2 text-sm"
                      style={{
                        background: 'linear-gradient(135deg, #4338CA, #3730A3)',
                        color: '#C7D2FE',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                      }}
                    >
                      <GraduationCap className="w-4 h-4" />
                      {application?.status === 'pending' ? 'Application Pending...' : 'Apply to Become a Host'}
                    </Button>
                  )}
                </SabbathGuard>
              </div>
            </div>
          </motion.div>
        )}

        {/* Scriptural Topics Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="rounded-2xl border-2 border-amber-700/40 bg-gradient-to-br from-amber-900/30 via-stone-900/50 to-amber-950/30 p-6 text-center backdrop-blur-sm">
            <BookOpen className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-amber-100 font-serif tracking-wider mb-1">
              SCRIPTURAL TOPICS
            </h2>
            <p className="text-amber-500/60 text-xs">10 Topics · 40 Studies</p>
          </div>
        </motion.div>

        {/* Topic Accordion */}
        <div className="space-y-3">
          {scripturalTopics.map((topic, idx) => {
            const isExpanded = expandedTopic === topic.id
            return (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-xl border border-amber-800/30 overflow-hidden"
                style={{ background: 'linear-gradient(135deg, rgba(120,80,30,0.15), rgba(60,30,10,0.25))' }}
              >
                {/* Topic Header */}
                <button
                  onClick={() => setExpandedTopic(isExpanded ? null : topic.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-amber-800/10 transition-colors"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-700/30 text-amber-400 text-sm font-bold shrink-0">
                    {topic.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-amber-100 font-semibold text-sm font-serif tracking-wide">
                      {topic.icon} {topic.title}
                    </span>
                    <span className="block text-amber-600/50 text-xs mt-0.5">{topic.questions.length} questions</span>
                  </div>
                  {isExpanded
                    ? <ChevronDown className="w-5 h-5 text-amber-500 shrink-0" />
                    : <ChevronRight className="w-5 h-5 text-amber-600/50 shrink-0" />
                  }
                </button>

                {/* Questions List + Go Live */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-amber-800/20 px-4 pb-3">
                        {topic.questions.map((q) => (
                          <button
                            key={q.id}
                            onClick={() => toast({
                              title: '📖 Live SkillDrop Coming Soon',
                              description: `A live SkillDrop session will be announced for this study. Stay tuned for the date & time where we'll explore this together with live chat, Q&A, and more!`,
                            })}
                            className="w-full flex items-start gap-3 py-3 text-left hover:bg-amber-700/10 rounded-lg px-2 transition-colors group"
                          >
                            <Lock className="w-4 h-4 text-amber-600/40 mt-0.5 shrink-0 group-hover:text-amber-400 transition-colors" />
                            <span className="text-amber-200/80 text-sm leading-snug group-hover:text-amber-100 transition-colors">
                              {q.question}
                            </span>
                          </button>
                        ))}

                        {/* Go Live Button — hidden on Sabbath, only for approved hosts or GoSat */}
                        <SabbathGuard>
                          <div className="mt-2 pt-3 border-t border-amber-800/20">
                            <Button
                              onClick={() => {
                                if (!isApprovedHost) {
                                  toast({
                                    title: '🎓 Host Application Required',
                                    description: 'You need to apply and be approved as a SkillDrop host before scheduling sessions.',
                                  })
                                  setHostAppDialog(true)
                                  return
                                }
                                setGoLiveDialog({ open: true, topicId: topic.id, topicTitle: topic.title })
                              }}
                              className="w-full gap-2 rounded-xl font-semibold text-sm"
                              style={{
                                background: 'linear-gradient(135deg, #B45309, #92400E)',
                                color: '#FDE68A',
                                border: '1px solid rgba(251, 191, 36, 0.3)',
                              }}
                            >
                              <Radio className="w-4 h-4" />
                              Go Live — Schedule SkillDrop Session
                              <Calendar className="w-4 h-4 ml-auto opacity-60" />
                            </Button>
                            <p className="text-amber-700/50 text-[10px] text-center mt-1.5 flex items-center justify-center gap-1">
                              <Clock className="w-3 h-3" />
                              {isApprovedHost ? 'Set a date & time for a live study session' : 'Requires approved host application'}
                            </p>
                          </div>
                        </SabbathGuard>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>

        {/* Cloud of witnesses silhouette */}
        <div className="mt-16 text-center opacity-20">
          <div className="text-6xl leading-none tracking-widest text-amber-800" style={{ fontFamily: 'serif' }}>
            ☁ ☁ ☁
          </div>
          <p className="text-amber-700/60 text-[10px] mt-1 italic tracking-widest uppercase">Cloud of Witnesses</p>
        </div>
      </div>

      {/* Schedule SkillDrop Dialog */}
      <ScheduleSkillDropDialog
        open={goLiveDialog.open}
        onOpenChange={(open) => setGoLiveDialog(prev => ({ ...prev, open }))}
        onSuccess={() => setGoLiveDialog({ open: false })}
        topicId={goLiveDialog.topicId}
        topicTitle={goLiveDialog.topicTitle}
      />

      {/* Host Application Dialog */}
      <SkillDropHostApplicationForm
        open={hostAppDialog}
        onOpenChange={setHostAppDialog}
      />
    </div>
  )
}
