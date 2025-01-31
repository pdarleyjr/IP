importScripts('https://unpkg.com/pdf-lib@1.17.1');

let pdfCache = new Map();

self.onmessage = async function(e) {
    const { type, data, cacheKey } = e.data;

    try {
        switch (type) {
            case 'generatePreview':
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
        self.postMessage({ type: 'error', error: error.message });
    }
};

async function generatePDF(data) {
    const { clientInfo, goals, summary } = data;
    
    // Load template PDF
    const templateBytes = await fetch('IP_Blank.pdf').then(res => res.arrayBuffer());
    const pdfDoc = await PDFLib.PDFDocument.load(templateBytes);
    
    // Embed fonts
    const helvetica = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
    
    // Get the first page
    let currentPage = pdfDoc.getPage(0);
    let yOffset = 144; // Reduced by another 36 points (0.5 inch)
    const pageHeight = currentPage.getHeight();
    const marginBottom = pageHeight - 108; // 1.5 inches from bottom (72 points per inch)

    // Helper function to check if there's enough space for text
    function checkSpaceForText(text, size, x, font) {
        const rightMargin = 612 - 72;
        const maxWidth = rightMargin - x;
        const words = text.split(' ');
        let lines = 1;
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const textWidth = font.widthOfTextAtSize(testLine, size);

            if (textWidth > maxWidth && currentLine) {
                lines++;
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }

        // Calculate total height needed including line spacing
        const totalHeight = lines * (size + 8); // Increased line spacing
        return yOffset + totalHeight < marginBottom;
    }

    // Helper function to add text with proper formatting and word wrapping
    function addText(text, { x = 138, size = 11, font = helvetica, pageNum = 0, startNewPage = false } = {}) { // Set x to 138 (0.75 inch from left + 0.25 inch additional)
        // Check if we need to start a new page
        if (startNewPage && yOffset > 144) {
            currentPage = pdfDoc.addPage(pdfDoc.getPage(0).clone());
            yOffset = 144;
        }

        // Check if there's enough space for the entire text block
        if (!checkSpaceForText(text, size, x, font)) {
            currentPage = pdfDoc.addPage(pdfDoc.getPage(0).clone());
            yOffset = 144;
        }
        const rightMargin = 612 - 72; // Standard US Letter width (612) minus right margin
        const maxWidth = rightMargin - x;
        const words = text.split(' ');
        let currentLine = '';
        let firstLine = true;

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const textWidth = font.widthOfTextAtSize(testLine, size);

            if (textWidth > maxWidth && currentLine) {
                // Check if we need a new page
                if (yOffset >= marginBottom) {
                    currentPage = pdfDoc.addPage(pdfDoc.getPage(0).clone());
            yOffset = 144;
                }

                // Draw the current line
                currentPage.drawText(currentLine, {
                    x: firstLine ? x : (text.startsWith('•') ? x + 20 : x), // Indent wrapped lines for bullets
                    y: pageHeight - yOffset,
                    size,
                    font,
                    color: PDFLib.rgb(0, 0, 0)
                });
                yOffset += size + 8; // Increased line spacing
                currentLine = word;
                firstLine = false;
            } else {
                currentLine = testLine;
            }
        }

        // Draw the last line
        if (currentLine) {
            if (yOffset >= marginBottom) {
                currentPage = pdfDoc.addPage(pdfDoc.getPage(0).clone());
            yOffset = 144;
            }

            currentPage.drawText(currentLine, {
                x: firstLine ? x : (text.startsWith('•') ? x + 20 : x), // Indent wrapped lines for bullets
                y: pageHeight - yOffset,
                size,
                font,
                color: PDFLib.rgb(0, 0, 0)
            });
            yOffset += size + 8; // Increased line spacing
        }
    }

    // Add client information
    if (clientInfo.name) addText(`Name: ${clientInfo.name}`, { font: helveticaBold });
    if (clientInfo.planDate) addText(`Plan Date: ${clientInfo.planDate}`, { font: helveticaBold });
    if (clientInfo.dob) addText(`Date of Birth: ${clientInfo.dob}`, { font: helveticaBold });
    if (clientInfo.age) addText(`Age: ${clientInfo.age}`, { font: helveticaBold });

    yOffset += 32; // Increased section spacing

    // Add frequency section
    addText('Frequency', { size: 12, font: helveticaBold });
    yOffset += 12; // Add spacing after section header
    addText(`Treatment plans are created and modified to each child's individual needs. ${clientInfo.name ? clientInfo.name + "'s" : ''} speech-language intervention plan currently consists of individual speech-language therapy ${clientInfo.frequency} times a week for ${clientInfo.duration} minutes.`);

    yOffset += 32; // Increased section spacing

    // Add long term objectives
    if (goals.longTerm.length > 0) {
        addText('Long Term Objectives', { size: 12, font: helveticaBold });
        yOffset += 12; // Add spacing after section header
        goals.longTerm.forEach(goal => {
            addText(`• ${goal.text}`, { x: 158 }); // Indent bullets 20 points from new left margin
        });
        yOffset += 32; // Increased section spacing
    }

    // Add short term objectives
    if (goals.shortTerm.length > 0) {
        addText('Short Term Objectives', { size: 12, font: helveticaBold, startNewPage: true });
        yOffset += 12; // Add spacing after section header
        
        goals.shortTerm.forEach(goal => {
            // Check if adding this goal would split across pages
            if (!checkSpaceForText(`• ${goal.text}`, 11, 158, helvetica)) {
                currentPage = pdfDoc.addPage(pdfDoc.getPage(0).clone());
            yOffset = 144;
            }
            addText(`• ${goal.text}`, { x: 158 }); // Indent bullets 20 points from new left margin
        });
    }

    // Add summary if exists
    if (summary) {
        // Always start summary on a new page
        currentPage = pdfDoc.addPage(pdfDoc.getPage(0).clone());
        yOffset = 144;
        
        addText('Plan Summary', { size: 12, font: helveticaBold });
        yOffset += 12; // Add spacing after summary title
        const summaryLines = summary.split('\n');
        summaryLines.forEach(line => {
            if (line.trim()) {
                // If line starts with a bullet point, add proper indentation
                if (line.trim().startsWith('•')) {
                    addText(line.trim(), { x: 158 }); // Indent bullets 20 points from new left margin
                } else {
                    addText(line.trim());
                }
            }
        });
    }

    return await pdfDoc.save();
}
