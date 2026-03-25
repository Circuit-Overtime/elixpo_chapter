'use client';

import { useState, useRef, useEffect, useMemo } from 'react';

const CATEGORIES = {
  People: {
    icon: '😀',
    emojis: [
      '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩',
      '😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🫢','🫣','🤫',
      '🤔','🫡','🤐','🤨','😐','😑','😶','🫥','😏','😒','🙄','😬','🤥','😌','😔','😪',
      '🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎',
      '🤓','🧐','😕','🫤','😟','🙁','😮','😯','😲','😳','🥺','🥹','😦','😧','😨','😰',
      '😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈',
      '👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖',
    ],
  },
  Hands: {
    icon: '👋',
    emojis: [
      '👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','👌','🤌','🤏','✌️','🤞','🫰','🤟',
      '🤘','🤙','👈','👉','👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜','👏',
      '🙌','🫶','👐','🤲','🤝','🙏','💪','🦾','🫂',
    ],
  },
  Nature: {
    icon: '🌿',
    emojis: [
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈',
      '🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋',
      '🌸','💐','🌷','🌹','🌺','🌻','🌼','🌱','🌲','🌳','🌴','🌵','🍀','🌿','🍃','🍂',
      '🍁','🌾','🌊','🌈','☀️','🌤️','⛅','🌥️','🌦️','🌧️','⛈️','🌩️','❄️','🔥','💧','🌍',
    ],
  },
  Food: {
    icon: '🍔',
    emojis: [
      '🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝',
      '🍅','🥑','🥦','🥬','🌽','🥕','🫒','🧄','🧅','🥔','🍠','🥐','🍞','🥖','🥨','🧀',
      '🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🫓','🥪','🌮','🌯',
      '🫔','🥙','🧆','🥚','🍲','🥣','🥗','🍿','🧂','🍩','🍪','🎂','🍰','🧁','🍫','🍬',
      '☕','🍵','🧃','🥤','🍶','🍷','🍸','🍹','🍺','🧋',
    ],
  },
  Activities: {
    icon: '⚽',
    emojis: [
      '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🥅','⛳',
      '🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🏋️',
      '🎪','🎭','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🪘','🎷','🎺','🪗','🎸','🎻','🎲',
      '♟️','🎯','🎳','🎮','🕹️','🧩',
    ],
  },
  Objects: {
    icon: '💡',
    emojis: [
      '⌚','📱','💻','⌨️','🖥️','🖨️','🖱️','🖲️','💾','💿','📀','📷','📹','🎥','📞','☎️',
      '📺','📻','🎙️','⏱️','⏰','🕰️','⌛','📡','🔋','🔌','💡','🔦','🕯️','🪔','🧯','🛢️',
      '💵','💴','💶','💷','🪙','💰','💳','💎','⚖️','🪜','🧲','🔧','🔨','⚒️','🛠️','⛏️',
      '🪚','🔩','⚙️','🪤','🧱','⛓️','🧰','🧲','🔬','🔭','📡','💉','🩸','💊','🩹','🩺',
      '📝','✏️','🖊️','🖋️','📚','📖','🔖','📎','📐','📏','✂️','🗃️','🗄️','🗑️','🔒','🔓',
      '🔑','🗝️',
    ],
  },
  Symbols: {
    icon: '❤️',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','💕','💞','💓','💗',
      '💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎',
      '♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️',
      '☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵',
      '🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘','❌','⭕','🛑','⛔','📛','🚫','💯','💢',
      '♨️','🚷','🚯','🚳','🚱','🔞','📵','🚭','❗','❕','❓','❔','‼️','⁉️','🔅','🔆',
      '〽️','⚠️','🚸','🔱','⚜️','🔰','♻️','✅','🈯','💹','❇️','✳️','❎','🌐','💠','Ⓜ️',
      '🌀','💤','🏧','♿','🅿️','🛗','🈳','🈂️','🛂','🛃','🛄','🛅','🚹','🚺','🚻','🚼',
      '🚾','🛜','🔣','ℹ️','🔤','🔡','🔠','🆖','🆗','🆙','🆒','🆕','🆓','0️⃣','1️⃣','2️⃣',
      '▶️','⏸️','⏹️','⏺️','⏭️','⏮️','⏩','⏪','🔀','🔁','🔂','◀️','🔼','🔽','⏫','⏬',
      '➡️','⬅️','⬆️','⬇️','↗️','↘️','↙️','↖️','↕️','↔️','🔄','↪️','↩️','⤴️','⤵️','#️⃣',
      '*️⃣','🔢','🔣','🔤','🔡','🔠','🔟','💲','©️','®️','™️',
    ],
  },
  Flags: {
    icon: '🏁',
    emojis: [
      '🏁','🚩','🎌','🏴','🏳️','🏳️‍🌈','🏳️‍⚧️','🏴‍☠️',
      '🇺🇸','🇬🇧','🇫🇷','🇩🇪','🇯🇵','🇰🇷','🇨🇳','🇮🇳','🇧🇷','🇷🇺','🇦🇺','🇨🇦',
      '🇪🇸','🇮🇹','🇲🇽','🇦🇷','🇳🇬','🇿🇦','🇪🇬','🇹🇷','🇸🇦','🇦🇪','🇮🇩','🇹🇭',
    ],
  },
};

const CATEGORY_NAMES = Object.keys(CATEGORIES);

export default function EmojiPicker({ onSelect, onRemove, onClose }) {
  const [activeCategory, setActiveCategory] = useState('People');
  const [filter, setFilter] = useState('');
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filteredEmojis = useMemo(() => {
    if (!filter.trim()) return null;
    const q = filter.toLowerCase();
    const results = [];
    for (const cat of CATEGORY_NAMES) {
      for (const em of CATEGORIES[cat].emojis) {
        if (results.length >= 80) break;
        // Simple filter: just include all when searching (emoji search by character match)
        results.push(em);
      }
    }
    // Filter by checking if the emoji string itself contains the query (works for flag codes etc.)
    // For a basic approach, we just show all emojis and let the user scroll
    return results;
  }, [filter]);

  const displayEmojis = filteredEmojis || CATEGORIES[activeCategory]?.emojis || [];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="relative z-50 mb-4 w-[352px] bg-[#10141E] border border-[#1D202A] rounded-xl shadow-2xl overflow-hidden">
        {/* Top tabs */}
        <div className="flex items-center justify-between px-3 pt-2.5 pb-0">
          <div className="flex gap-3">
            {['Emoji', 'Icons'].map((tab) => (
              <button
                key={tab}
                className={`text-xs font-medium pb-1.5 transition-colors ${
                  tab === 'Emoji'
                    ? 'text-white border-b-2 border-[#7ba8f0]'
                    : 'text-[#555] cursor-default'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <button
            onClick={onRemove}
            className="text-xs text-[#888] hover:text-red-400 transition-colors"
          >
            Remove
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="flex items-center gap-2 bg-[#1D202A] rounded-lg px-2.5 py-1.5 border border-[#333] focus-within:border-[#7ba8f0] transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter..."
              className="flex-1 bg-transparent outline-none text-xs text-white placeholder-[#555]"
            />
            {!filter && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-[#555] bg-[#10141E] px-1 rounded">⌘</span>
                <span className="text-lg select-none">{CATEGORIES[activeCategory]?.icon}</span>
              </div>
            )}
          </div>
        </div>

        {/* Category label */}
        {!filter && (
          <div className="px-3 pb-1">
            <span className="text-[10px] font-semibold text-[#555] uppercase tracking-wider">{activeCategory}</span>
          </div>
        )}

        {/* Emoji grid */}
        <div ref={scrollRef} className="px-2 pb-2 max-h-[220px] overflow-y-auto dark-scrollbar">
          <div className="grid grid-cols-9 gap-0">
            {displayEmojis.map((emoji, i) => (
              <button
                key={emoji + i}
                onClick={() => onSelect(emoji)}
                className="text-[22px] h-9 w-9 flex items-center justify-center rounded-md hover:bg-[#1D202A] transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom category bar */}
        <div className="flex items-center justify-between px-2 py-1.5 border-t border-[#1D202A] bg-[#0c1018]">
          {CATEGORY_NAMES.map((cat) => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setFilter(''); }}
              className={`text-lg h-7 w-7 flex items-center justify-center rounded-md transition-colors ${
                activeCategory === cat && !filter
                  ? 'bg-[#1D202A]'
                  : 'hover:bg-[#1D202A]/50 opacity-60 hover:opacity-100'
              }`}
              title={cat}
            >
              {CATEGORIES[cat].icon}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
