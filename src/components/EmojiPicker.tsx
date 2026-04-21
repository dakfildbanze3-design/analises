import React, { useState } from 'react';
import { Smile, Heart, Flame, ThumbsUp, PartyPopper, Briefcase, Package } from 'lucide-react';

const CATEGORIES = [
  { id: 'smileys', icon: <Smile size={18} />, name: '😀 Smileys', emojis: ['😀','😃','😄','😁','😆','😅','😂','🤣','🥲','☺️','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕'] },
  { id: 'emocoes', icon: <Heart size={18} />, name: '❤️ Emoções', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝'] },
  { id: 'popular', icon: <Flame size={18} />, name: '🔥 Popular', emojis: ['🔥','✨','🌟','💯','💢','💥','💫','💦','💨','🐵','🙈','🙉','🙊'] },
  { id: 'gestos', icon: <ThumbsUp size={18} />, name: '👍 Gestos', emojis: ['👍','👎','👏','🙌','👐','🤲','🤝','🤜','🤛','✊','👊','🖐️','✋','🤚','👋','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️'] },
  { id: 'eventos', icon: <PartyPopper size={18} />, name: '🎉 Eventos', emojis: ['🎉','🎊','🎈','🎂','🎀','🎁','🎇','🎆','🧨','🧧','🎐','🎏','🎎','🎑','🎋'] },
  { id: 'negocios', icon: <Briefcase size={18} />, name: '💰 Negócios', emojis: ['💰','💴','💵','💶','💷','🪙','💸','💳','🧾','💹','📈','📉','📊'] },
  { id: 'produtos', icon: <Package size={18} />, name: '📦 Produtos', emojis: ['📦','🛒','🛍️','📱','💻','⌚','📷','👟','👕','👖','👔','👗','🕶️'] }
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export default function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);

  const activeList = CATEGORIES.find(c => c.id === activeCategory)?.emojis || [];

  return (
    <div className="flex flex-col h-[280px]">
      {/* Header / Tabs */}
      <div className="flex overflow-x-auto hide-scrollbar bg-zinc-800 border-b border-white/5 p-2 gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            title={cat.name}
            className={`p-2 rounded-lg flex items-center justify-center shrink-0 transition-colors ${activeCategory === cat.id ? 'bg-blue-600 text-white' : 'text-white/40 hover:bg-white/10'}`}
          >
            {cat.icon}
          </button>
        ))}
      </div>

      {/* Emoji Grid */}
      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-7 gap-2 content-start bg-zinc-900 hide-scrollbar">
        {activeList.map((emoji, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(emoji)}
            className="text-2xl hover:scale-125 transition-transform active:scale-95 flex items-center justify-center h-10 w-10"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
