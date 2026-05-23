/**
 * Seed Cloudflare KV with product catalog and shipping rules
 * 
 * Usage:
 *   # Set your Cloudflare account details
 *   export CLOUDFLARE_ACCOUNT_ID=<your-account-id>
 *   export CLOUDFLARE_API_TOKEN=<your-api-token>
 *   export KV_NAMESPACE_ID=<your-kv-namespace-id>
 *   
 *   node scripts/seed-kv.js
 * 
 * Or use wrangler directly:
 *   cd worker
 *   wrangler kv:key put --namespace-id=<ID> "products:catalog" --path=../scripts/data/products.json
 *   wrangler kv:key put --namespace-id=<ID> "config:shipping_rules" --path=../scripts/data/shipping-rules.json
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read data files
const products = JSON.parse(readFileSync(join(__dirname, 'data', 'products.json'), 'utf8'));
const shippingRules = JSON.parse(readFileSync(join(__dirname, 'data', 'shipping-rules.json'), 'utf8'));

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const KV_NAMESPACE_ID = process.env.KV_NAMESPACE_ID;

if (!ACCOUNT_ID || !API_TOKEN || !KV_NAMESPACE_ID) {
  console.error('❌ Missing environment variables:');
  console.error('   CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, KV_NAMESPACE_ID');
  console.error('\nOr use wrangler CLI directly:');
  console.error('   cd worker');
  console.error('   wrangler kv:key put --namespace-id=<ID> "products:catalog" \'<JSON>\'');
  process.exit(1);
}

const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${KV_NAMESPACE_ID}/values`;

async function putKV(key, value) {
  const res = await fetch(`${baseUrl}/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(value),
  });

  if (res.ok) {
    console.log(`✅ ${key} — seeded successfully`);
  } else {
    const text = await res.text();
    console.error(`❌ ${key} — failed: ${res.status} ${text}`);
  }
}

async function main() {
  console.log('🌱 Seeding Cloudflare KV...\n');
  await putKV('products:catalog', products);
  await putKV('config:shipping_rules', shippingRules);
  console.log('\n✅ Done!');
}

main().catch(console.error);
