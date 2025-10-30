// test-mp.js - VERSIÓN FINAL CORREGIDA
require('dotenv').config();
const mercadopago = require('mercadopago');

console.log('🔧 Probando Mercado Pago con token:', process.env.MP_ACCESS_TOKEN);

mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN
});

async function testMercadoPago() {
  try {
    const preference = {
      items: [
        {
          title: "Producto de Prueba",
          unit_price: 100,
          quantity: 1,
          currency_id: "PEN"
        }
      ],
      back_urls: {
        success: "http://localhost:5173/payment/success",    // ✅ CORREGIDO
        failure: "http://localhost:5173/payment/failure",    // ✅ CORREGIDO
        pending: "http://localhost:5173/payment/pending"     // ✅ CORREGIDO
      },
      auto_return: "approved"
    };

    console.log('🔄 Creando preferencia...');
    const result = await mercadopago.preferences.create(preference);
    
    console.log('✅ ✅ ✅ ¡FUNCIONA! Preferencia creada:');
    console.log('ID:', result.body.id);
    console.log('URL Sandbox:', result.body.sandbox_init_point);
    
    return result.body.sandbox_init_point;
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    return null;
  }
}

// Ejecutar prueba
testMercadoPago().then(url => {
  if (url) {
    console.log('🌐 URL para probar:', url);
    console.log('📋 Copia esta URL y ábrela en el navegador:');
    console.log(url);
  }
});