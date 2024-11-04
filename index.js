import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const app = express();
app.use(express.static('public'));
const upload = multer({ dest: 'uploads/' });
const PORT = process.env.PORT || 3000;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Connect to MongoDB
await mongoose.connect(process.env.MONGODB_URI);

const yearbookSchema = new mongoose.Schema({
  imageUrl: String,
  name: String,
  nickname: String,
  birthday: String,
  state: String,
  hobbies: String,
  businessVentures: String,
  xHandle: String,
  igHandle: String,
  snapHandle: String,
  whatsapp: String,
  shoutOuts: String,
  careerUpdates: String,
});

const Yearbook = mongoose.model('Yearbook', yearbookSchema);

// Serve HTML form
app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Yearbook Upload</title>
        <link rel="stylesheet" href="/styles.css">
      </head>
      <body>
        <div class="container">
          <h1>Upload Yearbook Image & Info</h1>
          <form action="/upload" method="post" enctype="multipart/form-data">
            <input type="file" name="file" required />
            <input type="text" name="name" placeholder="Enter your name" required />
            <input type="text" name="nickname" placeholder="Enter your nickname" required />
            <input type="text" name="birthday" placeholder="Enter your birthday" required />
            <input type="text" name="state" placeholder="Enter your state" required />
            <input type="text" name="hobbies" placeholder="Enter your hobbies" required />
            <input type="text" name="businessVentures" placeholder="Enter your business ventures" />
            <input type="text" name="xHandle" placeholder="Enter your X (Twitter) handle" />
            <input type="text" name="igHandle" placeholder="Enter your Instagram handle" />
            <input type="text" name="snapHandle" placeholder="Enter your Snapchat handle" />
            <input type="text" name="whatsapp" placeholder="Enter your WhatsApp number" />
            <input type="text" name="shoutOuts" placeholder="Enter your shoutouts" />
            <input type="text" name="careerUpdates" placeholder="Enter your career updates" />
            <button type="submit">Upload</button>
          </form>
        </div>
      </body>
      </html>
    `);
  });
  

// Handle file upload and save to Cloudinary and MongoDB
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const filePath = req.file.path;

    // Upload image to Cloudinary
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'yearbook_images',
    });

    // Save image URL and form data to MongoDB
    const newEntry = new Yearbook({
      imageUrl: result.secure_url,
      name: req.body.name,
      nickname: req.body.nickname,
      birthday: req.body.birthday,
      state: req.body.state,
      hobbies: req.body.hobbies,
      businessVentures: req.body.businessVentures,
      xHandle: req.body.xHandle,
      igHandle: req.body.igHandle,
      snapHandle: req.body.snapHandle,
      whatsapp: req.body.whatsapp,
      shoutOuts: req.body.shoutOuts,
      careerUpdates: req.body.careerUpdates,
    });
    await newEntry.save();

    // Delete local file after upload
    fs.unlinkSync(filePath);

    res.send(`File uploaded successfully! Image URL: ${result.secure_url}`);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).send('Error uploading file');
  }
});

app.get('/entries', async (req, res) => {
  try {
    const entries = await Yearbook.find();
    res.json(entries);
  } catch (error) {
    console.error('Error fetching entries:', error);
    res.status(500).send('Error fetching entries');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
