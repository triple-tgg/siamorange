/**
 * Siam Orange V2 — Shipping Fee Calculator
 * Uses structured shipping rules (from API or fallback)
 */

// Local cache of shipping rules
let shippingRulesCache = null;

/**
 * Load shipping rules from API
 * @returns {Promise<Object>}
 */
export async function loadShippingRules() {
  if (shippingRulesCache) return shippingRulesCache;

  try {
    const res = await fetch('/api/shipping-rules');
    if (res.ok) {
      shippingRulesCache = await res.json();
      return shippingRulesCache;
    }
  } catch (err) {
    console.warn('Failed to load shipping rules from API, using fallback:', err);
  }

  // Fallback — hardcoded rules (same as V1)
  shippingRulesCache = getFallbackRules();
  return shippingRulesCache;
}

/**
 * Calculate shipping fee based on district and cart
 * @param {string} district — เขต/อำเภอ name
 * @param {Object} cart — { code: { price, qty }, ... }
 * @returns {number} — shipping fee in baht
 */
export function calculateShippingDistrictFee(district, cart) {
  if (!district || !cart) return 0;

  const rules = shippingRulesCache || getFallbackRules();
  const now = new Date();
  const specialEnd = new Date(rules.specialEndDate || '2025-12-31T23:59:59');

  const keys = Object.keys(cart).filter(code => cart[code]?.qty > 0);
  const total = keys.reduce((sum, code) => sum + (cart[code]?.price || 0) * (cart[code]?.qty || 0), 0);

  if (keys.length === 0) return 0;

  // Special: pc_ items always free shipping (unconditional — not tied to specialEndDate)
  if (rules.pcFreeShipping && keys.every(code => code.startsWith('pc_')) && total > 0) {
    return 0;
  }

  // Check each zone
  if (now <= specialEnd) {
    for (const zone of Object.values(rules.zones)) {
      if (zone.districts.includes(String(district))) {
        if (total >= zone.freeThreshold) return 0;
        return zone.fee;
      }
    }
  }

  // Default fee for areas outside all zones
  return rules.defaultFee || 300;
}

/**
 * Show shipping info popup based on district/province
 * @param {string} district
 * @param {string} province
 * @param {Object} cart
 * @param {Function} showPopup — popup display function
 */
export function showShippingInfoByDistrict(district, province, cart, showPopup) {
  const rules = shippingRulesCache || getFallbackRules();
  const total = Object.keys(cart)
    .filter(code => cart[code]?.qty > 0)
    .reduce((sum, code) => sum + (cart[code]?.price || 0) * (cart[code]?.qty || 0), 0);

  let message = '';

  for (const [key, zone] of Object.entries(rules.zones)) {
    if (zone.districts.includes(district) && total < zone.freeThreshold) {
      const isProvinceLevel = key.startsWith('nonthaburi') || key.startsWith('samutprakan');
      const prefix = isProvinceLevel
        ? `🔆 ${district}<br>📌 ${province} - ${district}<br>`
        : `🔆 เขต ${district}<br>`;

      message = `${prefix}📌 สั่งซื้อ ${zone.freeThreshold.toLocaleString('th-TH')} บาท ขึ้นไป ส่งฟรี<br>💰 ค่าจัดส่ง: ${zone.fee === 0 ? 'ฟรี' : zone.fee + ' บาท'}`;
      break;
    }
  }

  // Out-of-zone / upcountry
  if (!message && province !== 'กรุงเทพมหานคร' && province !== 'นนทบุรี' && province !== 'สมุทรปราการ') {
    if (total < 1400) {
      message = `🔆 เคส ต่างจังหวัด<br>📌 ${province} - ${district}<br>📌 สั่งซื้อยกเซ็ท ส่งฟรีทั่วประเทศ<br>📌 สินค้าปลีก: ขั้นต่ำ 1,400 บาท+ ส่งฟรี<br>💰 ค่าจัดส่งปกติ: 200-300 บาท`;
    }
  }

  if (message && showPopup) {
    showPopup('แจ้งเตือนจากระบบ', message);
  }
}

/**
 * Fallback shipping rules (same as V1 shipment-condition.js)
 */
function getFallbackRules() {
  return {
    specialEndDate: "2026-12-31T23:59:59",
    pcFreeShipping: true,
    defaultFee: 300,
    zones: {
      bkk_6km: {
        label: "กรุงเทพ รัศมี 6 กม.", fee: 0, freeThreshold: 150,
        districts: ["เขตบางกอกน้อย","เขตบางกอกใหญ่","เขตตลิ่งชัน","เขตพระนคร","เขตบางพลัด","เขตป้อมปราบศัตรูพ่าย","เขตธนบุรี","เขตดุสิต","เขตคลองสาน"]
      },
      bkk_12km: {
        label: "กรุงเทพ รัศมี 12 กม.", fee: 50, freeThreshold: 300,
        districts: ["เขตปทุมวัน","เขตสัมพันธวงศ์","เขตภาษีเจริญ","เขตราชเทวี","เขตบางรัก","เขตพญาไท","เขตบางซื่อ","เขตดินแดง","เขตบางคอแหลม","เขตสาทร","เขตบางแค","เขตจอมทอง","เขตราษฎร์บูรณะ","เขตทวีวัฒนา","เขตยานนาวา","เขตจตุจักร"]
      },
      bkk_20km: {
        label: "กรุงเทพ รัศมี 20 กม.", fee: 100, freeThreshold: 500,
        districts: ["เขตห้วยขวาง","เขตบางขุนเทียน","เขตวัฒนา","เขตบางใหญ่","เขตทุ่งครุ","เขตคลองเตย","เขตบางบอน","เขตหนองแขม","เขตวังทองหลาง","เขตลาดพร้าว","เขตปากเกร็ด","เขตพระโขนง","เขตบางนา","เขตหลักสี่","เขตบางเขน","เขตบางกะปิ","เขตสวนหลวง","เขตดอนเมือง"]
      },
      bkk_40km: {
        label: "กรุงเทพ รัศมี 40 กม.", fee: 150, freeThreshold: 1000,
        districts: ["เขตบึงกุ่ม","เขตคันนายาว","เขตสะพานสูง","เขตประเวศ","เขตสายไหม","เขตคลองสามวา","เขตมีนบุรี","เขตลาดกระบัง","เขตหนองจอก"]
      },
      nonthaburi_50: {
        label: "นนทบุรี 50 บาท", fee: 50, freeThreshold: 300,
        districts: ["อำเภอบางกรวย","อำเภอเมืองนนทบุรี"]
      },
      nonthaburi_100: {
        label: "นนทบุรี 100 บาท", fee: 100, freeThreshold: 500,
        districts: ["อำเภอบางบัวทอง","อำเภอปากเกร็ด","อำเภอบางใหญ่"]
      },
      nonthaburi_150: {
        label: "นนทบุรี 150 บาท", fee: 150, freeThreshold: 1000,
        districts: ["อำเภอไทรน้อย"]
      },
      samutprakan_100: {
        label: "สมุทรปราการ 100 บาท", fee: 100, freeThreshold: 300,
        districts: ["อำเภอพระประแดง"]
      },
      samutprakan_150: {
        label: "สมุทรปราการ 150 บาท", fee: 150, freeThreshold: 1000,
        districts: ["อำเภอพระสมุทรเจดีย์"]
      }
    }
  };
}
