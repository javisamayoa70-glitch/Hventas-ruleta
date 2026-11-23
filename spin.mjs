import { getStore } from "@netlify/blobs";

const TOTAL_SLOTS = 10;
const TOTAL_COUPONS = 3;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function shuffled(values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default async (request) => {
  if (request.method !== "POST") return json({ error: "Método no permitido." }, 405);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Solicitud inválida." }, 400); }

  const name = String(body?.name ?? "").trim().slice(0, 60);
  const playerId = String(body?.playerId ?? "").trim().slice(0, 24);
  if (name.length < 2 || !/^[0-9]{5,24}$/.test(playerId)) {
    return json({ error: "Escribe tu nombre de TikTok y un ID de Free Fire válido (solo números)." }, 400);
  }

  const store = getStore({ name: "hventas-ruleta-premios" });
  const availableCoupons = [];
  for (let couponNumber = 1; couponNumber <= TOTAL_COUPONS; couponNumber++) {
    const existing = await store.getJSON(`coupon-${couponNumber}`);
    if (!existing) availableCoupons.push(couponNumber);
  }

  // Los cupones disponibles cambian de posición en cada giro.
  const positions = shuffled(Array.from({ length: TOTAL_SLOTS }, (_, i) => i));
  const couponMap = new Map();
  availableCoupons.forEach((couponNumber, index) => couponMap.set(positions[index], couponNumber));
  const couponSlots = [...couponMap.keys()];
  const slot = Math.floor(Math.random() * TOTAL_SLOTS);
  const couponNumber = couponMap.get(slot);

  if (!couponNumber) {
    return json({ win: false, slot, couponSlots, prize: "COMIDA PARA GATOS" });
  }

  const result = await store.setJSON(`coupon-${couponNumber}`, {
    name,
    playerId,
    couponNumber,
    wonAt: new Date().toISOString()
  }, { onlyIfNew: true });

  if (!result.modified) {
    return json({ win: false, slot, couponSlots, prize: "COMIDA PARA GATOS" });
  }

  return json({ win: true, slot, couponSlots, prize: "CUPÓN SORPRESA" });
};
