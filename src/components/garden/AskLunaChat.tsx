import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, Send, Loader2, Moon, Sprout } from 'lucide-react';
import { getMoonInfo, getDailyCompanionTip, getZodiacEmoji, getRootDayPhAdvice } from '@/utils/lunarEngine';
import { GARDEN_CROPS, MOON_ELEMENT_LABELS, getCropByKey, PH_BANNER } from '@/data/gardenCrops';
import { getRestDayInfo } from '@/utils/gardenRestDays';
import { calculateCreatorDate } from '@/utils/dashboardCalendar';

interface AskLunaChatProps {
  userCropKeys?: string[];
  userSoilPh?: number;
  city?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'luna';
  content: string;
}

// Luna's local AI brain — no API needed, pattern-matched responses
function getLunaResponse(question: string, context: {
  moonInfo: ReturnType<typeof getMoonInfo>;
  yhwhDate: ReturnType<typeof calculateCreatorDate>;
  restDay: ReturnType<typeof getRestDayInfo>;
  userCrops: string[];
  soilPh?: number;
  city?: string;
}): string {
  const q = question.toLowerCase();
  const { moonInfo, restDay, userCrops, soilPh, city } = context;
  const elementInfo = MOON_ELEMENT_LABELS[moonInfo.element];

  // Rest day questions
  if (restDay.isRestDay) {
    if (q.includes('plant') || q.includes('work') || q.includes('garden')) {
      return `🕊️ Today is ${restDay.name} — a rest day for you AND your garden! No planting, harvesting, or soil work. Let the Creator restore both you and the earth. Use this time to plan for tomorrow's ${elementInfo.label} instead! 🌿`;
    }
  }

  // Moon phase questions
  if (q.includes('moon') || q.includes('phase') || q.includes('tonight')) {
    return `${moonInfo.phaseEmoji} The moon is currently in its **${moonInfo.phase}** phase, positioned in **${moonInfo.zodiac}** ${getZodiacEmoji(moonInfo.zodiac)}. This makes it a **${elementInfo.label}** — ${elementInfo.description.toLowerCase()}. ${moonInfo.isWaxing ? 'Energy is rising 🌒 — great for above-ground growth!' : 'Energy is descending 🌘 — perfect for root work and pruning.'}`;
  }

  // pH questions
  if (q.includes('ph') || q.includes('soil') || q.includes('acid') || q.includes('alkaline') || q.includes('lime')) {
    let phAdvice = PH_BANNER;
    if (soilPh !== undefined) {
      phAdvice = `Your soil pH is ${soilPh}. `;
      if (soilPh < 6.0) phAdvice += 'That\'s on the acidic side — great for potatoes 🥔 and strawberries 🍓, but you may want to add lime for most other crops. ';
      else if (soilPh > 7.0) phAdvice += 'That\'s alkaline — add sulfur or compost to lower it for most veggies. ';
      else phAdvice += 'That\'s in the ideal range for most crops! 🌟 ';
    }
    if (userCrops.length > 0) {
      const cropPh = userCrops.slice(0, 3).map(k => {
        const c = getCropByKey(k);
        return c ? `${c.emoji} ${c.name}: pH ${c.phRange.min}–${c.phRange.max}` : null;
      }).filter(Boolean).join(', ');
      phAdvice += `\n\nYour crops need: ${cropPh}`;
    }
    return phAdvice;
  }

  // Companion planting questions
  if (q.includes('companion') || q.includes('pair') || q.includes('together') || q.includes('next to')) {
    const tip = getDailyCompanionTip(moonInfo.element);
    let response = `🤝 **Companion Planting Tip** (Margaret Roberts' principles):\n\n${tip}\n\n`;
    
    // Find specific crop mentions
    const mentionedCrop = GARDEN_CROPS.find(c => q.includes(c.name.toLowerCase()) || q.includes(c.key));
    if (mentionedCrop) {
      const goodNames = mentionedCrop.companions.good.map(k => getCropByKey(k)?.name || k).join(', ');
      const badNames = mentionedCrop.companions.bad.map(k => getCropByKey(k)?.name || k).join(', ');
      response += `**${mentionedCrop.emoji} ${mentionedCrop.name}:**\n✅ Good with: ${goodNames}\n❌ Avoid: ${badNames || 'None known'}`;
      if (mentionedCrop.companions.notes) response += `\n💡 ${mentionedCrop.companions.notes}`;
    }
    return response;
  }

  // What to plant questions
  if (q.includes('plant') || q.includes('sow') || q.includes('grow') || q.includes('what should')) {
    const bestCrops = GARDEN_CROPS.filter(c => c.moonPreference === moonInfo.element).slice(0, 5);
    const cropList = bestCrops.map(c => `${c.emoji} ${c.name} (pH ${c.phRange.min}–${c.phRange.max})`).join('\n');
    let response = `${elementInfo.emoji} Today is a **${elementInfo.label}** — here are the best crops to work with:\n\n${cropList}`;
    if (city) response += `\n\n📍 In ${city}, remember to adjust for your local season and frost dates!`;
    return response;
  }

  // Harvest questions
  if (q.includes('harvest') || q.includes('pick') || q.includes('ready')) {
    return `🧺 For harvesting, **Fruit Days** (when the moon is in fire signs: Aries ♈, Leo ♌, Sagittarius ♐) are best for picking fruit crops. Today is a ${elementInfo.label} — ${moonInfo.element === 'fruit' ? 'great day to harvest! 🍅' : 'consider waiting for the next Fruit Day for optimal harvest.'} ${moonInfo.isWaxing ? 'Waxing moon harvests store longer.' : 'Waning moon — good for root harvesting.'}`;
  }

  // Water questions
  if (q.includes('water') || q.includes('irrigat')) {
    return `💧 Watering is most effective on **Leaf Days** (water signs: Cancer ♋, Scorpio ♏, Pisces ♓). Today is a ${elementInfo.label} — ${moonInfo.element === 'leaf' ? 'perfect day for deep watering! Plants absorb moisture best now. 🌊' : 'water as needed, but save deep soaking for the next Leaf Day.'}`;
  }

  // Default response
  return `🌕 Luna here! Today is a **${elementInfo.label}** with the ${moonInfo.phaseEmoji} **${moonInfo.phase}** in ${moonInfo.zodiac}. ${elementInfo.description}.\n\n${getDailyCompanionTip(moonInfo.element)}\n\nAsk me about:\n• 🌙 Moon phases & timing\n• 🤝 Companion planting\n• ⚗️ Soil pH\n• 🌱 What to plant today\n• 💧 Watering schedule\n• 🧺 Harvest timing`;
}

export function AskLunaChat({ userCropKeys = [], userSoilPh, city }: AskLunaChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const now = useMemo(() => new Date(), []);
  const moonInfo = useMemo(() => getMoonInfo(now), [now]);
  const yhwhDate = useMemo(() => calculateCreatorDate(now), [now]);
  const restDay = useMemo(() => getRestDayInfo(yhwhDate.weekDay, yhwhDate.month, yhwhDate.day), [yhwhDate]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const elementInfo = MOON_ELEMENT_LABELS[moonInfo.element];
      const welcome = restDay.isRestDay
        ? `🕊️ Shalom! I'm Luna, your biodynamic garden guide. Today is ${restDay.name} — a rest day for you and your garden. Let the Creator restore everything. Ask me anything about planning for the days ahead! 🌿`
        : `🌕 Shalom! I'm Luna, your biodynamic garden guide! Today is a **${elementInfo.label}** — ${elementInfo.description.toLowerCase()}. The ${moonInfo.phaseEmoji} ${moonInfo.phase} is in ${moonInfo.zodiac}. How can I help your garden today? 🌱`;
      setMessages([{ id: 'welcome', role: 'luna', content: welcome }]);
    }
  }, [isOpen]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    // Simulate typing delay for natural feel
    setTimeout(() => {
      const response = getLunaResponse(input.trim(), {
        moonInfo,
        yhwhDate,
        restDay,
        userCrops: userCropKeys,
        soilPh: userSoilPh,
        city,
      });
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'luna', content: response }]);
      setTyping(false);
    }, 600 + Math.random() * 800);
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[9990] w-14 h-14 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-800 shadow-lg shadow-emerald-900/50 flex items-center justify-center hover:scale-110 transition-transform border-2 border-emerald-400/30"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 1 }}
      >
        <span className="text-2xl">🌕</span>
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">
          <Sprout className="w-3 h-3" />
        </span>
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-end justify-end pointer-events-auto p-4 md:p-6" style={{ isolation: 'isolate' }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="relative w-full max-w-sm h-[70vh] max-h-[500px] bg-gradient-to-b from-emerald-950 to-stone-950 rounded-2xl shadow-2xl border border-emerald-800/40 flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-3 border-b border-emerald-800/30 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🌕</span>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-300">Ask Luna</h3>
                    <p className="text-[10px] text-emerald-600">Biodynamic Garden Coach</p>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-emerald-500 hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-emerald-700/40 text-emerald-200 rounded-br-sm'
                        : 'bg-emerald-900/40 text-emerald-300 border border-emerald-800/30 rounded-bl-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {typing && (
                  <div className="flex justify-start">
                    <div className="bg-emerald-900/40 text-emerald-400 rounded-2xl rounded-bl-sm px-3 py-2 text-xs border border-emerald-800/30">
                      <span className="animate-pulse">Luna is thinking... 🌱</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-3 border-t border-emerald-800/30 shrink-0">
                <div className="flex gap-2">
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder="Ask about moon phases, companions, pH..."
                    className="flex-1 bg-emerald-900/30 border border-emerald-800/40 rounded-xl px-3 py-2 text-xs text-emerald-200 placeholder:text-emerald-700 focus:outline-none focus:border-emerald-600/50"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || typing}
                    className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl px-3 py-2 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[9px] text-emerald-700 text-center mt-1.5">
                  Inspired by Seedtime · Gardenize · Margaret Roberts' Companion Planting
                </p>
              </div>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>
    </>
  );
}
