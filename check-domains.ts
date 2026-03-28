import * as dns from 'node:dns/promises';

const bases = [
  'gestalt', 'klara', 'vellum', 'episteme',
  'halcyon', 'ataraxis', 'kvieto', 'aegis',
  'nodus', 'ponto', 'verum', 'strata'
];

const prefixes = ['', 'get', 'use', 'try'];
const suffixes = ['', 'base', 'flow', 'sync', 'node', 'labs', 'grid', 'forge', 'core'];
const tlds = ['.com', '.co', '.net', '.io'];

async function huntAndPriceDomains() {
  console.log('1. Fetching live market pricing...');
  
  let pricingData: Record<string, any> = {};
  try {
    // Fetching from Porkbun's unauthenticated public API
    const priceRes = await fetch('https://api.porkbun.com/api/json/v3/pricing/get');
    const priceJson = await priceRes.json();
    if (priceJson.status === 'SUCCESS') {
      pricingData = priceJson.pricing;
      console.log('   ✅ Pricing data secured.');
    }
  } catch (e) {
    console.log('   ⚠️ Could not fetch live pricing, falling back to unknown.');
  }

  const openDomains: string[] = [];
  console.log('\n2. Silently scanning DNS records for available domains...');

  const totalChecks = bases.length * prefixes.length * suffixes.length * tlds.length;

  for (const base of bases) {
    for (const prefix of prefixes) {
      for (const suffix of suffixes) {
        if (prefix === '' && suffix === '') continue;

        const name = `${prefix}${base}${suffix}`;
        
        for (const tld of tlds) {
          const domain = `${name}${tld}`;
          
          try {
            await dns.resolveNs(domain);
          } catch (error: any) {
            if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
              // Remove the dot from the TLD to match the JSON key
              const tldKey = tld.substring(1);
              const price = pricingData[tldKey]?.registration 
                ? `$${pricingData[tldKey].registration}` 
                : 'Standard Rate';

              // Pad the domain name so the prices align nicely in the text file
              openDomains.push(`${domain.padEnd(25, ' ')} | ${price}/yr`);
            }
          }
        }
      }
    }
  }

  console.log('\n3. Generating report...');

  if (openDomains.length > 0) {
    // Sort alphabetically for easier reading
    openDomains.sort();
    
    const fileContent = `AVAILABLE GLOBAL STEALTH DOMAINS\n================================\nTotal Combinations Scanned: ${totalChecks}\n\n` + openDomains.join('\n');
    
    // Using Bun's native write method
    await Bun.write('priced-domains.txt', fileContent);
    console.log(`✅ Success! ${openDomains.length} domains and their exact prices have been saved to 'priced-domains.txt'`);
  } else {
    console.log('❌ No available domains found in this batch.');
  }
}

huntAndPriceDomains();