const express = require('express')
const app = express()
const cors = require('cors')
const session = require('express-session')
const MongoStore = require('connect-mongo')
const port = process.env.PORT || 3000;
require('dotenv').config()

// Import security configurations
const {
  securityMiddleware,
  sessionConfig,
  logAuditEvent
} = require('./config/security');

// Import authentication middleware
const {
  authenticateUser,
  optionalAuth,
  requireRole,
  authRateLimiter,
  apiRateLimiter,
  sanitizeInput
} = require('./middleware/auth');

// Import security headers middleware
const securityHeaders = require('./middleware/securityHeaders');
const requestLogger = require('./middleware/requestLogger');

// Apply security middleware
app.use(securityMiddleware.helmet);
app.use(securityMiddleware.xssClean);
app.use(securityMiddleware.hpp);
app.use(securityMiddleware.mongoSanitize);
app.use(securityHeaders);
app.use(requestLogger);

// CORS configuration
app.use(cors({
  origin: ["http://localhost:5173", "https://mern-job-portal-website.vercel.app"],
  methods: ["POST", "GET", "PUT", "DELETE", "PATCH"],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
const sessionConfigWithStore = {
  ...sessionConfig,
  store: MongoStore.create({
    mongoUrl: process.env.DB_URI
  })
};

app.use(session(sessionConfigWithStore));

// Input sanitization
app.use(sanitizeInput);

// Global rate limiting
app.use(securityMiddleware.rateLimiter);

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Job Portal API is running!')
})

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = process.env.DB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: true,
  }
});

// Database middleware
const dbMiddleware = (req, res, next) => {
  req.db = client.db("mernJobPortal");
  next();
};

app.use(dbMiddleware);

async function run() {
  try {
    // Connect the client to the server
    await client.connect();

    // Create Database
    const db = client.db("mernJobPortal");
    const jobsCollections = db.collection("demoJobs");
    const usersCollection = db.collection("users");
    const applicationsCollection = db.collection("applications");
    const auditLogsCollection = db.collection("auditLogs");

    // Create indexes for better performance
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await usersCollection.createIndex({ "passwordHistory.createdAt": 1 });
    await jobsCollections.createIndex({ postedBy: 1 });
    await jobsCollections.createIndex({ jobTitle: 1 });
    await jobsCollections.createIndex({ companyName: 1 });
    await jobsCollections.createIndex({ description: 1 });
    await applicationsCollection.createIndex({ jobId: 1 });
    await applicationsCollection.createIndex({ applicantEmail: 1 });
    await auditLogsCollection.createIndex({ userId: 1, timestamp: -1 });
    await auditLogsCollection.createIndex({ action: 1, timestamp: -1 });

    // Seed data function
    const seedData = async () => {
      try {
        // Check if data already exists
        const existingJobs = await jobsCollections.countDocuments();
        if (existingJobs > 0) {
          console.log('Data already seeded');
          return;
        }

        const seedJobs = [
          {
            companyName: "Google",
            jobTitle: "Senior Software Engineer",
            companyLogo: "https://logo.clearbit.com/google.com",
            minPrice: "120000",
            maxPrice: "180000",
            salaryType: "Yearly",
            jobLocation: "Mountain View, CA",
            postingDate: "2024-01-15",
            experienceLevel: "Experienced",
            employmentType: "Full-Time",
            description: "Join Google's engineering team to build scalable solutions that impact millions of users worldwide. Work on cutting-edge technologies and collaborate with world-class engineers.",
            skills: ["JavaScript", "React", "Node.js", "Python", "Go"],
            postedBy: "hr@google.com",
            createAt: new Date()
          },
          {
            companyName: "Microsoft",
            jobTitle: "Frontend Developer",
            companyLogo: "https://logo.clearbit.com/microsoft.com",
            minPrice: "90000",
            maxPrice: "140000",
            salaryType: "Yearly",
            jobLocation: "Seattle, WA",
            postingDate: "2024-01-20",
            experienceLevel: "Experienced",
            employmentType: "Full-Time",
            description: "Build beautiful and responsive user interfaces for Microsoft's next-generation products. Work with modern frameworks and contribute to open-source projects.",
            skills: ["React", "TypeScript", "CSS", "HTML", "JavaScript"],
            postedBy: "careers@microsoft.com",
            createAt: new Date()
          },
          {
            companyName: "Apple",
            jobTitle: "iOS Developer",
            companyLogo: "https://logo.clearbit.com/apple.com",
            minPrice: "110000",
            maxPrice: "160000",
            salaryType: "Yearly",
            jobLocation: "Cupertino, CA",
            postingDate: "2024-01-25",
            experienceLevel: "Experienced",
            employmentType: "Full-Time",
            description: "Create innovative iOS applications that delight millions of users. Work on the latest iOS technologies and contribute to Apple's ecosystem.",
            skills: ["Swift", "Objective-C", "iOS", "Xcode", "UIKit"],
            postedBy: "jobs@apple.com",
            createAt: new Date()
          },
          {
            companyName: "Netflix",
            jobTitle: "Backend Engineer",
            companyLogo: "https://logo.clearbit.com/netflix.com",
            minPrice: "130000",
            maxPrice: "190000",
            salaryType: "Yearly",
            jobLocation: "Los Gatos, CA",
            postingDate: "2024-01-30",
            experienceLevel: "Experienced",
            employmentType: "Full-Time",
            description: "Build scalable backend services that power Netflix's global streaming platform. Work on high-performance systems that serve millions of users.",
            skills: ["Java", "Spring Boot", "AWS", "Microservices", "Docker"],
            postedBy: "engineering@netflix.com",
            createAt: new Date()
          },
          {
            companyName: "Amazon",
            jobTitle: "DevOps Engineer",
            companyLogo: "https://logo.clearbit.com/amazon.com",
            minPrice: "100000",
            maxPrice: "150000",
            salaryType: "Yearly",
            jobLocation: "Seattle, WA",
            postingDate: "2024-02-01",
            experienceLevel: "Experienced",
            employmentType: "Full-Time",
            description: "Automate and optimize infrastructure deployment processes. Work with AWS services and implement CI/CD pipelines for large-scale applications.",
            skills: ["AWS", "Docker", "Kubernetes", "Terraform", "Jenkins"],
            postedBy: "aws-jobs@amazon.com",
            createAt: new Date()
          },
          {
            companyName: "Meta",
            jobTitle: "Data Scientist",
            companyLogo: "https://logo.clearbit.com/meta.com",
            minPrice: "120000",
            maxPrice: "170000",
            salaryType: "Yearly",
            jobLocation: "Menlo Park, CA",
            postingDate: "2024-02-05",
            experienceLevel: "Experienced",
            employmentType: "Full-Time",
            description: "Analyze large-scale data to drive product decisions and improve user experience. Work with cutting-edge ML models and big data technologies.",
            skills: ["Python", "R", "SQL", "Machine Learning", "TensorFlow"],
            postedBy: "data-science@meta.com",
            createAt: new Date()
          },
          {
            companyName: "Uber",
            jobTitle: "Mobile Developer",
            companyLogo: "https://logo.clearbit.com/uber.com",
            minPrice: "95000",
            maxPrice: "140000",
            salaryType: "Yearly",
            jobLocation: "San Francisco, CA",
            postingDate: "2024-02-10",
            experienceLevel: "Experienced",
            employmentType: "Full-Time",
            description: "Build mobile applications that connect millions of riders and drivers worldwide. Work on location services and real-time features.",
            skills: ["React Native", "JavaScript", "iOS", "Android", "TypeScript"],
            postedBy: "mobile-jobs@uber.com",
            createAt: new Date()
          },
          {
            companyName: "Airbnb",
            jobTitle: "Full Stack Developer",
            companyLogo: "https://logo.clearbit.com/airbnb.com",
            minPrice: "110000",
            maxPrice: "160000",
            salaryType: "Yearly",
            jobLocation: "San Francisco, CA",
            postingDate: "2024-02-15",
            experienceLevel: "Experienced",
            employmentType: "Full-Time",
            description: "Build end-to-end features for Airbnb's platform. Work on both frontend and backend to create seamless user experiences.",
            skills: ["React", "Node.js", "PostgreSQL", "Redis", "TypeScript"],
            postedBy: "engineering@airbnb.com",
            createAt: new Date()
          },
          {
            companyName: "Spotify",
            jobTitle: "Backend Developer",
            companyLogo: "https://logo.clearbit.com/spotify.com",
            minPrice: "100000",
            maxPrice: "150000",
            salaryType: "Yearly",
            jobLocation: "Stockholm, Sweden",
            postingDate: "2024-02-20",
            experienceLevel: "Experienced",
            employmentType: "Full-Time",
            description: "Develop scalable backend services for Spotify's music streaming platform. Work on recommendation algorithms and audio processing.",
            skills: ["Java", "Kotlin", "Spring", "Kafka", "Cassandra"],
            postedBy: "backend-jobs@spotify.com",
            createAt: new Date()
          },
          {
            companyName: "Stripe",
            jobTitle: "Security Engineer",
            companyLogo: "https://logo.clearbit.com/stripe.com",
            minPrice: "130000",
            maxPrice: "180000",
            salaryType: "Yearly",
            jobLocation: "San Francisco, CA",
            postingDate: "2024-02-25",
            experienceLevel: "Experienced",
            employmentType: "Full-Time",
            description: "Protect Stripe's payment infrastructure and customer data. Implement security best practices and respond to security incidents.",
            skills: ["Security", "Python", "Go", "AWS", "Docker"],
            postedBy: "security@stripe.com",
            createAt: new Date()
          },
          {
            companyName: "Slack",
            jobTitle: "Frontend Engineer",
            companyLogo: "https://logo.clearbit.com/slack.com",
            minPrice: "110000",
            maxPrice: "160000",
            salaryType: "Yearly",
            jobLocation: "San Francisco, CA",
            postingDate: "2024-03-01",
            experienceLevel: "Experienced",
            employmentType: "Full-Time",
            description: "Build intuitive user interfaces for Slack's communication platform. Work on real-time features and collaborative tools.",
            skills: ["React", "TypeScript", "Redux", "WebSockets", "CSS"],
            postedBy: "frontend@slack.com",
            createAt: new Date()
          },
          {
            companyName: "GitHub",
            jobTitle: "Platform Engineer",
            companyLogo: "https://logo.clearbit.com/github.com",
            minPrice: "120000",
            maxPrice: "170000",
            salaryType: "Yearly",
            jobLocation: "San Francisco, CA",
            postingDate: "2024-03-05",
            experienceLevel: "Experienced",
            employmentType: "Full-Time",
            description: "Build and maintain GitHub's platform infrastructure. Work on scalability, performance, and developer experience.",
            skills: ["Go", "Ruby", "MySQL", "Redis", "Kubernetes"],
            postedBy: "platform@github.com",
            createAt: new Date()
          }
        ];

        const seedUsers = [
          {
            email: "hr@google.com",
            name: "Google HR",
            role: "employer",
            company: "Google",
            password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.gS.O6", // hashed password
            isVerified: true,
            verifiedAt: new Date(),
            passwordHistory: [{
              password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.gS.O6",
              createdAt: new Date()
            }],
            loginAttempts: 0,
            lockUntil: null,
            lastLogin: null,
            createAt: new Date()
          },
          {
            email: "careers@microsoft.com",
            name: "Microsoft Recruiter",
            role: "employer",
            company: "Microsoft",
            password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.gS.O6",
            isVerified: true,
            verifiedAt: new Date(),
            passwordHistory: [{
              password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.gS.O6",
              createdAt: new Date()
            }],
            loginAttempts: 0,
            lockUntil: null,
            lastLogin: null,
            createAt: new Date()
          },
          {
            email: "jobs@apple.com",
            name: "Apple HR",
            role: "employer",
            company: "Apple",
            password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.gS.O6",
            isVerified: true,
            verifiedAt: new Date(),
            passwordHistory: [{
              password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.gS.O6",
              createdAt: new Date()
            }],
            loginAttempts: 0,
            lockUntil: null,
            lastLogin: null,
            createAt: new Date()
          },
          {
            email: "engineering@netflix.com",
            name: "Netflix Engineering",
            role: "employer",
            company: "Netflix",
            password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.gS.O6",
            isVerified: true,
            verifiedAt: new Date(),
            passwordHistory: [{
              password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.gS.O6",
              createdAt: new Date()
            }],
            loginAttempts: 0,
            lockUntil: null,
            lastLogin: null,
            createAt: new Date()
          },
          {
            email: "aws-jobs@amazon.com",
            name: "Amazon AWS",
            role: "employer",
            company: "Amazon",
            password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.gS.O6",
            isVerified: true,
            verifiedAt: new Date(),
            passwordHistory: [{
              password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.gS.O6",
              createdAt: new Date()
            }],
            loginAttempts: 0,
            lockUntil: null,
            lastLogin: null,
            createAt: new Date()
          },
          {
            email: "data-science@meta.com",
            name: "Meta Data Science",
            role: "employer",
            company: "Meta",
            password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.gS.O6",
            isVerified: true,
            verifiedAt: new Date(),
            passwordHistory: [{
              password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.gS.O6",
              createdAt: new Date()
            }],
            loginAttempts: 0,
            lockUntil: null,
            lastLogin: null,
            createAt: new Date()
          },
          {
            email: "mobile-jobs@uber.com",
            name: "Uber Mobile",
            role: "employer",
            company: "Uber",
            password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.gS.O6",
            isVerified: true,
            verifiedAt: new Date(),
            passwordHistory: [{
              password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.gS.O6",
              createdAt: new Date()
            }],
            loginAttempts: 0,
            lockUntil: null,
            lastLogin: null,
            createAt: new Date()
          },
          {
            email: "engineering@airbnb.com",
            name: "Airbnb Engineering",
            role: "employer",
            company: "Airbnb",
            password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.gS.O6",
            isVerified: true,
            verifiedAt: new Date(),
            passwordHistory: [{
              password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.gS.O6",
              createdAt: new Date()
            }],
            loginAttempts: 0,
            lockUntil: null,
            lastLogin: null,
            createAt: new Date()
          },
          {
            email: "backend-jobs@spotify.com",
            name: "Spotify Backend",
            role: "employer",
            company: "Spotify",
            password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.gS.O6",
            isVerified: true,
            verifiedAt: new Date(),
            passwordHistory: [{
              password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.gS.O6",
              createdAt: new Date()
            }],
            loginAttempts: 0,
            lockUntil: null,
            lastLogin: null,
            createAt: new Date()
          },
          {
            email: "security@stripe.com",
            name: "Stripe Security",
            role: "employer",
            company: "Stripe",
            password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.gS.O6",
            isVerified: true,
            verifiedAt: new Date(),
            passwordHistory: [{
              password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.gS.O6",
              createdAt: new Date()
            }],
            loginAttempts: 0,
            lockUntil: null,
            lastLogin: null,
            createAt: new Date()
          },
          {
            email: "frontend@slack.com",
            name: "Slack Frontend",
            role: "employer",
            company: "Slack",
            password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.gS.O6",
            isVerified: true,
            verifiedAt: new Date(),
            passwordHistory: [{
              password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.gS.O6",
              createdAt: new Date()
            }],
            loginAttempts: 0,
            lockUntil: null,
            lastLogin: null,
            createAt: new Date()
          },
          {
            email: "platform@github.com",
            name: "GitHub Platform",
            role: "employer",
            company: "GitHub",
            password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.gS.O6",
            isVerified: true,
            verifiedAt: new Date(),
            passwordHistory: [{
              password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.gS.O6",
              createdAt: new Date()
            }],
            loginAttempts: 0,
            lockUntil: null,
            lastLogin: null,
            createAt: new Date()
          }
        ];

        // Insert seed data
        await jobsCollections.insertMany(seedJobs);
        await usersCollection.insertMany(seedUsers);
        
        console.log('Seed data inserted successfully');
      } catch (error) {
        console.error('Error seeding data:', error);
      }
    };

    // Run seed data
    await seedData();

    // Import and use authentication routes
    const authRoutes = require('./routes/auth');
    const securityRoutes = require('./routes/security');
    app.use('/api/auth', authRateLimiter, authRoutes);
    app.use('/api/security', securityRoutes);

    // Job APIs with security
    app.post("/api/jobs", authenticateUser, requireRole(['employer']), async (req, res) => {
      try {
        const body = req.body;
        body.createAt = new Date();
        body.postedBy = req.user.email;
        
        const result = await jobsCollections.insertOne(body);
        
        if (result.insertedId) {
          // Log audit event
          logAuditEvent(
            req.user.userId,
            'JOB_CREATED',
            { jobId: result.insertedId, jobTitle: body.jobTitle },
            req.ip,
            req.get('User-Agent')
          );

          res.status(201).json({
            message: "Job posted successfully",
            jobId: result.insertedId
          });
        } else {
          res.status(500).json({ message: "Failed to post job" });
        }
      } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
      }
    });

    app.get("/api/jobs", optionalAuth, async (req, res) => {
      try {
        const { page = 1, limit = 10, search, location, type, experience } = req.query;
        const skip = (page - 1) * limit;
        
        let filter = {};
        
        if (search) {
          filter.$or = [
            { jobTitle: { $regex: search, $options: 'i' } },
            { companyName: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
          ];
        }
        
        if (location) {
          filter.jobLocation = { $regex: location, $options: 'i' };
        }
        
        if (type) {
          filter.employmentType = type;
        }
        
        if (experience) {
          filter.experienceLevel = experience;
        }

        const jobs = await jobsCollections.find(filter)
          .sort({ createAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();
        
        const total = await jobsCollections.countDocuments(filter);
        
        res.json({
          jobs,
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / limit)
        });
      } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
      }
    });

    app.get("/api/jobs/:id", optionalAuth, async (req, res) => {
      try {
        const { id } = req.params;
        const job = await jobsCollections.findOne({ _id: new ObjectId(id) });
        
        if (job) {
          res.json(job);
        } else {
          res.status(404).json({ message: "Job not found" });
        }
      } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
      }
    });

    app.put("/api/jobs/:id", authenticateUser, requireRole(['employer']), async (req, res) => {
      try {
        const { id } = req.params;
        const updateData = req.body;
        
        const job = await jobsCollections.findOne({ _id: new ObjectId(id) });
        if (!job) {
          return res.status(404).json({ message: "Job not found" });
        }
        
        if (job.postedBy !== req.user.email) {
          return res.status(403).json({ message: "Not authorized to update this job" });
        }
        
        const result = await jobsCollections.updateOne(
          { _id: new ObjectId(id) },
          { $set: { ...updateData, updatedAt: new Date() } }
        );
        
        if (result.modifiedCount > 0) {
          // Log audit event
          logAuditEvent(
            req.user.userId,
            'JOB_UPDATED',
            { jobId: id, jobTitle: updateData.jobTitle },
            req.ip,
            req.get('User-Agent')
          );

          res.json({ message: "Job updated successfully" });
        } else {
          res.status(500).json({ message: "Failed to update job" });
        }
      } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
      }
    });

    app.delete("/api/jobs/:id", authenticateUser, requireRole(['employer']), async (req, res) => {
      try {
        const { id } = req.params;
        
        const job = await jobsCollections.findOne({ _id: new ObjectId(id) });
        if (!job) {
          return res.status(404).json({ message: "Job not found" });
        }
        
        if (job.postedBy !== req.user.email) {
          return res.status(403).json({ message: "Not authorized to delete this job" });
        }
        
        const result = await jobsCollections.deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount > 0) {
          // Log audit event
          logAuditEvent(
            req.user.userId,
            'JOB_DELETED',
            { jobId: id, jobTitle: job.jobTitle },
            req.ip,
            req.get('User-Agent')
          );

          res.json({ message: "Job deleted successfully" });
        } else {
          res.status(500).json({ message: "Failed to delete job" });
        }
      } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
      }
    });

    app.get("/api/jobs/user/:email", authenticateUser, async (req, res) => {
      try {
        const { email } = req.params;
        const jobs = await jobsCollections.find({ postedBy: email }).toArray();
        res.json(jobs);
      } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
      }
    });

    // Application APIs with security
    app.post("/api/applications", authenticateUser, requireRole(['jobseeker']), async (req, res) => {
      try {
        const { jobId, resumeLink, coverLetter } = req.body;
        
        const application = {
          jobId: new ObjectId(jobId),
          applicantEmail: req.user.email,
          applicantName: req.user.name,
          resumeLink,
          coverLetter,
          status: "pending",
          appliedAt: new Date()
        };
        
        const result = await applicationsCollection.insertOne(application);
        
        if (result.insertedId) {
          // Log audit event
          logAuditEvent(
            req.user.userId,
            'APPLICATION_SUBMITTED',
            { jobId, applicationId: result.insertedId },
            req.ip,
            req.get('User-Agent')
          );

          res.status(201).json({
            message: "Application submitted successfully",
            applicationId: result.insertedId
          });
        } else {
          res.status(500).json({ message: "Failed to submit application" });
        }
      } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
      }
    });

    app.get("/api/applications/job/:jobId", authenticateUser, requireRole(['employer']), async (req, res) => {
      try {
        const { jobId } = req.params;
        const applications = await applicationsCollection.find({ 
          jobId: new ObjectId(jobId) 
        }).toArray();
        res.json(applications);
      } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
      }
    });

    app.get("/api/applications/applicant/:email", authenticateUser, async (req, res) => {
      try {
        const { email } = req.params;
        const applications = await applicationsCollection.find({ applicantEmail: email }).toArray();
        res.json(applications);
      } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
      }
    });

    app.patch("/api/applications/:id/status", authenticateUser, requireRole(['employer']), async (req, res) => {
      try {
        const { id } = req.params;
        const { status } = req.body;
        
        const result = await applicationsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status, updatedAt: new Date() } }
        );
        
        if (result.modifiedCount > 0) {
          // Log audit event
          logAuditEvent(
            req.user.userId,
            'APPLICATION_STATUS_UPDATED',
            { applicationId: id, status },
            req.ip,
            req.get('User-Agent')
          );

          res.json({ message: "Application status updated successfully" });
        } else {
          res.status(500).json({ message: "Failed to update application status" });
        }
      } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
      }
    });

    // Legacy endpoints for backward compatibility
    app.post("/post-job", async(req, res) => {
      const body = req.body;
      body.createAt = new Date();
      const result = await jobsCollections.insertOne(body);
      if(result.insertedId){
        return res.status(200).send(result);
        }else{
          return res.status(404).send({
            message: "Failed to post job! Try again later",
            status: false
          })
      }
    })

    app.get("/all-jobs", async(req, res) => {
      const jobs = await jobsCollections.find({}).toArray()
      res.send(jobs);
    })

    app.get("/all-jobs/:id", async(req, res) => {
      const id = req.params.id;
      const job = await jobsCollections.findOne({
        _id: new ObjectId(id)
      })
      res.send(job)
    })

    app.get("/myJobs/:email", async(req, res) => {
      const jobs = await jobsCollections.find({postedBy : req.params.email}).toArray();
      res.send(jobs)
    })

    app.delete("/job/:id", async(req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const result = await jobsCollections.deleteOne(filter);
      res.send(result)
    })

    app.patch("/update-job/:id", async(req, res) => {
      const id = req.params.id;
      const jobData = req.body;
      const filter = {_id: new ObjectId(id)};
      const options = { upsert: true};
      const updateDoc = {
        $set: {
          ...jobData
        },
    };
    const result = await jobsCollections.updateOne(filter, updateDoc, options);
    res.send(result)
  })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Job Portal API listening on port ${port}`)
})
