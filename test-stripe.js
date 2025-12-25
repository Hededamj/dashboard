// Test Stripe Connection
require('dotenv').config({ path: '.env.local' });

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function testStripeConnection() {
  console.log('🔍 Tester Stripe forbindelse...\n');

  // Check if API key is configured
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ FEJL: STRIPE_SECRET_KEY er ikke sat i .env.local');
    process.exit(1);
  }

  // Check API key format
  if (process.env.STRIPE_SECRET_KEY.startsWith('sk_test_your_') ||
      process.env.STRIPE_SECRET_KEY.startsWith('sk_live_your_')) {
    console.error('❌ FEJL: Du skal erstatte placeholder værdien med din rigtige Stripe API key');
    console.log('\nGå til: https://dashboard.stripe.com/test/apikeys');
    console.log('Kopier din "Secret key" og indsæt i .env.local\n');
    process.exit(1);
  }

  const mode = process.env.STRIPE_SECRET_KEY.startsWith('sk_test_') ? 'TEST' : 'LIVE';
  console.log(`📊 Mode: ${mode} mode`);
  console.log(`🔑 Key: ${process.env.STRIPE_SECRET_KEY.substring(0, 15)}...${process.env.STRIPE_SECRET_KEY.slice(-4)}\n`);

  try {
    // Test 1: Get account info
    console.log('Test 1: Henter account information...');
    const account = await stripe.account.retrieve();
    console.log(`✅ Forbundet til Stripe konto: ${account.business_profile?.name || account.email || 'Unknown'}`);
    console.log(`   Account ID: ${account.id}\n`);

    // Test 2: Count subscriptions
    console.log('Test 2: Henter subscriptions...');
    const subscriptions = await stripe.subscriptions.list({ limit: 100 });
    const activeCount = subscriptions.data.filter(sub => sub.status === 'active').length;

    console.log(`✅ Fundet ${subscriptions.data.length} total subscriptions`);
    console.log(`   ${activeCount} aktive medlemmer`);

    if (subscriptions.data.length === 0 && mode === 'TEST') {
      console.log('\n⚠️  Du har ingen test subscriptions endnu.');
      console.log('   Opret test subscriptions i Stripe Dashboard for at se data.');
      console.log('   https://dashboard.stripe.com/test/subscriptions\n');
    }

    // Test 3: Calculate MRR
    if (activeCount > 0) {
      console.log(`\n📊 Dashboard Preview:`);
      console.log(`   MRR: ${activeCount * 149} DKK`);
      console.log(`   Aktive medlemmer: ${activeCount}`);
    }

    console.log('\n✅ Stripe forbindelse fungerer perfekt! 🎉\n');

  } catch (error) {
    console.error('\n❌ FEJL ved forbindelse til Stripe:\n');

    if (error.type === 'StripeAuthenticationError') {
      console.error('   Din API key er ugyldig eller forkert.');
      console.error('   Tjek at du har kopieret hele nøglen korrekt.\n');
      console.error('   Gå til: https://dashboard.stripe.com/test/apikeys');
    } else if (error.type === 'StripePermissionError') {
      console.error('   API key har ikke de nødvendige permissions.');
      console.error('   Brug en "Secret key" (ikke "Publishable key").\n');
    } else {
      console.error(`   Error type: ${error.type}`);
      console.error(`   Message: ${error.message}\n`);
    }

    process.exit(1);
  }
}

testStripeConnection();
