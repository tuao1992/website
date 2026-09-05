import { Router } from 'express';
import multer from 'multer';
import { config } from '../config.js';
import { validateGstin } from '../lib/gstin.js';
import { parseUpload } from '../services/fileParser.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes, files: 1 },
});

export const uploadRouter: Router = Router();

/**
 * Accept a CSV / TSV / TXT / XLSX file and return the GSTIN candidates found in it,
 * already annotated with offline validation so the UI can preview before looking up.
 */
uploadRouter.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'NO_FILE', message: 'Attach a CSV, TSV, TXT or XLSX file in the "file" field.' });
    return;
  }

  try {
    const parsed = await parseUpload(req.file.originalname, req.file.mimetype, req.file.buffer);
    const items = parsed.candidates.map((candidate) => {
      const check = validateGstin(candidate);
      return { gstin: check.gstin, valid: check.valid, errors: check.errors, warnings: check.warnings };
    });

    res.json({
      filename: req.file.originalname,
      strategy: parsed.strategy,
      column: parsed.column ?? null,
      sheets: parsed.sheets ?? null,
      rowsScanned: parsed.rowsScanned,
      total: items.length,
      validCount: items.filter((item) => item.valid).length,
      invalidCount: items.filter((item) => !item.valid).length,
      candidates: parsed.candidates,
      items,
    });
  } catch (error) {
    res.status(422).json({
      error: 'PARSE_FAILED',
      message: error instanceof Error ? error.message : 'Could not read the uploaded file',
    });
  }
});
