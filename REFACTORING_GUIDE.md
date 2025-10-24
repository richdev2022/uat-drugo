# Drugs.ng WhatsApp Bot - Refactoring Guide

## 🎯 Completed Work

### New Service Files Created

#### 1. **utils/messageHandler.js** (366 lines)
Unified message sending utilities replacing typing indicators with interactive buttons:
- `sendPleaseWaitMessage()` - Replaces typing indicators
- `sendMainMenu()` - Main menu with buttons
- `sendAuthMenu()` - Authentication options
- `sendPaginatedList()` - Paginated lists with buttons
- `sendLocationRequest()` - Location sharing button
- `sendYesNoButtons()` - Yes/No confirmation
- `sendPaymentMethodButtons()` - Payment options
- `sendDateSelectionButtons()` - Date picker buttons
- `sendTimeSelectionButtons()` - Time slot buttons
- All with emoji-enhanced messages

#### 2. **services/authHandlers.js** (620 lines)
Complete authentication flow handlers:
- **Registration**: 5-step process (email → name → phone → password → OTP verification)
- **Login**: 2-step process (email → password)
- **Password Reset**: 3-step process (email → OTP → new password)
- **OTP Verification & Resend**
- **Logout**
- All flows with emoji-rich messages and proper session state management

#### 3. **services/productHandlers.js** (514 lines)
Product search and cart management:
- Medicine search with pagination
- Product details display
- Add to cart with quantity validation
- View cart with running totals
- Checkout flow: address → phone → payment method
- Healthcare products browsing
- Diagnostic tests browsing
- Real DB data fetching (not hardcoded)

#### 4. **services/appointmentHandlers.js** (459 lines)
Doctor search and appointment booking:
- Location-based doctor search (via WhatsApp location sharing)
- Specialty filtering (10 doctor specialties)
- Doctor details display with ratings
- Date selection with calendar-like interface
- Time selection with button-based slots
- Appointment confirmation with ID
- View upcoming appointments
- Proper validation and error handling

#### 5. **services/nlpProcessor.js** (286 lines)
Improved natural language processing:
- Fuzzy matching algorithm for misspellings
- Intent detection for: greetings, auth, product search, doctor search, appointments, cart, checkout, diagnostics, healthcare products, support, payments, prescriptions, tracking, help
- Multi-step flow detection (detects if user is in registration, login, appointment booking, checkout)
- OTP verification detection
- Confidence scoring
- Handles both numeric commands (1-8) and natural language

#### 6. **services/webhookMessageHandler.js** (404 lines)
Master message dispatcher that ties everything together:
- Routes messages to correct handlers based on intent
- Manages multi-step flow state
- Enforces authentication for protected features
- Handles different message types: text, locations, media
- Integrates all handler services
- Clear error handling and user feedback

---

## 🔄 How to Integrate into Main index.js

### Step 1: Update Imports in index.js
Replace the old handler imports with new ones:

```javascript
// Add these imports at the top of index.js
const { handleWebhookMessage, handleLocationMessage, handleMediaMessage } = require('./services/webhookMessageHandler');
const { processNLP } = require('./services/nlpProcessor');
```

### Step 2: Replace Message Handlers

**Old handleTextMessage function** - Replace with:
```javascript
const handleTextMessage = async (message, phoneNumber, messageId) => {
  try {
    let session = await Session.findOne({ where: { phoneNumber } });
    if (!session) {
      session = await Session.create({
        phoneNumber,
        state: 'NEW',
        data: {},
        lastActivity: new Date()
      });
    }
    
    await handleWebhookMessage(phoneNumber, message, session);
  } catch (error) {
    console.error('Error handling text message:', error);
    await sendErrorMessage(phoneNumber, 'An error occurred. Please try again.');
  }
};
```

**Old handleLocationMessage function** - Replace with:
```javascript
const handleLocationMessage = async (message, phoneNumber, messageId) => {
  try {
    let session = await Session.findOne({ where: { phoneNumber } });
    const location = message.location;
    await handleLocationMessage(phoneNumber, session, location.latitude, location.longitude);
  } catch (error) {
    console.error('Error handling location message:', error);
  }
};
```

**Old handleMediaMessage function** - Replace with:
```javascript
const handleMediaMessage = async (message, phoneNumber, messageId) => {
  try {
    let session = await Session.findOne({ where: { phoneNumber } });
    await handleMediaMessage(phoneNumber, session, message);
  } catch (error) {
    console.error('Error handling media message:', error);
  }
};
```

### Step 3: Remove Old Handler Functions
Remove these old functions from index.js (they're now in the new services):
- `handleGreeting()`
- `handleRegistration()` (→ authHandlers)
- `handleLogin()` (→ authHandlers)
- `handleLogout()` (→ authHandlers)
- `handleProductSearch()` (→ productHandlers)
- `handleAddToCart()` (→ productHandlers)
- `handleViewCart()` (→ productHandlers)
- `handlePlaceOrder()` (→ productHandlers)
- `handleDoctorSearch()` (→ appointmentHandlers)
- `handleBookAppointment()` (→ appointmentHandlers)
- Any other intent handlers (moved to respective services)

---

## 📱 User Flow Examples

### Registration Flow (New)
1. User: "register"
2. Bot: "📝 *Registration - Step 1 of 4* ... What's your email?"
3. User: "john@example.com"
4. Bot: "👤 *Registration - Step 2 of 4* ... What's your full name?"
5. User: "John Doe"
6. Bot: "📱 *Registration - Step 3 of 4* ... What's your phone number?"
7. User: "08012345678"
8. Bot: "🔐 *Registration - Step 4 of 4* ... Create a secure password"
9. User: "MyPassword123"
10. Bot: "⏳ Sending OTP to your email..."
11. User: "1234" (OTP code)
12. Bot: "🎉 *Registration Successful!* Welcome John Doe!"

### Medicine Search Flow (New)
1. User: "search medicines" or "💊 Medicines"
2. Bot: "💊 *Search Medicines* What medicine are you looking for?"
3. User: "paracetamol"
4. Bot: "⏳ Searching for medicines..." → Shows results with numbers
5. User: "1" (select first result)
6. Bot: Shows medicine details with "add 1" option
7. User: "add 3" (add 3 units)
8. Bot: "✅ Added to Cart... Reply 'cart' to view, 'checkout' to buy"

### Doctor Appointment Flow (New)
1. User: "find doctors" or "book appointment"
2. Bot: "📍 *Find a Doctor* Please share your location..."
3. User: [Shares location via WhatsApp button]
4. Bot: "✅ Location Received... Select a specialty: 1. Cardiologist..."
5. User: "1"
6. Bot: Shows doctors with "Dr. X" buttons
7. User: "1" (select doctor)
8. Bot: Shows doctor details, asks "Ready to book? Yes/No"
9. User: "yes"
10. Bot: "📅 *Select Date*" → Shows date buttons
11. User: [Selects date via button]
12. Bot: "⏰ *Select Time*" → Shows time slot buttons
13. User: [Selects time]
14. Bot: "🎉 *Appointment Booked!* ID: #123"

### Checkout Flow (New)
1. User: "checkout"
2. Bot: "📦 *Checkout* Please provide delivery address..."
3. User: "123 Main Street, Lagos, Nigeria"
4. Bot: "✅ Address saved... Please confirm your phone number"
5. User: "08012345678"
6. Bot: "✅ Phone saved... Choose payment method:" → Shows buttons
7. User: [Selects payment method via button]
8. Bot: Processes payment or confirms COD

---

## 🗄️ Database Considerations

### Existing Models (Already in /models/index.js)
All these models are already defined and seeded with sample data:
- **User** - User accounts
- **Product** - Medicines/products
- **Doctor** - Doctor profiles
- **Appointment** - Booked appointments
- **Order** - Customer orders
- **OrderItem** - Items in orders
- **Cart** - Shopping cart items
- **DiagnosticTest** - Lab tests
- **HealthcareProduct** - Medical devices/supplies
- **DiagnosticBooking** - Test bookings
- **Prescription** - Prescription uploads
- **Session** - User sessions (critical for tracking logged-in users)
- **OTP** - One-time passwords for verification
- **SupportTeam** - Support team members
- **SupportChat** - Chat messages

### Sample Data Seeded
The models are auto-seeded in initializeDatabase():
- 8 medicines (Paracetamol, Insulin, Amoxicillin, etc.)
- 7 doctors (Cardio, Pediatrician, Dermatologist, etc.)
- 8 diagnostic tests (Blood test, COVID test, Thyroid test, etc.)
- 8 healthcare products (First aid kit, Thermometer, Oximeter, etc.)

---

## 🔐 Authentication Flow

### Session State Machine
```
NEW → REGISTERING/LOGGING_IN → LOGGED_IN → (idle timeout) → NEW
                                  ↓
                              SUPPORT_CHAT (optional)
```

### Authentication Guard
All protected features check: `isUserAuthenticated(session)`
- Must have valid token in session.token or session.data.token
- Must have session.state === 'LOGGED_IN'
- Must not be idle for more than 20 minutes (configurable via env var SESSION_IDLE_TIMEOUT_MINUTES)

---

## ✨ Key Features Implemented

### 1. **No Typing Indicators**
- Replaced with: `sendPleaseWaitMessage()` - Shows "⏳ Please wait while we process your request..."
- Fixes the "Requuest failed with status code 400" error

### 2. **Interactive Buttons Instead of Type Commands**
- Before: "Type 1 for medicines, type 2 for doctors..."
- After: Actual clickable buttons with numbers/names
- WhatsApp native buttons → better UX

### 3. **Emoji Throughout**
- 💊 Medicine/products
- 👨‍⚕️ Doctors
- 📅 Appointments
- 🛒 Cart/shopping
- ✅ Success
- ❌ Error
- 🔐 Authentication
- 📍 Location
- And many more!

### 4. **Multi-Step Flows**
- Sessions track which step user is on
- Clear prompts and validation at each step
- Easy to resume if user loses connection

### 5. **Real Database Data**
- All search/browse queries fetch from actual DB
- Nothing is hardcoded
- Pagination with Next/Previous

### 6. **Location-Based Services**
- Doctor search with location filtering
- Appointment booking with location
- Uses WhatsApp's native location sharing

### 7. **Proper Session Management**
- Session timeout after 20 minutes of inactivity
- User authentication state tracking
- Cart and appointment data persisted in session

---

## 🧪 Testing Checklist

Before deployment, verify:

- [ ] User can register (4 steps + OTP)
- [ ] User can login (2 steps)
- [ ] User can search medicines
- [ ] User can add items to cart
- [ ] User can view cart
- [ ] User can start checkout
- [ ] User can search for doctors
- [ ] User can book appointments (location → specialty → doctor → date → time)
- [ ] User can browse healthcare products
- [ ] User can browse diagnostic tests
- [ ] Interactive buttons work (not type commands)
- [ ] No typing indicators showing
- [ ] Emojis display correctly in WhatsApp
- [ ] Session timeout works (wait 20+ min, try accessing feature)
- [ ] Authentication guard works (logout, try accessing protected feature)
- [ ] Error messages are helpful with clear instructions
- [ ] "Please wait" message shows instead of typing indicator

---

## 📝 Environment Variables (Already Set)

```
DATABASE_URL=postgresql://...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_VERIFY_TOKEN=...
FLUTTERWAVE_PUBLIC_KEY=...
FLUTTERWAVE_SECRET_KEY=...
SESSION_IDLE_TIMEOUT_MINUTES=20
ADMIN_TOKEN_EXPIRY_MINUTES=60
```

---

## 🚀 Deployment Notes

1. **Database migrations**: All models will auto-sync with `sequelize.sync({ alter: true })`
2. **Session table**: Ensured to have all required columns (token, userId, loginTime, lastActivity)
3. **OTP sending**: Uses Brevo email service (env var BREVO_SENDER_EMAIL)
4. **Payment webhooks**: Still intact for Flutterwave and Paystack
5. **Rate limiting**: Still active to prevent abuse

---

## 📞 Support System (TODO)

Create `services/supportHandlers.js` with:
- Support type selection (medical, technical, order)
- Queue management
- Agent assignment
- Chat forwarding
- Session rating

---

## 📋 Next Immediate Actions

1. ✅ Create new service files (DONE)
2. ⏳ **Update index.js webhook handlers to use new services**
3. ⏳ Test registration flow end-to-end
4. ⏳ Test medicine search flow end-to-end
5. ⏳ Test doctor booking flow end-to-end
6. ⏳ Create support handlers
7. ⏳ Deploy to staging for QA
8. ⏳ Deploy to production

---

## 📞 Questions During Integration?

Refer to these key files for implementation details:
- **Message formatting**: Look at sendSuccessMessage(), sendErrorMessage() in messageHandler.js
- **Flow handling**: Check multi-step handler patterns in authHandlers.js
- **Intent detection**: Review detectIntent() and checkMultiStepFlow() in nlpProcessor.js
- **Router logic**: See handleWebhookMessage() and its switch statement in webhookMessageHandler.js
