const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')

const userSchema = new mongoose.Schema({
  name: {
    type: String, required: true, trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: v => v.endsWith('@gmail.com'),
      message: 'Solo correos @gmail.com'
    }
  },
  password: {
    type: String, required: true, minlength: 6
  },
  role: {
    type: String,
    enum: ['administrador','vendedor','cliente'],
    default: 'cliente'
  }
})

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
  next()
})

module.exports = mongoose.model('User', userSchema)