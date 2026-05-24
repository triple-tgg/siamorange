/**
 * Siam Orange V2 — Main Application
 * Cart management, order submission, UI logic
 */
import { submitOrder, getProducts } from './api-client.js';
import { calculateShippingDistrictFee, loadShippingRules, showShippingInfoByDistrict } from './shipping.js';
import { UserSession } from './session.js';
import { showOrderPopup, showToast, getQueryParam, newOrderId, formatPrice } from './utils.js';

// === GLOBAL STATE ===
let cart = {};
let shippingFee = 0;
let productCatalog = {};

// === SHIPPING ===
function setShippingFee(value) {
  shippingFee = Number(value) || 0;
  const el = document.getElementById('deliveryFee');
  if (shippingFee === 0) {
    if (el) el.textContent = 'โปรโมชั่นส่งฟรี';
  } else {
    if (el) el.textContent = formatPrice(shippingFee);
  }
  updateCartDisplay();
}

function recalcFromDistrict() {
  const districtEl = document.querySelector('#district');
  const district = districtEl?.value?.trim();
  if (!district) return;
  setShippingFee(calculateShippingDistrictFee(district, cart));
}

// === CART ===
function updateCartDisplay() {
  const itemsEl = document.getElementById('cartItems');
  const totalEl = document.getElementById('totalPrice');
  const shipCostValue = Number(shippingFee) || 0;

  const keys = Object.keys(cart);
  if (keys.length === 0) {
    if (itemsEl) itemsEl.innerHTML = '<p style="color:#666;font-style:italic;margin:0;">กรุณาเลือกสินค้าจากด้านบน</p>';
    if (totalEl) totalEl.textContent = '฿0';
    return;
  }

  let html = '';
  let total = 0;

  keys.forEach(key => {
    const { name, price, qty } = cart[key];
    const sub = price * qty;
    total += sub;
    html += `
      <div style="display:flex;justify-content:space-between;align-items:center;margin:5px 0;padding:8px;background:white;border-radius:4px;">
        <div>
          <strong>${name}</strong><br>
          <small style="color:#666;">฿${price.toLocaleString('th-TH')} x ${qty}</small>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:bold;color:#e67e22;">฿${sub.toLocaleString('th-TH')}</div>
          <button type="button" data-remove="${key}" style="background:#dc3545;color:white;border:none;border-radius:3px;padding:2px 8px;font-size:10px;cursor:pointer;margin-top:3px;">ลบ</button>
        </div>
      </div>
    `;
  });

  if (itemsEl) itemsEl.innerHTML = html;
  if (totalEl) totalEl.textContent = `฿${(total + shipCostValue).toLocaleString('th-TH')}`;

  // Attach remove button events
  document.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      removeFromCart(btn.dataset.remove);
    });
  });
}

function addToCart(key, name, price, qty = 1) {
  if (!cart[key]) {
    cart[key] = { name, price: Number(price) || 0, qty: 0 };
  }
  cart[key].qty += qty;
  if (cart[key].qty <= 0) delete cart[key];
  updateCartDisplay();
  updateProductCards();
  recalcFromDistrict();
}

function removeFromCart(key) {
  delete cart[key];
  updateCartDisplay();
  updateProductCards();
  recalcFromDistrict();
}

// Make available globally for inline handlers
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;

// === PRODUCT CARDS ===
function updateProductCards() {
  document.querySelectorAll('.product-card').forEach(card => {
    const key = card.dataset.product;
    const qty = cart[key]?.qty || 0;
    const qtyDisplay = card.querySelector('.qty-display');

    if (qtyDisplay) qtyDisplay.textContent = qty;
    card.style.borderColor = qty > 0 ? '#ffa500' : '#ddd';
    card.style.backgroundColor = qty > 0 ? '#fff8f0' : 'white';
  });
}

function setupProductCards() {
  document.querySelectorAll('.product-card').forEach(card => {
    const key = card.dataset.product;
    const price = Number(card.dataset.price) || 0;
    const name = card.dataset.label || (card.querySelector('div')?.textContent || key).trim();

    const plusBtn = card.querySelector('.qty-btn.plus');
    if (plusBtn) {
      plusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        addToCart(key, name, price, 1);
      });
    }

    const minusBtn = card.querySelector('.qty-btn.minus');
    if (minusBtn) {
      minusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        addToCart(key, name, price, -1);
      });
    }
  });
}

// === PRODUCT RENDERING ===
function renderProducts(dataObj) {
  const wrapPc = document.getElementById('product_gallery_pc');
  const wrapOther = document.getElementById('product_gallery_other');
  const tplEl = document.getElementById('productCardTpl');

  if (!wrapPc || !wrapOther || !tplEl) return;

  // Clear previous cards to avoid duplicates when loading from API
  wrapPc.innerHTML = '';
  wrapOther.innerHTML = '';

  const tpl = tplEl.textContent.trim();
  const render = (str, map) => str.replace(/\{\{(\w+)\}\}/g, (_, k) => map[k] ?? '');

  for (const [code, p] of Object.entries(dataObj)) {
    // Normalize image path: prepend /public if path starts with /product/
    let imgPath = p.image || '';
    if (imgPath.startsWith('/product/')) {
      imgPath = '/public' + imgPath;
    }

    const map = {
      KEY: code,
      IMAGE: imgPath,
      LABEL: p.label || code,
      SIZE: p.size ?? '',
      TEXTURE: p.texture ?? '',
      PRICE: p.price ?? 0,
      PRICE_FMT: Number(p.price ?? 0).toLocaleString('th-TH'),
    };
    if (code.startsWith('pc_')) {
      wrapPc.insertAdjacentHTML('beforeend', render(tpl, map));
    } else {
      wrapOther.insertAdjacentHTML('beforeend', render(tpl, map));
    }
  }
}

// === FORM SUBMISSION ===
async function handleOrderSubmit(e) {
  e.preventDefault();

  if (Object.keys(cart).length === 0) {
    showOrderPopup('การแจ้งเตือน', '❌ กรุณาเลือกสินค้าอย่างน้อย 1 รายการ');
    return;
  }

  const fd = new FormData(e.target);
  const paymentMethod = fd.get('payment_method');
  if (!paymentMethod) {
    showOrderPopup('การแจ้งเตือน', '❌ กรุณาเลือกวิธีการชำระเงิน');
    return;
  }

  // Build catalog from DOM
  const catalog = {};
  document.querySelectorAll('.product-card').forEach(card => {
    const code = card.dataset.product;
    if (!code) return;
    const price = Number(card.dataset.price || 0);
    const name = card.dataset.label || card.querySelector('div')?.textContent?.trim() || code;
    catalog[code] = { name, price };
  });

  // Read quantities from cards
  const qtyMap = {};
  document.querySelectorAll('.product-card').forEach(card => {
    const code = card.dataset.product;
    if (!code) return;
    const qty = Number(card.querySelector('.qty-display')?.textContent || 0) || 0;
    qtyMap[code] = qty;
  });

  // Calculate totals
  const items = Object.keys(catalog).map(code => {
    const { name, price } = catalog[code];
    const qty = qtyMap[code] || 0;
    return { code, name, price, qty, subtotal: price * qty };
  });

  const orderProduct = items.reduce((s, it) => s + it.subtotal, 0);
  const orderQtyTotal = items.reduce((s, it) => s + it.qty, 0);

  if (orderProduct <= 0 || orderQtyTotal <= 0) {
    showOrderPopup('การแจ้งเตือน', '❌ กรุณาเลือกสินค้า');
    return;
  }
  if (orderProduct < 100) {
    showOrderPopup('การแจ้งเตือน', '❌ กรุณาสั่งซื้อขั้นต่ำ 100 บาท/การสั่งซื้อ');
    return;
  }

  const deliveryFeeNumber = Number(shippingFee) || 0;

  const productList = Object.fromEntries(
    Object.keys(catalog).map(code => [code, qtyMap[code] || 0])
  );

  const orderData = {
    order_id: newOrderId(),
    order_date: new Date().toLocaleString('th-TH'),
    aff_code: fd.get('qs_aff') || '',
    referral_link: (fd.get('qs_aff') || '') ? `https://line.siamorange.com/?aff=${fd.get('qs_aff')}` : '',
    note: (fd.get('note') || '').trim(),
    name: fd.get('customer_name') || '',
    phone: fd.get('phone') || '',
    address: fd.get('address') || fd.get('address_detail') || '',
    province: fd.get('province') || '',
    district: fd.get('district') || '',
    subdistrict: fd.get('subdistrict') || '',
    postcode: fd.get('postcode') || fd.get('zipcode') || '',
    payment_method: paymentMethod,
    pay_to_bank: fd.get('pay_to_bank') || 'SCB',
    pay_to_account: fd.get('pay_to_account') || '2642408438',
    pay_from_bank: fd.get('pay_from_bank') || '',
    pay_from_account: fd.get('pay_from_account') || '',
    pay_slip: (document.getElementById('slip_upload')?.files?.[0]?.name) || '',
    pay_form_person: fd.get('pay_form_person') || (fd.get('customer_name') || ''),
    deliv_date: fd.get('delivery_date') || '',
    deliv_time: document.getElementById('delivery_now')?.checked ? 1 : 0,
    order_total: orderProduct + deliveryFeeNumber,
    order_product: orderProduct,
    order_qty_total: orderQtyTotal,
    order_ship_fee: deliveryFeeNumber,
    product_list: productList,
  };

  // Disable submit button
  const submitBtn = document.getElementById('form_submit');
  if (submitBtn) {
    submitBtn.innerHTML = '⏳ กำลังดำเนินการ...';
    submitBtn.disabled = true;
  }

  try {
    const slip = document.getElementById('slip_upload')?.files?.[0] || null;
    const orderResponse = await submitOrder(orderData, slip);

    showOrderPopup(
      'คำสั่งซื้อสำเร็จ',
      `เลขที่จัดซื้อ: ${orderResponse.order_id}<br>วันที่สั่งซื้อ: ${orderResponse.order_date}<br>ผู้รับ: ${orderResponse.receiver || ''}`,
      (header) => {
        if (header === 'คำสั่งซื้อสำเร็จ') {
          window.location.reload();
        }
      }
    );
  } catch (err) {
    showOrderPopup('เกิดข้อผิดพลาด', 'ส่งคำสั่งซื้อไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อ หรือ ลองใหม่อีกครั้ง');
  } finally {
    if (submitBtn) {
      submitBtn.innerHTML = 'ยืนยันการสั่งซื้อ';
      submitBtn.disabled = false;
    }
  }
}

// === INITIALIZATION ===
document.addEventListener('DOMContentLoaded', async function () {
  // Load shipping rules
  await loadShippingRules();

  // Try to load products from API, fallback to inline HTML data
  try {
    productCatalog = await getProducts();
    renderProducts(productCatalog);
  } catch (err) {
    console.warn('Failed to load products from API, falling back to inline data:', err);
    const productsDataEl = document.getElementById('productsData');
    if (productsDataEl) {
      productCatalog = JSON.parse(productsDataEl.textContent.trim());
      // No need to render since inline script already rendered it
    }
  }

  // Set minimum date to today
  const dateInput = document.querySelector('input[name="delivery_date"]');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
  }

  // Setup product cards
  setupProductCards();
  updateCartDisplay();

  // Payment method toggle
  const paymentInputs = document.getElementsByName('payment_method');
  const paymentSection = document.getElementById('payment_method_slip');
  paymentInputs.forEach(input => {
    input.addEventListener('click', function () {
      if (paymentSection) paymentSection.style.display = 'block';
    });
  });

  // Shipping recalc on district change
  const districtEl = document.querySelector('#district, select[name="district"]');
  if (districtEl) {
    districtEl.addEventListener('change', () => {
      setTimeout(recalcFromDistrict, 0);
    });
  }

  // Affiliate code from query string OR saved cookie
  const affCode = getQueryParam('aff') || UserSession.getAffCode() || '';
  const affInput = document.getElementById('qs_aff');
  if (affInput && affCode) {
    affInput.value = affCode;
    UserSession.setAffCode(affCode);
  }

  // Order form submission
  const orderForm = document.getElementById('orderForm');
  if (orderForm) {
    orderForm.addEventListener('submit', handleOrderSubmit);
  }
});

// Export for potential use in other scripts
export { cart, shippingFee, addToCart, removeFromCart, updateCartDisplay, updateProductCards, showOrderPopup };
