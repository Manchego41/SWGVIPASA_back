const Discount = require('../models/Discount');
const Product = require('../models/Product');

// Crear nuevo descuento
exports.createDiscount = async (req, res) => {
  try {
    const discountData = req.body;

    // Validar fechas
    if (new Date(discountData.startDate) >= new Date(discountData.endDate)) {
      return res.status(400).json({
        success: false,
        message: 'La fecha de fin debe ser posterior a la fecha de inicio'
      });
    }

    const discount = await Discount.create(discountData);

    // Si es automático, aplicarlo a productos
    if (discount.isAutomatic) {
      await applyAutomaticDiscount(discount);
    }

    res.status(201).json({
      success: true,
      message: 'Descuento creado exitosamente',
      discount
    });

  } catch (error) {
    console.error('Error creando descuento:', error);
    
    // Manejar error de código duplicado
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'El código de descuento ya existe'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error al crear el descuento',
      error: error.message
    });
  }
};

// Obtener todos los descuentos activos
exports.getActiveDiscounts = async (req, res) => {
  try {
    const now = new Date();
    
    const discounts = await Discount.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    }).populate('applicableProducts', 'name price image countInStock category');

    // Filtrar descuentos que aún tienen uso disponible
    const validDiscounts = discounts.filter(discount => 
      !discount.usageLimit || discount.usedCount < discount.usageLimit
    );

    res.json({
      success: true,
      discounts: validDiscounts
    });

  } catch (error) {
    console.error('Error obteniendo descuentos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener descuentos'
    });
  }
};

// Aplicar descuento a productos automáticamente
const applyAutomaticDiscount = async (discount) => {
  try {
    let query = {};

    if (discount.applicableProducts && discount.applicableProducts.length > 0) {
      query._id = { $in: discount.applicableProducts };
    } else if (discount.applicableCategories && discount.applicableCategories.length > 0) {
      query.category = { $in: discount.applicableCategories };
    }

    await Product.updateMany(query, {
      isOnSale: true,
      discount: discount._id
    });

    console.log(`✅ Descuento automático aplicado a productos`);
  } catch (error) {
    console.error('Error aplicando descuento automático:', error);
  }
};

// Validar código de descuento
exports.validateDiscountCode = async (req, res) => {
  try {
    const { code, cartTotal, items } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'El código de descuento es requerido'
      });
    }

    const discount = await Discount.findOne({ 
      code: code.toUpperCase().trim()
    });

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: 'Código de descuento no encontrado'
      });
    }

    // Validar si el descuento es válido
    if (!discount.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Este descuento no está activo'
      });
    }

    const now = new Date();
    if (now < discount.startDate) {
      return res.status(400).json({
        success: false,
        message: 'Este descuento aún no está vigente'
      });
    }

    if (now > discount.endDate) {
      return res.status(400).json({
        success: false,
        message: 'Este descuento ha expirado'
      });
    }

    if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
      return res.status(400).json({
        success: false,
        message: 'Este descuento ha alcanzado su límite de uso'
      });
    }

    if (cartTotal < discount.minPurchaseAmount) {
      return res.status(400).json({
        success: false,
        message: `El monto mínimo de compra para este descuento es S/ ${discount.minPurchaseAmount}`
      });
    }

    let totalDiscount = 0;
    let discountDetails = [];

    // Calcular descuento para cada item
    if (discount.discountType !== 'free_shipping') {
      for (let item of items) {
        let itemDiscount = 0;

        // Verificar si el producto aplica para el descuento
        const appliesToProduct = !discount.applicableProducts || 
          discount.applicableProducts.length === 0 || 
          discount.applicableProducts.includes(item.product._id);

        const appliesToCategory = !discount.applicableCategories || 
          discount.applicableCategories.length === 0 || 
          discount.applicableCategories.includes(item.product.category);

        if (appliesToProduct && appliesToCategory) {
          itemDiscount = discount.calculateDiscount(item.product.price, item.quantity);
          totalDiscount += itemDiscount;

          discountDetails.push({
            product: item.product.name,
            discount: itemDiscount
          });
        }
      }
    }

    res.json({
      success: true,
      discount: {
        _id: discount._id,
        name: discount.name,
        description: discount.description,
        discountType: discount.discountType,
        value: discount.value,
        totalDiscount,
        discountDetails
      }
    });

  } catch (error) {
    console.error('Error validando descuento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al validar el descuento'
    });
  }
};

// Obtener productos en oferta
exports.getProductsOnSale = async (req, res) => {
  try {
    const products = await Product.find({
      isOnSale: true
    }).populate('discount').exec();

    // Filtrar solo productos con descuentos válidos
    const now = new Date();
    const productsWithValidDiscount = products.filter(product => {
      if (!product.discount) return false;
      
      return product.discount.isActive &&
             product.discount.startDate <= now &&
             product.discount.endDate >= now &&
             (!product.discount.usageLimit || product.discount.usedCount < product.discount.usageLimit);
    });

    res.json({
      success: true,
      products: productsWithValidDiscount
    });

  } catch (error) {
    console.error('Error obteniendo productos en oferta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos en oferta'
    });
  }
};

// CREAR DATOS DE PRUEBA - NUEVA FUNCIÓN
exports.createSampleData = async (req, res) => {
  try {
    console.log('🔄 Iniciando creación de datos de prueba...');

    // Obtener productos existentes
    const products = await Product.find().limit(12);
    
    if (products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay productos en la base de datos. Crea productos primero.'
      });
    }

    console.log(`📦 Encontrados ${products.length} productos para aplicar descuentos`);

    // Datos de descuentos de prueba
    const sampleDiscounts = [
      {
        name: "Otoño 2024 - Motor",
        description: "25% de descuento en repuestos de motor",
        discountType: "percentage",
        value: 25,
        applicableProducts: [products[0]._id, products[1]._id, products[2]._id],
        startDate: new Date("2024-10-01"),
        endDate: new Date("2024-12-31"),
        isActive: true,
        minPurchaseAmount: 0,
        code: "OTONO25",
        isAutomatic: true
      },
      {
        name: "Frenos Express",
        description: "15% off en sistema de frenos",
        discountType: "percentage",
        value: 15,
        applicableProducts: [products[3]._id, products[4]._id],
        startDate: new Date("2024-11-01"),
        endDate: new Date("2024-12-15"),
        isActive: true,
        minPurchaseAmount: 100,
        code: "FRENOS15",
        isAutomatic: true
      },
      {
        name: "Oferta Flash Baterías",
        description: "50% de descuento en baterías - Últimas unidades",
        discountType: "percentage",
        value: 50,
        applicableProducts: [products[5]._id],
        startDate: new Date("2024-11-20"),
        endDate: new Date("2024-11-30"),
        isActive: true,
        usageLimit: 10,
        code: "FLASH50",
        isAutomatic: true
      },
      {
        name: "Mantenimiento Total",
        description: "S/ 30 de descuento en kits de mantenimiento",
        discountType: "fixed",
        value: 30,
        applicableProducts: [products[6]._id, products[7]._id],
        startDate: new Date("2024-11-01"),
        endDate: new Date("2024-12-20"),
        isActive: true,
        minPurchaseAmount: 150,
        code: "MANT30",
        isAutomatic: true
      },
      {
        name: "Promo 2x1 Suspensión",
        description: "2x1 en amortiguadores - Lleva 2 paga 1",
        discountType: "buy_x_get_y",
        value: 0,
        minQuantity: 2,
        freeQuantity: 1,
        applicableProducts: [products[8]._id],
        startDate: new Date("2024-11-15"),
        endDate: new Date("2024-12-10"),
        isActive: true,
        code: "2X1SUSP",
        isAutomatic: true
      },
      {
        name: "Envío Gratis Navidad",
        description: "Envío gratis en compras mayores a S/ 200",
        discountType: "free_shipping",
        value: 0,
        startDate: new Date("2024-12-01"),
        endDate: new Date("2024-12-25"),
        isActive: true,
        minPurchaseAmount: 200,
        code: "NAVIDAD",
        isAutomatic: false
      }
    ];

    // Limpiar descuentos existentes
    await Discount.deleteMany({});
    console.log('🧹 Descuentos existentes eliminados');

    // Crear nuevos descuentos
    const createdDiscounts = await Discount.insertMany(sampleDiscounts);
    console.log(`✅ ${createdDiscounts.length} descuentos de prueba creados`);

    // Aplicar descuentos automáticamente a los productos
    let updatedProductsCount = 0;
    for (let discount of createdDiscounts) {
      if (discount.isAutomatic && discount.applicableProducts.length > 0) {
        const result = await Product.updateMany(
          { _id: { $in: discount.applicableProducts } },
          { 
            isOnSale: true,
            discount: discount._id
          }
        );
        updatedProductsCount += result.modifiedCount;
      }
    }

    console.log(`🎯 ${updatedProductsCount} productos actualizados con descuentos`);

    // Obtener productos actualizados para la respuesta
    const updatedProducts = await Product.find({
      _id: { $in: products.map(p => p._id) }
    }).populate('discount');

    res.json({
      success: true,
      message: `Datos de prueba creados exitosamente`,
      summary: {
        discountsCreated: createdDiscounts.length,
        productsUpdated: updatedProductsCount,
        totalProducts: products.length
      },
      discounts: createdDiscounts.map(d => ({
        _id: d._id,
        name: d.name,
        code: d.code,
        discountType: d.discountType,
        value: d.value,
        description: d.description
      })),
      sampleProducts: updatedProducts.slice(0, 3).map(p => ({
        name: p.name,
        price: p.price,
        isOnSale: p.isOnSale,
        discount: p.discount ? {
          name: p.discount.name,
          value: p.discount.value,
          discountType: p.discount.discountType
        } : null
      }))
    });

  } catch (error) {
    console.error('❌ Error creando datos de prueba:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear datos de prueba',
      error: error.message
    });
  }
};

// Endpoint simple para probar
exports.testDiscounts = async (req, res) => {
  try {
    const discountsCount = await Discount.countDocuments();
    const activeDiscounts = await Discount.find({ isActive: true });
    const productsOnSale = await Product.countDocuments({ isOnSale: true });
    
    res.json({
      success: true,
      message: 'API de descuentos funcionando correctamente',
      stats: {
        totalDiscounts: discountsCount,
        activeDiscounts: activeDiscounts.length,
        productsOnSale: productsOnSale,
        timestamp: new Date().toISOString()
      },
      endpoints: {
        'GET /active': 'Obtener descuentos activos',
        'GET /products/sale': 'Obtener productos en oferta', 
        'POST /validate': 'Validar código de descuento',
        'POST /create-samples': 'Crear datos de prueba',
        'GET /test': 'Estado del sistema'
      }
    });
  } catch (error) {
    console.error('Error en test discounts:', error);
    res.status(500).json({
      success: false,
      message: 'Error en test discounts'
    });
  }
};