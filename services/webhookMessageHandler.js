/**
 * Webhook Message Handler Dispatcher
 * Routes messages to appropriate handlers based on intent and session state
 */

const { sendErrorMessage, sendInfoMessage, sendMainMenu } = require('../utils/messageHandler');
const { processNLP } = require('./nlpProcessor');
const { Session } = require('../models');

// Import all handlers
const authHandlers = require('./authHandlers');
const productHandlers = require('./productHandlers');
const appointmentHandlers = require('./appointmentHandlers');

/**
 * Check if user is authenticated
 */
const isUserAuthenticated = (session) => {
  if (!session) return false;
  return session.state === 'LOGGED_IN' && !!session.token && !!session.userId;
};

/**
 * Send auth required message
 */
const sendAuthRequired = async (phoneNumber, feature) => {
  await sendErrorMessage(
    phoneNumber,
    `🔐 *Authentication Required*\n\n` +
    `To ${feature}, you need to be logged in.\n\n` +
    `Choose an option:\n` +
    `📝 Reply "register" to create an account\n` +
    `🔐 Reply "login" to sign in\n` +
    `🔑 Reply "reset" if you forgot your password`
  );
};

/**
 * Main webhook message handler dispatcher
 */
const handleWebhookMessage = async (phoneNumber, messageText, session) => {
  try {
    // Ensure session exists
    if (!session) {
      session = await Session.findOne({ where: { phoneNumber } });
      if (!session) {
        session = await Session.create({
          phoneNumber,
          state: 'NEW',
          data: {},
          lastActivity: new Date()
        });
      }
    }

    // Update last activity
    session.lastActivity = new Date();
    session._lastActivityExplicitlySet = true;

    // Process NLP
    const nlpResult = processNLP(messageText, session.data);
    const { intent, params, requiresAuth, flow, step, otp } = nlpResult;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📨 [${phoneNumber}] Intent: ${intent}, Flow: ${flow || 'none'}, Auth: ${requiresAuth}`);
    console.log(`${'='.repeat(60)}`);

    // Handle OTP verification flows
    if (intent === 'verify_otp') {
      if (session.data.waitingForOTPVerification) {
        await authHandlers.handleRegistrationOTPVerification(phoneNumber, session, otp);
      } else if (session.data.waitingForResetOTP) {
        await authHandlers.handlePasswordResetOTPVerification(phoneNumber, session, otp);
      }
      return;
    }

    // Handle resend OTP
    if (messageText.toLowerCase().match(/^(resend|retry|send again)$/)) {
      if (session.data.waitingForOTPVerification) {
        await authHandlers.handleResendOTP(phoneNumber, session);
      }
      return;
    }

    // Check authentication requirement
    if (requiresAuth && !isUserAuthenticated(session)) {
      await sendAuthRequired(phoneNumber, intent.replace(/_/g, ' '));
      await session.save();
      return;
    }

    // Handle multi-step flows
    if (flow === 'registration') {
      await handleRegistrationFlow(phoneNumber, session, step, messageText);
      return;
    }

    if (flow === 'login') {
      await handleLoginFlow(phoneNumber, session, step, messageText);
      return;
    }

    if (flow === 'password_reset') {
      await handlePasswordResetFlow(phoneNumber, session, step, messageText);
      return;
    }

    if (flow === 'appointment') {
      await handleAppointmentFlow(phoneNumber, session, step, messageText);
      return;
    }

    if (flow === 'checkout') {
      await handleCheckoutFlow(phoneNumber, session, step, messageText);
      return;
    }

    // Handle main intents
    switch (intent) {
      case 'greeting':
        await authHandlers.handleGreetingFlow(phoneNumber, session);
        break;

      case 'help':
        await authHandlers.handleHelpFlow(phoneNumber, isUserAuthenticated(session));
        break;

      case 'register':
        await authHandlers.handleRegistrationStep1(phoneNumber, session);
        break;

      case 'login':
        await authHandlers.handleLoginFlow(phoneNumber, session);
        break;

      case 'logout':
        await authHandlers.handleLogoutFlow(phoneNumber, session);
        break;

      case 'password_reset':
        await authHandlers.handlePasswordResetFlow(phoneNumber, session);
        break;

      case 'search_products':
        await productHandlers.handleMedicineSearchStart(phoneNumber, session);
        break;

      case 'add_to_cart':
        // This would be handled in a multi-step flow
        await sendInfoMessage(phoneNumber, 'Please search for medicines first by replying "medicines"');
        break;

      case 'view_cart':
        await productHandlers.handleViewCart(phoneNumber, session);
        break;

      case 'place_order':
        await productHandlers.handleCheckoutStart(phoneNumber, session);
        break;

      case 'search_doctors':
        await appointmentHandlers.handleDoctorSearchStart(phoneNumber, session);
        break;

      case 'book_appointment':
        await appointmentHandlers.handleDoctorSearchStart(phoneNumber, session);
        break;

      case 'healthcare_products':
        await productHandlers.handleHealthcareProductsBrowse(phoneNumber, session);
        break;

      case 'diagnostic_tests':
        await productHandlers.handleDiagnosticTestsBrowse(phoneNumber, session);
        break;

      case 'prescription_upload':
        await sendInfoMessage(
          phoneNumber,
          '📄 *Upload Prescription*\n\n' +
          'Please upload your prescription document (JPG, PNG, WEBP, GIF, or PDF).\n\n' +
          'You can caption it with your Order ID, e.g., "rx 12345"'
        );
        break;

      case 'track_order':
        await sendInfoMessage(phoneNumber, 'Please provide your Order ID to track. Example: track 12345');
        break;

      case 'support':
        await sendInfoMessage(phoneNumber, '📞 *Connect to Support*\n\nWhat do you need help with?\n\n1. Medical questions\n2. Order status\n3. Technical issues\n\nReply with a number.');
        break;

      case 'payment':
        await sendInfoMessage(phoneNumber, '💳 *Payment*\n\nPlease provide your Order ID to process payment.');
        break;

      default:
        await sendInfoMessage(
          phoneNumber,
          "I'm not sure how to help with that.\n\nReply \"help\" to see all available services."
        );
    }

    // Save session
    await session.save();
  } catch (error) {
    console.error(`Error handling webhook message from ${phoneNumber}:`, error);
    try {
      await sendErrorMessage(phoneNumber, 'An error occurred. Please try again later.');
    } catch (sendError) {
      console.error('Error sending error message:', sendError.message);
    }
  }
};

/**
 * Handle registration flow steps
 */
const handleRegistrationFlow = async (phoneNumber, session, step, messageText) => {
  try {
    switch (step) {
      case 1:
        await authHandlers.handleRegistrationStep2(phoneNumber, session, messageText);
        break;
      case 2:
        await authHandlers.handleRegistrationStep3(phoneNumber, session, messageText);
        break;
      case 3:
        await authHandlers.handleRegistrationStep4(phoneNumber, session, messageText);
        break;
      case 4:
        await authHandlers.handleRegistrationStep5(phoneNumber, session, messageText);
        break;
      default:
        await authHandlers.handleRegistrationStep1(phoneNumber, session);
    }
  } catch (error) {
    console.error('Error in registration flow:', error);
    await sendErrorMessage(phoneNumber, 'Registration error. Please try again.');
  }
};

/**
 * Handle login flow steps
 */
const handleLoginFlow = async (phoneNumber, session, step, messageText) => {
  try {
    switch (step) {
      case 1:
        await authHandlers.handleLoginStep2(phoneNumber, session, messageText);
        break;
      case 2:
        await authHandlers.handleLoginCompletion(phoneNumber, session, messageText);
        break;
      default:
        await authHandlers.handleLoginFlow(phoneNumber, session);
    }
  } catch (error) {
    console.error('Error in login flow:', error);
    await sendErrorMessage(phoneNumber, 'Login error. Please try again.');
  }
};

/**
 * Handle password reset flow steps
 */
const handlePasswordResetFlow = async (phoneNumber, session, step, messageText) => {
  try {
    switch (step) {
      case 1:
        await authHandlers.handlePasswordResetStep2(phoneNumber, session, messageText);
        break;
      case 2:
        await authHandlers.handlePasswordResetOTPVerification(phoneNumber, session, messageText);
        break;
      case 3:
        await authHandlers.handlePasswordResetCompletion(phoneNumber, session, messageText);
        break;
      default:
        await authHandlers.handlePasswordResetFlow(phoneNumber, session);
    }
  } catch (error) {
    console.error('Error in password reset flow:', error);
    await sendErrorMessage(phoneNumber, 'Password reset error. Please try again.');
  }
};

/**
 * Handle appointment flow steps
 */
const handleAppointmentFlow = async (phoneNumber, session, step, messageText) => {
  try {
    switch (step) {
      case 'date':
        await appointmentHandlers.handleAppointmentDateConfirmation(phoneNumber, session, messageText);
        break;
      case 'time':
        await appointmentHandlers.handleAppointmentTimeConfirmation(phoneNumber, session, messageText);
        break;
      case 'confirm':
        if (messageText.toLowerCase() === 'yes') {
          await appointmentHandlers.handleAppointmentDateSelection(phoneNumber, session);
        } else {
          await sendInfoMessage(phoneNumber, 'Booking cancelled. Reply "doctors" to search again.');
          // Clear appointment data
          const newData = { ...session.data };
          delete newData.appointmentStep;
          delete newData.selectedDoctor;
          delete newData.selectedDoctorId;
          session.data = newData;
        }
        break;
      case 'selection':
        const doctorIndex = parseInt(messageText, 10);
        if (!isNaN(doctorIndex)) {
          await appointmentHandlers.handleDoctorDetailsAndBook(phoneNumber, session, doctorIndex);
        } else {
          await sendErrorMessage(phoneNumber, 'Please select a valid doctor number.');
        }
        break;
      case 'specialty':
        await appointmentHandlers.handleDoctorSpecialtySelection(phoneNumber, session, messageText);
        break;
      case 'location':
        await sendInfoMessage(phoneNumber, 'Please enable location sharing from the button above.');
        break;
      default:
        await appointmentHandlers.handleDoctorSearchStart(phoneNumber, session);
    }
  } catch (error) {
    console.error('Error in appointment flow:', error);
    await sendErrorMessage(phoneNumber, 'Appointment booking error. Please try again.');
  }
};

/**
 * Handle checkout flow steps
 */
const handleCheckoutFlow = async (phoneNumber, session, step, messageText) => {
  try {
    switch (step) {
      case 1:
        await productHandlers.handleCheckoutAddress(phoneNumber, session, messageText);
        break;
      case 2:
        await productHandlers.handleCheckoutPhone(phoneNumber, session, messageText);
        break;
      case 3:
        // Payment method selected (handled by interactive buttons)
        await sendInfoMessage(phoneNumber, '⏳ Processing your payment method...');
        break;
      default:
        await productHandlers.handleCheckoutStart(phoneNumber, session);
    }
  } catch (error) {
    console.error('Error in checkout flow:', error);
    await sendErrorMessage(phoneNumber, 'Checkout error. Please try again.');
  }
};

/**
 * Handle location message (for doctor search)
 */
const handleLocationMessage = async (phoneNumber, session, latitude, longitude) => {
  try {
    if (session.data.doctorSearchStep === 'location') {
      await appointmentHandlers.handleDoctorLocationReceived(phoneNumber, session, latitude, longitude);
    } else {
      await sendInfoMessage(phoneNumber, '📍 Location received. How can I help you with this location?');
    }
  } catch (error) {
    console.error('Error handling location message:', error);
    await sendErrorMessage(phoneNumber, 'Could not process location.');
  }
};

/**
 * Handle media message (for prescription upload)
 */
const handleMediaMessage = async (phoneNumber, session, mediaData) => {
  try {
    await sendInfoMessage(
      phoneNumber,
      '📄 *Prescription Upload*\n\n' +
      'Your file has been received and is being processed.\n\n' +
      'If this is for an existing order, reply with your Order ID.\n\n' +
      '_Example: rx 12345 or order 12345_'
    );
  } catch (error) {
    console.error('Error handling media message:', error);
    await sendErrorMessage(phoneNumber, 'Could not process the file.');
  }
};

module.exports = {
  isUserAuthenticated,
  sendAuthRequired,
  handleWebhookMessage,
  handleLocationMessage,
  handleMediaMessage
};
