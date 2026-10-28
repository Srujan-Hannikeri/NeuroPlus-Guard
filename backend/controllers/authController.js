const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const twilio = require('twilio');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
};

const verifyDoctorWithAskMyDoc = async ({ regNumber, doctorName, stateCouncil, year }) => {
  if (!regNumber) {
    return { verified: false, message: 'Medical Registration Number is required.' };
  }

  const trimmedReg = String(regNumber).trim();
  // Support standard test registration numbers in development / testing
  if (
    trimmedReg.toUpperCase() === 'TEST-DOC-12345' ||
    trimmedReg.toUpperCase() === 'DOC-VERIFIED' ||
    trimmedReg === '99999'
  ) {
    return {
      verified: true,
      name: doctorName || 'Dr. Verified Practitioner',
      registration_no: trimmedReg,
      state_council: stateCouncil || 'National Medical Commission',
      qualification: 'MBBS, MD',
      university: 'All India Institute of Medical Sciences (AIIMS)',
      year_of_reg: year || '2018',
      source: 'test-sandbox'
    };
  }

  try {
    const postBody = JSON.stringify({
      reg_number: trimmedReg,
      doctor_name: doctorName || undefined,
      state_council: stateCouncil || undefined,
      year: year || undefined
    });

    const response = await fetch('https://api.askmydoc.in/api/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: postBody,
      signal: AbortSignal.timeout(8000)
    });

    const data = await response.json().catch(() => null);

    if (data && data.verified === true) {
      return {
        verified: true,
        name: data.name,
        registration_no: data.registration_no || trimmedReg,
        state_council: data.state_council || stateCouncil,
        qualification: data.qualification,
        university: data.university,
        year_of_reg: data.year_of_reg || data.year,
        raw: data
      };
    }

    if (data && data.verified === false) {
      let rawMsg = data.message || data.error || '';
      let friendlyMessage = `No verified doctor found with Registration Number "${trimmedReg}". Please verify your registration number and State Medical Council.`;
      if (rawMsg && !/404|portal|not found|http/i.test(rawMsg)) {
        friendlyMessage = rawMsg;
      }
      return {
        verified: false,
        message: friendlyMessage
      };
    }

    return {
      verified: false,
      message: `No verified doctor found with Registration Number "${trimmedReg}". Please check your registration details.`
    };
  } catch (error) {
    console.error('AskMyDoc API verification error:', error.message);
    return {
      verified: false,
      message: `Unable to verify with AskMyDoc medical register: ${error.name === 'TimeoutError' ? 'Verification service timed out' : 'Service currently unreachable'}. Please try again.`
    };
  }
};

exports.verifyDoctorCredentials = async (req, res) => {
  try {
    const { registrationNumber, name, stateCouncil, registrationYear } = req.body;
    const result = await verifyDoctorWithAskMyDoc({
      regNumber: registrationNumber,
      doctorName: name,
      stateCouncil,
      year: registrationYear
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ verified: false, message: error.message });
  }
};

exports.register = async (req, res) => {
  try {
    const { 
      name, phone, password, role, 
      specialization, upiId, age, bloodGroup,
      registrationNumber, stateCouncil, registrationYear
    } = req.body;

    const userExists = await User.findOne({ phone });
    if (userExists) return res.status(400).json({ message: 'User already exists with this phone number' });

    let doctorData = {};
    if (role === 'Doctor') {
      if (!registrationNumber) {
        return res.status(400).json({ message: 'Medical Registration Number is required for Doctor registration.' });
      }

      // Verify doctor with AskMyDoc API
      const verification = await verifyDoctorWithAskMyDoc({
        regNumber: registrationNumber,
        doctorName: name,
        stateCouncil,
        year: registrationYear
      });

      if (!verification.verified) {
        return res.status(400).json({ 
          message: verification.message || 'Doctor verification failed. You must be a verified doctor via AskMyDoc API to register.' 
        });
      }

      doctorData = {
        registrationNumber: verification.registration_no || registrationNumber,
        stateCouncil: verification.state_council || stateCouncil,
        registrationYear: verification.year_of_reg || registrationYear,
        qualification: verification.qualification || 'MBBS',
        doctorVerificationData: verification,
        verificationStatus: 'Verified',
        verified: true
      };
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name, phone, password: hashedPassword, role,
      specialization, upiId, age, bloodGroup,
      ...doctorData,
      isVerified: false // Needs OTP
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      verificationStatus: user.verificationStatus,
      message: 'User registered successfully. You can log in using your phone number.'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone });

    if (user && (await bcrypt.compare(password, user.password))) {
      const userObj = user.toObject();
      delete userObj.password;

      res.json({
        ...userObj,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid phone or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    // Mock OTP verification - assume "1234" is the universal OTP for now
    if (otp === "1234") {
      const user = await User.findOneAndUpdate({ phone }, { isVerified: true }, { new: true });
      if(!user) return res.status(404).json({message: "User not found"});
      res.json({ message: 'OTP Verified successfully', token: generateToken(user._id) });
    } else {
      res.status(400).json({ message: 'Invalid OTP' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { phone } = req.body;
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Generate a 6-digit OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = generatedOtp;
    await user.save();
    
    // Check if Twilio is configured
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        body: `Your NeuroPulse Guard password reset OTP is: ${generatedOtp}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });
      console.log(`Sent SMS to ${phone} via Twilio.`);
      res.json({ message: 'OTP sent successfully to your phone number' });
    } else {
      // Fallback
      console.log(`Twilio not configured. Fallback -> Sending OTP ${generatedOtp} to phone number: ${phone}`);
      // Returning OTP in response ONLY for local testing purposes. Do not do this in production!
      res.json({ message: 'OTP sent successfully (Mock Mode)', mockOtp: generatedOtp });
    }
    
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { phone, otp, newPassword } = req.body;
    
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.otp = undefined; // Clear OTP after successful reset
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { profilePicBase64, upiId, qrCodeBase64 } = req.body;
    let updateData = {};
    
    if (profilePicBase64) updateData.profilePic = profilePicBase64;
    if (upiId) updateData.upiId = upiId;
    if (qrCodeBase64) updateData.upiQrCode = qrCodeBase64;

    const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true }).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
