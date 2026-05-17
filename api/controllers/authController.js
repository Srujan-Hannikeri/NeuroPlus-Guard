const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const twilio = require('twilio');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
};

exports.register = async (req, res) => {
  try {
    const { name, phone, password, role, specialization, upiId, age, bloodGroup } = req.body;

    const userExists = await User.findOne({ phone });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name, phone, password: hashedPassword, role,
      specialization, upiId, age, bloodGroup,
      isVerified: false // Needs OTP
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      message: 'User registered. Please verify OTP.'
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
