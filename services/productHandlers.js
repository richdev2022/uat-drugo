/**
 * Product Search and Cart Handlers
 * Handles medicine search, product browsing, and cart management
 */

const { Product, Cart, Order, OrderItem, HealthcareProduct, DiagnosticTest } = require('../models');
const { sendWhatsAppMessage, sendInteractiveMessage } = require('../config/whatsapp');
const { sendPleaseWaitMessage, sendSuccessMessage, sendErrorMessage, sendInfoMessage, sendPaymentMethodButtons } = require('../utils/messageHandler');
const { Op } = require('sequelize');

const PAGE_SIZE = 5;

/**
 * Start medicine search - ask user what to search for
 */
const handleMedicineSearchStart = async (phoneNumber, session) => {
  try {
    await sendInfoMessage(
      phoneNumber,
      '💊 *Search Medicines*\n\n' +
      'What medicine are you looking for?\n\n' +
      '_Example: paracetamol, aspirin, vitamin c, cough syrup_'
    );
    
    // Update session state
    session.data = { ...session.data, searchingMedicines: true };
    await session.save();
  } catch (error) {
    console.error('Error starting medicine search:', error);
    await sendErrorMessage(phoneNumber, 'Could not start medicine search.');
  }
};

/**
 * Handle medicine search results
 */
const handleMedicineSearchResults = async (phoneNumber, session, searchQuery) => {
  try {
    if (!searchQuery || searchQuery.trim().length < 2) {
      await sendErrorMessage(phoneNumber, 'Please enter at least 2 characters to search.');
      return;
    }
    
    await sendPleaseWaitMessage(phoneNumber, '🔍 Searching for medicines...');
    
    try {
      // Search in database
      const medicines = await Product.findAll({
        where: {
          [Op.or]: [
            { name: { [Op.iLike]: `%${searchQuery}%` } },
            { category: { [Op.iLike]: `%${searchQuery}%` } },
            { description: { [Op.iLike]: `%${searchQuery}%` } }
          ],
          isActive: true
        },
        limit: PAGE_SIZE
      });
      
      if (medicines.length === 0) {
        await sendErrorMessage(phoneNumber, `No medicines found for "${searchQuery}". Try another search term.`);
        return;
      }
      
      // Display results
      let message = `💊 *Search Results for "${searchQuery}"*\n\n`;
      const buttons = [];
      
      medicines.slice(0, 3).forEach((med, idx) => {
        const num = idx + 1;
        message += `${num}. *${med.name}*\n`;
        message += `   Price: ₦${med.price.toLocaleString()}\n`;
        message += `   Category: ${med.category}\n`;
        if (med.stock > 0) {
          message += `   ✅ In Stock\n`;
        } else {
          message += `   ❌ Out of Stock\n`;
        }
        message += '\n';
        
        buttons.push({
          id: `med_${med.id}`,
          title: `${num}. ${med.name.substring(0, 20)}`
        });
      });
      
      // Store search results in session
      session.data = {
        ...session.data,
        medicineSearchResults: medicines,
        medicineSearchQuery: searchQuery,
        currentMedicineIndex: 0,
        searchingMedicines: false
      };
      await session.save();
      
      message += '📍 *What next?*\n';
      message += '• Reply with a number to see details\n';
      message += '• Reply "next" to see more results\n';
      message += '• Reply "back" to search again';
      
      if (buttons.length > 0) {
        await sendInteractiveMessage(phoneNumber, message, buttons.slice(0, 3));
      } else {
        await sendWhatsAppMessage(phoneNumber, message);
      }
    } catch (dbError) {
      console.error('Database search error:', dbError);
      await sendErrorMessage(phoneNumber, 'Search error. Please try again.');
    }
  } catch (error) {
    console.error('Error searching medicines:', error);
    await sendErrorMessage(phoneNumber, 'Could not search medicines. Please try again.');
  }
};

/**
 * Show medicine details
 */
const handleMedicineDetails = async (phoneNumber, session, medicineIndex) => {
  try {
    const medicines = session.data.medicineSearchResults || [];
    const idx = medicineIndex - 1;
    
    if (idx < 0 || idx >= medicines.length) {
      await sendErrorMessage(phoneNumber, `Invalid selection. Choose 1-${medicines.length}`);
      return;
    }
    
    const medicine = medicines[idx];
    
    let message = `💊 *${medicine.name}*\n\n`;
    message += `💰 *Price:* ₦${medicine.price.toLocaleString()}\n`;
    message += `📦 *Category:* ${medicine.category}\n`;
    message += `📝 *Description:* ${medicine.description || 'No description available'}\n`;
    message += `📊 *Stock:* ${medicine.stock > 0 ? `${medicine.stock} units available` : 'Out of stock'}\n\n`;
    
    if (medicine.stock > 0) {
      message += '📍 *What would you like to do?*\n';
      message += `Reply "add 1" to add 1 unit to cart\n`;
      message += `Reply "add 2" for 2 units, etc.`;
    } else {
      message += '❌ This medicine is currently out of stock.';
    }
    
    // Store current medicine in session
    session.data = { ...session.data, currentMedicine: medicine, currentMedicineId: medicine.id };
    await session.save();
    
    await sendWhatsAppMessage(phoneNumber, message);
  } catch (error) {
    console.error('Error showing medicine details:', error);
    await sendErrorMessage(phoneNumber, 'Could not load medicine details.');
  }
};

/**
 * Add medicine to cart
 */
const handleAddMedicineToCart = async (phoneNumber, session, quantity) => {
  try {
    const userId = session.userId;
    const medicineId = session.data.currentMedicineId;
    const medicine = session.data.currentMedicine;
    
    if (!userId || !medicineId || !medicine) {
      await sendErrorMessage(phoneNumber, 'Invalid request. Please search for a medicine first.');
      return;
    }
    
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1 || qty > 100) {
      await sendErrorMessage(phoneNumber, 'Please enter a valid quantity (1-100).');
      return;
    }
    
    if (medicine.stock < qty) {
      await sendErrorMessage(phoneNumber, `Only ${medicine.stock} units available. Please adjust the quantity.`);
      return;
    }
    
    await sendPleaseWaitMessage(phoneNumber, '🛒 Adding to cart...');
    
    try {
      // Find or create cart item
      let cartItem = await Cart.findOne({
        where: { userId, productId: medicineId }
      });
      
      if (cartItem) {
        cartItem.quantity += qty;
      } else {
        cartItem = await Cart.create({
          userId,
          productId: medicineId,
          quantity: qty,
          price: medicine.price
        });
      }
      
      await cartItem.save();
      
      // Get cart total
      const cartItems = await Cart.findAll({ where: { userId } });
      const cartTotal = cartItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      
      await sendSuccessMessage(
        phoneNumber,
        `✅ *Added to Cart*\n\n` +
        `${qty}x ${medicine.name}\n` +
        `Subtotal: ₦${(qty * medicine.price).toLocaleString()}\n\n` +
        `📦 *Cart Total:* ₦${cartTotal.toLocaleString()}\n\n` +
        `📍 What next?\n` +
        `• Reply "cart" to view full cart\n` +
        `• Reply "checkout" to proceed to checkout\n` +
        `• Reply "medicines" to search more`
      );
    } catch (dbError) {
      console.error('Database error adding to cart:', dbError);
      await sendErrorMessage(phoneNumber, 'Could not add to cart. Please try again.');
    }
  } catch (error) {
    console.error('Error adding medicine to cart:', error);
    await sendErrorMessage(phoneNumber, 'Could not add to cart. Please try again.');
  }
};

/**
 * View cart
 */
const handleViewCart = async (phoneNumber, session) => {
  try {
    const userId = session.userId;
    
    if (!userId) {
      await sendErrorMessage(phoneNumber, 'Please login first to view your cart.');
      return;
    }
    
    const cartItems = await Cart.findAll({
      where: { userId },
      include: [{ model: Product, attributes: ['name', 'price'] }],
      order: [['createdAt', 'ASC']]
    });
    
    if (cartItems.length === 0) {
      await sendInfoMessage(
        phoneNumber,
        '🛒 *Your Cart*\n\n' +
        'Your cart is empty.\n\n' +
        'Reply "medicines" to start shopping!'
      );
      return;
    }
    
    let message = '🛒 *Your Cart*\n\n';
    let total = 0;
    
    cartItems.forEach((item, idx) => {
      const itemTotal = item.quantity * item.price;
      total += itemTotal;
      
      message += `${idx + 1}. ${item.Product.name}\n`;
      message += `   Qty: ${item.quantity} × ₦${item.price.toLocaleString()} = ₦${itemTotal.toLocaleString()}\n\n`;
    });
    
    message += `💰 *Total: ₦${total.toLocaleString()}*\n\n`;
    message += '📍 *What next?*\n';
    message += '• Reply "checkout" to proceed to checkout\n';
    message += '• Reply "medicines" to add more items\n';
    message += '• Reply "remove 1" to remove an item';
    
    await sendWhatsAppMessage(phoneNumber, message);
  } catch (error) {
    console.error('Error viewing cart:', error);
    await sendErrorMessage(phoneNumber, 'Could not load cart. Please try again.');
  }
};

/**
 * Start checkout process
 */
const handleCheckoutStart = async (phoneNumber, session) => {
  try {
    const userId = session.userId;
    
    // Get cart items
    const cartItems = await Cart.findAll({
      where: { userId },
      include: [{ model: Product }]
    });
    
    if (cartItems.length === 0) {
      await sendErrorMessage(phoneNumber, 'Your cart is empty. Add items before checkout.');
      return;
    }
    
    // Calculate total
    const cartTotal = cartItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    
    // Store checkout data
    session.data = {
      ...session.data,
      checkoutStep: 1,
      checkoutItems: cartItems.map(item => ({ productId: item.productId, quantity: item.quantity, price: item.price })),
      checkoutTotal: cartTotal,
      waitingForDeliveryAddress: true
    };
    await session.save();
    
    let message = `📦 *Checkout*\n\n`;
    message += `Items in cart: ${cartItems.length}\n`;
    message += `📍 *Subtotal: ₦${cartTotal.toLocaleString()}*\n\n`;
    message += `Step 1 of 3: Delivery Address\n\n`;
    message += `Please enter your delivery address or share your location.`;
    
    await sendInfoMessage(phoneNumber, message);
  } catch (error) {
    console.error('Error starting checkout:', error);
    await sendErrorMessage(phoneNumber, 'Could not start checkout. Please try again.');
  }
};

/**
 * Handle checkout address submission
 */
const handleCheckoutAddress = async (phoneNumber, session, address) => {
  try {
    if (!address || address.trim().length < 10) {
      await sendErrorMessage(phoneNumber, 'Please enter a complete delivery address (minimum 10 characters).');
      return;
    }
    
    session.data = {
      ...session.data,
      checkoutStep: 2,
      deliveryAddress: address,
      waitingForDeliveryAddress: null,
      waitingForPhone: true
    };
    await session.save();
    
    await sendInfoMessage(
      phoneNumber,
      `✅ *Address Saved*\n\n` +
      `${address}\n\n` +
      `Step 2 of 3: Phone Number\n\n` +
      `Please confirm your phone number for delivery coordination.`
    );
  } catch (error) {
    console.error('Error handling checkout address:', error);
    await sendErrorMessage(phoneNumber, 'Could not save address. Please try again.');
  }
};

/**
 * Handle checkout phone submission
 */
const handleCheckoutPhone = async (phoneNumber, session, phone) => {
  try {
    if (!phone || phone.length < 10) {
      await sendErrorMessage(phoneNumber, 'Please enter a valid phone number.');
      return;
    }
    
    const cartTotal = session.data.checkoutTotal;
    
    session.data = {
      ...session.data,
      checkoutStep: 3,
      deliveryPhone: phone,
      waitingForPhone: null,
      waitingForPaymentMethod: true
    };
    await session.save();
    
    let message = `✅ *Phone Saved*\n\n`;
    message += `Step 3 of 3: Payment Method\n\n`;
    message += `📍 *Order Summary*\n`;
    message += `Total: ₦${cartTotal.toLocaleString()}\n\n`;
    message += `Choose a payment method:`;
    
    await sendWhatsAppMessage(phoneNumber, message);
    
    // Send payment method buttons
    await sendPaymentMethodButtons(phoneNumber);
  } catch (error) {
    console.error('Error handling checkout phone:', error);
    await sendErrorMessage(phoneNumber, 'Could not save phone number. Please try again.');
  }
};

/**
 * Healthcare products browse
 */
const handleHealthcareProductsBrowse = async (phoneNumber, session) => {
  try {
    await sendPleaseWaitMessage(phoneNumber, '🛍️ Loading healthcare products...');
    
    const products = await HealthcareProduct.findAll({
      where: { isActive: true },
      limit: PAGE_SIZE,
      order: [['id', 'ASC']]
    });
    
    if (products.length === 0) {
      await sendErrorMessage(phoneNumber, 'No healthcare products available.');
      return;
    }
    
    let message = `🛍️ *Healthcare Products*\n\n`;
    const buttons = [];
    
    products.slice(0, 3).forEach((prod, idx) => {
      const num = idx + 1;
      message += `${num}. *${prod.name}*\n`;
      message += `   Category: ${prod.category}\n`;
      message += `   Price: ₦${prod.price.toLocaleString()}\n`;
      message += `   Stock: ${prod.stock > 0 ? `✅ ${prod.stock}` : '❌ Out'}\n\n`;
      
      buttons.push({
        id: `health_${prod.id}`,
        title: `${num}. ${prod.name.substring(0, 20)}`
      });
    });
    
    message += '📍 *What next?*\n';
    message += '• Reply with a number to view details\n';
    message += '• Reply "next" to see more products';
    
    session.data = {
      ...session.data,
      healthcareProducts: products,
      browsingHealthcare: true
    };
    await session.save();
    
    if (buttons.length > 0) {
      await sendInteractiveMessage(phoneNumber, message, buttons.slice(0, 3));
    } else {
      await sendWhatsAppMessage(phoneNumber, message);
    }
  } catch (error) {
    console.error('Error browsing healthcare products:', error);
    await sendErrorMessage(phoneNumber, 'Could not load products. Please try again.');
  }
};

/**
 * Diagnostic tests browse
 */
const handleDiagnosticTestsBrowse = async (phoneNumber, session) => {
  try {
    await sendPleaseWaitMessage(phoneNumber, '🩺 Loading diagnostic tests...');
    
    const tests = await DiagnosticTest.findAll({
      where: { isActive: true },
      limit: PAGE_SIZE,
      order: [['id', 'ASC']]
    });
    
    if (tests.length === 0) {
      await sendErrorMessage(phoneNumber, 'No diagnostic tests available.');
      return;
    }
    
    let message = `🩺 *Diagnostic Tests*\n\n`;
    const buttons = [];
    
    tests.slice(0, 3).forEach((test, idx) => {
      const num = idx + 1;
      message += `${num}. *${test.name}*\n`;
      message += `   Price: ₦${test.price.toLocaleString()}\n`;
      message += `   Sample: ${test.sampleType || 'N/A'}\n\n`;
      
      buttons.push({
        id: `test_${test.id}`,
        title: `${num}. ${test.name.substring(0, 20)}`
      });
    });
    
    message += '📍 Reply with a number to book';
    
    session.data = {
      ...session.data,
      diagnosticTests: tests,
      browsingDiagnostics: true
    };
    await session.save();
    
    if (buttons.length > 0) {
      await sendInteractiveMessage(phoneNumber, message, buttons.slice(0, 3));
    } else {
      await sendWhatsAppMessage(phoneNumber, message);
    }
  } catch (error) {
    console.error('Error browsing diagnostic tests:', error);
    await sendErrorMessage(phoneNumber, 'Could not load tests. Please try again.');
  }
};

module.exports = {
  handleMedicineSearchStart,
  handleMedicineSearchResults,
  handleMedicineDetails,
  handleAddMedicineToCart,
  handleViewCart,
  handleCheckoutStart,
  handleCheckoutAddress,
  handleCheckoutPhone,
  handleHealthcareProductsBrowse,
  handleDiagnosticTestsBrowse
};
