/**
 * Products route — serves product catalog from KV or fallback
 * GET /api/products
 */
import { Hono } from 'hono';

const products = new Hono();

/**
 * Hardcoded product catalog fallback
 * (used when KV is not yet set up)
 */
const FALLBACK_PRODUCTS = {
  "ml200g10_dtt1": {
    "label": "ลายวันสำคัญทางศาสนา",
    "image": "/product/thaibuddha_2008.jpg?v=1",
    "size": 200,
    "texture": 10,
    "price": 20,
    "amount": 1,
    "note": ""
  },
  "ml200g10_dtt2": {
    "label": "ครบรอบ1ปีท่าวังหลัง",
    "image": "/product/celebration_2008.jpg?v=1",
    "size": 200,
    "texture": 20,
    "price": 25,
    "amount": 1,
    "note": ""
  },
  "ml200g20_dtt1": {
    "label": "ลายวิถีชุมชน",
    "image": "/product/thaicommunity_2008.jpg?v=1",
    "size": 270,
    "texture": 20,
    "price": 30,
    "amount": 1,
    "note": ""
  },
  "ml350g30_dtt1": {
    "label": "ลายราชพิธี",
    "image": "/product/royalceremony_2008.jpg?v=1",
    "size": 350,
    "texture": 30,
    "price": 40,
    "amount": 1,
    "note": ""
  },
  "ml500g40_dtt1": {
    "label": "ลายท่าวังหลัง",
    "image": "/product/wanglang_2008.jpg?v=1",
    "size": 500,
    "texture": 40,
    "price": 50,
    "amount": 1,
    "note": ""
  },
  "ml500g120_dtt1": {
    "label": "ป่าในวรรณคดี",
    "image": "/product/forestliterature_2008.jpg?v=1",
    "size": 500,
    "texture": 120,
    "price": 120,
    "amount": 1,
    "note": ""
  },
  "bx_ml500g40_dtt1": {
    "label": "รามเกียรติ์ 4 กระป๋อง คละลาย",
    "image": "/product/thairammakien_2008.jpg?v=1",
    "size": 500,
    "texture": 40,
    "price": 200,
    "amount": 4,
    "note": ""
  },
  "pc_ml200g10_dtt1": {
    "label": "ลายสยามออเร้นจ์",
    "image": "/product/siamorange_set_0309.jpg?v=1",
    "size": 200,
    "texture": 10,
    "price": 1400,
    "amount": 80,
    "note": ""
  },
  "pc_ml200g10_dtt2": {
    "label": "ลายวันสำคัญทางศาสนา",
    "image": "/product/thaibuddha_set_0309.jpg?v=1",
    "size": 200,
    "texture": 10,
    "price": 1600,
    "amount": 80,
    "note": ""
  },
  "pc_ml200g20_dtt1": {
    "label": "ครบรอบ1ปีท่าวังหลัง",
    "image": "/product/celebration_set_0309.jpg?v=1",
    "size": 200,
    "texture": 20,
    "price": 2000,
    "amount": 80,
    "note": ""
  },
  "pc_ml270g20_dtt1": {
    "label": "ลายวิถีชุมชน",
    "image": "/product/thaicommunity_set_0309.jpg?v=1",
    "size": 270,
    "texture": 20,
    "price": 2100,
    "amount": 70,
    "note": ""
  },
  "pc_ml350g30_dtt1": {
    "label": "ลายราชพิธี",
    "image": "/product/royalceremony_set_0309.jpg?v=1",
    "size": 350,
    "texture": 30,
    "price": 2000,
    "amount": 50,
    "note": ""
  },
  "pc_ml500g10_dtt1": {
    "label": "ลายท่าวังหลังและป่าวรรณคดี",
    "image": "/product/wanglang_set_0309.jpg?v=1",
    "size": 500,
    "texture": 10,
    "price": 1600,
    "amount": 40,
    "note": ""
  },
  "pc_ml500g40_dtt1": {
    "label": "รามเกียรติ์ คละลายละ 10 กระป๋อง",
    "image": "/product/thairammakien_set_0309.jpg?v=1",
    "size": 500,
    "texture": 40,
    "price": 2000,
    "amount": 40,
    "note": ""
  },
  "pc_ml2000g3000_dtt1": {
    "label": "น้ำส้มคั้นสด 20 ลิตร/ เนื้อส้มแกะ 3 กิโลกรัม + สติกเกอร์สยามออเรนจ์ 100 ดวง",
    "image": "/product/extralarge_set_0910.jpg?v=1",
    "size": 20000,
    "texture": 3000,
    "price": 2000,
    "amount": 1,
    "note": ""
  }
};

/**
 * GET /api/products — return product catalog
 */
products.get('/', async (c) => {
  const env = c.env;

  // Try KV first
  if (env.PRODUCTS_KV) {
    try {
      const kvData = await env.PRODUCTS_KV.get('products:catalog', { type: 'json' });
      if (kvData) {
        return c.json(kvData, 200, {
          'Cache-Control': 'public, max-age=300', // 5 min cache
        });
      }
    } catch (err) {
      console.error('KV read error:', err);
    }
  }

  // Fallback to hardcoded data
  return c.json(FALLBACK_PRODUCTS, 200, {
    'Cache-Control': 'public, max-age=300',
  });
});

export default products;
