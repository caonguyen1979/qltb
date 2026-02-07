import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

// Initialize Auth - THIS RUNS ON SERVER ONLY
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);

export default async function handler(req, res) {
  try {
    await doc.loadInfo();
    
    // Determine which sheet to access based on query param ?type=users or ?type=devices
    const type = req.query.type || 'data'; // 'data' matches the sheet name for devices
    const sheet = doc.sheetsByTitle[type];

    if (!sheet) {
      return res.status(404).json({ error: `Sheet '${type}' not found` });
    }

    // --- GET (Read) ---
    if (req.method === 'GET') {
      const rows = await sheet.getRows();
      // Convert rows to JSON objects
      const data = rows.map(row => {
        const obj = {};
        sheet.headerValues.forEach(header => {
          obj[header] = row.get(header);
        });
        
        // Parse JSON fields (like history)
        if (obj.history) {
            try { obj.history = JSON.parse(obj.history); } catch (e) { obj.history = []; }
        }
        return obj;
      });
      return res.status(200).json(data);
    }

    // --- POST (Create) ---
    if (req.method === 'POST') {
      const payload = req.body;
      // Stringify complex objects before saving
      if (payload.history) payload.history = JSON.stringify(payload.history);
      
      const row = await sheet.addRow(payload);
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
    console.error('Google Sheet Error:', error);
    return res.status(500).json({ error: error.message });
  }
}