import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

export default async function handler(req, res) {
  // 1. Basic Check
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_SHEET_ID) {
    console.error('SERVER ERROR: Missing Env Vars');
    return res.status(500).json({ 
      error: 'Configuration Error', 
      details: 'Missing GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, or GOOGLE_SHEET_ID' 
    });
  }

  try {
    // 2. Clean Key Formatting
    // Problem: Sometimes users copy quotes "..." or the key has literal \n characters.
    let cleanKey = process.env.GOOGLE_PRIVATE_KEY;
    
    // Remove wrapping double quotes if they exist (common copy-paste error)
    if (cleanKey.startsWith('"') && cleanKey.endsWith('"')) {
      cleanKey = cleanKey.slice(1, -1);
    }
    
    // Replace literal escaped newlines with actual newlines
    cleanKey = cleanKey.replace(/\\n/g, '\n');

    console.log(`Attempting Auth with Email: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`);

    // 3. Initialize Auth
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: cleanKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);

    // 4. Load Info (This verifies connection)
    await doc.loadInfo();
    console.log(`Connected to Sheet: ${doc.title}`);
    
    // Determine which sheet to access
    const type = req.query.type || 'data'; 
    const sheet = doc.sheetsByTitle[type];

    if (!sheet) {
      const sheetNames = doc.sheetsByIndex.map(s => s.title);
      console.error(`Sheet '${type}' not found. Available: ${sheetNames.join(', ')}`);
      return res.status(404).json({ 
        error: `Sheet tab '${type}' not found`, 
        availableSheets: sheetNames,
        instruction: "Please rename your tabs in Google Sheets exactly to 'data' and 'users' (lowercase)."
      });
    }

    // --- GET (Read) ---
    if (req.method === 'GET') {
      const rows = await sheet.getRows();
      const data = rows.map(row => {
        const obj = {};
        // Robust header extraction
        sheet.headerValues.forEach(header => {
            obj[header] = row.get(header);
        });
        
        // Helper for specific fields
        if (obj.history) {
            try { obj.history = JSON.parse(obj.history); } catch (e) { obj.history = []; }
        }
        if (!obj.id && row.get('id')) obj.id = row.get('id');
        
        return obj;
      });
      return res.status(200).json(data);
    }

    // --- POST (Create) ---
    if (req.method === 'POST') {
      const payload = req.body;
      if (payload.history) payload.history = JSON.stringify(payload.history);
      
      await sheet.addRow(payload);
      return res.status(201).json({ message: 'Created', id: payload.id });
    }

    // --- PUT (Update) ---
    if (req.method === 'PUT') {
      const { id, ...updates } = req.body;
      const rows = await sheet.getRows();
      const row = rows.find(r => r.get('id') === id);

      if (!row) return res.status(404).json({ error: 'Item not found' });

      // Update fields
      Object.keys(updates).forEach(key => {
        let value = updates[key];
        if (key === 'history') value = JSON.stringify(value);
        row.assign({ [key]: value });
      });

      await row.save();
      return res.status(200).json({ message: 'Updated' });
    }

    // --- DELETE ---
    if (req.method === 'DELETE') {
      const { id } = req.query;
      const rows = await sheet.getRows();
      const row = rows.find(r => r.get('id') === id);

      if (row) {
        await row.delete();
        return res.status(200).json({ message: 'Deleted' });
      }
      return res.status(404).json({ error: 'Item not found' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Google Sheet API CRITICAL Error:', error);
    // Return the actual error message to the frontend for debugging
    return res.status(500).json({ 
        error: 'Google API Connection Failed', 
        message: error.message,
        stack: error.stack // Warning: exposed only for debugging, remove in production later
    });
  }
}