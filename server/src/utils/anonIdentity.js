import crypto from 'crypto';

const NAMES = [
  "Masala_Lion", "Samosa_Ghost", "Chai_Panda", "Biryani_Tiger", "Jalebi_Fox",
  "Curry_Dragon", "Tikka_Hawk", "Naan_Ninja", "Lassi_Lover", "Paneer_Pirate",
  "Dosa_Wizard", "Idli_Idol", "Raita_Ranger", "Kulfi_King", "Mango_Mamba",
  "Gulab_Genius", "Papad_Pilot", "Chutney_Chief", "Pakora_Prince", "Kebab_Knight",
  "Saffron_Sultan", "Turmeric_Titan", "Cardamom_Czar", "Cumin_Commander", "Ginger_Guru",
  "Garlic_Giant", "Onion_Overlord", "Chili_Champion", "Pepper_Paladin", "Salt_Sage",
  "Sugar_Saint", "Honey_Hero", "Ghee_Gladiator", "Butter_Baron", "Milk_Monk",
  "Curd_Crusader", "Basmati_Boss", "Dal_Duke", "Aloo_Ace", "Gobi_God",
  "Matar_Master", "Palak_Peer", "Bhindi_Beast", "Karela_Killer", "Baingan_Bard",
  "Kadai_King", "Handi_Helper", "Tandoor_Tsar", "Roti_Ruler", "Paratha_Pope",
];

// 20 unique, non-duplicate emoji avatars
const AVATARS = [
  "🦁", "🦊", "🐼", "🐯", "🐨",
  "🐲", "🦅", "🦉", "🦄", "🦋",
  "🐉", "🐒", "🐘", "🐙", "🐢",
  "🐧", "🦩", "🦖", "🦓", "🐝",
];

// Params are plain strings — no TypeScript type annotations
export const generateAnonIdentity = (userId, postId) => {
  const hash = crypto.createHash('md5').update(userId + postId).digest('hex');
  const hashNum = parseInt(hash.substring(0, 8), 16);

  const name = NAMES[hashNum % NAMES.length];
  const avatar = AVATARS[hashNum % AVATARS.length];

  return { name, avatar };
};
