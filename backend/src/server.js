import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import pdfRoutes from './routes/pdf.js';
import questionRoutes from './routes/questions.js';
import metricsRoutes from './routes/metrics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

app.use('/uploads', express.static('uploads'));

app.use('/api/pdf', upload.single('pdf'), pdfRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/metrics', metricsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message 
  });
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  
  // Clean up old processing jobs on startup
  import('./services/jobService.js').then(({ jobService }) => {
    jobService.cleanupOldJobs(7); // Clean jobs older than 7 days
  });
});

// Increase server timeout for long-running operations
const requestTimeout = parseInt(process.env.REQUEST_TIMEOUT) || 600000; // 10 minutes default
server.timeout = requestTimeout;
server.keepAliveTimeout = 65000; // Keep alive connections
server.headersTimeout = 66000; // Slightly longer than keep-alive

console.log(`Request timeout set to: ${requestTimeout}ms (${Math.round(requestTimeout/60000)} minutes)`);