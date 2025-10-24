/**
 * Advanced NLP Message Processor
 * Improved intent detection and message routing
 */

/**
 * Improved fuzzy matching with better similarity calculation
 */
const improvedFuzzyMatch = (input, target, threshold = 0.75) => {
  const inp = input.toLowerCase().trim();
  const tgt = target.toLowerCase().trim();

  // Exact match
  if (inp === tgt) return 1.0;

  // Check if one contains the other
  if (inp.includes(tgt) || tgt.includes(inp)) return 0.95;

  // Levenshtein distance-based similarity
  const maxLen = Math.max(inp.length, tgt.length);
  if (maxLen === 0) return 1.0;

  const matrix = Array(inp.length + 1).fill(null).map(() => Array(tgt.length + 1).fill(0));

  for (let i = 0; i <= inp.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= tgt.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= inp.length; i++) {
    for (let j = 1; j <= tgt.length; j++) {
      const cost = inp[i - 1] === tgt[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[inp.length][tgt.length];
  const similarity = 1 - (distance / maxLen);
  return similarity >= threshold ? similarity : 0;
};

/**
 * Detect user intent with confidence scoring
 */
const detectIntent = (message) => {
  if (!message || typeof message !== 'string') {
    return { intent: 'unknown', confidence: 0, params: {} };
  }

  const lowerMsg = message.toLowerCase().trim();
  const words = lowerMsg.split(/\s+/);

  // Greeting detection
  const greetings = ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening', 'start', 'begin'];
  if (greetings.some(g => improvedFuzzyMatch(lowerMsg, g, 0.85) > 0.85)) {
    return { intent: 'greeting', confidence: 0.95, params: {} };
  }

  // Logout detection
  const logouts = ['logout', 'exit', 'bye', 'goodbye', 'sign out', 'log out', 'goodbye', 'quit'];
  if (logouts.some(g => improvedFuzzyMatch(lowerMsg, g, 0.85) > 0.85)) {
    return { intent: 'logout', confidence: 0.95, params: {} };
  }

  // Help detection
  const helps = ['help', 'menu', 'what can you do', 'capabilities', 'features', '?', 'options'];
  if (helps.some(h => improvedFuzzyMatch(lowerMsg, h, 0.85) > 0.85 || lowerMsg === h)) {
    return { intent: 'help', confidence: 0.95, params: {} };
  }

  // Registration detection
  if (/^(register|signup|sign up|create account|new account|sign me up)/.test(lowerMsg)) {
    return { intent: 'register', confidence: 0.95, params: {} };
  }

  // Login detection
  if (/^(login|signin|sign in|log in|authenticate|log me in)/.test(lowerMsg)) {
    return { intent: 'login', confidence: 0.95, params: {} };
  }

  // Password reset detection
  if (/^(forgot|reset|change).*password/.test(lowerMsg)) {
    return { intent: 'password_reset', confidence: 0.90, params: {} };
  }

  // Medicine/Product search detection
  const medicineKeywords = ['medicine', 'drug', 'medication', 'pill', 'tablet', 'paracetamol', 'aspirin', 'vitamin', 'antibiotic'];
  if (/^(search|find|show|look|give|send).*?(medicine|drug|product|medication|pill|tablet)/i.test(lowerMsg) ||
      medicineKeywords.some(kw => improvedFuzzyMatch(lowerMsg, kw, 0.75) > 0.75)) {
    const match = lowerMsg.match(/(?:for|an?|the)?\s*([a-zA-Z\s]+?)(?:\s+online)?$/i);
    const searchTerm = match ? match[1].trim() : '';
    return { intent: 'search_products', confidence: 0.90, params: { searchTerm } };
  }

  // Doctor search detection (must come before product to avoid conflicts)
  const doctorKeywords = ['doctor', 'physician', 'specialist', 'cardiologist', 'pediatrician', 'dermatologist', 'gynecologist', 'neurologist', 'orthopedic', 'dentist'];
  if (/\b(doctor|physician|specialist|cardiologist|pediatrician|dermatologist|gynecologist|neurologist|orthopedic|dentist|ent|ophthalmologist)\b/i.test(lowerMsg) ||
      /^(find|search|need|look for|consult).*?(doctor|physician|specialist)/i.test(lowerMsg)) {
    return { intent: 'search_doctors', confidence: 0.90, params: {} };
  }

  // Appointment booking detection
  if (/\b(book|schedule|make|arrange|reserve)\b.*\b(appointment|consultation|visit|slot)\b/i.test(lowerMsg)) {
    return { intent: 'book_appointment', confidence: 0.90, params: {} };
  }

  // Cart operations detection
  if (/^(add to cart|add|put|move).*cart\b/i.test(lowerMsg) || /^(add)\s+(\d+)(?:\s+(\d+))?$/i.test(lowerMsg)) {
    const match = lowerMsg.match(/(?:add)\s+(\d+)(?:\s+(\d+))?/);
    const params = {};
    if (match) {
      params.productIndex = match[1];
      params.quantity = match[2] || '1';
    }
    return { intent: 'add_to_cart', confidence: 0.90, params };
  }

  // View cart detection
  if (/^(cart|view cart|show cart|my cart|check cart)$/i.test(lowerMsg)) {
    return { intent: 'view_cart', confidence: 0.95, params: {} };
  }

  // Checkout/Order placement detection
  if (/\b(order|checkout|place order|buy|purchase|proceed to|complete|confirm order)\b/i.test(lowerMsg)) {
    return { intent: 'place_order', confidence: 0.90, params: {} };
  }

  // Track order detection
  if (/\b(track|where is|status of|check|trace|update on)\b.*\b(order|delivery|package)\b/i.test(lowerMsg) ||
      /^(track)\s+(\d+)/i.test(lowerMsg)) {
    const match = lowerMsg.match(/(\d+)/);
    return { intent: 'track_order', confidence: 0.90, params: { orderId: match ? match[1] : '' } };
  }

  // Diagnostic tests detection
  if (/\b(diagnostic|screening|check up|blood test|lab test|medical test|covid|malaria|typhoid|thyroid)\b/i.test(lowerMsg)) {
    return { intent: 'diagnostic_tests', confidence: 0.90, params: {} };
  }

  // Healthcare products detection
  if (/\b(healthcare|health care|health products|browse products|equipment|devices|supplies|first aid|thermometer|oximeter)\b/i.test(lowerMsg)) {
    return { intent: 'healthcare_products', confidence: 0.90, params: {} };
  }

  // Prescription detection
  if (/\b(upload|prescription|script|rx|medicine prescription|attach|attach prescription)\b/i.test(lowerMsg)) {
    return { intent: 'prescription_upload', confidence: 0.90, params: {} };
  }

  // Support detection
  if (/\b(support|agent|help me|speak to|chat with|contact|complaint|issue|problem|complaint|reach out)\b/i.test(lowerMsg)) {
    return { intent: 'support', confidence: 0.90, params: {} };
  }

  // Payment detection
  if (/\b(pay|payment|process payment|pay for|settle|pay now)\b/i.test(lowerMsg)) {
    return { intent: 'payment', confidence: 0.85, params: {} };
  }

  // Numeric quick command (1-8)
  const numMatch = lowerMsg.match(/^(\d)$/);
  if (numMatch) {
    const numCommands = {
      '1': 'search_products',
      '2': 'search_doctors',
      '3': 'track_order',
      '4': 'book_appointment',
      '5': 'view_cart',
      '6': 'support',
      '7': 'prescription_upload',
      '8': 'healthcare_products'
    };
    const intent = numCommands[numMatch[1]];
    if (intent) {
      return { intent, confidence: 0.95, params: {} };
    }
  }

  // Default: Unknown
  return { intent: 'unknown', confidence: 0, params: {} };
};

/**
 * Check if user is in a multi-step flow and handle accordingly
 */
const checkMultiStepFlow = (message, sessionData) => {
  if (!sessionData) {
    return null;
  }

  // Check registration flow
  if (sessionData.registrationStep) {
    return {
      flow: 'registration',
      step: sessionData.registrationStep,
      intent: `registration_step_${sessionData.registrationStep}`
    };
  }

  // Check login flow
  if (sessionData.loginStep) {
    return {
      flow: 'login',
      step: sessionData.loginStep,
      intent: `login_step_${sessionData.loginStep}`
    };
  }

  // Check password reset flow
  if (sessionData.resetPasswordStep) {
    return {
      flow: 'password_reset',
      step: sessionData.resetPasswordStep,
      intent: `password_reset_step_${sessionData.resetPasswordStep}`
    };
  }

  // Check appointment flow
  if (sessionData.appointmentStep) {
    return {
      flow: 'appointment',
      step: sessionData.appointmentStep,
      intent: `appointment_${sessionData.appointmentStep}`
    };
  }

  // Check checkout flow
  if (sessionData.checkoutStep) {
    return {
      flow: 'checkout',
      step: sessionData.checkoutStep,
      intent: `checkout_step_${sessionData.checkoutStep}`
    };
  }

  // Check OTP verification
  if (sessionData.waitingForOTPVerification || sessionData.waitingForResetOTP) {
    const otpMatch = message.match(/^\d{4}$/);
    if (otpMatch) {
      return {
        flow: 'otp_verification',
        step: 'verify_otp',
        intent: 'verify_otp',
        otp: otpMatch[0]
      };
    }
  }

  return null;
};

/**
 * Main NLP processing function
 */
const processNLP = (message, sessionData = {}) => {
  // Check if user is in a multi-step flow
  const multiStepFlow = checkMultiStepFlow(message, sessionData);
  if (multiStepFlow) {
    return {
      ...multiStepFlow,
      message,
      confidence: 0.98
    };
  }

  // Detect intent
  const detection = detectIntent(message);

  return {
    intent: detection.intent,
    confidence: detection.confidence,
    params: detection.params,
    message,
    requiresAuth: !['register', 'login', 'greeting', 'help', 'password_reset'].includes(detection.intent)
  };
};

module.exports = {
  improvedFuzzyMatch,
  detectIntent,
  checkMultiStepFlow,
  processNLP
};
