const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const mdPath = path.resolve(__dirname, '..', 'NeuroPlus-Guard_Detailed_Function_Docs.md');
const outPath = path.resolve(__dirname, '..', 'NeuroPlus-Guard_Detailed_Function_Docs.pdf');

if (!fs.existsSync(mdPath)) {
  console.error('Markdown source not found:', mdPath);
  process.exit(1);
}

const text = fs.readFileSync(mdPath, 'utf8');

function writePdf(text, outPath) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  doc.font('Times-Roman').fontSize(14).text('NeuroPlus-Guard — Detailed Function & Module Reference', { align: 'center' });
  doc.moveDown();

  const lines = text.split(/\r?\n/);
  doc.fontSize(10).font('Times-Roman');

  lines.forEach(line => {
    // Simple formatting for headings
    if (/^#{1,6}\s/.test(line)) {
      const clean = line.replace(/^#{1,6}\s*/, '');
      doc.moveDown(0.2);
      doc.fontSize(12).font('Times-Bold').text(clean);
      doc.moveDown(0.1);
      doc.fontSize(10).font('Times-Roman');
      return;
    }

    if (line.trim() === '') {
      doc.moveDown(0.5);
    } else {
      doc.text(line, { align: 'left' });
    }
  });

  doc.end();
  stream.on('finish', () => {
    console.log('PDF generated at', outPath);
  });
}

writePdf(text, outPath);