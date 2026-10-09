const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

const FAKE_OPERATORS = [
  "TeleMobix", "OrionCell", "VoltNet", "SkyLink+", "NovaTone",
  "PulseTel", "AeroCom", "ZenitMobile", "Kvant+", "StratosGSM"
];

const FAKE_COUNTRIES = [
  { code: "+199", name: "Республика Норланд" },
  { code: "+299", name: "Острова Веспер" },
  { code: "+399", name: "Федерация Аквилон" },
  { code: "+499", name: "Королевство Мираж" },
  { code: "+599", name: "Территория Зенит" },
  { code: "+699", name: "Союз Киберия" },
  { code: "+799", name: "Атлантида-Сити" },
];

const RARITIES = {
  common:    { name: "Обычный",     color: "r-common",    mult: 1.0,  weight: 55 },
  uncommon:  { name: "Необычный",   color: "r-uncommon",  mult: 2.0,  weight: 25 },
  rare:      { name: "Редкий",      color: "r-rare",      mult: 4.0,  weight: 13 },
  epic:      { name: "Эпический",   color: "r-epic",      mult: 8.0,  weight: 5  },
  legendary: { name: "Легендарный", color: "r-legendary", mult: 20.0, weight: 2  },
};

const GEN_COST = 10;
const ROULETTE_COST = 100;
const XP_BASE = 50;
const xpNeed = lvl => XP_BASE * lvl;

let state = { coins: 250, level: 1, xp: 0, inventory: [] };

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFrom = arr => arr[Math.floor(Math.random() * arr.length)];

function pickRarity(boost = 1) {
  const entries = Object.entries(RARITIES).map(([k, v]) => {
    let w = v.weight;
    if (boost > 1 && (k === "epic" || k === "legendary" || k === "rare")) w *= boost;
    return [k, w];
  });
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of entries) {
    if (r < w) return k;
    r -= w;
  }
  return "common";
}

function countRepeats(str) {
  const digits = str.replace(/\D/g, "");
  const freq = {};
  for (const d of digits) freq[d] = (freq[d] || 0) + 1;
  let bonus = 0;
  for (const k in freq) if (freq[k] >= 3) bonus += freq[k] - 2;
  return bonus;
}

function generateNumber(boost = 1) {
  const country = randomFrom(FAKE_COUNTRIES);
  const operator = randomFrom(FAKE_OPERATORS);
  const rarity = pickRarity(boost);
  let body;
  if (rarity === "legendary") {
    const d = randInt(1, 9);
    body = `${d}${d}${d}-${d}${d}${d}`;
  } else if (rarity === "epic") {
    const a = randInt(1, 9), b = randInt(0, 9);
    body = `${a}${b}${a}-${b}${a}${b}`;
  } else if (rarity === "rare") {
    body = `${randInt(100, 999)}-${randInt(100, 999)}`;
  } else {
    body = `${randInt(100, 999)}-${randInt(10, 99)}-${randInt(10, 99)}`;
  }
  const full = `${country.code} ${body}`;
  const base = 15 + Math.floor(Math.random() * 15);
  const beautyBonus = countRepeats(full) * 3;
  const price = Math.floor((base + beautyBonus) * RARITIES[rarity].mult);
  return { id: Date.now() + Math.random(), number: full, country: country.name, operator, rarity, price };
}

const $ = id => document.getElementById(id);

function render() {
  $("coins").textContent = state.coins;
  $("level").textContent = state.level;
  $("xp").textContent = state.xp;
  $("xpNeed").textContent = xpNeed(state.level);
  $("xpFill").style.width = (state.xp / xpNeed(state.level) * 100) + "%";
  $("invCount").textContent = state.inventory.length;
  renderInventory();
}

function renderInventory() {
  const box = $("inventory");
  if (state.inventory.length === 0) {
    box.innerHTML = `<div class="hint">Инвентарь пуст. Сгенерируй номер!</div>`;
    return;
  }
  box.innerHTML = state.inventory.map(item => `
    <div class="inv-item ${RARITIES[item.rarity].color}">
      <div>
        <div class="num">${item.number}</div>
        <div class="hint">${item.operator} · ${RARITIES[item.rarity].name}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <span class="price">${item.price}💰</span>
        <button class="sell-btn" data-id="${item.id}">Продать</button>
      </div>
    </div>
  `).join("");
  box.querySelectorAll(".sell-btn").forEach(btn => {
    btn.onclick = () => sellItem(parseFloat(btn.dataset.id));
  });
}

function toast(text) {
  const t = $("toast");
  t.textContent = text;
  t.classList.add("show");
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove("show"), 1800);
}

function addXP(amount) {
  state.xp += amount;
  while (state.xp >= xpNeed(state.level)) {
    state.xp -= xpNeed(state.level);
    state.level++;
    const bonus = state.level * 20;
    state.coins += bonus;
    toast(`🎉 Уровень ${state.level}! +${bonus}💰`);
  }
}

$("genBtn").onclick = () => {
  if (state.coins < GEN_COST) return toast("Недостаточно монет");
  state.coins -= GEN_COST;
  const num = generateNumber();
  state.inventory.push(num);
  const preview = $("preview");
  preview.textContent = num.number;
  preview.classList.remove("pop");
  void preview.offsetWidth;
  preview.classList.add("pop");
  const r = RARITIES[num.rarity];
  $("rarity").textContent = `${r.name} · ${num.operator} · ${num.country}`;
  $("rarity").className = `rarity-tag ${r.color}`;
  addXP(5);
  tg?.HapticFeedback?.impactOccurred("light");
  render();
  toast(`Получен номер: ${num.price}💰`);
};

$("rouletteBtn").onclick = () => {
  if (state.coins < ROULETTE_COST) return toast("Недостаточно монет");
  state.coins -= ROULETTE_COST;
  const num = generateNumber(3);
  state.inventory.push(num);
  $("rouletteResult").textContent = `Выпало: ${num.number} (${RARITIES[num.rarity].name}) — ${num.price}💰`;
  addXP(15);
  tg?.HapticFeedback?.notificationOccurred("success");
  render();
};

function sellItem(id) {
  const idx = state.inventory.findIndex(i => i.id === id);
  if (idx === -1) return;
  const item = state.inventory[idx];
  state.coins += item.price;
  state.inventory.splice(idx, 1);
  addXP(3);
  tg?.HapticFeedback?.impactOccurred("medium");
  render();
  toast(`Продано за ${item.price}💰`);
}

$("sellAllBtn").onclick = () => {
  if (!state.inventory.length) return;
  const total = state.inventory.reduce((s, i) => s + i.price, 0);
  state.coins += total;
  state.inventory = [];
  tg?.HapticFeedback?.notificationOccurred("success");
  render();
  toast(`Продано всё за ${total}💰`);
};

render();
