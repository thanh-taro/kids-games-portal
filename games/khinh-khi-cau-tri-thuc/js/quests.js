// Dynamic quest generation: math, English vocab, playful quiz, general
// knowledge, national flags, and cooking. Every quest is generated fresh
// from the current stage number, which drives difficulty (operand size,
// distractor closeness, category mix).

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// A "shuffle bag": draws items from `pool` in random order without repeats,
// reshuffling a fresh cycle once every item has been drawn. Used so kids
// don't see the same vocab word, riddle, or fact twice in a row across a
// whole play session — only after the entire pool has been exhausted does
// it start repeating.
function createShuffleBag(pool) {
  let bag = [];
  return function drawNext() {
    if (bag.length === 0) bag = shuffle(pool);
    return bag.pop();
  };
}

// Pools below are curated roughly easy-to-hard by their declared order (e.g.
// FLAGS starts with well-known countries and drifts toward obscure ones).
// A "staged shuffle bag" only draws from the stage-unlocked prefix of the
// pool, so early stages see the easier front of the list while later stages
// gradually unlock the full pool — without ever repeating within whatever
// slice is currently unlocked.
function createStagedShuffleBag(pool, minUnlock, perStage) {
  const bagByUnlocked = new Map();
  return function drawNext(stage) {
    const unlocked = Math.min(pool.length, minUnlock + stage * perStage);
    let bag = bagByUnlocked.get(unlocked);
    if (!bag || bag.length === 0) {
      bag = shuffle(pool.slice(0, unlocked));
      bagByUnlocked.set(unlocked, bag);
    }
    return bag.pop();
  };
}

// Builds a 4-choice answer set (or fewer for very early stages) containing
// the correct answer plus unique, plausible distractors from `distractorFn`.
function buildChoices(correct, distractorFn, count = 4) {
  const choices = new Set([correct]);
  let guard = 0;
  while (choices.size < count && guard < 50) {
    choices.add(distractorFn());
    guard++;
  }
  return shuffle(Array.from(choices));
}

// --- Math --------------------------------------------------------------

function genMath(stage) {
  const ops = stage < 3 ? ["+"] : stage < 6 ? ["+", "-"] : stage < 12 ? ["+", "-", "×"] : ["+", "-", "×", "÷"];
  const op = pick(ops);
  const maxOperand = Math.min(10 + stage * 2, 60);
  let a, b, answer, text;

  if (op === "+") {
    a = randInt(1, maxOperand);
    b = randInt(1, maxOperand);
    answer = a + b;
    text = `${a} + ${b} = ?`;
  } else if (op === "-") {
    a = randInt(1, maxOperand);
    b = randInt(0, a);
    answer = a - b;
    text = `${a} - ${b} = ?`;
  } else if (op === "×") {
    a = randInt(1, Math.min(4 + Math.floor(stage / 3), 12));
    b = randInt(1, Math.min(4 + Math.floor(stage / 3), 12));
    answer = a * b;
    text = `${a} × ${b} = ?`;
  } else {
    b = randInt(2, Math.min(4 + Math.floor(stage / 3), 12));
    const q = randInt(1, Math.min(4 + Math.floor(stage / 3), 12));
    a = b * q;
    answer = q;
    text = `${a} ÷ ${b} = ?`;
  }

  const spread = Math.max(2, Math.round(answer * 0.2) + 1);
  const choices = buildChoices(answer, () => {
    const delta = randInt(-spread, spread) || 1;
    const v = answer + delta;
    return v < 0 ? answer + Math.abs(delta) + 1 : v;
  });

  return { category: "math", prompt: text, choices, answer };
}

// --- Toán tìm đáp số (word problems) ------------------------------------

const WORD_PROBLEM_NAMES = ["An", "Bình", "Chi", "Dũng", "Lan", "Minh", "Hoa", "Nam", "Mai", "Tuấn"];

const WORD_PROBLEM_ITEMS = [
  "quả bóng bay",
  "cái kẹo",
  "quyển vở",
  "cây bút chì",
  "con cá vàng",
  "bông hoa",
  "quả táo",
  "chiếc xe đồ chơi",
  "con búp bê",
  "cái bánh",
];

// Add/subtract "story" templates. Each returns { a, b, answer, text } where
// `a` and `b` are the two numbers already placed into the sentence.
const WORD_PROBLEM_TEMPLATES = [
  (n1, n2, item, a, b) =>
    `${n1} có ${a} ${item}. ${n2} cho ${n1} thêm ${b} ${item} nữa. Hỏi ${n1} có tất cả bao nhiêu ${item}?`,
  (n1, n2, item, a, b) =>
    `${n1} có ${a} ${item}. ${n1} cho ${n2} ${b} ${item}. Hỏi ${n1} còn lại bao nhiêu ${item}?`,
  (n1, n2, item, a, b) =>
    `${n1} có ${a} ${item}, ${n2} có ${b} ${item}. Hỏi cả hai bạn có tất cả bao nhiêu ${item}?`,
  (n1, n2, item, a, b) =>
    `Trong giỏ có ${a} ${item}. Mẹ lấy ra ${b} ${item}. Hỏi trong giỏ còn lại bao nhiêu ${item}?`,
];

function genMathWord(stage) {
  const maxOperand = Math.min(8 + stage * 2, 40);
  const useSubtract = stage >= 3 && Math.random() < 0.5;
  const templateIdx = useSubtract ? pick([1, 3]) : pick([0, 2]);
  const [n1, n2] = shuffle(WORD_PROBLEM_NAMES).slice(0, 2);
  const item = pick(WORD_PROBLEM_ITEMS);

  let a, b, answer;
  if (useSubtract) {
    a = randInt(2, maxOperand);
    b = randInt(1, a);
    answer = a - b;
  } else {
    a = randInt(1, maxOperand);
    b = randInt(1, maxOperand);
    answer = a + b;
  }

  const text = WORD_PROBLEM_TEMPLATES[templateIdx](n1, n2, item, a, b);

  const spread = Math.max(2, Math.round(answer * 0.2) + 1);
  const choices = buildChoices(answer, () => {
    const delta = randInt(-spread, spread) || 1;
    const v = answer + delta;
    return v < 0 ? answer + Math.abs(delta) + 1 : v;
  });

  return { category: "mathword", prompt: text, choices, answer };
}

// --- English vocab -------------------------------------------------------

const VOCAB = [
  { emoji: "🐶", en: "Dog" },
  { emoji: "🐱", en: "Cat" },
  { emoji: "🐘", en: "Elephant" },
  { emoji: "🦁", en: "Lion" },
  { emoji: "🐸", en: "Frog" },
  { emoji: "🐟", en: "Fish" },
  { emoji: "🐦", en: "Bird" },
  { emoji: "🐝", en: "Bee" },
  { emoji: "🍎", en: "Apple" },
  { emoji: "🍌", en: "Banana" },
  { emoji: "🍇", en: "Grape" },
  { emoji: "🍓", en: "Strawberry" },
  { emoji: "☀️", en: "Sun" },
  { emoji: "🌙", en: "Moon" },
  { emoji: "⭐", en: "Star" },
  { emoji: "🌈", en: "Rainbow" },
  { emoji: "🚗", en: "Car" },
  { emoji: "✈️", en: "Airplane" },
  { emoji: "🚀", en: "Rocket" },
  { emoji: "⛵", en: "Boat" },
  { emoji: "🏠", en: "House" },
  { emoji: "🌳", en: "Tree" },
  { emoji: "☂️", en: "Umbrella" },
  { emoji: "📚", en: "Book" },
  { emoji: "🔴", en: "Red" },
  { emoji: "🔵", en: "Blue" },
  { emoji: "🟢", en: "Green" },
  { emoji: "🟡", en: "Yellow" },
  { emoji: "🐴", en: "Horse" },
  { emoji: "🐮", en: "Cow" },
  { emoji: "🐷", en: "Pig" },
  { emoji: "🐑", en: "Sheep" },
  { emoji: "🐔", en: "Chicken" },
  { emoji: "🦆", en: "Duck" },
  { emoji: "🐢", en: "Turtle" },
  { emoji: "🦋", en: "Butterfly" },
  { emoji: "🕷️", en: "Spider" },
  { emoji: "🐍", en: "Snake" },
  { emoji: "🍊", en: "Orange" },
  { emoji: "🍉", en: "Watermelon" },
  { emoji: "🍍", en: "Pineapple" },
  { emoji: "🥕", en: "Carrot" },
  { emoji: "🍞", en: "Bread" },
  { emoji: "🥛", en: "Milk" },
  { emoji: "🧊", en: "Ice" },
  { emoji: "🔥", en: "Fire" },
  { emoji: "💧", en: "Water" },
  { emoji: "🌊", en: "Ocean" },
  { emoji: "🏔️", en: "Mountain" },
  { emoji: "🌸", en: "Flower" },
  { emoji: "🍃", en: "Leaf" },
  { emoji: "👋", en: "Hand" },
  { emoji: "👀", en: "Eyes" },
  { emoji: "👂", en: "Ear" },
  { emoji: "👃", en: "Nose" },
  { emoji: "🚲", en: "Bicycle" },
  { emoji: "🚌", en: "Bus" },
  { emoji: "🚂", en: "Train" },
  { emoji: "⚽", en: "Ball" },
  { emoji: "🎈", en: "Balloon" },
  { emoji: "🎂", en: "Cake" },
  { emoji: "🕐", en: "Clock" },
  { emoji: "🔑", en: "Key" },
  { emoji: "🪑", en: "Chair" },
  { emoji: "🛏️", en: "Bed" },
  { emoji: "🦊", en: "Fox" },
  { emoji: "🐺", en: "Wolf" },
  { emoji: "🐻", en: "Bear" },
  { emoji: "🐼", en: "Panda" },
  { emoji: "🐨", en: "Koala" },
  { emoji: "🦒", en: "Giraffe" },
  { emoji: "🦓", en: "Zebra" },
  { emoji: "🐬", en: "Dolphin" },
  { emoji: "🐳", en: "Whale" },
  { emoji: "🦀", en: "Crab" },
  { emoji: "🐙", en: "Octopus" },
  { emoji: "🦉", en: "Owl" },
  { emoji: "🦇", en: "Bat" },
  { emoji: "🍒", en: "Cherry" },
  { emoji: "🍑", en: "Peach" },
  { emoji: "🥑", en: "Avocado" },
  { emoji: "🌽", en: "Corn" },
  { emoji: "🥔", en: "Potato" },
  { emoji: "🧀", en: "Cheese" },
  { emoji: "🍳", en: "Egg" },
  { emoji: "🍦", en: "Ice Cream" },
  { emoji: "🍪", en: "Cookie" },
  { emoji: "☁️", en: "Cloud" },
  { emoji: "⚡", en: "Lightning" },
  { emoji: "❄️", en: "Snow" },
  { emoji: "🌵", en: "Cactus" },
  { emoji: "🍁", en: "Autumn Leaf" },
  { emoji: "👑", en: "Crown" },
  { emoji: "👓", en: "Glasses" },
  { emoji: "🧦", en: "Sock" },
  { emoji: "👕", en: "Shirt" },
  { emoji: "🎩", en: "Hat" },
  { emoji: "🎁", en: "Gift" },
  { emoji: "🎨", en: "Paint" },
  { emoji: "✏️", en: "Pencil" },
  { emoji: "✂️", en: "Scissors" },
  { emoji: "📱", en: "Phone" },
  { emoji: "💻", en: "Computer" },
  { emoji: "🎸", en: "Guitar" },
  { emoji: "🥁", en: "Drum" },
  { emoji: "⛄", en: "Snowman" },
  { emoji: "🏀", en: "Basketball" },
  { emoji: "🎯", en: "Target" },
  { emoji: "🐹", en: "Hamster" },
  { emoji: "🐭", en: "Mouse" },
  { emoji: "🦔", en: "Hedgehog" },
  { emoji: "🦘", en: "Kangaroo" },
  { emoji: "🦚", en: "Peacock" },
  { emoji: "🦜", en: "Parrot" },
  { emoji: "🦈", en: "Shark" },
  { emoji: "🐊", en: "Crocodile" },
  { emoji: "🦕", en: "Dinosaur" },
  { emoji: "🐜", en: "Ant" },
  { emoji: "🐌", en: "Snail" },
  { emoji: "🥭", en: "Mango" },
  { emoji: "🍋", en: "Lemon" },
  { emoji: "🥒", en: "Cucumber" },
  { emoji: "🍅", en: "Tomato" },
  { emoji: "🧅", en: "Onion" },
  { emoji: "🍯", en: "Honey" },
  { emoji: "🍚", en: "Rice" },
  { emoji: "🍵", en: "Tea" },
  { emoji: "🌋", en: "Volcano" },
  { emoji: "🏝️", en: "Island" },
  { emoji: "🏜️", en: "Desert" },
  { emoji: "🌾", en: "Wheat" },
  { emoji: "🌻", en: "Sunflower" },
  { emoji: "🌴", en: "Palm Tree" },
  { emoji: "🍄", en: "Mushroom" },
  { emoji: "🦶", en: "Foot" },
  { emoji: "🦷", en: "Tooth" },
  { emoji: "💪", en: "Arm" },
  { emoji: "🧠", en: "Brain" },
  { emoji: "👶", en: "Baby" },
  { emoji: "👴", en: "Grandfather" },
  { emoji: "👵", en: "Grandmother" },
  { emoji: "🧑‍🏫", en: "Teacher" },
  { emoji: "👨‍⚕️", en: "Doctor" },
  { emoji: "👮", en: "Police" },
  { emoji: "🚒", en: "Fire Truck" },
  { emoji: "🚑", en: "Ambulance" },
  { emoji: "🚁", en: "Helicopter" },
  { emoji: "🛴", en: "Scooter" },
  { emoji: "🧸", en: "Teddy Bear" },
  { emoji: "🪁", en: "Kite" },
  { emoji: "🎲", en: "Dice" },
  { emoji: "🧩", en: "Puzzle" },
  { emoji: "🎣", en: "Fishing" },
  { emoji: "📷", en: "Camera" },
  { emoji: "💡", en: "Lightbulb" },
  { emoji: "🕯️", en: "Candle" },
  { emoji: "🐋", en: "Blue Whale" },
  { emoji: "🦥", en: "Sloth" },
  { emoji: "🦦", en: "Otter" },
  { emoji: "🦡", en: "Badger" },
  { emoji: "🐿️", en: "Squirrel" },
  { emoji: "🦩", en: "Flamingo" },
  { emoji: "🐧", en: "Penguin" },
  { emoji: "🦢", en: "Swan" },
  { emoji: "🐞", en: "Ladybug" },
  { emoji: "🦗", en: "Cricket" },
  { emoji: "🦂", en: "Scorpion" },
  { emoji: "🍐", en: "Pear" },
  { emoji: "🫐", en: "Blueberry" },
  { emoji: "🥝", en: "Kiwi" },
  { emoji: "🫑", en: "Pepper" },
  { emoji: "🥦", en: "Broccoli" },
  { emoji: "🧄", en: "Garlic" },
  { emoji: "🥐", en: "Croissant" },
  { emoji: "🥞", en: "Pancake" },
  { emoji: "🍟", en: "French Fries" },
  { emoji: "🍕", en: "Pizza" },
  { emoji: "🌭", en: "Hot Dog" },
  { emoji: "🍔", en: "Hamburger" },
  { emoji: "🍩", en: "Donut" },
  { emoji: "🍫", en: "Chocolate" },
  { emoji: "🍭", en: "Lollipop" },
  { emoji: "🥤", en: "Juice" },
  { emoji: "🌤️", en: "Sunny" },
  { emoji: "🌧️", en: "Rain" },
  { emoji: "🌪️", en: "Tornado" },
  { emoji: "🌫️", en: "Fog" },
  { emoji: "🪐", en: "Planet" },
  { emoji: "🛰️", en: "Satellite" },
  { emoji: "🔬", en: "Microscope" },
  { emoji: "🔭", en: "Telescope" },
  { emoji: "🧲", en: "Magnet" },
  { emoji: "⚗️", en: "Flask" },
  { emoji: "🩹", en: "Bandage" },
  { emoji: "💊", en: "Pill" },
  { emoji: "🩺", en: "Stethoscope" },
  { emoji: "🧴", en: "Lotion" },
  { emoji: "🧼", en: "Soap" },
  { emoji: "🪥", en: "Toothbrush" },
  { emoji: "🛁", en: "Bathtub" },
  { emoji: "🚿", en: "Shower" },
  { emoji: "🪟", en: "Window" },
  { emoji: "🚪", en: "Door" },
  { emoji: "🪜", en: "Ladder" },
  { emoji: "🧹", en: "Broom" },
  { emoji: "🪣", en: "Bucket" },
  { emoji: "🦌", en: "Deer" },
  { emoji: "🐐", en: "Goat" },
  { emoji: "🦙", en: "Llama" },
  { emoji: "🐫", en: "Camel" },
  { emoji: "🦏", en: "Rhino" },
  { emoji: "🦛", en: "Hippo" },
  { emoji: "🐗", en: "Boar" },
  { emoji: "🐕", en: "Puppy" },
  { emoji: "🐈", en: "Kitten" },
  { emoji: "🦤", en: "Dodo" },
  { emoji: "🦫", en: "Beaver" },
  { emoji: "🐁", en: "Rat" },
  { emoji: "🐇", en: "Rabbit" },
  { emoji: "🦎", en: "Lizard" },
  { emoji: "🐡", en: "Pufferfish" },
  { emoji: "🐠", en: "Tropical Fish" },
  { emoji: "🦞", en: "Lobster" },
  { emoji: "🦐", en: "Shrimp" },
  { emoji: "🦑", en: "Squid" },
  { emoji: "🌰", en: "Chestnut" },
  { emoji: "🫒", en: "Olive" },
  { emoji: "🥜", en: "Peanut" },
  { emoji: "🫘", en: "Beans" },
  { emoji: "🥬", en: "Lettuce" },
  { emoji: "🥗", en: "Salad" },
  { emoji: "🍲", en: "Soup" },
  { emoji: "🍜", en: "Noodles" },
  { emoji: "🍝", en: "Spaghetti" },
  { emoji: "🍣", en: "Sushi" },
  { emoji: "🥟", en: "Dumpling" },
  { emoji: "🧇", en: "Waffle" },
  { emoji: "🕹️", en: "Joystick" },
  { emoji: "🎮", en: "Game Controller" },
  { emoji: "🎺", en: "Trumpet" },
  { emoji: "🎻", en: "Violin" },
  { emoji: "🎹", en: "Piano" },
  { emoji: "🎬", en: "Movie" },
  { emoji: "🎭", en: "Theater Masks" },
  { emoji: "🖼️", en: "Painting" },
  { emoji: "🗺️", en: "Map" },
  { emoji: "🧭", en: "Compass" },
  { emoji: "⏰", en: "Alarm Clock" },
  { emoji: "📅", en: "Calendar" },
  { emoji: "✉️", en: "Envelope" },
  { emoji: "📦", en: "Box" },
  { emoji: "🛒", en: "Shopping Cart" },
  { emoji: "💰", en: "Money" },
  { emoji: "🏦", en: "Bank" },
  { emoji: "🏫", en: "School" },
  { emoji: "🏥", en: "Hospital" },
  { emoji: "🏰", en: "Castle" },
  { emoji: "⛺", en: "Tent" },
  { emoji: "🌡️", en: "Thermometer" },
  { emoji: "🧯", en: "Fire Extinguisher" },
  { emoji: "🦭", en: "Seal" },
  { emoji: "🦃", en: "Turkey" },
  { emoji: "🦅", en: "Eagle" },
  { emoji: "🐆", en: "Leopard" },
  { emoji: "🐅", en: "Tiger" },
  { emoji: "🦝", en: "Raccoon" },
  { emoji: "🦨", en: "Skunk" },
  { emoji: "🐾", en: "Paw Print" },
  { emoji: "🍆", en: "Eggplant" },
  { emoji: "🥥", en: "Coconut" },
  { emoji: "🫓", en: "Flatbread" },
  { emoji: "🍿", en: "Popcorn" },
  { emoji: "🍶", en: "Sake" },
  { emoji: "🧃", en: "Juice Box" },
  { emoji: "🎪", en: "Circus Tent" },
  { emoji: "🎡", en: "Ferris Wheel" },
  { emoji: "🎢", en: "Roller Coaster" },
  { emoji: "🛝", en: "Slide" },
  { emoji: "🏖️", en: "Beach" },
  { emoji: "🏕️", en: "Camping" },
  { emoji: "🚤", en: "Speedboat" },
  { emoji: "🛶", en: "Canoe" },
  { emoji: "🚦", en: "Traffic Light" },
  { emoji: "🚧", en: "Construction" },
  { emoji: "🏗️", en: "Crane" },
  { emoji: "🧱", en: "Brick" },
  { emoji: "🪓", en: "Axe" },
  { emoji: "🔨", en: "Hammer" },
  { emoji: "🪛", en: "Screwdriver" },
  { emoji: "🔧", en: "Wrench" },
  { emoji: "🧰", en: "Toolbox" },
  { emoji: "📐", en: "Ruler" },
  { emoji: "📏", en: "Measuring Tape" },
  { emoji: "🖊️", en: "Pen" },
  { emoji: "📖", en: "Open Book" },
  { emoji: "🎓", en: "Graduation Cap" },
  { emoji: "🏆", en: "Trophy" },
  { emoji: "🥇", en: "Gold Medal" },
  { emoji: "🎖️", en: "Medal" },
];

const OPPOSITES = [
  { word: "Hot", answer: "Cold", options: ["Cold", "Big", "Fast", "Happy"] },
  { word: "Big", answer: "Small", options: ["Small", "Loud", "Tall", "Cold"] },
  { word: "Up", answer: "Down", options: ["Down", "Left", "Fast", "Slow"] },
  { word: "Happy", answer: "Sad", options: ["Sad", "Hot", "Big", "Loud"] },
  { word: "Fast", answer: "Slow", options: ["Slow", "Small", "Sad", "Cold"] },
  { word: "Day", answer: "Night", options: ["Night", "Sun", "Rain", "Hot"] },
  { word: "Open", answer: "Close", options: ["Close", "Big", "Slow", "Down"] },
  { word: "Old", answer: "New", options: ["New", "Small", "Sad", "Fast"] },
  { word: "Long", answer: "Short", options: ["Short", "Tall", "Wide", "Deep"] },
  { word: "Wet", answer: "Dry", options: ["Dry", "Cold", "Clean", "Soft"] },
  { word: "Full", answer: "Empty", options: ["Empty", "Heavy", "Light", "Loud"] },
  { word: "Clean", answer: "Dirty", options: ["Dirty", "Wet", "Hard", "Old"] },
  { word: "Hard", answer: "Soft", options: ["Soft", "Weak", "Small", "Slow"] },
  { word: "Strong", answer: "Weak", options: ["Weak", "Short", "Cold", "Sad"] },
  { word: "Left", answer: "Right", options: ["Right", "Up", "Down", "Front"] },
  { word: "In", answer: "Out", options: ["Out", "Up", "Down", "Near"] },
  { word: "Near", answer: "Far", options: ["Far", "Wide", "Deep", "High"] },
  { word: "Rich", answer: "Poor", options: ["Poor", "Sad", "Weak", "Small"] },
  { word: "Young", answer: "Old", options: ["Old", "Small", "Weak", "Slow"] },
  { word: "High", answer: "Low", options: ["Low", "Far", "Wide", "Deep"] },
  { word: "Light", answer: "Heavy", options: ["Heavy", "Dark", "Hard", "Big"] },
  { word: "First", answer: "Last", options: ["Last", "Next", "Near", "Far"] },
  { word: "Start", answer: "Finish", options: ["Finish", "Begin", "Open", "Stop"] },
  { word: "Give", answer: "Take", options: ["Take", "Get", "Buy", "Keep"] },
  { word: "Push", answer: "Pull", options: ["Pull", "Lift", "Drop", "Throw"] },
  { word: "Buy", answer: "Sell", options: ["Sell", "Pay", "Give", "Take"] },
  { word: "Win", answer: "Lose", options: ["Lose", "Fail", "Stop", "Quit"] },
  { word: "Easy", answer: "Difficult", options: ["Difficult", "Hard", "Slow", "Heavy"] },
  { word: "Loud", answer: "Quiet", options: ["Quiet", "Soft", "Calm", "Low"] },
  { word: "Sweet", answer: "Sour", options: ["Sour", "Bitter", "Spicy", "Salty"] },
  { word: "Thick", answer: "Thin", options: ["Thin", "Wide", "Short", "Small"] },
  { word: "Wide", answer: "Narrow", options: ["Narrow", "Thin", "Short", "Flat"] },
  { word: "Deep", answer: "Shallow", options: ["Shallow", "Wide", "Thin", "Low"] },
  { word: "Bright", answer: "Dark", options: ["Dark", "Dull", "Deep", "Low"] },
  { word: "Awake", answer: "Asleep", options: ["Asleep", "Tired", "Slow", "Quiet"] },
  { word: "Laugh", answer: "Cry", options: ["Cry", "Sleep", "Yell", "Run"] },
  { word: "Sit", answer: "Stand", options: ["Stand", "Run", "Jump", "Walk"] },
  { word: "Front", answer: "Back", options: ["Back", "Side", "Top", "Bottom"] },
  { word: "Top", answer: "Bottom", options: ["Bottom", "Side", "Front", "Back"] },
  { word: "Early", answer: "Late", options: ["Late", "Slow", "Soon", "Fast"] },
  { word: "Same", answer: "Different", options: ["Different", "Equal", "Alike", "Similar"] },
  { word: "True", answer: "False", options: ["False", "Wrong", "Bad", "Fake"] },
  { word: "Kind", answer: "Mean", options: ["Mean", "Rude", "Sad", "Angry"] },
  { word: "Brave", answer: "Scared", options: ["Scared", "Weak", "Sad", "Shy"] },
  { word: "Sick", answer: "Healthy", options: ["Healthy", "Strong", "Young", "Fast"] },
  { word: "Thirsty", answer: "Hungry", options: ["Hungry", "Tired", "Sleepy", "Full"] },
  { word: "Above", answer: "Below", options: ["Below", "Beside", "Near", "Around"] },
  { word: "Inside", answer: "Outside", options: ["Outside", "Above", "Below", "Beside"] },
  { word: "Cheap", answer: "Expensive", options: ["Expensive", "Big", "Heavy", "Old"] },
  { word: "Beautiful", answer: "Ugly", options: ["Ugly", "Sad", "Small", "Old"] },
  { word: "Clever", answer: "Silly", options: ["Silly", "Slow", "Weak", "Lazy"] },
  { word: "Busy", answer: "Free", options: ["Free", "Tired", "Lazy", "Slow"] },
  { word: "Ancient", answer: "Modern", options: ["Modern", "New", "Fast", "Bright"] },
  { word: "Polite", answer: "Rude", options: ["Rude", "Loud", "Angry", "Mean"] },
  { word: "Safe", answer: "Dangerous", options: ["Dangerous", "Scary", "Wild", "Fast"] },
  { word: "Wild", answer: "Tame", options: ["Tame", "Quiet", "Slow", "Calm"] },
  { word: "Empty", answer: "Full", options: ["Full", "Heavy", "Light", "Big"] },
  { word: "Short", answer: "Tall", options: ["Tall", "Wide", "Deep", "Long"] },
  { word: "Fat", answer: "Thin", options: ["Thin", "Small", "Weak", "Short"] },
  { word: "Traditional", answer: "Modern", options: ["Modern", "New", "Fast", "Bright"] },
  { word: "Noisy", answer: "Silent", options: ["Silent", "Calm", "Soft", "Slow"] },
  { word: "Straight", answer: "Crooked", options: ["Crooked", "Bent", "Round", "Curly"] },
  { word: "Smooth", answer: "Rough", options: ["Rough", "Hard", "Sharp", "Bumpy"] },
  { word: "Sharp", answer: "Dull", options: ["Dull", "Blunt", "Soft", "Flat"] },
  { word: "Rise", answer: "Fall", options: ["Fall", "Drop", "Sink", "Land"] },
  { word: "Remember", answer: "Forget", options: ["Forget", "Lose", "Miss", "Skip"] },
  { word: "Question", answer: "Answer", options: ["Answer", "Reply", "Guess", "Solve"] },
  { word: "Begin", answer: "End", options: ["End", "Stop", "Finish", "Close"] },
  { word: "Build", answer: "Destroy", options: ["Destroy", "Break", "Ruin", "Smash"] },
  { word: "Freeze", answer: "Melt", options: ["Melt", "Boil", "Burn", "Cool"] },
  { word: "Ask", answer: "Tell", options: ["Tell", "Say", "Reply", "Explain"] },
  { word: "Married", answer: "Single", options: ["Single", "Alone", "Free", "Lonely"] },
  { word: "Public", answer: "Private", options: ["Private", "Secret", "Quiet", "Personal"] },
  { word: "Real", answer: "Fake", options: ["Fake", "Wrong", "False", "Copy"] },
  { word: "Whole", answer: "Broken", options: ["Broken", "Half", "Small", "Piece"] },
  { word: "Simple", answer: "Complicated", options: ["Complicated", "Hard", "Slow", "Heavy"] },
  { word: "Wake", answer: "Sleep", options: ["Sleep", "Rest", "Dream", "Nap"] },
  { word: "Arrive", answer: "Leave", options: ["Leave", "Depart", "Go", "Exit"] },
  { word: "Fill", answer: "Empty", options: ["Empty", "Drain", "Pour", "Spill"] },
  { word: "Attack", answer: "Defend", options: ["Defend", "Guard", "Protect", "Shield"] },
  { word: "Add", answer: "Subtract", options: ["Subtract", "Remove", "Take", "Minus"] },
  { word: "Import", answer: "Export", options: ["Export", "Trade", "Sell", "Ship"] },
  { word: "Increase", answer: "Decrease", options: ["Decrease", "Reduce", "Lower", "Drop"] },
];

const nextVocab = createShuffleBag(VOCAB);
const nextOpposite = createShuffleBag(OPPOSITES);

function genEnglish(stage) {
  if (stage >= 5 && Math.random() < 0.4) {
    const item = nextOpposite();
    return {
      category: "english",
      prompt: `Opposite of "${item.word}"?`,
      choices: shuffle(item.options),
      answer: item.answer,
    };
  }
  const item = nextVocab();
  const distractPool = VOCAB.filter((v) => v.en !== item.en);
  const choices = new Set([item.en]);
  while (choices.size < 4) {
    choices.add(pick(distractPool).en);
  }
  return {
    category: "english",
    prompt: `${item.emoji}  What is this in English?`,
    choices: shuffle(Array.from(choices)),
    answer: item.en,
  };
}

// --- Đố vui (playful/fun quiz) ------------------------------------------

const QUIZ = [
  // Animal sounds & silly animal riddles
  { q: "Con vật nào kêu 'ụm bò'?", a: "Con bò", options: ["Con bò", "Con lợn", "Con cừu", "Con ngựa"] },
  { q: "Con vật nào kêu 'meo meo'?", a: "Con mèo", options: ["Con mèo", "Con chó", "Con vịt", "Con gà"] },
  { q: "Con vật nào kêu 'gâu gâu'?", a: "Con chó", options: ["Con chó", "Con mèo", "Con heo", "Con dê"] },
  { q: "Con vật nào kêu 'ò ó o'?", a: "Con gà trống", options: ["Con gà trống", "Con vịt", "Con chim", "Con ngỗng"] },
  { q: "Con gì ăn chuối mỗi ngày và thích trèo cây?", a: "Con khỉ", options: ["Con khỉ", "Con voi", "Con hổ", "Con gấu"] },
  { q: "Con gì có cái cổ dài nhất trong các loài vật?", a: "Hươu cao cổ", options: ["Hươu cao cổ", "Voi", "Ngựa vằn", "Lạc đà"] },
  { q: "Con gì mang cả nhà trên lưng đi khắp nơi?", a: "Con ốc sên", options: ["Con ốc sên", "Con rùa", "Con cua", "Con cóc"] },
  { q: "Con gì to xác nhưng lại sợ chuột nhất trong phim hoạt hình?", a: "Con voi", options: ["Con voi", "Con hổ", "Con sư tử", "Con gấu"] },
  { q: "Con gì bay được nhưng không phải là chim?", a: "Con dơi", options: ["Con dơi", "Con sóc", "Con nhện", "Con thỏ"] },
  { q: "Con gì thích ăn cà rốt và có đôi tai dài?", a: "Con thỏ", options: ["Con thỏ", "Con chuột", "Con sóc", "Con nai"] },
  { q: "Con gì hay xuất hiện trong câu chuyện 'Rùa và Thỏ'?", a: "Con rùa", options: ["Con rùa", "Con ếch", "Con cáo", "Con sói"] },
  { q: "Con gì có cái đuôi xòe ra như chiếc quạt nhiều màu?", a: "Con công", options: ["Con công", "Con gà", "Con vịt", "Con ngỗng"] },
  { q: "Con gì có thể nói bắt chước tiếng người?", a: "Con vẹt", options: ["Con vẹt", "Con quạ", "Con sáo", "Con chim sẻ"] },
  { q: "Con gì thích ngủ suốt mùa đông, không ăn gì cả?", a: "Con gấu", options: ["Con gấu", "Con thỏ", "Con sóc", "Con nai"] },
  { q: "Con vật nào kêu 'be be'?", a: "Con dê", options: ["Con dê", "Con cừu", "Con lợn", "Con ngựa"] },
  { q: "Con vật nào kêu 'ríu rít' trên cành cây?", a: "Con chim", options: ["Con chim", "Con ếch", "Con dế", "Con ong"] },
  { q: "Con gì có 8 cái chân và hay giăng tơ?", a: "Con nhện", options: ["Con nhện", "Con bọ", "Con cua", "Con kiến"] },
  { q: "Con gì thay đổi màu da để trốn kẻ thù?", a: "Tắc kè hoa", options: ["Tắc kè hoa", "Con ếch", "Con rắn", "Con thằn lằn"] },
  { q: "Con gì kêu 'ộp ộp' ở ao hồ?", a: "Con ếch", options: ["Con ếch", "Con cá", "Con vịt", "Con rùa"] },
  { q: "Con vật nào kêu 'chiêm chiếp'?", a: "Con gà con", options: ["Con gà con", "Con vịt con", "Con chim non", "Con ngỗng con"] },
  { q: "Con vật nào kêu 'kêu éc éc'?", a: "Con lợn", options: ["Con lợn", "Con chuột", "Con dê", "Con mèo"] },
  { q: "Con gì có cái mũi dài dùng để hút nước?", a: "Con voi", options: ["Con voi", "Con lợn", "Con tê giác", "Con hà mã"] },
  { q: "Con gì đi rất chậm và có cái mai cứng trên lưng?", a: "Con rùa", options: ["Con rùa", "Con ốc sên", "Con cua", "Con cóc"] },
  { q: "Con gì được gọi là 'chúa tể sơn lâm'?", a: "Con hổ", options: ["Con hổ", "Con sư tử", "Con báo", "Con gấu"] },
  { q: "Con gì thích leo núi và có bộ lông trắng ở vùng cực?", a: "Gấu Bắc Cực", options: ["Gấu Bắc Cực", "Gấu trúc", "Gấu nâu", "Sư tử biển"] },
  { q: "Con gì sống dưới nước nhưng lại thở bằng phổi như con người?", a: "Cá heo", options: ["Cá heo", "Cá mập", "Cá voi con", "Cá ngừ"] },
  { q: "Con gì chăm chỉ tha mồi về tổ, sống thành đàn?", a: "Con kiến", options: ["Con kiến", "Con ong", "Con bướm", "Con nhện"] },
  { q: "Con gì có màu sắc sặc sỡ và bay từ hoa này sang hoa khác?", a: "Con bướm", options: ["Con bướm", "Con chuồn chuồn", "Con ong", "Con ve"] },
  { q: "Con vật nào kêu 'ụt ịt'?", a: "Con lợn", options: ["Con lợn", "Con bò", "Con dê", "Con vịt"] },
  { q: "Con vật nào kêu 'cạc cạc'?", a: "Con vịt", options: ["Con vịt", "Con ngỗng", "Con gà", "Con chim"] },
  { q: "Con vật nào kêu 'gừ gừ' khi vui vẻ?", a: "Con mèo", options: ["Con mèo", "Con chó", "Con hổ", "Con sư tử"] },
  { q: "Con gì được mệnh danh là 'vua của bầu trời'?", a: "Đại bàng", options: ["Đại bàng", "Chim sẻ", "Bồ câu", "Cú mèo"] },
  { q: "Con gì có thể sống cả trên cạn lẫn dưới nước?", a: "Con ếch", options: ["Con ếch", "Con cá", "Con chim", "Con mèo"] },
  { q: "Con gì có gai nhọn khắp mình để tự vệ?", a: "Con nhím", options: ["Con nhím", "Con sóc", "Con thỏ", "Con chuột"] },
  { q: "Con gì biết đổi từ sâu bướm thành sinh vật biết bay?", a: "Con bướm", options: ["Con bướm", "Con ong", "Con ve", "Con chuồn chuồn"] },
  { q: "Con vật nào kêu 'quạc quạc' và bơi giỏi dưới nước?", a: "Con vịt", options: ["Con vịt", "Con ngỗng", "Con thiên nga", "Con cò"] },
  { q: "Con gì có túi trước bụng để giữ con non?", a: "Chuột túi", options: ["Chuột túi", "Gấu túi", "Khỉ", "Sóc"] },
  { q: "Con gì được gọi là 'kỹ sư xây đập' vì hay đắp đập trên sông?", a: "Con hải ly", options: ["Con hải ly", "Con rái cá", "Con chuột", "Con thỏ"] },
  { q: "Con gì có thể phun mực đen để trốn kẻ thù?", a: "Con mực", options: ["Con mực", "Con cá", "Con tôm", "Con cua"] },
  { q: "Con gì được coi là loài chạy nhanh nhất trong các loài chim?", a: "Đà điểu", options: ["Đà điểu", "Chim cánh cụt", "Bồ câu", "Vẹt"] },
  { q: "Con gì thích ngủ treo ngược đầu xuống?", a: "Con dơi", options: ["Con dơi", "Con khỉ", "Con sóc", "Con chim"] },
  { q: "Con gì có thể nhảy xa hơn chiều dài cơ thể nó rất nhiều lần?", a: "Con châu chấu", options: ["Con châu chấu", "Con kiến", "Con ong", "Con bọ rùa"] },
  { q: "Con gì có lông xù và thích đào hang trong đất?", a: "Con thỏ", options: ["Con thỏ", "Con chuột", "Con nhím", "Con sóc"] },
  { q: "Con gì được coi là loài thông minh nhất đại dương?", a: "Cá heo", options: ["Cá heo", "Cá mập", "Cá voi", "Cá ngừ"] },
  { q: "Con gì có thể đổi giới tính từ đực sang cái khi cần thiết?", a: "Cá hề", options: ["Cá hề", "Cá vàng", "Cá heo", "Cá mập"] },
  { q: "Con gì ngủ đứng và chỉ nằm rất ít khi ngủ?", a: "Con ngựa", options: ["Con ngựa", "Con bò", "Con dê", "Con lừa"] },
  { q: "Con gì có thể sống mà không cần uống nước trong nhiều ngày nhờ có bướu?", a: "Lạc đà", options: ["Lạc đà", "Ngựa vằn", "Hươu cao cổ", "Voi"] },
  { q: "Con gì có cái mai để tự bảo vệ và có thể rụt đầu vào trong?", a: "Con rùa", options: ["Con rùa", "Con ốc sên", "Con cua", "Con tôm"] },

  // Silly food riddles
  { q: "Quả gì càng lột vỏ càng làm bạn khóc?", a: "Củ hành", options: ["Củ hành", "Quả chuối", "Quả cam", "Củ tỏi"] },
  { q: "Món gì có lỗ ở giữa mà vẫn ăn ngon?", a: "Bánh donut", options: ["Bánh donut", "Bánh mì", "Bánh bao", "Bánh flan"] },
  { q: "Trái cây nào có nhiều 'mắt' nhất?", a: "Quả dứa", options: ["Quả dứa", "Quả táo", "Quả nho", "Quả xoài"] },
  { q: "Món ăn nào làm 'cay xè lưỡi' nếu ăn quá nhiều ớt?", a: "Món cay", options: ["Món cay", "Món ngọt", "Món chua", "Món mặn"] },
  { q: "Loại quả nào có múi và vị chua nhất?", a: "Quả chanh", options: ["Quả chanh", "Quả dưa hấu", "Quả xoài", "Quả nho"] },
  { q: "Món gì được làm đông lạnh và tan chảy nếu để lâu ngoài trời?", a: "Kem", options: ["Kem", "Bánh quy", "Kẹo", "Sữa chua"] },
  { q: "Loại hạt nào nổ bung ra thành bỏng khi rang nóng?", a: "Bắp rang", options: ["Bắp rang", "Đậu phộng", "Hạt dẻ", "Hạt điều"] },
  { q: "Món gì có hình tròn, nhiều lớp và thường có nến cắm lên trong sinh nhật?", a: "Bánh kem", options: ["Bánh kem", "Bánh mì", "Bánh bao", "Bánh quy"] },
  { q: "Trái cây nào có vỏ gai nhưng ruột lại rất thơm và ngọt?", a: "Sầu riêng", options: ["Sầu riêng", "Mít", "Dứa", "Chôm chôm"] },
  { q: "Uống nhiều loại nước này vào ban đêm sẽ khó ngủ vì có caffeine?", a: "Cà phê", options: ["Cà phê", "Nước lọc", "Sữa", "Nước cam"] },
  { q: "Món ăn nào của Việt Nam có bánh tráng cuốn cùng rau và tôm thịt?", a: "Gỏi cuốn", options: ["Gỏi cuốn", "Bánh mì", "Phở", "Bún chả"] },
  { q: "Món nào nổi tiếng của Việt Nam có nước dùng và sợi bánh phở?", a: "Phở", options: ["Phở", "Bún riêu", "Hủ tiếu", "Mì Quảng"] },
  { q: "Loại quả nào có tên gọi là 'vua của các loại trái cây' ở Đông Nam Á?", a: "Sầu riêng", options: ["Sầu riêng", "Mít", "Dứa", "Xoài"] },
  { q: "Vị gì khiến bạn nhăn mặt khi ăn phải chanh?", a: "Vị chua", options: ["Vị chua", "Vị ngọt", "Vị mặn", "Vị đắng"] },

  // What-am-I style riddles (đố mẹo)
  { q: "Vật gì càng dùng càng ngắn đi?", a: "Cây bút chì", options: ["Cây bút chì", "Cái ghế", "Quyển sách", "Cái bàn"] },
  { q: "Vật gì có mặt nhưng không có mắt, mũi, miệng?", a: "Đồng hồ", options: ["Đồng hồ", "Cái gương", "Con búp bê", "Bức tranh"] },
  { q: "Vật gì càng lấy ra càng to hơn?", a: "Cái hố", options: ["Cái hố", "Quả bóng", "Cái hộp", "Cái túi"] },
  { q: "Cái gì luôn ở phía trước bạn nhưng không bao giờ nhìn thấy được?", a: "Tương lai", options: ["Tương lai", "Cái bóng", "Gương", "Ánh sáng"] },
  { q: "Vật gì có 4 chân, có ngăn kéo, và em đặt sách vở lên để học bài?", a: "Cái bàn học", options: ["Cái bàn học", "Cái ghế", "Cái tủ", "Cái giường"] },
  { q: "Vật gì có răng nhưng không thể nhai?", a: "Cái lược", options: ["Cái lược", "Cái muỗng", "Cái nĩa", "Cái kéo"] },
  { q: "Mùa nào lá cây rụng nhiều nhất?", a: "Mùa thu", options: ["Mùa thu", "Mùa xuân", "Mùa hè", "Mùa đông"] },
  { q: "Vật gì càng phơi nắng càng khô, càng gặp nước càng ướt?", a: "Quần áo", options: ["Quần áo", "Cái ô", "Cái bàn", "Cuốn sách"] },
  { q: "Cái gì đi khắp thế giới mà vẫn nằm nguyên một chỗ?", a: "Con tem", options: ["Con tem", "Lá thư", "Bản đồ", "Chiếc vali"] },
  { q: "Cái gì bạn phải cho đi mới giữ được?", a: "Lời hứa", options: ["Lời hứa", "Món quà", "Tiền", "Đồ chơi"] },
  { q: "Cái gì luôn đi theo bạn nhưng chỉ xuất hiện khi có ánh sáng?", a: "Cái bóng", options: ["Cái bóng", "Gương", "Ảnh chụp", "Tiếng vang"] },
  { q: "Vật gì bạn càng đổ nước vào càng nhẹ đi?", a: "Cái lỗ", options: ["Cái lỗ", "Cái xô", "Cái ly", "Cái chai"] },
  { q: "Cái gì có đầu, có đuôi mà không có thân?", a: "Đồng xu", options: ["Đồng xu", "Con rắn", "Cây bút", "Chiếc lá"] },
  { q: "Cái gì bạn đập vỡ ra trước khi dùng nó?", a: "Quả trứng", options: ["Quả trứng", "Cái ly", "Cái đĩa", "Quả dừa"] },
  { q: "Vật gì có nhiều chìa khóa nhưng không mở được cửa nào?", a: "Cây đàn piano", options: ["Cây đàn piano", "Chùm chìa khóa", "Ổ khóa", "Cái tủ"] },
  { q: "Cái gì trên trời mà bạn không thể chạm tới, dù đứng trên núi cao?", a: "Ngôi sao", options: ["Ngôi sao", "Đám mây", "Cầu vồng", "Máy bay"] },

  // Fairy-tale / story characters
  { q: "Ai là người bạn của Doraemon hay quên làm bài tập?", a: "Nobita", options: ["Nobita", "Suneo", "Jaian", "Shizuka"] },
  { q: "Trong truyện cổ tích, ai đã đánh rơi chiếc giày thủy tinh?", a: "Lọ Lem", options: ["Lọ Lem", "Bạch Tuyết", "Công chúa ngủ trong rừng", "Nàng tiên cá"] },
  { q: "Ai là chú chuột nổi tiếng của hãng Disney?", a: "Mickey", options: ["Mickey", "Donald", "Goofy", "Pluto"] },
  { q: "Người tuyết được xây vào mùa nào?", a: "Mùa đông", options: ["Mùa đông", "Mùa hè", "Mùa xuân", "Mùa thu"] },
  { q: "Ai là chú mèo màu xanh đến từ tương lai, có túi thần kỳ?", a: "Doraemon", options: ["Doraemon", "Tom", "Garfield", "Hello Kitty"] },
  { q: "Ai đã leo dây tóc dài của mình xuống từ tòa tháp?", a: "Rapunzel", options: ["Rapunzel", "Bạch Tuyết", "Lọ Lem", "Nàng tiên cá"] },
  { q: "Con sói trong truyện 'Ba chú heo con' thích làm gì?", a: "Thổi sập nhà", options: ["Thổi sập nhà", "Xây nhà", "Trồng cây", "Nấu ăn"] },
  { q: "Ai đã cắn phải quả táo và ngủ suốt nhiều năm?", a: "Bạch Tuyết", options: ["Bạch Tuyết", "Lọ Lem", "Rapunzel", "Nàng tiên cá"] },
  { q: "Chú robot nào của Big Hero 6 luôn chăm sóc sức khỏe mọi người?", a: "Baymax", options: ["Baymax", "WALL-E", "R2-D2", "Doraemon"] },
  { q: "Ai là cô bé mặc áo choàng đỏ đi thăm bà trong rừng?", a: "Cô bé quàng khăn đỏ", options: ["Cô bé quàng khăn đỏ", "Lọ Lem", "Bạch Tuyết", "Rapunzel"] },
  { q: "Ai đã kết bạn với 7 chú lùn trong rừng?", a: "Bạch Tuyết", options: ["Bạch Tuyết", "Lọ Lem", "Rapunzel", "Nàng tiên cá"] },
  { q: "Chú cá nào đi tìm con trai của mình khắp đại dương?", a: "Nemo", options: ["Nemo", "Dory", "Flounder", "Nemo's dad"] },
  { q: "Ai là nàng công chúa có mái tóc dài buông xuống từ cửa sổ tháp cao?", a: "Rapunzel", options: ["Rapunzel", "Bạch Tuyết", "Lọ Lem", "Elsa"] },
  { q: "Ai là công chúa có phép thuật đóng băng mọi thứ trong phim 'Frozen'?", a: "Elsa", options: ["Elsa", "Anna", "Rapunzel", "Belle"] },
  { q: "Ai là cậu bé không bao giờ lớn, sống ở đảo Neverland?", a: "Peter Pan", options: ["Peter Pan", "Pinocchio", "Aladdin", "Simba"] },
  { q: "Chú sư tử nào trở thành vua sau khi cha qua đời?", a: "Simba", options: ["Simba", "Mufasa", "Scar", "Timon"] },
  { q: "Cậu bé gỗ nào có chiếc mũi dài ra mỗi khi nói dối?", a: "Pinocchio", options: ["Pinocchio", "Peter Pan", "Aladdin", "Nobita"] },
  { q: "Ai đã cứu cả làng nhờ tài bắn cung trong phim 'Mulan'?", a: "Mộc Lan", options: ["Mộc Lan", "Elsa", "Belle", "Moana"] },
  { q: "Ai là chàng trai nghèo tìm được cây đèn thần?", a: "Aladdin", options: ["Aladdin", "Peter Pan", "Pinocchio", "Simba"] },
];

const nextQuiz = createStagedShuffleBag(QUIZ, 20, 4);

function genQuiz(stage) {
  const item = nextQuiz(stage);
  return { category: "quiz", prompt: item.q, choices: shuffle(item.options), answer: item.a };
}

// --- General knowledge -----------------------------------------------

const GENERAL_KNOWLEDGE = [
  { q: "Thủ đô của Việt Nam là gì?", a: "Hà Nội", options: ["Hà Nội", "Đà Nẵng", "Hồ Chí Minh", "Huế"] },
  { q: "Việt Nam có bao nhiêu mùa ở miền Bắc?", a: "4", options: ["4", "2", "3", "5"] },
  { q: "Núi nào cao nhất Việt Nam?", a: "Fansipan", options: ["Fansipan", "Bà Đen", "Ba Vì", "Yên Tử"] },
  { q: "Con người thở bằng bộ phận nào?", a: "Phổi", options: ["Phổi", "Tim", "Gan", "Dạ dày"] },
  { q: "Hành tinh nào gần Mặt Trời nhất?", a: "Sao Thủy", options: ["Sao Thủy", "Sao Kim", "Trái Đất", "Sao Hỏa"] },
  { q: "Nước được tạo thành từ hai nguyên tố nào?", a: "Hidro và Oxy", options: ["Hidro và Oxy", "Cacbon và Oxy", "Nito và Hidro", "Heli và Oxy"] },
  { q: "Cây xanh hấp thụ khí gì để quang hợp?", a: "Khí CO2", options: ["Khí CO2", "Khí Oxy", "Khí Nito", "Khí Heli"] },
  { q: "Ai là người tìm ra bóng đèn điện?", a: "Thomas Edison", options: ["Thomas Edison", "Isaac Newton", "Albert Einstein", "Louis Pasteur"] },
  { q: "Đại dương nào lớn nhất thế giới?", a: "Thái Bình Dương", options: ["Thái Bình Dương", "Đại Tây Dương", "Ấn Độ Dương", "Bắc Băng Dương"] },
  { q: "Sông nào dài nhất Việt Nam?", a: "Sông Mê Kông", options: ["Sông Mê Kông", "Sông Hồng", "Sông Đồng Nai", "Sông Cửu Long"] },
  { q: "Cơ thể người có bao nhiêu chiếc xương?", a: "206", options: ["206", "100", "300", "150"] },
  { q: "Quốc kỳ Việt Nam có màu gì?", a: "Đỏ và vàng", options: ["Đỏ và vàng", "Xanh và trắng", "Xanh và vàng", "Đỏ và trắng"] },
  { q: "Một tuần có bao nhiêu ngày?", a: "7", options: ["7", "5", "6", "8"] },
  { q: "Chúng ta đang sống trên hành tinh nào?", a: "Trái Đất", options: ["Trái Đất", "Sao Hỏa", "Sao Kim", "Mặt Trăng"] },
  { q: "Hình tam giác có mấy cạnh?", a: "3", options: ["3", "4", "5", "2"] },
  { q: "Một năm có bao nhiêu tháng?", a: "12", options: ["12", "10", "24", "6"] },
  { q: "Hình nào có 4 cạnh bằng nhau?", a: "Hình vuông", options: ["Hình vuông", "Hình tam giác", "Hình tròn", "Hình ngôi sao"] },
  { q: "Một ngày có bao nhiêu giờ?", a: "24", options: ["24", "12", "60", "7"] },
  { q: "Con nhện có bao nhiêu chân?", a: "8", options: ["8", "6", "4", "10"] },
  { q: "Trộn màu xanh dương với màu vàng ra màu gì?", a: "Xanh lá", options: ["Xanh lá", "Tím", "Cam", "Hồng"] },
  { q: "Con ong làm ra thứ gì?", a: "Mật ong", options: ["Mật ong", "Sữa", "Bánh mì", "Bơ"] },
  { q: "Con vật nào chạy nhanh nhất trên cạn?", a: "Báo gêpa", options: ["Báo gêpa", "Ngựa", "Sư tử", "Chó"] },
  { q: "Cầu vồng có bao nhiêu màu?", a: "7", options: ["7", "5", "6", "8"] },
  { q: "Việt Nam nằm ở châu lục nào?", a: "Châu Á", options: ["Châu Á", "Châu Âu", "Châu Phi", "Châu Mỹ"] },
  { q: "Trái Đất quay quanh vật gì?", a: "Mặt Trời", options: ["Mặt Trời", "Mặt Trăng", "Sao Hỏa", "Sao Kim"] },
  { q: "Mặt Trăng quay quanh vật gì?", a: "Trái Đất", options: ["Trái Đất", "Mặt Trời", "Sao Kim", "Sao Hỏa"] },
  { q: "Hành tinh nào được gọi là 'Hành tinh Đỏ'?", a: "Sao Hỏa", options: ["Sao Hỏa", "Sao Kim", "Sao Mộc", "Sao Thổ"] },
  { q: "Hệ Mặt Trời có bao nhiêu hành tinh?", a: "8", options: ["8", "7", "9", "10"] },
  { q: "Con người có bao nhiêu ngón tay?", a: "10", options: ["10", "8", "12", "9"] },
  { q: "Bộ phận nào giúp con người nhìn thấy?", a: "Mắt", options: ["Mắt", "Tai", "Mũi", "Miệng"] },
  { q: "Bộ phận nào bơm máu đi khắp cơ thể?", a: "Tim", options: ["Tim", "Gan", "Phổi", "Thận"] },
  { q: "Loài động vật nào lớn nhất trên Trái Đất?", a: "Cá voi xanh", options: ["Cá voi xanh", "Voi châu Phi", "Cá mập trắng", "Hươu cao cổ"] },
  { q: "Đâu là thủ đô của nước Pháp?", a: "Paris", options: ["Paris", "London", "Rome", "Berlin"] },
  { q: "Đâu là thủ đô của nước Nhật?", a: "Tokyo", options: ["Tokyo", "Seoul", "Bắc Kinh", "Bangkok"] },
  { q: "Kim tự tháp nổi tiếng nằm ở quốc gia nào?", a: "Ai Cập", options: ["Ai Cập", "Ấn Độ", "Hy Lạp", "Mexico"] },
  { q: "Băng được tạo ra khi nước làm gì?", a: "Đông đặc", options: ["Đông đặc", "Bay hơi", "Sôi lên", "Tan chảy"] },
  { q: "Cầu thủ dùng bộ phận nào để chơi bóng đá (trừ thủ môn)?", a: "Chân", options: ["Chân", "Tay", "Đầu", "Vai"] },
  { q: "Một chiếc bánh xe có hình gì?", a: "Hình tròn", options: ["Hình tròn", "Hình vuông", "Hình tam giác", "Hình chữ nhật"] },
  { q: "Nước sôi ở bao nhiêu độ C?", a: "100 độ", options: ["100 độ", "50 độ", "0 độ", "200 độ"] },
  { q: "Loài chim nào không biết bay?", a: "Chim cánh cụt", options: ["Chim cánh cụt", "Chim bồ câu", "Chim sẻ", "Chim én"] },
  { q: "Một năm nhuận có bao nhiêu ngày?", a: "366", options: ["366", "365", "360", "364"] },
  { q: "Đâu là hành tinh lớn nhất trong Hệ Mặt Trời?", a: "Sao Mộc", options: ["Sao Mộc", "Sao Thổ", "Trái Đất", "Sao Hải Vương"] },
  { q: "Việt Nam có bao nhiêu miền chính?", a: "3", options: ["3", "2", "4", "5"] },
  { q: "Cây cần gì để quang hợp và lớn lên?", a: "Ánh sáng mặt trời", options: ["Ánh sáng mặt trời", "Bóng tối", "Muối", "Đường"] },
  { q: "Bộ phận nào giúp con người nghe được âm thanh?", a: "Tai", options: ["Tai", "Mắt", "Mũi", "Da"] },
  { q: "Bộ phận nào giúp con người ngửi được mùi?", a: "Mũi", options: ["Mũi", "Tai", "Lưỡi", "Tay"] },
  { q: "Người ta dùng gì để đo nhiệt độ?", a: "Nhiệt kế", options: ["Nhiệt kế", "Thước kẻ", "Cân", "Đồng hồ"] },
  { q: "Người ta dùng gì để đo thời gian?", a: "Đồng hồ", options: ["Đồng hồ", "Cân", "Thước kẻ", "Nhiệt kế"] },
  { q: "Chất gì giúp cây có màu xanh?", a: "Diệp lục", options: ["Diệp lục", "Nước", "Đường", "Muối"] },
  { q: "Loài vật nào được coi là bạn thân nhất của con người?", a: "Chó", options: ["Chó", "Mèo", "Chim", "Cá"] },
  { q: "Con người dùng gì để viết chữ ngày xưa trước khi có bút?", a: "Lông vũ", options: ["Lông vũ", "Bút chì", "Bút bi", "Phấn"] },
  { q: "Đâu là quốc gia đông dân nhất thế giới?", a: "Trung Quốc", options: ["Trung Quốc", "Ấn Độ", "Hoa Kỳ", "Việt Nam"] },
  { q: "Vịnh Hạ Long thuộc tỉnh nào của Việt Nam?", a: "Quảng Ninh", options: ["Quảng Ninh", "Hải Phòng", "Nam Định", "Thanh Hóa"] },
  { q: "Con người có bao nhiêu giác quan chính?", a: "5", options: ["5", "4", "6", "3"] },
  { q: "Cầu vồng thường xuất hiện sau hiện tượng thời tiết nào?", a: "Mưa", options: ["Mưa", "Nắng", "Gió", "Sương mù"] },
  { q: "Loài cây nào cao nhất thế giới?", a: "Cây gỗ đỏ", options: ["Cây gỗ đỏ", "Cây tre", "Cây thông", "Cây sồi"] },
  { q: "Kim loại nào được dùng để làm dây điện phổ biến nhất?", a: "Đồng", options: ["Đồng", "Sắt", "Vàng", "Chì"] },
  { q: "Ai là người đầu tiên đặt chân lên Mặt Trăng?", a: "Neil Armstrong", options: ["Neil Armstrong", "Yuri Gagarin", "Buzz Aldrin", "Isaac Newton"] },
  { q: "Cơ quan nào giúp con người suy nghĩ?", a: "Não", options: ["Não", "Tim", "Phổi", "Gan"] },
  { q: "Loài cá nào to nhất đại dương?", a: "Cá voi xanh", options: ["Cá voi xanh", "Cá mập trắng", "Cá ngừ", "Cá heo"] },
  { q: "Nước chiếm bao nhiêu phần trăm bề mặt Trái Đất?", a: "71%", options: ["71%", "30%", "50%", "90%"] },
  { q: "Việt Nam giáp với biển nào?", a: "Biển Đông", options: ["Biển Đông", "Biển Đỏ", "Biển Đen", "Biển Bắc"] },
  { q: "Loài động vật nào có thể sống hơn 100 năm?", a: "Rùa", options: ["Rùa", "Chó", "Mèo", "Thỏ"] },
  { q: "Đâu là ngôn ngữ chính thức của Việt Nam?", a: "Tiếng Việt", options: ["Tiếng Việt", "Tiếng Anh", "Tiếng Trung", "Tiếng Pháp"] },
  { q: "Cầu Long Biên bắc qua sông nào?", a: "Sông Hồng", options: ["Sông Hồng", "Sông Mê Kông", "Sông Đồng Nai", "Sông Hàn"] },
  { q: "Loài vật nào được nuôi để lấy trứng?", a: "Con gà", options: ["Con gà", "Con chó", "Con mèo", "Con bò"] },
  { q: "Loài vật nào được nuôi để lấy sữa?", a: "Con bò", options: ["Con bò", "Con gà", "Con lợn", "Con dê"] },
  { q: "Bộ phận nào của cây hút nước từ đất?", a: "Rễ", options: ["Rễ", "Lá", "Hoa", "Thân"] },
  { q: "Bộ phận nào của cây tạo ra oxy?", a: "Lá", options: ["Lá", "Rễ", "Thân", "Hoa"] },
  { q: "Núi lửa phun ra chất gì nóng chảy?", a: "Dung nham", options: ["Dung nham", "Nước", "Băng", "Cát"] },
  { q: "Cơ thể người có bao nhiêu chiếc răng khi trưởng thành?", a: "32", options: ["32", "20", "28", "36"] },
  { q: "Đâu là thủ đô của nước Anh?", a: "London", options: ["London", "Paris", "Rome", "Berlin"] },
  { q: "Đâu là thủ đô của Hàn Quốc?", a: "Seoul", options: ["Seoul", "Tokyo", "Bắc Kinh", "Bangkok"] },
  { q: "Loài vật nào là biểu tượng của nước Úc?", a: "Chuột túi", options: ["Chuột túi", "Gấu túi", "Đà điểu", "Cá sấu"] },
  { q: "Tháp Eiffel nằm ở thành phố nào?", a: "Paris", options: ["Paris", "London", "Rome", "Madrid"] },
  { q: "Vạn Lý Trường Thành nằm ở quốc gia nào?", a: "Trung Quốc", options: ["Trung Quốc", "Nhật Bản", "Hàn Quốc", "Ấn Độ"] },
  { q: "Chất nào con người cần hít vào để sống?", a: "Oxy", options: ["Oxy", "Cacbonic", "Nito", "Heli"] },
  { q: "Chất nào con người thở ra sau khi hít thở?", a: "Khí CO2", options: ["Khí CO2", "Khí Oxy", "Khí Heli", "Khí Nito"] },
  { q: "Bộ phận nào giúp con người nếm được vị thức ăn?", a: "Lưỡi", options: ["Lưỡi", "Mũi", "Tai", "Da"] },
  { q: "Cơ thể người có bao nhiêu lá phổi?", a: "2", options: ["2", "1", "3", "4"] },
  { q: "Trứng của loài nào lớn nhất trong tất cả các loài chim?", a: "Đà điểu", options: ["Đà điểu", "Chim cánh cụt", "Đại bàng", "Ngỗng"] },
  { q: "Chợ Bến Thành là địa danh nổi tiếng ở thành phố nào?", a: "Thành phố Hồ Chí Minh", options: ["Thành phố Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Huế"] },
  { q: "Cố đô của Việt Nam thời nhà Nguyễn ở đâu?", a: "Huế", options: ["Huế", "Hà Nội", "Sài Gòn", "Đà Nẵng"] },
  { q: "Ánh sáng mặt trời mất bao lâu để đến Trái Đất?", a: "8 phút", options: ["8 phút", "1 giây", "1 giờ", "1 ngày"] },
  { q: "Đâu là hành tinh có vành đai nổi tiếng nhất?", a: "Sao Thổ", options: ["Sao Thổ", "Sao Mộc", "Sao Hỏa", "Sao Kim"] },
  { q: "Khí nào chiếm phần lớn nhất trong bầu khí quyển Trái Đất?", a: "Khí Nito", options: ["Khí Nito", "Khí Oxy", "Khí CO2", "Khí Heli"] },
  { q: "Đâu là quốc gia có diện tích lớn nhất thế giới?", a: "Nga", options: ["Nga", "Trung Quốc", "Canada", "Hoa Kỳ"] },
  { q: "Đâu là quốc gia có dân số ít nhất thế giới?", a: "Vatican", options: ["Vatican", "Monaco", "Nauru", "San Marino"] },
  { q: "Sa mạc nào lớn nhất thế giới?", a: "Sahara", options: ["Sahara", "Gobi", "Sa mạc Úc", "Kalahari"] },
  { q: "Ngọn núi nào cao nhất thế giới?", a: "Everest", options: ["Everest", "Fansipan", "K2", "Kilimanjaro"] },
  { q: "Con sông nào dài nhất thế giới?", a: "Sông Nile", options: ["Sông Nile", "Sông Amazon", "Sông Mê Kông", "Sông Trường Giang"] },
  { q: "Loài động vật nào có cổ dài giúp ăn lá cây trên cao?", a: "Hươu cao cổ", options: ["Hươu cao cổ", "Voi", "Lạc đà", "Ngựa vằn"] },
  { q: "Mấy chân thì gọi là con vật đi bằng 2 chân?", a: "2", options: ["2", "4", "6", "8"] },
  { q: "Cầu thang cuốn trong siêu thị chạy bằng gì?", a: "Điện", options: ["Điện", "Nước", "Gió", "Hơi nước"] },
  { q: "Đâu là hành tinh có nhiều mặt trăng nhất trong Hệ Mặt Trời?", a: "Sao Thổ", options: ["Sao Thổ", "Sao Mộc", "Sao Thiên Vương", "Trái Đất"] },
  { q: "Bộ phận nào của con người dùng để cầm nắm đồ vật?", a: "Tay", options: ["Tay", "Chân", "Đầu", "Vai"] },
  { q: "Ngôn ngữ nào được nói nhiều nhất trên thế giới?", a: "Tiếng Trung", options: ["Tiếng Trung", "Tiếng Anh", "Tiếng Tây Ban Nha", "Tiếng Hindi"] },
  { q: "Loài cây nào không có hoa mà vẫn sinh sản được?", a: "Cây dương xỉ", options: ["Cây dương xỉ", "Cây hoa hồng", "Cây hướng dương", "Cây táo"] },
  { q: "Đơn vị nào dùng để đo chiều dài?", a: "Mét", options: ["Mét", "Kilôgam", "Lít", "Giây"] },
  { q: "Đơn vị nào dùng để đo khối lượng?", a: "Kilôgam", options: ["Kilôgam", "Mét", "Lít", "Giây"] },
  { q: "Việt Nam có bao nhiêu tỉnh thành trực thuộc Trung ương (trước 2025)?", a: "63", options: ["63", "54", "58", "70"] },
  { q: "Đâu là quốc gia có nhiều múi giờ nhất thế giới?", a: "Pháp", options: ["Pháp", "Nga", "Hoa Kỳ", "Trung Quốc"] },
  { q: "Hòn đảo lớn nhất thế giới là gì?", a: "Greenland", options: ["Greenland", "Madagascar", "Borneo", "Iceland"] },
  { q: "Châu lục nào lạnh nhất trên Trái Đất?", a: "Nam Cực", options: ["Nam Cực", "Bắc Cực", "Châu Âu", "Châu Á"] },
  { q: "Động vật nào có thể thay đổi hình dạng cơ thể để trốn kẻ thù dưới biển?", a: "Bạch tuộc", options: ["Bạch tuộc", "Cá mập", "Sứa", "Tôm hùm"] },
  { q: "Cầu vồng xuất hiện khi ánh sáng mặt trời gặp gì?", a: "Giọt nước mưa", options: ["Giọt nước mưa", "Gió", "Sương mù", "Tuyết"] },
  { q: "Chất nào giúp máu có màu đỏ?", a: "Hemoglobin", options: ["Hemoglobin", "Canxi", "Vitamin C", "Nước"] },
  { q: "Xương nào dài nhất trong cơ thể người?", a: "Xương đùi", options: ["Xương đùi", "Xương tay", "Xương sườn", "Xương sống"] },
  { q: "Cây nào được coi là biểu tượng của làng quê Việt Nam?", a: "Cây tre", options: ["Cây tre", "Cây bàng", "Cây phượng", "Cây đa"] },
  { q: "Hoa nào là quốc hoa của Việt Nam?", a: "Hoa sen", options: ["Hoa sen", "Hoa mai", "Hoa đào", "Hoa hồng"] },
  { q: "Tết Nguyên Đán của Việt Nam diễn ra vào mùa nào?", a: "Mùa xuân", options: ["Mùa xuân", "Mùa hè", "Mùa thu", "Mùa đông"] },
];

const nextGeneralKnowledge = createStagedShuffleBag(GENERAL_KNOWLEDGE, 20, 4);

function genGeneralKnowledge(stage) {
  const item = nextGeneralKnowledge(stage);
  return { category: "gk", prompt: item.q, choices: shuffle(item.options), answer: item.a };
}

// --- Cờ các nước (national flags) ---------------------------------------

const FLAGS = [
  { flag: "🇻🇳", name: "Việt Nam" },
  { flag: "🇺🇸", name: "Hoa Kỳ" },
  { flag: "🇬🇧", name: "Anh" },
  { flag: "🇫🇷", name: "Pháp" },
  { flag: "🇩🇪", name: "Đức" },
  { flag: "🇮🇹", name: "Ý" },
  { flag: "🇪🇸", name: "Tây Ban Nha" },
  { flag: "🇵🇹", name: "Bồ Đào Nha" },
  { flag: "🇷🇺", name: "Nga" },
  { flag: "🇨🇳", name: "Trung Quốc" },
  { flag: "🇯🇵", name: "Nhật Bản" },
  { flag: "🇰🇷", name: "Hàn Quốc" },
  { flag: "🇰🇵", name: "Triều Tiên" },
  { flag: "🇮🇳", name: "Ấn Độ" },
  { flag: "🇹🇭", name: "Thái Lan" },
  { flag: "🇱🇦", name: "Lào" },
  { flag: "🇰🇭", name: "Campuchia" },
  { flag: "🇲🇲", name: "Myanmar" },
  { flag: "🇲🇾", name: "Malaysia" },
  { flag: "🇸🇬", name: "Singapore" },
  { flag: "🇮🇩", name: "Indonesia" },
  { flag: "🇵🇭", name: "Philippines" },
  { flag: "🇧🇳", name: "Brunei" },
  { flag: "🇹🇱", name: "Đông Timor" },
  { flag: "🇦🇺", name: "Úc" },
  { flag: "🇳🇿", name: "New Zealand" },
  { flag: "🇨🇦", name: "Canada" },
  { flag: "🇲🇽", name: "Mexico" },
  { flag: "🇧🇷", name: "Brazil" },
  { flag: "🇦🇷", name: "Argentina" },
  { flag: "🇨🇱", name: "Chile" },
  { flag: "🇨🇴", name: "Colombia" },
  { flag: "🇵🇪", name: "Peru" },
  { flag: "🇪🇬", name: "Ai Cập" },
  { flag: "🇿🇦", name: "Nam Phi" },
  { flag: "🇳🇬", name: "Nigeria" },
  { flag: "🇰🇪", name: "Kenya" },
  { flag: "🇲🇦", name: "Morocco" },
  { flag: "🇹🇷", name: "Thổ Nhĩ Kỳ" },
  { flag: "🇬🇷", name: "Hy Lạp" },
  { flag: "🇳🇱", name: "Hà Lan" },
  { flag: "🇧🇪", name: "Bỉ" },
  { flag: "🇨🇭", name: "Thụy Sĩ" },
  { flag: "🇦🇹", name: "Áo" },
  { flag: "🇸🇪", name: "Thụy Điển" },
  { flag: "🇳🇴", name: "Na Uy" },
  { flag: "🇩🇰", name: "Đan Mạch" },
  { flag: "🇫🇮", name: "Phần Lan" },
  { flag: "🇵🇱", name: "Ba Lan" },
  { flag: "🇮🇪", name: "Ireland" },
  { flag: "🇮🇸", name: "Iceland" },
  { flag: "🇺🇦", name: "Ukraine" },
  { flag: "🇨🇿", name: "Séc" },
  { flag: "🇭🇺", name: "Hungary" },
  { flag: "🇷🇴", name: "Romania" },
  { flag: "🇸🇦", name: "Ả Rập Xê Út" },
  { flag: "🇦🇪", name: "UAE" },
  { flag: "🇮🇱", name: "Israel" },
  { flag: "🇶🇦", name: "Qatar" },
  { flag: "🇵🇰", name: "Pakistan" },
  { flag: "🇧🇩", name: "Bangladesh" },
  { flag: "🇳🇵", name: "Nepal" },
  { flag: "🇨🇺", name: "Cuba" },
  { flag: "🇱🇰", name: "Sri Lanka" },
  { flag: "🇦🇫", name: "Afghanistan" },
  { flag: "🇮🇷", name: "Iran" },
  { flag: "🇮🇶", name: "Iraq" },
  { flag: "🇯🇴", name: "Jordan" },
  { flag: "🇱🇧", name: "Lebanon" },
  { flag: "🇰🇼", name: "Kuwait" },
  { flag: "🇧🇭", name: "Bahrain" },
  { flag: "🇴🇲", name: "Oman" },
  { flag: "🇾🇪", name: "Yemen" },
  { flag: "🇬🇭", name: "Ghana" },
  { flag: "🇪🇹", name: "Ethiopia" },
  { flag: "🇹🇿", name: "Tanzania" },
  { flag: "🇺🇬", name: "Uganda" },
  { flag: "🇩🇿", name: "Algeria" },
  { flag: "🇹🇳", name: "Tunisia" },
  { flag: "🇱🇾", name: "Libya" },
  { flag: "🇸🇳", name: "Senegal" },
  { flag: "🇨🇮", name: "Bờ Biển Ngà" },
  { flag: "🇿🇲", name: "Zambia" },
  { flag: "🇿🇼", name: "Zimbabwe" },
  { flag: "🇻🇪", name: "Venezuela" },
  { flag: "🇪🇨", name: "Ecuador" },
  { flag: "🇧🇴", name: "Bolivia" },
  { flag: "🇵🇾", name: "Paraguay" },
  { flag: "🇺🇾", name: "Uruguay" },
  { flag: "🇬🇹", name: "Guatemala" },
  { flag: "🇭🇳", name: "Honduras" },
  { flag: "🇯🇲", name: "Jamaica" },
  { flag: "🇭🇹", name: "Haiti" },
  { flag: "🇩🇴", name: "Dominican Republic" },
  { flag: "🇭🇷", name: "Croatia" },
  { flag: "🇷🇸", name: "Serbia" },
  { flag: "🇧🇬", name: "Bulgaria" },
  { flag: "🇸🇰", name: "Slovakia" },
  { flag: "🇸🇮", name: "Slovenia" },
  { flag: "🇱🇹", name: "Lithuania" },
  { flag: "🇱🇻", name: "Latvia" },
  { flag: "🇪🇪", name: "Estonia" },
  { flag: "🇱🇺", name: "Luxembourg" },
  { flag: "🇲🇹", name: "Malta" },
  { flag: "🇨🇾", name: "Cyprus" },
  { flag: "🇦🇱", name: "Albania" },
  { flag: "🇲🇨", name: "Monaco" },
  { flag: "🇻🇦", name: "Vatican" },
  { flag: "🇫🇯", name: "Fiji" },
  { flag: "🇵🇬", name: "Papua New Guinea" },
  { flag: "🇲🇳", name: "Mông Cổ" },
  { flag: "🇰🇿", name: "Kazakhstan" },
  { flag: "🇺🇿", name: "Uzbekistan" },
  { flag: "🇧🇹", name: "Bhutan" },
  { flag: "🇲🇻", name: "Maldives" },
  { flag: "🇫🇲", name: "Micronesia" },
  { flag: "🇼🇸", name: "Samoa" },
  { flag: "🇹🇴", name: "Tonga" },
  { flag: "🇸🇧", name: "Solomon Islands" },
  { flag: "🇻🇺", name: "Vanuatu" },
  { flag: "🇧🇿", name: "Belize" },
  { flag: "🇸🇻", name: "El Salvador" },
  { flag: "🇳🇮", name: "Nicaragua" },
  { flag: "🇨🇷", name: "Costa Rica" },
  { flag: "🇵🇦", name: "Panama" },
  { flag: "🇬🇾", name: "Guyana" },
  { flag: "🇸🇷", name: "Suriname" },
  { flag: "🇲🇿", name: "Mozambique" },
  { flag: "🇲🇬", name: "Madagascar" },
  { flag: "🇨🇲", name: "Cameroon" },
  { flag: "🇸🇩", name: "Sudan" },
  { flag: "🇸🇴", name: "Somalia" },
  { flag: "🇧🇼", name: "Botswana" },
  { flag: "🇳🇦", name: "Namibia" },
  { flag: "🇷🇼", name: "Rwanda" },
  { flag: "🇸🇸", name: "Nam Sudan" },
  { flag: "🇲🇼", name: "Malawi" },
];

const nextFlag = createStagedShuffleBag(FLAGS, 20, 5);

function genFlag(stage) {
  const item = nextFlag(stage);
  const unlocked = Math.min(FLAGS.length, 20 + stage * 5);
  const distractPool = FLAGS.slice(0, unlocked).filter((f) => f.name !== item.name);
  const choices = new Set([item.name]);
  while (choices.size < 4) {
    choices.add(pick(distractPool).name);
  }
  return {
    category: "flag",
    prompt: `${item.flag}  Đây là quốc kỳ nước nào?`,
    choices: shuffle(Array.from(choices)),
    answer: item.name,
  };
}

// --- Nấu ăn (cooking) ----------------------------------------------------

const COOKING = [
  { q: "Muốn cơm chín, ta cần nấu gạo với gì?", a: "Nước", options: ["Nước", "Dầu ăn", "Sữa", "Đường"] },
  { q: "Trước khi nấu ăn, ta cần rửa sạch nguyên liệu bằng gì?", a: "Nước", options: ["Nước", "Nước mắm", "Dầu ăn", "Giấm"] },
  { q: "Dụng cụ nào dùng để đảo thức ăn khi xào?", a: "Cái xẻng", options: ["Cái xẻng", "Cái thìa nhỏ", "Cái nĩa", "Cái dao"] },
  { q: "Dụng cụ nào dùng để cắt rau củ?", a: "Con dao", options: ["Con dao", "Cái muỗng", "Cái chảo", "Cái nồi"] },
  { q: "Vật gì dùng để đựng nước nấu canh?", a: "Cái nồi", options: ["Cái nồi", "Cái chảo", "Cái đĩa", "Cái ly"] },
  { q: "Vật gì dùng để chiên hoặc xào thức ăn?", a: "Cái chảo", options: ["Cái chảo", "Cái nồi", "Cái tô", "Cái đĩa"] },
  { q: "Gia vị nào làm món ăn có vị mặn?", a: "Muối", options: ["Muối", "Đường", "Tiêu", "Chanh"] },
  { q: "Gia vị nào làm món ăn có vị ngọt?", a: "Đường", options: ["Đường", "Muối", "Ớt", "Giấm"] },
  { q: "Gia vị nào làm món ăn có vị cay?", a: "Ớt", options: ["Ớt", "Muối", "Đường", "Chanh"] },
  { q: "Gia vị nào làm món ăn có vị chua?", a: "Chanh", options: ["Chanh", "Đường", "Muối", "Tiêu"] },
  { q: "Nước chấm nào không thể thiếu trong bữa cơm Việt?", a: "Nước mắm", options: ["Nước mắm", "Tương ớt", "Sữa", "Giấm"] },
  { q: "Muốn luộc trứng, ta cần đun trứng trong gì?", a: "Nước sôi", options: ["Nước sôi", "Dầu ăn", "Sữa", "Nước đá"] },
  { q: "Bánh mì được làm chủ yếu từ nguyên liệu nào?", a: "Bột mì", options: ["Bột mì", "Bột gạo", "Bột năng", "Bột bắp"] },
  { q: "Cơm được nấu chín từ hạt gì?", a: "Gạo", options: ["Gạo", "Bắp", "Đậu", "Lúa mì"] },
  { q: "Món trứng nào được đánh tơi rồi chiên trong chảo?", a: "Trứng chiên", options: ["Trứng chiên", "Trứng luộc", "Trứng hấp", "Trứng ốp la"] },
  { q: "Để làm bánh ngọt, ta thường cần trộn bột với gì để bánh nở?", a: "Bột nở", options: ["Bột nở", "Muối", "Nước mắm", "Dầu hào"] },
  { q: "Dụng cụ nào giúp đo lượng bột hoặc đường khi làm bánh?", a: "Cân", options: ["Cân", "Thước kẻ", "Đồng hồ", "Nhiệt kế"] },
  { q: "Trước khi ăn, ta nên làm gì với đôi tay?", a: "Rửa tay sạch sẽ", options: ["Rửa tay sạch sẽ", "Lau vào áo", "Không cần làm gì", "Đeo găng tay bẩn"] },
  { q: "Rau củ nên được làm gì trước khi nấu để loại bỏ bụi bẩn?", a: "Rửa sạch", options: ["Rửa sạch", "Cắt nhỏ", "Nấu chín ngay", "Ướp muối"] },
  { q: "Muốn nước sôi nhanh hơn, ta nên đậy gì lên nồi?", a: "Nắp nồi", options: ["Nắp nồi", "Khăn ướt", "Rổ", "Đĩa nhỏ"] },
  { q: "Dụng cụ nào dùng để múc canh ra tô?", a: "Cái muôi", options: ["Cái muôi", "Cái dao", "Cái kéo", "Cái xẻng"] },
  { q: "Món ăn nào của Việt Nam có bánh tráng, bún và rau sống cuốn lại?", a: "Gỏi cuốn", options: ["Gỏi cuốn", "Bánh xèo", "Bánh cuốn", "Chả giò"] },
  { q: "Món nào của Việt Nam được chiên giòn, có nhân thịt và rau củ bên trong?", a: "Chả giò", options: ["Chả giò", "Gỏi cuốn", "Phở", "Bún riêu"] },
  { q: "Trước khi cho dầu vào chảo, ta nên làm gì với chảo?", a: "Làm nóng chảo", options: ["Làm nóng chảo", "Rửa lại chảo", "Cho đá vào", "Đậy nắp kín"] },
  { q: "Loại nồi nào giúp nấu chín thức ăn nhanh nhờ áp suất cao?", a: "Nồi áp suất", options: ["Nồi áp suất", "Nồi cơm điện", "Chảo chống dính", "Nồi đất"] },
  { q: "Thiết bị nào giúp nấu cơm tự động trong gia đình?", a: "Nồi cơm điện", options: ["Nồi cơm điện", "Lò vi sóng", "Bếp gas", "Tủ lạnh"] },
  { q: "Ta nên bảo quản thức ăn thừa ở đâu để không bị hỏng?", a: "Tủ lạnh", options: ["Tủ lạnh", "Ngoài trời", "Trong tủ quần áo", "Trên bàn"] },
  { q: "Trước khi nếm thử món ăn nóng, ta nên làm gì?", a: "Thổi cho nguội bớt", options: ["Thổi cho nguội bớt", "Ăn ngay lập tức", "Đổ thêm đá", "Bỏ qua"] },

  // Vị giác & gia vị
  { q: "Vị gì có trong quả khế xanh và quả me?", a: "Vị chua", options: ["Vị chua", "Vị ngọt", "Vị mặn", "Vị đắng"] },
  { q: "Vị gì có trong quả mướp đắng?", a: "Vị đắng", options: ["Vị đắng", "Vị ngọt", "Vị chua", "Vị mặn"] },
  { q: "Có bao nhiêu vị cơ bản mà lưỡi ta cảm nhận được?", a: "5", options: ["5", "3", "4", "6"] },
  { q: "Gia vị nào có mùi thơm nồng, thường dùng để khử mùi tanh của cá?", a: "Gừng", options: ["Gừng", "Đường", "Muối", "Bột ngọt"] },
  { q: "Gia vị nào có màu trắng, dạng bột, thường dùng để làm món ăn ngọt đậm đà hơn?", a: "Bột ngọt", options: ["Bột ngọt", "Muối", "Tiêu", "Ớt bột"] },
  { q: "Loại lá nào có mùi thơm đặc trưng, hay dùng để ăn kèm phở?", a: "Rau húng", options: ["Rau húng", "Lá chuối", "Lá bàng", "Lá tre"] },
  { q: "Gia vị nào dạng hạt nhỏ màu đen, có vị cay nồng, hay rắc lên món ăn?", a: "Tiêu", options: ["Tiêu", "Muối", "Đường", "Bột ngọt"] },
  { q: "Tỏi và hành khi phi vàng trong dầu sẽ tạo ra mùi gì đặc trưng?", a: "Mùi thơm", options: ["Mùi thơm", "Mùi khét", "Mùi tanh", "Mùi chua"] },
  { q: "Nước cốt của loại quả nào thường dùng để làm nước chấm chua ngọt?", a: "Chanh", options: ["Chanh", "Cam", "Dưa hấu", "Táo"] },
  { q: "Vị gì xuất hiện khi ta ăn socola đắng?", a: "Vị đắng", options: ["Vị đắng", "Vị ngọt", "Vị chua", "Vị cay"] },

  // Cứu món ăn / mẹo nấu ăn
  { q: "Nếu canh bị mặn quá, ta nên làm gì để bớt mặn?", a: "Thêm nước", options: ["Thêm nước", "Thêm muối", "Thêm ớt", "Đổ hết đi"] },
  { q: "Nếu món ăn bị nhạt, ta nên làm gì?", a: "Nêm thêm muối hoặc nước mắm", options: ["Nêm thêm muối hoặc nước mắm", "Thêm nước lọc", "Thêm đá", "Đun lâu hơn"] },
  { q: "Nếu món ăn quá cay, ta nên ăn kèm với gì để dịu bớt?", a: "Cơm hoặc sữa", options: ["Cơm hoặc sữa", "Nước đá", "Thêm ớt", "Nước chanh"] },
  { q: "Cách nào giúp bớt cay khi tay bị dính ớt?", a: "Rửa tay với sữa hoặc dầu ăn", options: ["Rửa tay với sữa hoặc dầu ăn", "Rửa tay với nước đá", "Không làm gì cả", "Chà xát với muối"] },
  { q: "Nếu cơm bị nhão, lần sau ta nên làm gì khi nấu?", a: "Cho ít nước hơn", options: ["Cho ít nước hơn", "Cho nhiều nước hơn", "Nấu lâu hơn", "Thêm muối"] },
  { q: "Nếu cơm bị khô, lần sau ta nên làm gì khi nấu?", a: "Cho nhiều nước hơn", options: ["Cho nhiều nước hơn", "Cho ít nước hơn", "Nấu nhanh hơn", "Bớt gạo lại"] },
  { q: "Khi thái hành khiến mắt bị cay, ta nên làm gì để đỡ cay mắt?", a: "Ngâm hành trong nước trước khi thái", options: ["Ngâm hành trong nước trước khi thái", "Thái thật nhanh dưới ánh nắng", "Đeo khẩu trang tay", "Không có cách nào"] },
  { q: "Nếu thức ăn bị cháy khét dưới đáy nồi, ta nên làm gì?", a: "Bỏ phần cháy, giữ lại phần còn ngon", options: ["Bỏ phần cháy, giữ lại phần còn ngon", "Ăn hết cả phần cháy", "Cho thêm đường", "Nấu tiếp thêm nhiều giờ"] },
  { q: "Muốn thịt mềm hơn khi nấu, người ta thường ướp thịt với gì trước?", a: "Gia vị và để thấm", options: ["Gia vị và để thấm", "Nước đá", "Đường trắng nhiều", "Không ướp gì cả"] },
  { q: "Nếu rau bị luộc quá lâu, rau sẽ trở nên thế nào?", a: "Mềm nhũn và mất chất", options: ["Mềm nhũn và mất chất", "Giòn hơn", "Ngọt hơn", "Có màu tươi hơn"] },
  { q: "Nếu nước dùng bị nhạt, ta nên làm gì?", a: "Nêm thêm gia vị", options: ["Nêm thêm gia vị", "Đổ thêm nước lã", "Cho thêm đá", "Không làm gì"] },
  { q: "Muốn nồi không bị dính đáy khi nấu, ta nên làm gì?", a: "Đảo đều tay khi nấu", options: ["Đảo đều tay khi nấu", "Đậy nắp kín rồi bỏ đi chỗ khác", "Tắt bếp giữa chừng", "Cho thêm nhiều muối"] },
  { q: "Nếu súp bị quá đặc, ta nên làm gì để loãng bớt?", a: "Thêm nước hoặc nước dùng", options: ["Thêm nước hoặc nước dùng", "Thêm bột năng", "Đun cạn thêm", "Cho thêm dầu ăn"] },
  { q: "Trước khi chiên cá, ta nên làm gì để đỡ bắn dầu?", a: "Lau khô cá", options: ["Lau khô cá", "Ngâm cá vào nước lạnh thêm", "Chiên với lửa thật to ngay", "Không làm gì"] },
  { q: "Nếu trái cây bị chín quá, ta có thể dùng để làm gì thay vì bỏ đi?", a: "Làm sinh tố hoặc mứt", options: ["Làm sinh tố hoặc mứt", "Đun sôi với muối", "Bỏ vào tủ đông cả vỏ", "Không làm được gì"] },

  // Nguyên liệu & vật dụng bếp
  { q: "Vật dụng nào giúp giữ thức ăn nóng lâu trên bàn ăn?", a: "Nồi giữ nhiệt", options: ["Nồi giữ nhiệt", "Cái quạt", "Cái tủ lạnh", "Cái chậu"] },
  { q: "Dụng cụ nào dùng để nghiền nhuyễn tỏi, ớt?", a: "Cối và chày", options: ["Cối và chày", "Cái kéo", "Cái dao lớn", "Cái muôi"] },
  { q: "Vật gì dùng để trải lên bàn khi ăn để giữ sạch sẽ?", a: "Khăn trải bàn", options: ["Khăn trải bàn", "Khăn tắm", "Túi ni lông", "Chăn mỏng"] },
  { q: "Dụng cụ nào giúp giữ thức ăn tươi lâu hơn khi bảo quản?", a: "Hộp đựng thực phẩm", options: ["Hộp đựng thực phẩm", "Túi giấy", "Ly thủy tinh", "Rổ tre"] },
  { q: "Loại bột nào thường dùng để làm bánh mì và mì sợi?", a: "Bột mì", options: ["Bột mì", "Bột nghệ", "Bột ớt", "Bột quế"] },
  { q: "Dầu nào thường dùng để chiên xào trong bếp Việt?", a: "Dầu ăn", options: ["Dầu ăn", "Dầu gió", "Dầu gội", "Dầu thơm"] },
];

const nextCooking = createStagedShuffleBag(COOKING, 15, 3);

function genCooking(stage) {
  const item = nextCooking(stage);
  return { category: "cooking", prompt: item.q, choices: shuffle(item.options), answer: item.a };
}

// --- Public API ------------------------------------------------------

export function generateQuest(stage) {
  const roll = Math.random();
  let category;
  if (roll < 0.25) category = "math";
  else if (roll < 0.35) category = "mathword";
  else if (roll < 0.53) category = "english";
  else if (roll < 0.7) category = "quiz";
  else if (roll < 0.83) category = "gk";
  else if (roll < 0.93) category = "flag";
  else category = "cooking";

  const quest =
    category === "math"
      ? genMath(stage)
      : category === "mathword"
      ? genMathWord(stage)
      : category === "english"
      ? genEnglish(stage)
      : category === "quiz"
      ? genQuiz(stage)
      : category === "gk"
      ? genGeneralKnowledge(stage)
      : category === "flag"
      ? genFlag(stage)
      : genCooking(stage);

  // Fewer choices for very early stages to keep it simple for little kids.
  if (stage < 2 && quest.choices.length > 3) {
    const others = quest.choices.filter((c) => c !== quest.answer);
    quest.choices = shuffle([quest.answer, ...shuffle(others).slice(0, 2)]);
  }

  return quest;
}

// Time (ms) allowed to answer before the nails reach the balloon, scaled
// down slightly as stages increase but never below a friendly minimum.
export function timeForStage(stage) {
  return Math.max(9000, 16000 - stage * 350);
}
