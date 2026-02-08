import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

export default async function handler(req, res) {
  // 1. Check Environment Variables
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_SHEET_ID) {
    console.error('Missing Environment Variables');
    return res.status(500).json({ 
      error: 'Server Misconfiguration: Missing Google API Credentials', 
      details: 'Check Vercel Environment Variables' 
    });
  }

  try {
    // 2. Initialize Auth
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);

    // 3. Load Info
    await doc.loadInfo();
    
    // Determine which sheet to access
    const type = req.query.type || 'data'; 
    const sheet = doc.sheetsByTitle[type];

    if (!sheet) {
      // List available sheets for debugging
      const sheetNames = doc.sheetsByIndex.map(s => s.title);
      return res.status(404).json({ 
        error: `Sheet tab '${type}' not found`, 
        availableSheets: sheetNames 
      });
    }

    // --- GET (Read) ---
    if (req.method === 'GET') {
      const rows = await sheet.getRows();
      const data = rows.map(row => {
        const obj = row.toObject ? row.toObject() : {}; // Try v4/v5 helper
        
        // Manual fallback if toObject doesn't get everything or if using older version
        if (Object.keys(obj).length === 0) {
            sheet.headerValues.forEach(header => {
                obj[header] = row.get(header);
            });
        }
        
        // Parse JSON fields
        if (obj.history) {
            try { obj.history = JSON.parse(obj.history); } catch (e) { obj.history = []; }
        }
        // Add ID if not present in columns but present in row
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
    console.error('Google Sheet API Error:', error);
    return res.status(500).json({ 
        error: 'Internal API Error', 
        message: error.message 
    });
  }
}