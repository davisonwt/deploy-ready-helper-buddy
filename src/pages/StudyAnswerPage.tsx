import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Flame, Zap, Target } from 'lucide-react'
import { scripturalTopics } from '@/data/scripturalTopics'
import { motion } from 'framer-motion'

export default function StudyAnswerPage() {
  const { topicId, questionId } = useParams()
  const navigate = useNavigate()

  const topic = scripturalTopics.find(t => t.id === topicId)
  const question = topic?.questions.find(q => q.id === questionId)
  const qIndex = topic?.questions.findIndex(q => q.id === questionId) ?? -1

  if (!topic || !question) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1A0F0A' }}>
        <div className="text-center text-amber-300">
          <p className="text-xl mb-4">Study not found</p>
          <button onClick={() => navigate('/scriptural-study')} className="text-amber-500 underline">Return to Topics</button>
        </div>
      </div>
    )
  }

  // Next / prev navigation
  const prevQ = qIndex > 0 ? topic.questions[qIndex - 1] : null
  const nextQ = qIndex < topic.questions.length - 1 ? topic.questions[qIndex + 1] : null

  return (
    <div className="min-h-screen relative" style={{ background: 'linear-gradient(180deg, #2C1810 0%, #1A0F0A 50%, #0D0705 100%)' }}>
      {/* Hebrew watermark */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none select-none overflow-hidden">
        <div className="text-[180px] leading-none font-serif text-amber-200 whitespace-nowrap rotate-[-10deg] translate-y-[20%]">
          אבגדהוזחטיכלמנסעפצקרשת
        </div>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6 pb-32">
        {/* Back */}
        <button onClick={() => navigate('/scriptural-study')} className="flex items-center gap-2 text-amber-400/80 hover:text-amber-300 mb-6 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">All Topics</span>
        </button>

        {/* Topic badge */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-2">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-amber-600/70 bg-amber-900/20 px-3 py-1 rounded-full border border-amber-800/20">
            Topic {topic.number}: {topic.title}
          </span>
        </motion.div>

        {/* Question title */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl md:text-3xl font-bold text-amber-100 font-serif leading-tight mb-8"
        >
          {question.question}
        </motion.h1>

        <div className="w-16 h-[2px] bg-gradient-to-r from-amber-600 to-transparent mb-8" />

        {/* Answer body */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="prose prose-invert max-w-none mb-10"
        >
          <p className="text-amber-200/80 leading-relaxed text-[15px]">{question.answer}</p>
        </motion.div>

        {/* 🔥 Conventional View vs Scripture Table */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-10 rounded-xl border border-amber-700/30 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(120,60,20,0.12), rgba(40,20,8,0.2))' }}
        >
          <div className="flex items-center gap-2 px-5 py-3 border-b border-amber-800/20 bg-amber-900/15">
            <Flame className="w-5 h-5 text-orange-500" />
            <h3 className="text-sm font-bold text-amber-200 tracking-wide">CONVENTIONAL VIEW VS. SCRIPTURE</h3>
          </div>
          <div className="divide-y divide-amber-800/15">
            {question.conventionalView.map((row, i) => (
              <div key={i} className="grid grid-cols-2 gap-0">
                <div className="p-4 border-r border-amber-800/15">
                  <span className="block text-[10px] uppercase tracking-widest text-red-400/60 mb-1 font-semibold">Conventional</span>
                  <p className="text-amber-300/60 text-sm leading-snug italic">{row.conventional}</p>
                </div>
                <div className="p-4">
                  <span className="block text-[10px] uppercase tracking-widest text-emerald-400/60 mb-1 font-semibold">Scripture Says</span>
                  <p className="text-amber-100/90 text-sm leading-snug font-medium">{row.scripture}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* 💥 Mind-Blown Moment */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-10 rounded-xl border-2 border-amber-500/30 p-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(180,120,30,0.12), rgba(120,60,10,0.15))' }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🤯</span>
              <h3 className="text-sm font-bold text-amber-300 tracking-widest uppercase">Mind-Blown Moment</h3>
            </div>
            <p className="text-amber-100 text-[15px] leading-relaxed font-medium mb-2">
              {question.mindBlown.text}
            </p>
            <p className="text-amber-500/70 text-xs italic">— {question.mindBlown.reference}</p>
          </div>
        </motion.div>

        {/* 🎯 Drop The Mic */}
        {question.dropTheMic && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-10 rounded-xl border border-amber-700/30 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(80,40,15,0.2), rgba(30,15,5,0.25))' }}
          >
            <div className="flex items-center gap-2 px-5 py-3 border-b border-amber-800/20 bg-amber-900/10">
              <Target className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-amber-200 tracking-wide">DROP THE MIC 🎤</h3>
            </div>
            <div className="grid grid-cols-2 gap-0">
              <div className="p-5 border-r border-amber-800/15">
                <span className="block text-[10px] uppercase tracking-widest text-amber-500/50 mb-2 font-semibold">
                  {question.dropTheMic.leftLabel || 'Before'}
                </span>
                <p className="text-amber-200/70 text-sm leading-relaxed italic">"{question.dropTheMic.left}"</p>
              </div>
              <div className="p-5">
                <span className="block text-[10px] uppercase tracking-widest text-amber-400/70 mb-2 font-semibold">
                  {question.dropTheMic.rightLabel || 'After'}
                </span>
                <p className="text-amber-100 text-sm leading-relaxed font-bold">{question.dropTheMic.right}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-amber-800/20">
          {prevQ ? (
            <button
              onClick={() => navigate(`/scriptural-study/${topic.id}/${prevQ.id}`)}
              className="text-amber-400/70 hover:text-amber-300 text-sm flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Previous
            </button>
          ) : <div />}
          {nextQ ? (
            <button
              onClick={() => navigate(`/scriptural-study/${topic.id}/${nextQ.id}`)}
              className="text-amber-400/70 hover:text-amber-300 text-sm flex items-center gap-1 transition-colors"
            >
              Next <Zap className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => navigate('/scriptural-study')}
              className="text-amber-400/70 hover:text-amber-300 text-sm transition-colors"
            >
              Back to Topics
            </button>
          )}
        </div>

        {/* Cloud of witnesses */}
        <div className="mt-16 text-center opacity-15">
          <div className="text-5xl leading-none tracking-widest text-amber-800" style={{ fontFamily: 'serif' }}>
            ☁ ☁ ☁
          </div>
          <p className="text-amber-700/50 text-[10px] mt-1 italic tracking-widest uppercase">Cloud of Witnesses</p>
        </div>
      </div>
    </div>
  )
}
