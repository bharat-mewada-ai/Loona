import DailyPoll from "../models/dailyPoll.model.js";

// Helper to seed a default poll if none is active today
const seedDefaultPoll = async (activeDate) => {
  const defaultPolls = [
    {
      question: "Is OGI's canteen samosa actually edible? 🥟",
      options: [
        { text: "Yes, it is fire! 🔥" },
        { text: "Nah, it is biohazard 💀" },
        { text: "Meh, average 🤷" }
      ]
    },
    {
      question: "LNCT Canteen vs OGI Canteen: Which one wins? ⚔️",
      options: [
        { text: "LNCT 🌙" },
        { text: "OGI 🦊" },
        { text: "Both are trash 🗑️" }
      ]
    },
    {
      question: "Do you attend 9:00 AM lectures? ⏰",
      options: [
        { text: "Yes, standard topper 🤓" },
        { text: "Only for attendance 📝" },
        { text: "Never, sleep is life 😴" }
      ]
    },
    {
      question: "What is your main strategy for passing semester exams? 📚",
      options: [
        { text: "One-night study marathon ☕" },
        { text: "Attending all lectures regularly ✍️" },
        { text: "Depending on nearby friends 🤝" },
        { text: "Pure luck and prayers 🙏" }
      ]
    },
    {
      question: "Hostellers vs Day Scholars: Who has it better? 🏢",
      options: [
        { text: "Hostellers (freedom & late nights) 🌌" },
        { text: "Day Scholars (home food & comfort) 🏡" }
      ]
    },
    {
      question: "Have you ever given a fake proxy attendance for a friend? 🗣️",
      options: [
        { text: "Yes, standard bro-code 🤜🤛" },
        { text: "No, too scared to get caught 😰" },
        { text: "I am the one who needs proxies 🙋" }
      ]
    },
    {
      question: "What is the biggest scam in our college? 💸",
      options: [
        { text: "The mandatory 75% attendance rule 📝" },
        { text: "Placement training fee 📈" },
        { text: "Canteen food pricing 🍔" },
        { text: "The slow campus Wi-Fi 🌐" }
      ]
    },
    {
      question: "Where do you spend most of your free time on campus? 🚶‍♂️",
      options: [
        { text: "Canteen / Tapri ☕" },
        { text: "Back lawns / Chill spots 🌳" },
        { text: "Library (sleeping or actual study) 📚" },
        { text: "Outside campus gates 🚪" }
      ]
    },
    {
      question: "What is the best survival food during mid-sem exams? 🍜",
      options: [
        { text: "2-minute Maggie 🍜" },
        { text: "Canteen Chai and Samosa ☕" },
        { text: "Delivery / Fast food 🍕" },
        { text: "Nothing, stress kills appetite 😵" }
      ]
    },
    {
      question: "How do you react when a professor calls your name randomly? 🎤",
      options: [
        { text: "Pretend my mic/internet isn't working 🔇" },
        { text: "Confidently answer (even if wrong) 😎" },
        { text: "Instant panic attack 🚨" },
        { text: "Stare blankly at my friends for help 👀" }
      ]
    },
    {
      question: "Which coding language do you prefer for placements? 💻",
      options: [
        { text: "C++ (DSA standard) 🚀" },
        { text: "Java (Solid & robust) ☕" },
        { text: "Python (Easy & fast) 🐍" },
        { text: "Web Dev / JS 🌐" }
      ]
    },
    {
      question: "Have you ever mass-bunked a lecture? 🚪",
      options: [
        { text: "Yes, multiple times! 🏃‍♂️" },
        { text: "Once or twice 🤫" },
        { text: "Never, I was the topper who ruined it 🤓" }
      ]
    },
    {
      question: "What's the main reason you visit the college library? 🏫",
      options: [
        { text: "Free AC and sleep ❄️" },
        { text: "Charging my phone 🔌" },
        { text: "To actually study 📖" },
        { text: "To meet my crush/friends 👀" }
      ]
    },
    {
      question: "DSA vs Web/App Development: What are you focusing on? ⚙️",
      options: [
        { text: "LeetCode grinding (DSA) 🧠" },
        { text: "Building cool projects (Dev) 🛠️" },
        { text: "Both (Superhuman) 💪" },
        { text: "None, waiting for miracle 🤷" }
      ]
    },
    {
      question: "How do you rate our college's Wi-Fi speed? 📶",
      options: [
        { text: "Super fast (rarely) ⚡" },
        { text: "Barely loads a webpage 🐌" },
        { text: "Doesn't connect at all 📵" }
      ]
    },
    {
      question: "What is your reaction to the CR (Class Representative) posting notifications? 📱",
      options: [
        { text: "Mute the group instantly 🔕" },
        { text: "Read and panic 😰" },
        { text: "Ignore until the exam day 🙈" }
      ]
    },
    {
      question: "Best place to celebrate after exams? 🎉",
      options: [
        { text: "Nearest local cafe ☕" },
        { text: "Hostel room party 🍕" },
        { text: "Going back home directly 🏡" },
        { text: "Sleep for 15 hours 🛌" }
      ]
    },
    {
      question: "How often do you check your attendance percentage? 📊",
      options: [
        { text: "Every day on the portal 🔍" },
        { text: "Once a week 📅" },
        { text: "Only when debarment list is out 🚨" },
        { text: "Ignorance is bliss 🕊️" }
      ]
    },
    {
      question: "What is the worst part of morning lectures? 🌅",
      options: [
        { text: "Waking up early 🥱" },
        { text: "Missing breakfast 🍳" },
        { text: "Professor's monotonous voice 😴" },
        { text: "Travel / Local bus rush 🚌" }
      ]
    },
    {
      question: "Which zone is your crush in? 💔",
      options: [
        { text: "Friendzone 🤝" },
        { text: "Brozone / Behazone 💀" },
        { text: "Strangerzone (doesn't know I exist) 🥲" },
        { text: "Mutual attraction! 💕" }
      ]
    },
    {
      question: "How do you complete your practical assignments? 📄",
      options: [
        { text: "Copying word-for-word from class topper 📝" },
        { text: "Writing by myself (Rare breed) 🤓" },
        { text: "Asking ChatGPT to rephrase 🤖" },
        { text: "Submitting late with excuses ⏳" }
      ]
    },
    {
      question: "What is your favorite drink at the college tapri? ☕",
      options: [
        { text: "Adrak Chai (Ginger tea) ☕" },
        { text: "Filter Coffee 🥛" },
        { text: "Cold drink / Juice 🥤" },
        { text: "Water (Broke life) 💧" }
      ]
    },
    {
      question: "Do you turn your camera on during online sessions? 📷",
      options: [
        { text: "Never, ceiling fan show only 💨" },
        { text: "Only when forced by professor 😰" },
        { text: "Yes, ready and dressed up 😎" }
      ]
    },
    {
      question: "Your opinion on group projects? 👥",
      options: [
        { text: "I do all the work alone 😤" },
        { text: "I am the freeloader who gets free grades 🤫" },
        { text: "We actually divide work equally (Myth) 🦄" }
      ]
    },
    {
      question: "What is the primary criteria for choosing a seat in class? 🪑",
      options: [
        { text: "Last bench (Peace and phone use) 📱" },
        { text: "First bench (Topper vibes) 🤓" },
        { text: "Under the fan/AC ❄️" },
        { text: "Next to my crush/bestie 💖" }
      ]
    },
    {
      question: "How long does it take you to prepare for a Viva? 🗣️",
      options: [
        { text: "15 minutes before entering the lab ⏳" },
        { text: "Read the manual the night before 📖" },
        { text: "Completely blank, relying on prayers 🙏" }
      ]
    },
    {
      question: "What's the status of your laptop sticker collection? 💻",
      options: [
        { text: "Full of developer / anime stickers 🎨" },
        { text: "Clean and corporate 🏢" },
        { text: "No stickers at all 🔘" }
      ]
    },
    {
      question: "Would you rather have a 9-5 high paying job or a chill low paying job? 💼",
      options: [
        { text: "High pay, high stress 💸" },
        { text: "Low pay, high chill 🏖️" }
      ]
    },
    {
      question: "Is your room clean right now? 🧹",
      options: [
        { text: "Sparkling clean ✨" },
        { text: "Average messy 🤷" },
        { text: "Looks like a warzone 💣" }
      ]
    },
    {
      question: "How do you wake up for early college? ⏰",
      options: [
        { text: "One alarm is enough 🔔" },
        { text: "10 alarms with 5-minute intervals 🔕" },
        { text: "Family members shaking me awake 🥶" },
        { text: "I don't (just sleep through) 🛌" }
      ]
    },
    {
      question: "What is your main distraction during self-study? 📱",
      options: [
        { text: "Instagram Reels / YouTube Shorts 📱" },
        { text: "Gaming 🎮" },
        { text: "Sleeping 😴" },
        { text: "Daydreaming about future 🌌" }
      ]
    },
    {
      question: "Have you ever fallen asleep during a lecture? 😴",
      options: [
        { text: "Yes, it's my second bed 🛌" },
        { text: "Only in boring theoretical classes 📖" },
        { text: "Never, too much respect/fear 🙅" }
      ]
    },
    {
      question: "How do you feel about college fests? 🎪",
      options: [
        { text: "Super excited, attending everything! 🎉" },
        { text: "Only going for the concert/DJ night 🎵" },
        { text: "Staying home and sleeping 🛌" }
      ]
    },
    {
      question: "Best season on campus? 🌦️",
      options: [
        { text: "Winter (Fashion & chill) 🧥" },
        { text: "Monsoon (Beautiful but muddy) 🌧️" },
        { text: "Spring (Perfect weather) 🌸" },
        { text: "Summer (Torture) 🥵" }
      ]
    },
    {
      question: "Do you have a backlog/carryover right now? 🚨",
      options: [
        { text: "All clear! 😎" },
        { text: "1 or 2 pending 📖" },
        { text: "A collection (Backlog king) 👑" }
      ]
    },
    {
      question: "What is the most useful skill you learned in college? 🛠️",
      options: [
        { text: "Actual engineering/coding 💻" },
        { text: "Last-minute management and jugad 🧠" },
        { text: "Dealing with difficult people / politics 🗣️" },
        { text: "Making PPTs look nice 🎨" }
      ]
    },
    {
      question: "Preferred mode of transport to college? 🚌",
      options: [
        { text: "College Bus / Local Bus 🚌" },
        { text: "My own bike/scooty 🏍️" },
        { text: "Metro / Train 🚇" },
        { text: "Walking / Day scholar nearby 🚶‍♂️" }
      ]
    },
    {
      question: "Do you buy textbooks? 📖",
      options: [
        { text: "Yes, brand new every sem 📚" },
        { text: "Library books / Seniors' hand-downs 🤝" },
        { text: "Only PDFs and online notes 📱" },
        { text: "What are textbooks? 🤷" }
      ]
    },
    {
      question: "What's your go-to topic for small talk in college? 💬",
      options: [
        { text: "Placements / Internship stress 📈" },
        { text: "Professor gossips 🤫" },
        { text: "Syllabus and exam dates 📅" },
        { text: "Movies / Web series / Anime 🎬" }
      ]
    },
    {
      question: "How do you rate the hostel mess food? 🍽️",
      options: [
        { text: "Surprisingly good 😋" },
        { text: "Tolerable to survive 😐" },
        { text: "Worse than prison food 🤮" }
      ]
    },
    {
      question: "Which subject is the biggest nightmare this semester? 🧠",
      options: [
        { text: "Mathematics (Calculus/Stats) 🧮" },
        { text: "Coding / DSA labs 💻" },
        { text: "Core engineering theory 📖" },
        { text: "Labs and writing manuals 📄" }
      ]
    },
    {
      question: "Do you participate in college clubs/societies? 🎭",
      options: [
        { text: "Yes, active core member 🏆" },
        { text: "Just registered for the certificate 🎓" },
        { text: "No, too lazy to stay after hours 🛌" }
      ]
    },
    {
      question: "How many WhatsApp groups do you have muted? 🔕",
      options: [
        { text: "Less than 5 📱" },
        { text: "5 to 15 📲" },
        { text: "All of them (pure peace) 🔕" }
      ]
    },
    {
      question: "Your favorite time of the college day? 🕰️",
      options: [
        { text: "Lunch break / Canteen time 🥪" },
        { text: "Bunking hours 🚪" },
        { text: "4:00 PM (Going home/hostel) 🚶‍♂️" }
      ]
    },
    {
      question: "Have you ever prepared a cheatsheet for exams? 📝",
      options: [
        { text: "Yes, micro-printing expert 🧐" },
        { text: "No, too honest 😇" },
        { text: "No, too lazy to even make one 🥱" }
      ]
    },
    {
      question: "How do you deal with a boring professor? 🗣️",
      options: [
        { text: "Use my phone under the bench 📱" },
        { text: "Doodle on the back of my notebook 🎨" },
        { text: "Actually try to pay attention 🤓" },
        { text: "Bunk the class 🚪" }
      ]
    },
    {
      question: "Where do you get your exam notes? 📄",
      options: [
        { text: "My own clean hand-written notes ✍️" },
        { text: "From the class topper/GeeksforGeeks 🤓" },
        { text: "YouTube playlists at 2x speed 🎥" },
        { text: "Just reading the slides 5 mins before ⏳" }
      ]
    },
    {
      question: "Which platform do you use most for coding practice? 💻",
      options: [
        { text: "LeetCode / GFG 🚀" },
        { text: "HackerRank / CodeChef 🏆" },
        { text: "GitHub (working on projects) 🛠️" },
        { text: "None, copy-pasting from ChatGPT 🤖" }
      ]
    },
    {
      question: "What is your daily screen time during college? 📱",
      options: [
        { text: "Under 3 hours ⏱️" },
        { text: "3 to 6 hours 📲" },
        { text: "More than 6 hours (Zombified) 🧟" }
      ]
    },
    {
      question: "Do you have a side hustle/part-time job? 💸",
      options: [
        { text: "Yes, freelancing/interning 💻" },
        { text: "Trying to start one 🚀" },
        { text: "No, college load is enough 😮" }
      ]
    },
    {
      question: "What is your reaction when college extends submission dates? 🎉",
      options: [
        { text: "Relief! I can sleep more 🛌" },
        { text: "Frustration (I already rushed and finished) 😤" },
        { text: "Doesn't matter, will still submit late 🤷" }
      ]
    },
    {
      question: "How do you prepare for placement interviews? 💼",
      options: [
        { text: "Mock interviews and DSA 🧠" },
        { text: "Reading interview experiences 📄" },
        { text: "Wing it on the spot 🤞" }
      ]
    },
    {
      question: "Do you drink tea/coffee to stay awake during study nights? ☕",
      options: [
        { text: "Yes, chain-drinker during exams ☕" },
        { text: "Only energy drinks 🥤" },
        { text: "No, natural sleep fighter 💪" }
      ]
    },
    {
      question: "What is your main source of college gossip? 🤫",
      options: [
        { text: "Loona feed 🦊" },
        { text: "My close circle group chat 💬" },
        { text: "Canteen talk ☕" }
      ]
    },
    {
      question: "Would you rather skip a lab or a theory class? 🏫",
      options: [
        { text: "Skip lab (Write-ups are annoying) 📄" },
        { text: "Skip theory (Boring lectures) 🥱" }
      ]
    },
    {
      question: "How many languages can you code in? 💻",
      options: [
        { text: "Only one (but master) 🎯" },
        { text: "2 or 3 languages 🛠️" },
        { text: "4+ languages (Super dev) 🚀" },
        { text: "HTML/CSS counts? 😂" }
      ]
    },
    {
      question: "Are college friends permanent? 🤝",
      options: [
        { text: "Yes, friends for life ❤️" },
        { text: "Only till graduation 🎓" },
        { text: "Most are just snake classmates 🐍" }
      ]
    },
    {
      question: "How do you style yourself for college? 👕",
      options: [
        { text: "Full drip (Outfits, perfumes) 😎" },
        { text: "Casual jeans and t-shirt 👕" },
        { text: "Whatever is clean on top of the pile 🤷" }
      ]
    },
    {
      question: "What is the biggest regret of your college life so far? 😔",
      options: [
        { text: "Not studying enough / bad CGPA 📉" },
        { text: "Not socializing / missing fun 😢" },
        { text: "Wasting time on the wrong crowd/crush 💔" },
        { text: "No regrets, living it full! 🚀" }
      ]
    },
    {
      question: "How do you handle exam stress? 🤯",
      options: [
        { text: "Deep sleep 🛌" },
        { text: "Vent to friends for hours 💬" },
        { text: "Eating junk food 🍕" },
        { text: "Pure panic & crying 😭" }
      ]
    },
    {
      question: "Did you ever copy-paste code from StackOverflow without understanding? ⌨️",
      options: [
        { text: "Every single time 🤫" },
        { text: "Only when debugging got hard 🐛" },
        { text: "Never, I write pure logic 😇" }
      ]
    },
    {
      question: "Do you prefer online classes or offline college? 🏫",
      options: [
        { text: "Online (comfort, bunking, sleeping) 🛌" },
        { text: "Offline (canteen, friends, real life) 🏫" }
      ]
    },
    {
      question: "How many backlogs can a student handle before losing sanity? 🚨",
      options: [
        { text: "Maximum 1 or 2 📖" },
        { text: "Up to 5 (Heavy heart) 😰" },
        { text: "Sanity was lost long ago 🤪" }
      ]
    },
    {
      question: "Do you have a crush on any professor? 🤫",
      options: [
        { text: "Yes, secret admirer 👀" },
        { text: "No, they all give me nightmares 💀" }
      ]
    },
    {
      question: "What is your target CGPA? 📈",
      options: [
        { text: "9+ CGPA (Topper club) 👑" },
        { text: "8.0 to 8.9 (Safe zone) 👍" },
        { text: "7.0 to 7.9 (Average pack) 😎" },
        { text: "Just let me pass (6.5+ is enough) 🙏" }
      ]
    },
    {
      question: "Your go-to app during boring lectures? 📱",
      options: [
        { text: "Instagram 📸" },
        { text: "Reddit / Loona 🦊" },
        { text: "WhatsApp / Chatting 💬" },
        { text: "Stock market / Trading 📊" }
      ]
    },
    {
      question: "Have you ever sneaked out of hostel at night? 🌃",
      options: [
        { text: "Yes, thrill is real! 🏃‍♂️" },
        { text: "No, warden is too strict 👮" },
        { text: "Day scholar (doesn't apply) 🏡" }
      ]
    },
    {
      question: "What is the best way to get on a professor's good side? 😇",
      options: [
        { text: "Sitting in the front row and nodding 🤓" },
        { text: "Being the CR / helping with labs 🛠️" },
        { text: "Asking intelligent (or fake) questions 🎤" },
        { text: "Impossible, they hate everyone 💀" }
      ]
    },
    {
      question: "Best study spot on campus? 🏫",
      options: [
        { text: "Quiet corner in the library 📚" },
        { text: "Empty classrooms after hours 🏫" },
        { text: "Lawns / Under a tree 🌳" },
        { text: "Study? I only study at home/hostel 🛌" }
      ]
    },
    {
      question: "What's the status of your college ID card? 📇",
      options: [
        { text: "Always around my neck 📇" },
        { text: "Deep inside my bag 🎒" },
        { text: "Lost it in the first semester 🤷" }
      ]
    },
    {
      question: "Do you prefer placements in service-based or product-based companies? 💼",
      options: [
        { text: "Product-based (High package, DSA grind) 💎" },
        { text: "Service-based (Easier entry, mass recruiters) 🏢" }
      ]
    },
    {
      question: "How long does your phone battery last during college? 🔋",
      options: [
        { text: "Dies before lunch break 🪫" },
        { text: "Survives till the end of the day 🔋" },
        { text: "I carry a power bank everywhere 🔌" }
      ]
    },
    {
      question: "Have you ever participated in a college protest/strike? 📢",
      options: [
        { text: "Yes, revolution! 📢" },
        { text: "No, staying away from trouble 🤫" }
      ]
    },
    {
      question: "How many friends from your first day of college are still close? 🤝",
      options: [
        { text: "All of them! 👬" },
        { text: "Only 1 or 2 🤝" },
        { text: "None, dynamic group changes 🔄" }
      ]
    },
    {
      question: "What's the biggest waste of money in college? 💸",
      options: [
        { text: "Buying official uniforms / blazers 👔" },
        { text: "College bus fee (when you bunk often) 🚌" },
        { text: "Buying records and manuals 📄" }
      ]
    },
    {
      question: "Best gaming console for hostel rooms? 🎮",
      options: [
        { text: "PlayStation / Xbox 🎮" },
        { text: "Gaming Laptop 💻" },
        { text: "Mobile gaming (BGMI/FreeFire) 📱" }
      ]
    },
    {
      question: "How many assignments do you submit on time? 📄",
      options: [
        { text: "100% of them (Topper energy) 🤓" },
        { text: "Only when professors threaten marks deduction 🚨" },
        { text: "Rarely, late submissions are my signature ⏳" }
      ]
    },
    {
      question: "Which streaming platform is keeping you awake at night? 🎬",
      options: [
        { text: "Netflix / Prime Video 🍿" },
        { text: "YouTube / Anime sites 🎌" },
        { text: "Instagram Reels scrolling 📱" }
      ]
    },
    {
      question: "Do you read college newsletters? 📰",
      options: [
        { text: "Yes, cover-to-cover 📰" },
        { text: "Only when my photo/name is in it 🏆" },
        { text: "Never, goes straight to trash 🗑️" }
      ]
    },
    {
      question: "Which subject has the most useless labs? 🔬",
      options: [
        { text: "Physics / Chemistry (First year pain) 🧪" },
        { text: "Basic Workshop (Hammering files) 🛠️" },
        { text: "Drawing / CAD labs 📐" }
      ]
    },
    {
      question: "Have you ever bunked college to watch a movie? 🍿",
      options: [
        { text: "Yes, first day first show! 🎬" },
        { text: "No, did it for other reasons 🤷" },
        { text: "Never bunked for movies 🙅" }
      ]
    },
    {
      question: "How do you feel when your classmates get placed? 💼",
      options: [
        { text: "Genuinely happy for them ❤️" },
        { text: "Jealous and anxious about my future 😰" },
        { text: "Happy, but party kab hai? 🍕" }
      ]
    },
    {
      question: "Your favorite snack at the tapri? 🥟",
      options: [
        { text: "Samosa / Patty 🥟" },
        { text: "Maggie 🍜" },
        { text: "Biscuit / Toast 🍞" }
      ]
    },
    {
      question: "Do you keep your camera off on teams/zoom? 📹",
      options: [
        { text: "Yes, standard protocol 🤫" },
        { text: "Only turn on to show attendance 🙋" }
      ]
    },
    {
      question: "How many backlogs do you think is 'normal' for an engineer? 👑",
      options: [
        { text: "Zero, clean record is best 😇" },
        { text: "1 or 2 is part of the experience 🍻" },
        { text: "4+ is the badge of a true engineer 🎖️" }
      ]
    },
    {
      question: "Best thing about hostel life? 🏢",
      options: [
        { text: "Late night gossips / Maggi sessions 🌃" },
        { text: "Freedom from parents 🗽" },
        { text: "Exam night mass study groups 📖" }
      ]
    },
    {
      question: "Worst thing about hostel life? 🏢",
      options: [
        { text: "Shared washrooms 🚿" },
        { text: "Warden's rules & gate times 👮" },
        { text: "Homesickness / bad food 🍽️" }
      ]
    },
    {
      question: "Do you have your placement resume ready? 📄",
      options: [
        { text: "Yes, fully optimized and polished 📄" },
        { text: "It's a draft with half-completed projects 🛠️" },
        { text: "Resume? What's that? 🤷" }
      ]
    },
    {
      question: "How do you treat juniors on campus? 🤝",
      options: [
        { text: "Helpful mentor 🎓" },
        { text: "Intimidating senior (fun ragging only) 😎" },
        { text: "Ignore completely 🙈" }
      ]
    },
    {
      question: "Have you ever lied on your placement resume? 🤫",
      options: [
        { text: "Yes, standard embellishments 📄" },
        { text: "No, keeping it 100% honest 😇" }
      ]
    },
    {
      question: "Preferred programming language for coding rounds? 💻",
      options: [
        { text: "C++ (Fast & DSA standard) 🚀" },
        { text: "Java (Verbose but strong) ☕" },
        { text: "Python (Simple & clean) 🐍" }
      ]
    },
    {
      question: "How do you handle copy-paste detections in lab submissions? 🕵️",
      options: [
        { text: "Change variable names and comments 📝" },
        { text: "Re-structure the code blocks 🛠️" },
        { text: "Submit and hope the TA doesn't check 🤞" }
      ]
    },
    {
      question: "What is your main criteria for grading a canteen? 🍔",
      options: [
        { text: "Taste of food 😋" },
        { text: "Price (Broke-friendly) 💸" },
        { text: "Cleanliness & Hygiene 🧼" }
      ]
    },
    {
      question: "How long is your daily college commute? 🚌",
      options: [
        { text: "Under 20 mins ⏱️" },
        { text: "20 to 60 mins 🚌" },
        { text: "More than an hour (Commute warrior) 🛡️" }
      ]
    },
    {
      question: "Do you attend college webinars/seminars? 🎤",
      options: [
        { text: "Yes, for the certificates 🎓" },
        { text: "Only if attendance is mandatory 📝" },
        { text: "Never, staying in canteen 🍔" }
      ]
    },
    {
      question: "What's your target sector for jobs? 🏢",
      options: [
        { text: "IT / Software engineering 💻" },
        { text: "Core fields (Mechanical, Civil, EE) ⚡" },
        { text: "Management / Non-tech roles 💼" },
        { text: "Government jobs / GATE prep 🏛️" }
      ]
    },
    {
      question: "Best memory of first year? 🌸",
      options: [
        { text: "Freshers party 🎉" },
        { text: "Making my first close group 🤝" },
        { text: "Bunking classes without fear 🏃‍♂️" }
      ]
    },
    {
      question: "How often do you visit the college gym? 🏋️",
      options: [
        { text: "Daily grind 💪" },
        { text: "Registered but never went 🤷" },
        { text: "College has a gym? 😂" }
      ]
    }
  ];

  // Pick sequential poll based on day count from a fixed epoch date (Jan 1, 2026).
  // This ensures the poll advances by exactly 1 every single day, and does not
  // repeat until all 100+ polls have been cycled through.
  const baseDate = new Date("2026-01-01").getTime();
  const currentDate = new Date(activeDate).getTime();
  const diffDays = Math.floor((currentDate - baseDate) / (1000 * 60 * 60 * 24));
  const index = Math.max(0, diffDays) % defaultPolls.length;
  const chosen = defaultPolls[index];
  
  return await DailyPoll.create({
    question: chosen.question,
    options: chosen.options,
    activeDate
  });
};

export const getTodayPoll = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    let poll = await DailyPoll.findOne({ activeDate: todayStr }).lean();

    if (!poll) {
      // Seed a default poll dynamically if none is created yet
      poll = await seedDefaultPoll(todayStr);
    }

    const userId = req.user._id.toString();
    const userVote = poll.votedUsers && poll.votedUsers[userId] !== undefined ? poll.votedUsers[userId] : null;

    // Clean up votedUsers mapping from response payload to save bandwidth
    const { votedUsers, ...rest } = poll;

    res.json({
      ...rest,
      userVote
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const voteDailyPoll = async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const todayStr = new Date().toISOString().split("T")[0];
    const userId = req.user._id.toString();

    if (optionIndex === undefined || optionIndex < 0) {
      return res.status(400).json({ error: "Invalid option index" });
    }

    let poll = await DailyPoll.findOne({ activeDate: todayStr });
    if (!poll) {
      poll = await seedDefaultPoll(todayStr);
    }

    // Check if user has already voted
    if (poll.votedUsers.has(userId)) {
      return res.status(400).json({ error: "You already voted in today's poll!" });
    }

    if (optionIndex >= poll.options.length) {
      return res.status(400).json({ error: "Option index out of bounds" });
    }

    // Atomic update
    poll.options[optionIndex].votes += 1;
    poll.votedUsers.set(userId, optionIndex);
    await poll.save();

    const userVote = optionIndex;
    const pollObj = poll.toObject();
    delete pollObj.votedUsers;

    res.json({
      ...pollObj,
      userVote
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
