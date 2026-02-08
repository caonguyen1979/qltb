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
    let rawKey = process.env.GOOGLE_PRIVATE_KEY;
    
    // --- AGGRESSIVE KEY NORMALIZATION ---
    // 1. If it looks like a JSON object (full file copy), extract the key
    if (rawKey.trim().startsWith('{')) {
      try {
        const obj = JSON.parse(rawKey);
        if (obj.private_key) rawKey = obj.private_key;
      } catch (e) {}
    }

    // 2. Remove all outer quotes (single or double) independently
    // This fixes the case where user copies " at the start but misses " at the end
    let cleanKey = rawKey.replace(/^["']+|["']+$/g, '').trim();

    // 3. Handle newlines:
    // Case A: Key is one long string with literal \n characters (common JSON copy)
    // Case B: Key has actual newlines (Vercel "return characters" warning) -> Preserve them
    cleanKey = cleanKey.replace(/\\n/g, '\n');

    // 4. Validate and Fix Header/Footer
    // Ensure the key starts exactly right. Sometimes spaces get inserted before dashes.
    const header = "-----BEGIN PRIVATE KEY-----";
    const footer = "-----END PRIVATE KEY-----";
    
    if (!cleanKey.includes(header) || !cleanKey.includes(footer)) {
       throw new Error(`Invalid Key. Must contain ${header} and ${footer}`);
    }

    // 5. Re-assemble to ensure perfect structure
    // We strip the header/footer, clean the body, and put it back together
    // This removes any weird spaces/newlines that might have broken the PEM format
    const body = cleanKey
      .replace(header, '')
      .replace(footer, '')
      .replace(/\s/g, ''); // Remove ALL whitespace from body to be safe

    // Re-add headers with correct newlines
    const finalKey = `${header}\n${body.match(/.{1,64}/g).join('\n')}\n${footer}\n`;

    console.log(`Auth Attempt: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`);

    // 2. Initialize Auth
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: finalKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);

    // 3. Load Info
    await doc.loadInfo();
    console.log(`Connected to Sheet: ${doc.title}`);
    
    const type = req.query.type || 'data'; 
    const sheet = doc.sheetsByTitle[type];

    if (!sheet) {
      const sheetNames = doc.sheetsByIndex.map(s => s.title);
      return res.status(404).json({ 
        error: `Sheet tab '${type}' not found`, 
        availableSheets: sheetNames,
        instruction: "Please rename your tabs in Google Sheets to 'data' and 'users' (lowercase)."
      });
    }

    // --- GET ---
    if (req.method === 'GET') {
      const rows = await sheet.getRows();
      const data = rows.map(row => {
        const obj = {};
        sheet.headerValues.forEach(header => {
            obj[header] = row.get(header);
        });
        if (obj.history) {
            try { obj.history = JSON.parse(obj.history); } catch (e) { obj.history = []; }
        }
        if (!obj.id && row.get('id')) obj.id = row.get('id');
        return obj;
      });
      return res.status(200).json(data);
    }

    // --- POST ---
    if (req.method === 'POST') {
      const payload = req.body;
      if (payload.history) payload.history = JSON.stringify(payload.history);
      await sheet.addRow(payload);
      return res.status(201).json({ message: 'Created', id: payload.id });
    }

    // --- PUT ---
    if (req.method === 'PUT') {
      const { id, ...updates } = req.body;
      const rows = await sheet.getRows();
      const row = rows.find(r => r.get('id') === id);
      if (!row) return res.status(404).json({ error: 'Item not found' });
      
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
    console.error('Google Sheet API CRITICAL Error:', error.message);
    return res.status(500).json({ 
        error: 'Google API Connection Failed', 
        message: error.message,
    });
  }
}