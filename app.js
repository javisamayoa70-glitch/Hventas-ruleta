const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');
const form = document.getElementById('player-form');
const spinButton = document.getElementById('spin-button');
const statusMessage = document.getElementById('status-message');
const resultCard = document.getElementById('result');
const totalSlots = 10;
const slice = Math.PI * 2 / totalSlots;
const colors = { coupon: '#d5ad61', food: '#1676d2' };
const couponImage = new Image();
const foodImage = new Image();
couponImage.src = 'assets/coupon.svg';
foodImage.src = 'assets/cat-food.svg';
let rotation = 0;
let spinning = false;
let currentCouponSlots = [0, 4, 7];

function drawWheel(couponSlots = currentCouponSlots) {
  currentCouponSlots = couponSlots;
  const couponSet = new Set(couponSlots);
  const cx = 300, cy = 300, radius = 286;
  ctx.clearRect(0, 0, 600, 600);
  for (let i = 0; i < totalSlots; i++) {
    const start = -Math.PI / 2 + i * slice;
    const end = start + slice;
    const isCoupon = couponSet.has(i);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, radius, start, end); ctx.closePath();
    ctx.fillStyle = isCoupon ? '#d9b45e' : (i % 2 ? '#1769ad' : '#123d68'); ctx.fill();
    ctx.strokeStyle = '#f7f9fc'; ctx.lineWidth = 5; ctx.stroke();
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(start + slice / 2);
    if (isCoupon && couponImage.complete && couponImage.naturalWidth) {
      ctx.drawImage(couponImage, 151, -43, 86, 76);
    } else if (!isCoupon && foodImage.complete && foodImage.naturalWidth) {
      ctx.drawImage(foodImage, 151, -42, 82, 74);
    } else {
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '900 13px system-ui';
      ctx.fillText(isCoupon ? 'CUPÓN' : 'COMIDA', 190, 0);
      ctx.font = '800 9px system-ui'; ctx.fillText(isCoupon ? 'SORPRESA' : 'PARA GATOS', 190, 15);
    }
    ctx.restore();
  }
  ctx.beginPath(); ctx.arc(cx, cy, 53, 0, Math.PI * 2); ctx.fillStyle = '#101827'; ctx.fill();
  ctx.lineWidth = 5; ctx.strokeStyle = '#d5ad61'; ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '900 23px system-ui, sans-serif'; ctx.fillText('HV', cx, cy - 3);
  ctx.font = '700 8px system-ui, sans-serif'; ctx.fillStyle = '#d5ad61'; ctx.fillText('HVENTAS', cx, cy + 19);
  const legend = document.querySelector('.wheel-caption');
  if (legend) legend.innerHTML = `<span class="legend coupon"></span> ${couponSlots.length} CUPÓN${couponSlots.length === 1 ? '' : 'ES'} SORPRESA <span class="legend cat"></span> COMIDA PARA GATOS`;
}
couponImage.onload = () => drawWheel();
foodImage.onload = () => drawWheel();
drawWheel();

function setStatus(message) { statusMessage.textContent = message; }
function makeWhatsAppUrl(name, playerId) {
  const number = String(window.HVENTAS_CONFIG?.whatsappNumber || '').replace(/\D/g, '');
  if (!number || number.length < 10) return null;
  const message = `Hola HVENTAS, gané un CUPÓN SORPRESA en la ruleta.\nNombre de TikTok: ${name}\nID de Free Fire: ${playerId}\nMi resultado: CUPÓN SORPRESA.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (spinning) return;
  const name = document.getElementById('player-name').value.trim();
  const playerId = document.getElementById('player-id').value.trim();
  if (name.length < 2 || !/^[0-9]{5,24}$/.test(playerId)) {
    setStatus('Escribe tu nombre de TikTok y un ID de Free Fire válido, solo números.'); return;
  }
  spinning = true; spinButton.disabled = true; resultCard.hidden = true;
  setStatus('La ruleta está girando. ¡Mucha suerte!');
  try {
    const response = await fetch('/.netlify/functions/spin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, playerId })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo procesar el giro.');

    // Cada giro recibe una nueva distribución de los cupones en la ruleta.
    canvas.style.transition = 'none';
    canvas.style.transform = `rotate(${rotation}deg)`;
    drawWheel(data.couponSlots || []);
    const sliceDegrees = 360 / totalSlots;
    const target = (360 - (data.slot * sliceDegrees + sliceDegrees / 2)) % 360;
    const current = ((rotation % 360) + 360) % 360;
    const extra = 360 * 6 + ((target - current + 360) % 360);
    rotation += extra;
    void canvas.offsetWidth;
    canvas.style.transition = 'transform 5.5s cubic-bezier(.12,.72,.12,1)';
    canvas.style.transform = `rotate(${rotation}deg)`;
    await new Promise(resolve => setTimeout(resolve, 5650));
    canvas.style.transition = 'none';

    resultCard.hidden = false;
    const title = document.getElementById('result-title');
    const copy = document.getElementById('result-copy');
    const warning = document.getElementById('coupon-warning');
    const whatsapp = document.getElementById('whatsapp-button');
    const help = document.getElementById('whatsapp-help');
    const symbol = document.getElementById('result-symbol');
    const kicker = document.getElementById('result-kicker');
    if (data.win) {
      symbol.textContent = '★'; kicker.textContent = 'RESULTADO GANADOR';
      title.textContent = '¡Felicidades!';
      copy.textContent = '¡Te ganaste un cupón de descuento sorpresa! Este cupón tendrá descuento dependiendo el paquete de diamantes que desees recargar.';
      warning.hidden = false;
      const url = makeWhatsAppUrl(name, playerId);
      if (url) { whatsapp.href = url; whatsapp.hidden = false; help.hidden = false; help.textContent = 'Se abrirá WhatsApp con tu nombre de TikTok, ID y resultado. Pulsa «Enviar» para mandarlo a HVENTAS.'; }
      else { whatsapp.hidden = true; help.hidden = false; help.textContent = 'El premio quedó registrado, pero falta configurar el WhatsApp de HVENTAS.'; }
      setStatus('¡Cupón registrado! Envía tus resultados a HVENTAS por WhatsApp.');
    } else {
      symbol.textContent = '🐾'; kicker.textContent = 'RESULTADO DE PARTICIPACIÓN';
      title.textContent = '¡Te tocó comida para gatos!';
      copy.textContent = 'Esta vez no salió cupón sorpresa. ¡Gracias por participar en la ruleta HVENTAS!';
      warning.hidden = true; whatsapp.hidden = true; help.hidden = true;
      setStatus('Gracias por participar.');
    }
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (error) {
    setStatus(error.message || 'Ocurrió un error. Inténtalo nuevamente.');
  } finally {
    spinButton.disabled = false; spinning = false;
  }
});
