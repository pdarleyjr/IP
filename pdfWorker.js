importScripts('https://unpkg.com/pdf-lib@1.17.1');

let pdfCache = new Map();
let templateData = null;

self.onmessage = async function(e) {
    const { type, data, cacheKey, templateData: initData } = e.data;

    try {
        switch (type) {
            case 'init':
                if (!initData) {
                    throw new Error('Template data is required for initialization');
                }
                templateData = initData;
                self.postMessage({ type: 'initialized' });
                break;

            case 'generatePreview':
                if (!templateData) {
                    throw new Error('Worker not initialized with template data');
                }

                const cachedPdf = pdfCache.get(cacheKey);
                if (cachedPdf) {
                    self.postMessage({ type: 'previewGenerated', data: cachedPdf });
                    return;
                }

                const pdfBytes = await generatePDF(data);
                pdfCache.set(cacheKey, pdfBytes);
                self.postMessage({ type: 'previewGenerated', data: pdfBytes });
                break;

            case 'clearCache':
                pdfCache.clear();
                self.postMessage({ type: 'cacheCleared' });
                break;
        }
    } catch (error) {
        console.error('Worker error:', error);
        self.postMessage({ type: 'error', error: error.message });
    }
};

async function generatePDF(data) {
    try {
        // Convert base64 template to bytes
        const templateBytes = new Uint8Array(atob(templateData).split('').map(c => c.charCodeAt(0)));
        
        // Create a new PDF document
        const pdfDoc = await PDFLib.PDFDocument.create();
        
        // Load the template PDF
        const templatePdf = await PDFLib.PDFDocument.load(templateBytes);
        
        // Copy the template page
        const [templatePage] = await pdfDoc.copyPages(templatePdf, [0]);
        pdfDoc.addPage(templatePage);
        
        // Embed the standard font
        const helvetica = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
        const helveticaBold = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
        
        // Get template dimensions
        const templateDims = templatePage.getSize();
        
        // Get the first page
        let page = pdfDoc.getPage(0);
        
        // Set margins (in points, 72 points = 1 inch)
        const margins = {
            top: 108,    // 1.5 inches
            right: 54,   // 0.75 inches
            bottom: 108, // 1.5 inches
            left: 126    // 1.75 inches
        };

        // Set page size to match template
        page.setSize(templateDims.width, templateDims.height);

    const { clientInfo, goals, summary } = data;
    let yPos = margins.top;
    const lineHeight = 14;
    const fontSize = 11;

    // Helper function to measure text height
    function measureTextHeight(text, maxWidth, font, size) {
        const words = text.split(' ');
        let currentLine = '';
        let lineCount = 1;

        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const width = font.widthOfTextAtSize(testLine, size);

            if (width > maxWidth && currentLine) {
                lineCount++;
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }

        return lineCount * lineHeight;
    }

    // Helper function to add text with proper font and page breaks
    async function drawText(text, x, y, { font = helvetica, size = fontSize, indent = 0, isBulletPoint = false } = {}) {
        const maxWidth = page.getWidth() - margins.left - margins.right - indent;
        const textHeight = measureTextHeight(text, maxWidth, font, size);

        const pageHeight = templateDims.height;
        const bottomLimit = pageHeight - margins.bottom - (lineHeight * 2); // Add extra buffer for line height
        let words = text.split(' ');
        let currentLine = '';
        let currentY = y;
        let lines = [];

        // First, break text into lines and calculate total height
        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const width = font.widthOfTextAtSize(testLine, size);

            if (width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) {
            lines.push(currentLine);
        }

        // Now draw lines, creating new pages when needed
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check if this line would go past the bottom margin
            if (currentY > bottomLimit) {
                // Create new page from template
                const [newPage] = await pdfDoc.copyPages(templatePdf, [0]);
                pdfDoc.addPage(newPage);
                const newPageNum = pdfDoc.getPageCount() - 1;
                page = pdfDoc.getPage(newPageNum);
                page.setSize(templateDims.width, templateDims.height);
                currentY = margins.top;
            }

            // Draw the line
            page.drawText(line, {
                x: x + indent,
                y: pageHeight - currentY,
                size,
                font
            });
            currentY += lineHeight;
        }

        return currentY;
    }

    // Add client information
    if (clientInfo.name) {
        yPos = await drawText(`Name: ${clientInfo.name}`, margins.left, yPos, { font: helveticaBold });
    }
    if (clientInfo.planDate) {
        yPos = await drawText(`Plan Date: ${clientInfo.planDate}`, margins.left, yPos, { font: helveticaBold });
    }
    if (clientInfo.dob) {
        yPos = await drawText(`Date of Birth: ${clientInfo.dob}`, margins.left, yPos, { font: helveticaBold });
    }
    if (clientInfo.age) {
        yPos = await drawText(`Age: ${clientInfo.age}`, margins.left, yPos, { font: helveticaBold });
    }

    yPos += lineHeight;

    // Add frequency and duration
    yPos = await drawText('Frequency and Duration', margins.left, yPos, { font: helveticaBold });
    yPos += lineHeight;

    const frequencyText = `Treatment plans are created and modified to each child's individual needs. ${
        clientInfo.name ? clientInfo.name + "'s" : 'The'
    } speech-language intervention plan currently consists of individual speech-language therapy ${
        clientInfo.frequency ? clientInfo.frequency + ' times per week' : ''
    }${
        clientInfo.duration ? ' for ' + clientInfo.duration + ' minutes' : ''
    }.`;

    yPos = await drawText(frequencyText, margins.left, yPos);
    yPos += lineHeight * 2;

    // Add long term objectives
    if (goals.longTerm.length > 0) {
        yPos = await drawText('Long Term Objectives', margins.left, yPos, { font: helveticaBold });
        yPos += lineHeight;

        for (const goal of goals.longTerm) {
            yPos = await drawText(`• ${goal.text}`, margins.left, yPos, { indent: 20, isBulletPoint: true });
            yPos += lineHeight / 2;
        }
    }

    // Add short term objectives
    if (goals.shortTerm.length > 0) {
        yPos += lineHeight;
        yPos = await drawText('Short Term Objectives', margins.left, yPos, { font: helveticaBold });
        yPos += lineHeight;

        for (const goal of goals.shortTerm) {
            yPos = await drawText(`• ${goal.text}`, margins.left, yPos, { indent: 20, isBulletPoint: true });
            yPos += lineHeight / 2;
        }
    }

    // Add summary if present
    if (summary) {
        yPos += lineHeight;
        yPos = await drawText('Plan Summary', margins.left, yPos, { font: helveticaBold });
        yPos += lineHeight;

        const summaryLines = summary.split('\n');
        for (const line of summaryLines) {
            if (line.trim()) {
                yPos = await drawText(line.trim(), margins.left, yPos);
                yPos += lineHeight / 2;
            }
        }
    }

        // Serialize the PDFDocument to bytes
        return await pdfDoc.save();
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
}
