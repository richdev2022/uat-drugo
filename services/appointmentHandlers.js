/**
 * Doctor Search and Appointment Booking Handlers
 * Handles doctor search, filtering, and appointment booking
 */

const { Doctor, Appointment, User } = require('../models');
const { sendWhatsAppMessage, sendInteractiveMessage, sendLocationRequestMessage } = require('../config/whatsapp');
const { sendPleaseWaitMessage, sendSuccessMessage, sendErrorMessage, sendInfoMessage, sendDateSelectionButtons, sendTimeSelectionButtons } = require('../utils/messageHandler');
const { Op } = require('sequelize');

const PAGE_SIZE = 5;

// Doctor specialties
const DOCTOR_SPECIALTIES = [
  'Cardiologist',
  'Dermatologist',
  'Pediatrician',
  'General Practitioner',
  'Gynecologist',
  'Neurologist',
  'Orthopedic',
  'Dentist',
  'Ophthalmologist',
  'ENT Specialist'
];

/**
 * Handle doctor search start
 */
const handleDoctorSearchStart = async (phoneNumber, session) => {
  try {
    await sendInfoMessage(
      phoneNumber,
      '👨‍⚕️ *Find a Doctor*\n\n' +
      'We help you find the right doctor for your needs.\n\n' +
      '📍 First, enable your location so we can show doctors near you.\n\n' +
      'Tap the button below to share your location:'
    );
    
    // Request location
    await sendLocationRequestMessage(
      phoneNumber,
      '📍 Please share your current location for nearby doctor recommendations.',
      '📍 Share Location'
    );
    
    session.data = { ...session.data, searchingDoctors: true, doctorSearchStep: 'location' };
    await session.save();
  } catch (error) {
    console.error('Error starting doctor search:', error);
    await sendErrorMessage(phoneNumber, 'Could not start doctor search.');
  }
};

/**
 * Handle location received for doctor search
 */
const handleDoctorLocationReceived = async (phoneNumber, session, latitude, longitude) => {
  try {
    // Store user location
    session.data = {
      ...session.data,
      userLocation: { latitude, longitude },
      doctorSearchStep: 'specialty'
    };
    await session.save();
    
    // Show specialty selection
    await sendInfoMessage(
      phoneNumber,
      '✅ *Location Received*\n\n' +
      'Now, select a doctor specialty:\n\n' +
      '1. Cardiologist\n' +
      '2. Dermatologist\n' +
      '3. Pediatrician\n' +
      '4. General Practitioner\n' +
      '5. Gynecologist\n' +
      '6. Neurologist\n' +
      '7. Orthopedic\n' +
      '8. Dentist\n\n' +
      'Reply with a number (1-8) or type the specialty name.'
    );
  } catch (error) {
    console.error('Error handling doctor location:', error);
    await sendErrorMessage(phoneNumber, 'Could not process location.');
  }
};

/**
 * Handle doctor specialty selection
 */
const handleDoctorSpecialtySelection = async (phoneNumber, session, specialty) => {
  try {
    if (!specialty || specialty.trim().length === 0) {
      await sendErrorMessage(phoneNumber, 'Please select a valid specialty.');
      return;
    }
    
    await sendPleaseWaitMessage(phoneNumber, '🔍 Searching for doctors...');
    
    try {
      // Search doctors by specialty
      const doctors = await Doctor.findAll({
        where: {
          specialty: { [Op.iLike]: `%${specialty}%` },
          available: true,
          isActive: true
        },
        limit: PAGE_SIZE,
        order: [['rating', 'DESC']]
      });
      
      if (doctors.length === 0) {
        await sendErrorMessage(
          phoneNumber,
          `No ${specialty} doctors available right now.\n\n` +
          `Try another specialty or contact our support team.`
        );
        return;
      }
      
      // Display doctors
      let message = `👨‍⚕️ *Available ${specialty}s*\n\n`;
      const buttons = [];
      
      doctors.slice(0, 3).forEach((doctor, idx) => {
        const num = idx + 1;
        message += `${num}. *Dr. ${doctor.name}*\n`;
        message += `   Location: ${doctor.location}\n`;
        message += `   Rating: ${'⭐'.repeat(Math.floor(doctor.rating))} ${doctor.rating}/5\n\n`;
        
        buttons.push({
          id: `doctor_${doctor.id}`,
          title: `${num}. Dr. ${doctor.name.substring(0, 15)}`
        });
      });
      
      message += '📍 *What next?*\n';
      message += '• Reply with a number to view doctor details\n';
      message += '• Reply "next" to see more doctors';
      
      session.data = {
        ...session.data,
        doctorSearchResults: doctors,
        selectedSpecialty: specialty,
        doctorSearchStep: 'selection'
      };
      await session.save();
      
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
    console.error('Error selecting doctor specialty:', error);
    await sendErrorMessage(phoneNumber, 'Could not select specialty. Please try again.');
  }
};

/**
 * Show doctor details and booking options
 */
const handleDoctorDetailsAndBook = async (phoneNumber, session, doctorIndex) => {
  try {
    const doctors = session.data.doctorSearchResults || [];
    const idx = doctorIndex - 1;
    
    if (idx < 0 || idx >= doctors.length) {
      await sendErrorMessage(phoneNumber, `Invalid selection. Choose 1-${doctors.length}`);
      return;
    }
    
    const doctor = doctors[idx];
    
    let message = `👨‍⚕️ *Dr. ${doctor.name}*\n\n`;
    message += `Specialty: ${doctor.specialty}\n`;
    message += `Location: ${doctor.location}\n`;
    message += `Rating: ${'⭐'.repeat(Math.floor(doctor.rating))} ${doctor.rating}/5\n`;
    message += `Available: ${doctor.available ? '✅ Yes' : '❌ No'}\n\n`;
    message += `📍 Ready to book an appointment?\n`;
    message += `Reply "yes" to proceed with booking or "no" to go back.`;
    
    session.data = {
      ...session.data,
      selectedDoctor: doctor,
      selectedDoctorId: doctor.id,
      doctorSearchStep: 'confirm'
    };
    await session.save();
    
    await sendWhatsAppMessage(phoneNumber, message);
  } catch (error) {
    console.error('Error showing doctor details:', error);
    await sendErrorMessage(phoneNumber, 'Could not load doctor details.');
  }
};

/**
 * Handle appointment date selection
 */
const handleAppointmentDateSelection = async (phoneNumber, session) => {
  try {
    session.data = {
      ...session.data,
      appointmentStep: 'date',
      waitingForAppointmentDate: true
    };
    await session.save();
    
    await sendInfoMessage(
      phoneNumber,
      '📅 *Select Appointment Date*\n\n' +
      'Choose a date for your appointment:\n\n' +
      'You can book an appointment for:\n' +
      '• Tomorrow\n' +
      '• Next 3-7 days\n\n' +
      'Reply "tomorrow" or a date like "2024-01-15" or "15-01-2024"'
    );
    
    // Send date buttons
    await sendDateSelectionButtons(phoneNumber);
  } catch (error) {
    console.error('Error selecting appointment date:', error);
    await sendErrorMessage(phoneNumber, 'Could not select date. Please try again.');
  }
};

/**
 * Handle appointment date confirmation
 */
const handleAppointmentDateConfirmation = async (phoneNumber, session, dateString) => {
  try {
    // Parse date
    let appointmentDate;
    
    if (dateString.toLowerCase() === 'tomorrow') {
      appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + 1);
    } else {
      // Try to parse date formats: YYYY-MM-DD or DD-MM-YYYY
      let parts;
      if (dateString.includes('-')) {
        parts = dateString.split('-');
      } else if (dateString.includes('/')) {
        parts = dateString.split('/');
      } else {
        await sendErrorMessage(phoneNumber, 'Invalid date format. Use YYYY-MM-DD or DD-MM-YYYY.');
        return;
      }
      
      if (parts.length !== 3) {
        await sendErrorMessage(phoneNumber, 'Invalid date format. Use YYYY-MM-DD or DD-MM-YYYY.');
        return;
      }
      
      let year, month, day;
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        [year, month, day] = parts.map(p => parseInt(p, 10));
      } else {
        // DD-MM-YYYY
        [day, month, year] = parts.map(p => parseInt(p, 10));
      }
      
      appointmentDate = new Date(year, month - 1, day);
    }
    
    // Validate date
    if (isNaN(appointmentDate.getTime())) {
      await sendErrorMessage(phoneNumber, 'Invalid date. Please try again.');
      return;
    }
    
    const today = new Date();
    if (appointmentDate <= today) {
      await sendErrorMessage(phoneNumber, 'Please select a future date.');
      return;
    }
    
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3);
    if (appointmentDate > maxDate) {
      await sendErrorMessage(phoneNumber, 'Can only book appointments up to 3 months in advance.');
      return;
    }
    
    session.data = {
      ...session.data,
      appointmentStep: 'time',
      appointmentDate: appointmentDate.toISOString().split('T')[0],
      waitingForAppointmentDate: null,
      waitingForAppointmentTime: true
    };
    await session.save();
    
    const dateStr = appointmentDate.toLocaleDateString('en-NG', { month: 'long', day: 'numeric', year: 'numeric' });
    
    await sendInfoMessage(
      phoneNumber,
      `✅ Date Confirmed: ${dateStr}\n\n` +
      `⏰ *Select Appointment Time*\n\n` +
      `Available times:\n` +
      `• 9:00 AM\n` +
      `• 11:00 AM\n` +
      `• 2:00 PM\n` +
      `• 4:00 PM\n\n` +
      `Reply with your preferred time.`
    );
    
    // Send time buttons
    await sendTimeSelectionButtons(phoneNumber);
  } catch (error) {
    console.error('Error confirming appointment date:', error);
    await sendErrorMessage(phoneNumber, 'Could not confirm date. Please try again.');
  }
};

/**
 * Handle appointment time confirmation and completion
 */
const handleAppointmentTimeConfirmation = async (phoneNumber, session, timeString) => {
  try {
    const userId = session.userId;
    const doctorId = session.data.selectedDoctorId;
    const appointmentDate = session.data.appointmentDate;
    
    if (!userId || !doctorId || !appointmentDate) {
      await sendErrorMessage(phoneNumber, 'Invalid booking data. Please start over.');
      return;
    }
    
    await sendPleaseWaitMessage(phoneNumber, '⏳ Booking your appointment...');
    
    try {
      // Parse time and create appointment datetime
      let [hours, minutes] = timeString.split(':').map(t => parseInt(t, 10));
      
      const dateObj = new Date(appointmentDate);
      dateObj.setHours(hours, minutes, 0, 0);
      
      // Create appointment
      const appointment = await Appointment.create({
        userId,
        doctorId,
        dateTime: dateObj,
        status: 'Scheduled',
        notes: `Appointment booked via WhatsApp Bot on ${new Date().toLocaleString()}`
      });
      
      // Clear appointment data
      const newData = { ...session.data };
      delete newData.appointmentStep;
      delete newData.appointmentDate;
      delete newData.selectedDoctor;
      delete newData.selectedDoctorId;
      delete newData.doctorSearchResults;
      delete newData.doctorSearchStep;
      delete newData.selectedSpecialty;
      delete newData.userLocation;
      delete newData.waitingForAppointmentTime;
      delete newData.searchingDoctors;
      
      session.data = newData;
      await session.save();
      
      const timeStr = dateObj.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
      const dateStr = dateObj.toLocaleDateString('en-NG', { month: 'long', day: 'numeric' });
      
      await sendSuccessMessage(
        phoneNumber,
        `🎉 *Appointment Booked!*\n\n` +
        `Appointment ID: #${appointment.id}\n` +
        `Doctor: Dr. ${session.data.selectedDoctor?.name || 'TBD'}\n` +
        `Date: ${dateStr}\n` +
        `Time: ${timeStr}\n\n` +
        `✅ You will receive a reminder 24 hours before your appointment.\n\n` +
        `Need help? Reply "support"`
      );
    } catch (dbError) {
      console.error('Database error creating appointment:', dbError);
      await sendErrorMessage(phoneNumber, 'Could not book appointment. Please try again.');
    }
  } catch (error) {
    console.error('Error confirming appointment time:', error);
    await sendErrorMessage(phoneNumber, 'Could not complete booking. Please try again.');
  }
};

/**
 * View upcoming appointments
 */
const handleViewAppointments = async (phoneNumber, session) => {
  try {
    const userId = session.userId;
    
    if (!userId) {
      await sendErrorMessage(phoneNumber, 'Please login first.');
      return;
    }
    
    const appointments = await Appointment.findAll({
      where: {
        userId,
        status: ['Scheduled', 'Completed']
      },
      include: [{ model: Doctor, attributes: ['name', 'specialty', 'location'] }],
      order: [['dateTime', 'ASC']]
    });
    
    if (appointments.length === 0) {
      await sendInfoMessage(
        phoneNumber,
        '📅 *Your Appointments*\n\n' +
        'You have no upcoming appointments.\n\n' +
        'Reply "doctors" to book one now.'
      );
      return;
    }
    
    let message = '📅 *Your Appointments*\n\n';
    
    appointments.forEach((apt, idx) => {
      const dateStr = new Date(apt.dateTime).toLocaleString('en-NG', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      message += `${idx + 1}. Dr. ${apt.Doctor.name}\n`;
      message += `   Specialty: ${apt.Doctor.specialty}\n`;
      message += `   Date/Time: ${dateStr}\n`;
      message += `   Status: ${apt.status}\n\n`;
    });
    
    await sendWhatsAppMessage(phoneNumber, message);
  } catch (error) {
    console.error('Error viewing appointments:', error);
    await sendErrorMessage(phoneNumber, 'Could not load appointments. Please try again.');
  }
};

module.exports = {
  DOCTOR_SPECIALTIES,
  handleDoctorSearchStart,
  handleDoctorLocationReceived,
  handleDoctorSpecialtySelection,
  handleDoctorDetailsAndBook,
  handleAppointmentDateSelection,
  handleAppointmentDateConfirmation,
  handleAppointmentTimeConfirmation,
  handleViewAppointments
};
