/**
 * Shipping rules route — serves shipping configuration
 * GET /api/shipping-rules
 */
import { Hono } from 'hono';

const shipping = new Hono();

/**
 * Fallback shipping rules (matches shipment-condition.js)
 */
const FALLBACK_SHIPPING_RULES = {
  specialEndDate: "2050-12-31T23:59:59",
  zones: {
    bkk_6km: {
      label: "กรุงเทพ รัศมี 6 กม.",
      fee: 0,
      freeThreshold: 150,
      districts: [
        "เขตบางกอกน้อย", "เขตบางกอกใหญ่", "เขตตลิ่งชัน",
        "เขตพระนคร", "เขตบางพลัด", "เขตป้อมปราบศัตรูพ่าย",
        "เขตธนบุรี", "เขตดุสิต", "เขตคลองสาน"
      ]
    },
    bkk_12km: {
      label: "กรุงเทพ รัศมี 12 กม.",
      fee: 50,
      freeThreshold: 300,
      districts: [
        "เขตปทุมวัน", "เขตสัมพันธวงศ์", "เขตภาษีเจริญ",
        "เขตราชเทวี", "เขตบางรัก", "เขตพญาไท",
        "เขตบางซื่อ", "เขตดินแดง", "เขตบางคอแหลม",
        "เขตสาทร", "เขตบางแค", "เขตจอมทอง",
        "เขตราษฎร์บูรณะ", "เขตทวีวัฒนา", "เขตยานนาวา",
        "เขตจตุจักร"
      ]
    },
    bkk_20km: {
      label: "กรุงเทพ รัศมี 20 กม.",
      fee: 100,
      freeThreshold: 500,
      districts: [
        "เขตห้วยขวาง", "เขตบางขุนเทียน", "เขตวัฒนา",
        "เขตบางใหญ่", "เขตทุ่งครุ", "เขตคลองเตย",
        "เขตบางบอน", "เขตหนองแขม", "เขตวังทองหลาง",
        "เขตลาดพร้าว", "เขตปากเกร็ด", "เขตพระโขนง",
        "เขตบางนา", "เขตหลักสี่", "เขตบางเขน",
        "เขตบางกะปิ", "เขตสวนหลวง", "เขตดอนเมือง"
      ]
    },
    bkk_40km: {
      label: "กรุงเทพ รัศมี 40 กม.",
      fee: 150,
      freeThreshold: 1000,
      districts: [
        "เขตบึงกุ่ม", "เขตคันนายาว", "เขตสะพานสูง",
        "เขตประเวศ", "เขตสายไหม", "เขตคลองสามวา",
        "เขตมีนบุรี", "เขตลาดกระบัง", "เขตหนองจอก"
      ]
    },
    nonthaburi_50: {
      label: "นนทบุรี 50 บาท",
      fee: 50,
      freeThreshold: 300,
      districts: ["อำเภอบางกรวย", "อำเภอเมืองนนทบุรี"]
    },
    nonthaburi_100: {
      label: "นนทบุรี 100 บาท",
      fee: 100,
      freeThreshold: 500,
      districts: ["อำเภอบางบัวทอง", "อำเภอปากเกร็ด", "อำเภอบางใหญ่"]
    },
    nonthaburi_150: {
      label: "นนทบุรี 150 บาท",
      fee: 150,
      freeThreshold: 1000,
      districts: ["อำเภอไทรน้อย"]
    },
    samutprakan_100: {
      label: "สมุทรปราการ 100 บาท",
      fee: 100,
      freeThreshold: 300,
      districts: ["อำเภอพระประแดง"]
    },
    samutprakan_150: {
      label: "สมุทรปราการ 150 บาท",
      fee: 150,
      freeThreshold: 1000,
      districts: ["อำเภอพระสมุทรเจดีย์"]
    }
  },
  defaultFee: 300,
  pcFreeShipping: true
};

/**
 * GET /api/shipping-rules
 */
shipping.get('/', async (c) => {
  const env = c.env;

  // Try KV first
  if (env.PRODUCTS_KV) {
    try {
      const kvData = await env.PRODUCTS_KV.get('config:shipping_rules', { type: 'json' });
      if (kvData) {
        return c.json(kvData, 200, {
          'Cache-Control': 'public, max-age=600', // 10 min cache
        });
      }
    } catch (err) {
      console.error('KV read error:', err);
    }
  }

  return c.json(FALLBACK_SHIPPING_RULES, 200, {
    'Cache-Control': 'public, max-age=600',
  });
});

export default shipping;
