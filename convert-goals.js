const fs = require('fs').promises;
const path = require('path');
const mammoth = require('mammoth');

const goalCategories = {
    'articulation': 'Articulation goals.docx',
    'attention': 'Attention.docx',
    'executive': 'Executive Functioning.docx',
    'expressive': 'Expressive Language.docx',
    'fluency': 'Fluency.docx',
    'pragmatic': 'Pragmatic Language Skills.docx',
    'receptive': 'Receptive Langauge.docx'
};

async function convertGoals() {
    try {
        const goals = [];
        
        for (const [category, filename] of Object.entries(goalCategories)) {
            console.log(`Processing ${filename}...`);
            const filePath = path.join(__dirname, 'Goal Bank', filename);
            const buffer = await fs.readFile(filePath);
            const result = await mammoth.extractRawText({ buffer });

            const categoryGoals = result.value
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .map(text => ({ category, text }));

            goals.push(...categoryGoals);
            console.log(`Added ${categoryGoals.length} goals from ${filename}`);
        }

        // Create data directory if it doesn't exist
        const dataDir = path.join(__dirname, 'data');
        try {
            await fs.mkdir(dataDir);
        } catch (err) {
            if (err.code !== 'EEXIST') throw err;
        }

        // Write goals to JSON file
        const outputPath = path.join(dataDir, 'goals.json');
        await fs.writeFile(outputPath, JSON.stringify(goals, null, 2));
        console.log(`Successfully wrote ${goals.length} goals to ${outputPath}`);
    } catch (error) {
        console.error('Error converting goals:', error);
        process.exit(1);
    }
}

convertGoals();
