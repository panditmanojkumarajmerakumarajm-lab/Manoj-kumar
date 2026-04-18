import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Health Check for debugging external hosting
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    time: new Date().toISOString(),
    env: process.env.NODE_ENV || "not set"
  });
});

const SMM_API_URL = process.env.SMM_API_URL || "https://glorysmmpanel.com/api/v2";
const SMM_API_KEY = process.env.SMM_API_KEY || "8ecc98412894c3dbcc74523ccdb0d3938e067223";

// Firebase Config for dynamic settings
const FIREBASE_PROJECT_ID = "gen-lang-client-0848123495";
const FIREBASE_DB_ID = "ai-studio-b78eb1bc-d446-4a62-b8fa-e1deb144e16c";

// Cache for services to prevent 429 rate limit errors
let cachedServices: any[] | null = null;
let lastCacheUpdate = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

// Dynamic settings
let dynamicProfitMargin = 0.20; // Default 20%
let lastSettingsUpdate = 0;
const SETTINGS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getProfitMargin() {
  const now = Date.now();
  if (now - lastSettingsUpdate < SETTINGS_CACHE_DURATION) {
    return dynamicProfitMargin;
  }

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIREBASE_DB_ID}/documents/settings/global`;
    const response = await axios.get(url);
    const margin = response.data.fields.profitMargin.doubleValue || response.data.fields.profitMargin.integerValue;
    if (margin !== undefined) {
      dynamicProfitMargin = parseFloat(margin) / 100;
      lastSettingsUpdate = now;
      console.log(`Updated dynamic profit margin: ${dynamicProfitMargin * 100}%`);
    }
  } catch (err: any) {
    // 404 is expected if the admin hasn't saved settings yet - be quiet about it
    if (err.response?.status === 404) {
      lastSettingsUpdate = now; // Don't retry for 5 mins
      return dynamicProfitMargin;
    }
    console.error("Using default margin due to settings fetch error:", err.message);
  }
  return dynamicProfitMargin;
}

// API Routes
app.get("/api/services", async (req, res) => {
  const now = Date.now();
  
  // Return cached data if valid
  if (cachedServices && (now - lastCacheUpdate < CACHE_DURATION)) {
    return res.json(cachedServices);
  }

  try {
    const currentMargin = await getProfitMargin();
    
    // Use URLSearchParams for application/x-www-form-urlencoded (standard for SMM panels)
    const params = new URLSearchParams();
    params.append('key', SMM_API_KEY);
    params.append('action', 'services');

    const response = await axios.post(SMM_API_URL, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000 // 10s timeout
    });
    
    // Profit margin from database
    const PROFIT_PERCENT = 1 + currentMargin; 
    
    // Ensure we handle different API response formats
    let rawServices = response.data;
    if (!Array.isArray(rawServices) && rawServices.data && Array.isArray(rawServices.data)) {
      rawServices = rawServices.data;
    }
    
    let services = Array.isArray(rawServices) ? rawServices : [];
    
    // Add margin and format to 2 decimal places
    const processedServices = services.map((service: any) => {
      const originalRate = parseFloat(service.rate || "0");
      const markedUpRate = originalRate * PROFIT_PERCENT;
      
      return {
        ...service,
        rate: markedUpRate.toFixed(2)
      };
    });

    // Sort: Cheap services first (ASC)
    processedServices.sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate));

    // Update global cache
    cachedServices = processedServices;
    lastCacheUpdate = now;

    res.json(processedServices);
  } catch (error) {
    console.error("Error fetching services:", error);
    
    // If API fails but we have stale cache, return stale cache as fallback
    if (cachedServices) {
      console.log("Serving stale cache due to API error");
      return res.json(cachedServices);
    }
    
    res.status(500).json({ error: "Failed to fetch services. Please try again later." });
  }
});

app.post("/api/order", async (req, res) => {
  const { service, link, quantity } = req.body;
  try {
    const params = new URLSearchParams();
    params.append('key', SMM_API_KEY);
    params.append('action', 'add');
    params.append('service', service);
    params.append('link', link);
    params.append('quantity', quantity);

    const response = await axios.post(SMM_API_URL, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    res.json(response.data);
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ error: "Failed to place order" });
  }
});

app.get("/api/status/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const params = new URLSearchParams();
    params.append('key', SMM_API_KEY);
    params.append('action', 'status');
    params.append('order', id);

    const response = await axios.post(SMM_API_URL, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    res.json(response.data);
  } catch (error) {
    console.error("Error checking status:", error);
    res.status(500).json({ error: "Failed to check order status" });
  }
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === "production" || process.env.VITE_USER_NODE_ENV === "production";
  
  if (!isProduction) {
    console.log("Starting in DEVELOPMENT mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in PRODUCTION mode...");
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`BharatSMM Server running on http://localhost:${PORT}`);
  });
}

startServer();
