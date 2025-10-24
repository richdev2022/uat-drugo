/**
 * Message Handler Utility
 * Replaces typing indicators with "Please wait" messages
 * Provides unified message sending with proper error handling
 */

const {
  sendWhatsAppMessage,
  sendInteractiveMessage,
  sendListMessage,
  sendLocationRequestMessage
} = require('../config/whatsapp');

/**
 * Send a "Please wait" message instead of typing indicator
 * @param {string} phoneNumber - User's phone number
 * @param {string} message - Custom message (default: "⏳ Please wait while we process your request...")
 * @returns {Promise<boolean>} True if message sent successfully
 */
const sendPleaseWaitMessage = async (phoneNumber, message = '⏳ Please wait while we process your request...') => {
  try {
    const fullMessage = `${message}\n\n_This may take a few moments._`;
    await sendWhatsAppMessage(phoneNumber, fullMessage);
    return true;
  } catch (error) {
    console.warn(`⚠️  Could not send wait message to ${phoneNumber}:`, error.message);
    return false;
  }
};

/**
 * Send main menu with interactive buttons
 * @param {string} phoneNumber - User's phone number
 * @returns {Promise<boolean>} True if message sent successfully
 */
const sendMainMenu = async (phoneNumber) => {
  try {
    const buttons = [
      { id: '1', title: '💊 Search Medicines' },
      { id: '2', title: '👨‍⚕️ Find Doctors' },
      { id: '3', title: '📦 Healthcare Products' },
      { id: '4', title: '🩺 Book Diagnostic Test' },
      { id: '5', title: '📋 View Cart' },
      { id: '6', title: '❤️ Appointments' },
      { id: '7', title: '📨 Support' },
      { id: '8', title: '💬 More Options' }
    ];

    await sendInteractiveMessage(
      phoneNumber,
      '🏥 *Welcome to Drugs.ng WhatsApp Bot*\n\nHow can we help you today? Select an option below:',
      buttons.slice(0, 3) // WhatsApp allows max 3 buttons per message
    );

    // Send second batch of buttons
    await sendInteractiveMessage(
      phoneNumber,
      'Select more options:',
      buttons.slice(3, 6)
    );

    // Send third batch
    await sendInteractiveMessage(
      phoneNumber,
      '',
      buttons.slice(6)
    );

    return true;
  } catch (error) {
    console.error('Error sending main menu:', error.message);
    return false;
  }
};

/**
 * Send authentication menu (login/register)
 * @param {string} phoneNumber - User's phone number
 * @returns {Promise<boolean>} True if message sent successfully
 */
const sendAuthMenu = async (phoneNumber) => {
  try {
    const buttons = [
      { id: 'register', title: '📝 Register' },
      { id: 'login', title: '🔐 Login' },
      { id: 'reset', title: '🔑 Reset Password' }
    ];

    await sendInteractiveMessage(
      phoneNumber,
      '🔐 *Authentication*\n\nChoose an option:',
      buttons
    );

    return true;
  } catch (error) {
    console.error('Error sending auth menu:', error.message);
    return false;
  }
};

/**
 * Send paginated list with interactive buttons
 * @param {string} phoneNumber - User's phone number
 * @param {Array} items - Items to display
 * @param {number} page - Current page
 * @param {number} totalPages - Total pages
 * @param {string} title - List title
 * @param {Function} itemFormatter - Function to format each item for display
 * @returns {Promise<boolean>} True if message sent successfully
 */
const sendPaginatedList = async (
  phoneNumber,
  items = [],
  page = 1,
  totalPages = 1,
  title = 'Items',
  itemFormatter = (item, idx) => `${idx + 1}. ${item.name || String(item)}`
) => {
  try {
    if (!Array.isArray(items) || items.length === 0) {
      await sendWhatsAppMessage(phoneNumber, `❌ No ${title.toLowerCase()} found.`);
      return true;
    }

    // Format the message
    let message = `📋 *${title}* (Page ${page}/${totalPages})\n\n`;
    const buttons = [];

    items.forEach((item, index) => {
      const num = index + 1;
      const displayText = itemFormatter(item, index);
      message += `${num}. ${displayText}\n\n`;
      
      // Create buttons for items (max 3 buttons per interactive message)
      if (num <= 3) {
        buttons.push({
          id: String(num),
          title: `${num}. Select`
        });
      }
    });

    // Add navigation info
    message += '📍 *Navigation:*\n';
    if (page > 1) message += '• Reply "Previous" to go back\n';
    if (page < totalPages) message += '• Reply "Next" to continue\n';
    message += '• Reply with a number to select an item\n';

    // Send initial message with buttons
    if (buttons.length > 0) {
      await sendInteractiveMessage(phoneNumber, message, buttons);
    } else {
      await sendWhatsAppMessage(phoneNumber, message);
    }

    return true;
  } catch (error) {
    console.error('Error sending paginated list:', error.message);
    return false;
  }
};

/**
 * Send location request
 * @param {string} phoneNumber - User's phone number
 * @param {string} purpose - Purpose of location request
 * @returns {Promise<boolean>} True if message sent successfully
 */
const sendLocationRequest = async (phoneNumber, purpose = 'delivery address') => {
  try {
    const message = `📍 *Location Request*\n\nPlease share your ${purpose} by tapping the button below.`;
    await sendLocationRequestMessage(phoneNumber, message, '📍 Share Location');
    return true;
  } catch (error) {
    console.error('Error sending location request:', error.message);
    return false;
  }
};

/**
 * Send quick reply buttons for yes/no questions
 * @param {string} phoneNumber - User's phone number
 * @param {string} question - Question to ask
 * @param {string} yesId - ID for yes button
 * @param {string} noId - ID for no button
 * @returns {Promise<boolean>} True if message sent successfully
 */
const sendYesNoButtons = async (phoneNumber, question, yesId = 'yes', noId = 'no') => {
  try {
    const buttons = [
      { id: yesId, title: '✅ Yes' },
      { id: noId, title: '❌ No' }
    ];

    await sendInteractiveMessage(phoneNumber, question, buttons);
    return true;
  } catch (error) {
    console.error('Error sending yes/no buttons:', error.message);
    return false;
  }
};

/**
 * Send payment method selection buttons
 * @param {string} phoneNumber - User's phone number
 * @returns {Promise<boolean>} True if message sent successfully
 */
const sendPaymentMethodButtons = async (phoneNumber) => {
  try {
    const buttons = [
      { id: 'flutterwave', title: '💳 Flutterwave' },
      { id: 'paystack', title: '💰 Paystack' },
      { id: 'cod', title: '🏪 Cash on Delivery' }
    ];

    await sendInteractiveMessage(
      phoneNumber,
      '💳 *Select Payment Method*\n\nChoose how you want to pay:',
      buttons
    );

    return true;
  } catch (error) {
    console.error('Error sending payment method buttons:', error.message);
    return false;
  }
};

/**
 * Send appointment date selection (next 7 days)
 * @param {string} phoneNumber - User's phone number
 * @returns {Promise<boolean>} True if message sent successfully
 */
const sendDateSelectionButtons = async (phoneNumber) => {
  try {
    const buttons = [];
    const today = new Date();

    for (let i = 0; i < 3; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i + 1); // Start from tomorrow
      const dateStr = date.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
      
      buttons.push({
        id: date.toISOString().split('T')[0],
        title: dateStr
      });
    }

    await sendInteractiveMessage(
      phoneNumber,
      '📅 *Select Appointment Date*\n\nChoose a date:',
      buttons
    );

    return true;
  } catch (error) {
    console.error('Error sending date selection:', error.message);
    return false;
  }
};

/**
 * Send time selection buttons
 * @param {string} phoneNumber - User's phone number
 * @returns {Promise<boolean>} True if message sent successfully
 */
const sendTimeSelectionButtons = async (phoneNumber) => {
  try {
    const buttons = [
      { id: '09:00', title: '09:00 AM' },
      { id: '11:00', title: '11:00 AM' },
      { id: '14:00', title: '02:00 PM' },
      { id: '16:00', title: '04:00 PM' }
    ];

    // Send in two batches since WhatsApp allows max 3 buttons
    await sendInteractiveMessage(
      phoneNumber,
      '⏰ *Select Appointment Time*\n\nChoose a time slot:',
      buttons.slice(0, 3)
    );

    await sendInteractiveMessage(
      phoneNumber,
      'More time slots:',
      buttons.slice(3)
    );

    return true;
  } catch (error) {
    console.error('Error sending time selection:', error.message);
    return false;
  }
};

/**
 * Send success message with emoji
 * @param {string} phoneNumber - User's phone number
 * @param {string} message - Message to send
 * @param {string} icon - Emoji icon (default: ✅)
 * @returns {Promise<boolean>} True if message sent successfully
 */
const sendSuccessMessage = async (phoneNumber, message, icon = '✅') => {
  try {
    const fullMessage = `${icon} *Success*\n\n${message}`;
    await sendWhatsAppMessage(phoneNumber, fullMessage);
    return true;
  } catch (error) {
    console.error('Error sending success message:', error.message);
    return false;
  }
};

/**
 * Send error message with emoji
 * @param {string} phoneNumber - User's phone number
 * @param {string} message - Error message to send
 * @param {string} icon - Emoji icon (default: ❌)
 * @returns {Promise<boolean>} True if message sent successfully
 */
const sendErrorMessage = async (phoneNumber, message, icon = '❌') => {
  try {
    const fullMessage = `${icon} *Error*\n\n${message}\n\nPlease try again or reply "Help" for assistance.`;
    await sendWhatsAppMessage(phoneNumber, fullMessage);
    return true;
  } catch (error) {
    console.error('Error sending error message:', error.message);
    return false;
  }
};

/**
 * Send info message with emoji
 * @param {string} phoneNumber - User's phone number
 * @param {string} message - Message to send
 * @param {string} icon - Emoji icon (default: ℹ️)
 * @returns {Promise<boolean>} True if message sent successfully
 */
const sendInfoMessage = async (phoneNumber, message, icon = 'ℹ️') => {
  try {
    const fullMessage = `${icon} *Information*\n\n${message}`;
    await sendWhatsAppMessage(phoneNumber, fullMessage);
    return true;
  } catch (error) {
    console.error('Error sending info message:', error.message);
    return false;
  }
};

module.exports = {
  sendPleaseWaitMessage,
  sendMainMenu,
  sendAuthMenu,
  sendPaginatedList,
  sendLocationRequest,
  sendYesNoButtons,
  sendPaymentMethodButtons,
  sendDateSelectionButtons,
  sendTimeSelectionButtons,
  sendSuccessMessage,
  sendErrorMessage,
  sendInfoMessage
};
