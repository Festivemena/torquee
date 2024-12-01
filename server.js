import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import mongooseSequence from 'mongoose-sequence'; // Correctly import mongoose-sequence
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const port = 5000;

// Middleware
app.use(bodyParser.json());

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Set up multer storage with Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'voting-system/candidates', // Folder name in Cloudinary
    allowed_formats: ['jpg', 'png', 'jpeg'], // Allowed image formats
  },
});

const upload = multer({ storage: storage });

// Connect to MongoDB using the URI from the .env file
mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('Failed to connect to MongoDB', err);
});

// Add auto-increment feature for user ID (after mongoose is initialized)
const AutoIncrement = mongooseSequence(mongoose);  // Pass mongoose to mongoose-sequence

// Define Mongoose schemas for candidates and users
const candidateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sex: { type: String, required: true }, // "Male", "Female", etc.
  category: { type: String, required: true }, // e.g., "President", "Governor", etc.
  image: { type: String }, // URL of the image hosted on Cloudinary
  party: { type: String, required: true }, // Party the candidate belongs to
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  voted: { type: Boolean, default: false },
});

// Add auto-increment feature for user ID (after mongoose is initialized)
userSchema.plugin(AutoIncrement, { inc_field: 'id' }); // Adds auto-incrementing "id"

// Models
const Candidate = mongoose.model('Candidate', candidateSchema);
const User = mongoose.model('User', userSchema);

// CRUD Operations for Candidates with image upload
app.post('/candidates', upload.single('image'), async (req, res) => {
  const { name, sex, category, party } = req.body;
  const imageUrl = req.file ? req.file.path : ''; // Image URL returned by Cloudinary

  try {
    const candidate = new Candidate({ name, sex, category, party, image: imageUrl });
    await candidate.save();
    res.status(201).json(candidate);
  } catch (err) {
    res.status(400).json({ error: 'Failed to add candidate' });
  }
});

app.get('/candidates', async (req, res) => {
  try {
    const candidates = await Candidate.find();
    res.status(200).json(candidates);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

app.put('/candidates/:id', upload.single('image'), async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const updatedData = req.body;
    if (req.file) {
      updatedData.image = req.file.path; // If new image uploaded, update the image URL
    }

    const updatedCandidate = await Candidate.findByIdAndUpdate(req.params.id, updatedData, { new: true });
    res.status(200).json(updatedCandidate);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update candidate' });
  }
});

app.delete('/candidates/:id', async (req, res) => {
  try {
    const candidate = await Candidate.findByIdAndDelete(req.params.id);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    res.status(200).json({ message: 'Candidate deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete candidate' });
  }
});

// CRUD Operations for Users with auto-increment ID
app.post('/users', async (req, res) => {
  const { name, email } = req.body;
  try {
    const user = new User({ name, email });
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: 'Failed to register user' });
  }
});

app.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.put('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
