/**
 * Authentication Handlers
 * Handles registration, login, and password reset with interactive buttons
 */

const { User, OTP, Session } = require('../models');
const { sendWhatsAppMessage, sendInteractiveMessage } = require('../config/whatsapp');
const { sendPleaseWaitMessage, sendSuccessMessage, sendErrorMessage, sendInfoMessage, sendAuthMenu, sendYesNoButtons } = require('../utils/messageHandler');
const { requestRegistrationOTP, verifyRegistrationOTP, completeRegistration, loginUser } = require('./auth');
const { generateToken } = require('./security');
const bcryptjs = require('bcryptjs');
const { isValidEmail, isValidPhoneNumber } = require('../utils/validation');

/**
 * Handle greeting/welcome flow
 */
const handleGreetingFlow = async (phoneNumber, session) => {
  try {
    const isLoggedIn = session && session.state === 'LOGGED_IN' && session.token;
    
    if (isLoggedIn) {
      // User is logged in - show main menu
      await sendWhatsAppMessage(
        phoneNumber,
        '🏥 *Welcome back to Drugs.ng!*\n\nHow can we help you today?\n\n' +
        '💊 *Search Medicines* - Find medications\n' +
        '👨‍⚕️ *Find Doctors* - Book appointments\n' +
        '📦 *Healthcare Products* - Browse medical devices\n' +
        '🩺 *Diagnostic Tests* - Schedule lab tests\n' +
        '🛒 *View Cart* - Check your cart\n' +
        '📋 *Support* - Connect with our team\n\n' +
        'Just reply with the number of what you want!'
      );
      
      // Send interactive buttons for quick access
      const buttons = [
        { id: '1', title: '💊 Medicines' },
        { id: '2', title: '👨‍⚕️ Doctors' },
        { id: '5', title: '🛒 Cart' }
      ];
      
      await sendInteractiveMessage(phoneNumber, 'Quick access:', buttons);
    } else {
      // User is not logged in - offer auth options
      await sendWhatsAppMessage(
        phoneNumber,
        '🏥 *Welcome to Drugs.ng WhatsApp Bot*\n\n' +
        'We help you find medicines, book doctors, and access healthcare services all through WhatsApp!\n\n' +
        'To get started, please login or register:'
      );
      
      await sendAuthMenu(phoneNumber);
    }
  } catch (error) {
    console.error('Error in greeting flow:', error);
    await sendErrorMessage(phoneNumber, 'Something went wrong. Please try again.');
  }
};

/**
 * Handle help request with buttons
 */
const handleHelpFlow = async (phoneNumber, isLoggedIn) => {
  try {
    const message = isLoggedIn 
      ? '🆘 *Help & Support*\n\n' +
        'Available services:\n\n' +
        '1️⃣ *Search Medicines* - Find medications by name\n' +
        '2️⃣ *Find Doctors* - Search doctors by specialty\n' +
        '3️⃣ *View Cart* - Check items in your cart\n' +
        '4️⃣ *Book Appointment* - Schedule with doctors\n' +
        '5️⃣ *Track Order* - Check order status\n' +
        '6️⃣ *Healthcare Products* - Browse medical devices\n' +
        '7️⃣ *Diagnostic Tests* - Schedule lab tests\n' +
        '8️⃣ *Support* - Talk to our team\n\n' +
        'Reply with a number or describe what you need!'
      : '🆘 *Help & Support*\n\n' +
        'To access our services, please:\n\n' +
        '📝 *Register* - Create a new account\n' +
        '🔐 *Login* - Sign in to your account\n\n' +
        'After logging in, you can:\n' +
        '💊 Search medicines\n' +
        '👨‍⚕️ Find and book doctors\n' +
        '🛒 Shop healthcare products\n' +
        '🩺 Book diagnostic tests\n' +
        '📦 Track orders';
    
    await sendWhatsAppMessage(phoneNumber, message);
  } catch (error) {
    console.error('Error in help flow:', error);
    await sendErrorMessage(phoneNumber, 'Could not load help menu.');
  }
};

/**
 * Handle registration flow - Step 1: Email collection
 */
const handleRegistrationStep1 = async (phoneNumber, session) => {
  try {
    // Reset registration state
    session.state = 'REGISTERING';
    session.data = { ...session.data, registrationStep: 1 };
    await session.save();
    
    await sendInfoMessage(
      phoneNumber,
      '📝 *Registration - Step 1 of 4*\n\n' +
      'Let\'s create your account! Please provide your information.\n\n' +
      '📧 *First, what\'s your email address?*\n\n' +
      '_Example: john@example.com_'
    );
  } catch (error) {
    console.error('Error in registration step 1:', error);
    await sendErrorMessage(phoneNumber, 'Registration failed. Please try again.');
  }
};

/**
 * Handle registration flow - Step 2: Full name collection
 */
const handleRegistrationStep2 = async (phoneNumber, session, email) => {
  try {
    // Validate email
    if (!isValidEmail(email)) {
      await sendErrorMessage(phoneNumber, `"${email}" is not a valid email address. Please try again.`);
      return;
    }
    
    // Check if email already exists
    const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      await sendErrorMessage(phoneNumber, `The email "${email}" is already registered. Please try logging in or use a different email.`);
      return;
    }
    
    // Save email and move to next step
    session.data = { ...session.data, registrationStep: 2, registrationEmail: email.toLowerCase() };
    await session.save();
    
    await sendInfoMessage(
      phoneNumber,
      '👤 *Registration - Step 2 of 4*\n\n' +
      '✅ Email saved!\n\n' +
      'Now, what\'s your full name?\n\n' +
      '_Example: John Doe_'
    );
  } catch (error) {
    console.error('Error in registration step 2:', error);
    await sendErrorMessage(phoneNumber, 'Registration failed. Please try again.');
  }
};

/**
 * Handle registration flow - Step 3: Phone number collection
 */
const handleRegistrationStep3 = async (phoneNumber, session, fullName) => {
  try {
    if (!fullName || fullName.trim().length < 2) {
      await sendErrorMessage(phoneNumber, 'Please enter a valid full name (at least 2 characters).');
      return;
    }
    
    // Save name and move to next step
    session.data = { ...session.data, registrationStep: 3, registrationName: fullName };
    await session.save();
    
    await sendInfoMessage(
      phoneNumber,
      '📱 *Registration - Step 3 of 4*\n\n' +
      '✅ Name saved: ' + fullName + '\n\n' +
      'What\'s your phone number?\n\n' +
      '_Example: 08012345678 (without +234)_'
    );
  } catch (error) {
    console.error('Error in registration step 3:', error);
    await sendErrorMessage(phoneNumber, 'Registration failed. Please try again.');
  }
};

/**
 * Handle registration flow - Step 4: Password collection
 */
const handleRegistrationStep4 = async (phoneNumber, session, phoneNumber2) => {
  try {
    if (!isValidPhoneNumber(phoneNumber2)) {
      await sendErrorMessage(phoneNumber, `"${phoneNumber2}" is not a valid phone number. Please enter without +234 or country code.`);
      return;
    }
    
    // Save phone number and move to next step
    session.data = { ...session.data, registrationStep: 4, registrationPhone: phoneNumber2 };
    await session.save();
    
    await sendInfoMessage(
      phoneNumber,
      '🔐 *Registration - Step 4 of 4*\n\n' +
      '✅ Phone saved!\n\n' +
      'Finally, create a secure password (at least 6 characters).\n\n' +
      '_Use a mix of letters and numbers for security_'
    );
  } catch (error) {
    console.error('Error in registration step 4:', error);
    await sendErrorMessage(phoneNumber, 'Registration failed. Please try again.');
  }
};

/**
 * Handle registration flow - Step 5: OTP verification
 */
const handleRegistrationStep5 = async (phoneNumber, session, password) => {
  try {
    if (password.length < 6) {
      await sendErrorMessage(phoneNumber, 'Password must be at least 6 characters long. Please try again.');
      return;
    }
    
    const email = session.data.registrationEmail;
    const name = session.data.registrationName;
    
    // Request OTP
    await sendPleaseWaitMessage(phoneNumber, '⏳ Sending OTP to your email...');
    
    try {
      const result = await requestRegistrationOTP(email, name);
      
      // Save password and waiting state
      session.data = { ...session.data, registrationStep: 5, registrationPassword: password, waitingForOTPVerification: true };
      await session.save();
      
      await sendSuccessMessage(
        phoneNumber,
        `✅ Verification code sent to ${email}\n\n` +
        'Check your email for a 4-digit code and reply with it here.\n\n' +
        'The code is valid for 5 minutes.\n\n' +
        'If you didn\'t receive it, reply "resend" to get a new code.'
      );
    } catch (otpError) {
      await sendErrorMessage(phoneNumber, `Could not send verification code: ${otpError.message}`);
    }
  } catch (error) {
    console.error('Error in registration step 5:', error);
    await sendErrorMessage(phoneNumber, 'Registration failed. Please try again.');
  }
};

/**
 * Handle OTP verification during registration
 */
const handleRegistrationOTPVerification = async (phoneNumber, session, otp) => {
  try {
    const email = session.data.registrationEmail;
    
    await sendPleaseWaitMessage(phoneNumber, '⏳ Verifying your code...');
    
    try {
      // Verify OTP
      await verifyRegistrationOTP(email, otp);
      
      // Complete registration
      const userData = {
        name: session.data.registrationName,
        email: email,
        password: session.data.registrationPassword,
        phoneNumber: session.data.registrationPhone
      };
      
      const registrationResult = await completeRegistration(userData);
      
      if (registrationResult.success) {
        // Clear registration data
        session.state = 'LOGGED_IN';
        session.userId = registrationResult.userId;
        session.token = generateToken(registrationResult.userId);
        session.data = {
          ...session.data,
          registrationStep: null,
          registrationEmail: null,
          registrationName: null,
          registrationPhone: null,
          registrationPassword: null,
          waitingForOTPVerification: null,
          token: session.token
        };
        await session.save();
        
        await sendSuccessMessage(
          phoneNumber,
          `🎉 *Registration Successful!*\n\n` +
          `Welcome ${userData.name}!\n\n` +
          `Your account is now active. You can now:\n` +
          `💊 Search and order medicines\n` +
          `👨‍⚕️ Book doctor appointments\n` +
          `🛒 Browse healthcare products\n` +
          `🩺 Schedule diagnostic tests\n\n` +
          `Type "help" to see all available services or "💊 Medicines" to get started!`
        );
      } else {
        await sendErrorMessage(phoneNumber, registrationResult.message || 'Registration failed. Please try again.');
      }
    } catch (verifyError) {
      await sendErrorMessage(phoneNumber, `Verification failed: ${verifyError.message}. Please try again or reply "resend" for a new code.`);
    }
  } catch (error) {
    console.error('Error verifying OTP:', error);
    await sendErrorMessage(phoneNumber, 'Verification error. Please try again.');
  }
};

/**
 * Handle OTP resend
 */
const handleResendOTP = async (phoneNumber, session) => {
  try {
    const email = session.data.registrationEmail;
    const name = session.data.registrationName;
    
    await sendPleaseWaitMessage(phoneNumber, '⏳ Sending new verification code...');
    
    try {
      await requestRegistrationOTP(email, name);
      await sendSuccessMessage(
        phoneNumber,
        `✅ New code sent to ${email}\n\nCheck your email and reply with the 4-digit code.`
      );
    } catch (error) {
      await sendErrorMessage(phoneNumber, `Could not resend code: ${error.message}`);
    }
  } catch (error) {
    console.error('Error resending OTP:', error);
    await sendErrorMessage(phoneNumber, 'Could not resend OTP. Please try again.');
  }
};

/**
 * Handle login flow
 */
const handleLoginFlow = async (phoneNumber, session) => {
  try {
    // Reset login state
    session.state = 'REGISTERING';
    session.data = { ...session.data, loginStep: 1 };
    await session.save();
    
    await sendInfoMessage(
      phoneNumber,
      '🔐 *Login*\n\n' +
      'Welcome back! Please enter your login details.\n\n' +
      '📧 *First, what\'s your email address?*'
    );
  } catch (error) {
    console.error('Error in login flow:', error);
    await sendErrorMessage(phoneNumber, 'Login failed. Please try again.');
  }
};

/**
 * Handle login step 2: Password entry
 */
const handleLoginStep2 = async (phoneNumber, session, email) => {
  try {
    if (!isValidEmail(email)) {
      await sendErrorMessage(phoneNumber, `"${email}" is not a valid email address.`);
      return;
    }
    
    // Save email
    session.data = { ...session.data, loginStep: 2, loginEmail: email.toLowerCase() };
    await session.save();
    
    await sendInfoMessage(
      phoneNumber,
      '🔑 *Login*\n\n' +
      '✅ Email saved!\n\n' +
      '🔐 Now, enter your password:'
    );
  } catch (error) {
    console.error('Error in login step 2:', error);
    await sendErrorMessage(phoneNumber, 'Login failed. Please try again.');
  }
};

/**
 * Handle login completion
 */
const handleLoginCompletion = async (phoneNumber, session, password) => {
  try {
    const email = session.data.loginEmail;
    
    await sendPleaseWaitMessage(phoneNumber, '⏳ Logging you in...');
    
    try {
      // Attempt login
      const loginResult = await loginUser({ email, password });
      
      if (loginResult.success) {
        // Update session
        session.state = 'LOGGED_IN';
        session.userId = loginResult.userId;
        session.token = generateToken(loginResult.userId);
        session.loginTime = new Date();
        session.data = {
          ...session.data,
          loginStep: null,
          loginEmail: null,
          token: session.token
        };
        await session.save();
        
        await sendSuccessMessage(
          phoneNumber,
          `🎉 *Login Successful!*\n\n` +
          `Welcome back, ${loginResult.user.name}!\n\n` +
          `You can now:\n` +
          `💊 Search medicines\n` +
          `👨‍⚕️ Book appointments\n` +
          `🛒 Shop healthcare products\n` +
          `📦 Track orders\n\n` +
          `Type "help" to see all services.`
        );
      } else {
        await sendErrorMessage(phoneNumber, loginResult.message || 'Login failed. Please check your email and password.');
      }
    } catch (loginError) {
      await sendErrorMessage(phoneNumber, `Login failed: ${loginError.message}`);
    }
  } catch (error) {
    console.error('Error completing login:', error);
    await sendErrorMessage(phoneNumber, 'Login error. Please try again.');
  }
};

/**
 * Handle logout
 */
const handleLogoutFlow = async (phoneNumber, session) => {
  try {
    // Clear session data
    session.state = 'NEW';
    session.token = null;
    session.userId = null;
    session.loginTime = null;
    session.data = {};
    await session.save();
    
    await sendSuccessMessage(
      phoneNumber,
      '👋 *Logged Out*\n\n' +
      'You have been safely logged out.\n\n' +
      'To access our services again, please login or register.\n\n' +
      'Type "login" or "register" to continue.'
    );
  } catch (error) {
    console.error('Error logging out:', error);
    await sendErrorMessage(phoneNumber, 'Logout failed. Please try again.');
  }
};

/**
 * Handle password reset flow
 */
const handlePasswordResetFlow = async (phoneNumber, session) => {
  try {
    session.state = 'REGISTERING';
    session.data = { ...session.data, resetPasswordStep: 1 };
    await session.save();
    
    await sendInfoMessage(
      phoneNumber,
      '🔑 *Password Reset*\n\n' +
      'We\'ll help you reset your password.\n\n' +
      '📧 *Enter your email address:*'
    );
  } catch (error) {
    console.error('Error in password reset flow:', error);
    await sendErrorMessage(phoneNumber, 'Password reset failed. Please try again.');
  }
};

/**
 * Handle password reset step 2: Request OTP
 */
const handlePasswordResetStep2 = async (phoneNumber, session, email) => {
  try {
    if (!isValidEmail(email)) {
      await sendErrorMessage(phoneNumber, `"${email}" is not a valid email address.`);
      return;
    }
    
    // Check if user exists
    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      await sendErrorMessage(phoneNumber, `No account found with email "${email}". Please register first or check the email address.`);
      return;
    }
    
    // Send OTP
    await sendPleaseWaitMessage(phoneNumber, '⏳ Sending reset code...');
    
    try {
      const result = await requestRegistrationOTP(email, user.name);
      
      session.data = { ...session.data, resetPasswordStep: 2, resetPasswordEmail: email.toLowerCase(), waitingForResetOTP: true };
      await session.save();
      
      await sendSuccessMessage(
        phoneNumber,
        `✅ Reset code sent to ${email}\n\n` +
        'Check your email and reply with the 4-digit code.\n\n' +
        'Valid for 5 minutes.'
      );
    } catch (error) {
      await sendErrorMessage(phoneNumber, `Could not send reset code: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in password reset step 2:', error);
    await sendErrorMessage(phoneNumber, 'Password reset failed. Please try again.');
  }
};

/**
 * Handle password reset OTP verification
 */
const handlePasswordResetOTPVerification = async (phoneNumber, session, otp) => {
  try {
    const email = session.data.resetPasswordEmail;
    
    await sendPleaseWaitMessage(phoneNumber, '⏳ Verifying code...');
    
    try {
      await verifyRegistrationOTP(email, otp);
      
      session.data = { ...session.data, resetPasswordStep: 3, waitingForResetOTP: null };
      await session.save();
      
      await sendInfoMessage(
        phoneNumber,
        '🔐 *Create New Password*\n\n' +
        '✅ Code verified!\n\n' +
        'Enter your new password (at least 6 characters):'
      );
    } catch (error) {
      await sendErrorMessage(phoneNumber, `Verification failed: ${error.message}. Reply "resend" for a new code.`);
    }
  } catch (error) {
    console.error('Error verifying password reset OTP:', error);
    await sendErrorMessage(phoneNumber, 'Verification error. Please try again.');
  }
};

/**
 * Handle password reset completion
 */
const handlePasswordResetCompletion = async (phoneNumber, session, newPassword) => {
  try {
    if (newPassword.length < 6) {
      await sendErrorMessage(phoneNumber, 'Password must be at least 6 characters long.');
      return;
    }
    
    const email = session.data.resetPasswordEmail;
    
    await sendPleaseWaitMessage(phoneNumber, '⏳ Resetting password...');
    
    try {
      // Find user and update password
      const user = await User.findOne({ where: { email: email.toLowerCase() } });
      if (!user) {
        await sendErrorMessage(phoneNumber, 'User not found. Please try again.');
        return;
      }
      
      // Update password (will be hashed by model hook)
      user.password = newPassword;
      await user.save();
      
      // Clear reset state
      session.state = 'NEW';
      session.data = {
        resetPasswordStep: null,
        resetPasswordEmail: null,
        waitingForResetOTP: null
      };
      await session.save();
      
      await sendSuccessMessage(
        phoneNumber,
        '🎉 *Password Reset Successful!*\n\n' +
        'Your password has been updated.\n\n' +
        'You can now login with your new password.\n\n' +
        'Type "login" to continue.'
      );
    } catch (error) {
      await sendErrorMessage(phoneNumber, `Could not reset password: ${error.message}`);
    }
  } catch (error) {
    console.error('Error completing password reset:', error);
    await sendErrorMessage(phoneNumber, 'Password reset error. Please try again.');
  }
};

module.exports = {
  handleGreetingFlow,
  handleHelpFlow,
  handleRegistrationStep1,
  handleRegistrationStep2,
  handleRegistrationStep3,
  handleRegistrationStep4,
  handleRegistrationStep5,
  handleRegistrationOTPVerification,
  handleResendOTP,
  handleLoginFlow,
  handleLoginStep2,
  handleLoginCompletion,
  handleLogoutFlow,
  handlePasswordResetFlow,
  handlePasswordResetStep2,
  handlePasswordResetOTPVerification,
  handlePasswordResetCompletion
};
