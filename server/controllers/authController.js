const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.register = async (req, res) => {
  try {
    const { username, password } = req.body; // any "role" sent by the browser is ignored on purpose

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please provide username and password' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Username already exists' });
    }

    // SECURITY: public sign-up always creates a MANAGER.
    // Admins are created only by the seed script (or promoted by an existing admin), never by sign-up.
    const newUser = new User({ username, password, role: 'manager' });
    await newUser.save();

    res.status(201).json({
      success: true,
      data: { username: newUser.username, role: newUser.role },
      message: 'User registered successfully'
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.login = async (req, res) => {
  try {
    const { username, password } = req.body; // the role comes from the database, not from the browser

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please provide username and password' });
    }

    // Same message for "no such user" and "wrong password", so nobody can find out which usernames exist
    const user = await User.findOne({ username });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    // Sign JWT
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(200).json({ 
      success: true, 
      data: { token, username: user.username, role: user.role }, 
      message: 'Logged in successfully' 
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};