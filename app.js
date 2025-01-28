// Import dependencies
import goalDB from './db.js?v=1';

// Global state
let useModel = null;
let selectedCategories = new Set();
let currentGoals = {
    longTerm: [],
    shortTerm: []
};

// DOM Elements
const clientNameInput = document.getElementById('clientName');
const planDateInput = document.getElementById('planDate');
const dobInput = document.getElementById('dob');
const frequencyInput = document.getElementById('frequency');
const durationInput = document.getElementById('duration');
const languageSelect = document.getElementById('language');
const goalSearchInput = document.getElementById('goalSearch');
const goalsListElement = document.getElementById('goalsList');
const previewDocument = document.getElementById('previewDocument');
const saveAsPdfButton = document.getElementById('saveAsPdf');
const saveAsDocButton = document.getElementById('saveAsDoc');

// Initialize TensorFlow models
async function initializeTensorflow() {
    try {
        console.log('Loading Universal Sentence Encoder...');
        useModel = await use.load();
        console.log('USE model loaded successfully');
    } catch (error) {
        console.error('Error loading USE model:', error);
        // Fall back to text-based search only
        useModel = null;
    }
}

// Helper function to validate required inputs
function validateInputs() {
    const requiredInputs = {
        'Client Name': clientNameInput.value,
        'Frequency': frequencyInput.value,
        'Duration': durationInput.value,
        'Language': languageSelect.value
    };

    const missing = Object.entries(requiredInputs)
        .filter(([_, value]) => !value)
        .map(([name]) => name);

    if (missing.length > 0) {
        throw new Error(`Please fill in the following required fields: ${missing.join(', ')}`);
    }

    if (selectedCategories.size === 0) {
        throw new Error('Please select at least one goal category');
    }

    if (currentGoals.shortTerm.length === 0) {
        throw new Error('Please select at least one short-term objective');
    }
}

// Helper function to capitalize first letter of each word
function capitalizeWords(str) {
    return str.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Generate summary using enhanced hybrid approach
async function generatePlanSummary() {
    try {
        // Validate inputs first
        validateInputs();

        const selectedCats = Array.from(selectedCategories);
        const allGoals = [...currentGoals.longTerm, ...currentGoals.shortTerm];
        const clientName = clientNameInput.value;
        const frequency = frequencyInput.value;
        const duration = durationInput.value;
        const language = languageSelect.value;

        // Rule-based analysis of goals
        const goalsByCategory = {};
        selectedCats.forEach(category => {
            goalsByCategory[category] = allGoals.filter(g => g.category === category);
        });

        // Generate category-specific insights
        const categoryInsights = [];
        for (const [category, goals] of Object.entries(goalsByCategory)) {
            if (goals.length > 0) {
                const capitalizedCategory = capitalizeWords(category);
                const insight = `For ${capitalizedCategory}, the plan includes ${goals.length} specific objectives targeting key areas of development`;
                categoryInsights.push(insight);
            }
        }

        // Use semantic analysis if USE model is available
        let semanticInsights = [];
        if (useModel) {
            try {
                // Get embeddings for all goals
                const goalTexts = allGoals.map(g => g.text);
                const embeddings = await useModel.embed(goalTexts);
                
                // Enhanced semantic analysis
                const embeddingArray = await embeddings.array();
                const similarities = [];
                const relatedGoals = [];
                
                for (let i = 0; i < embeddingArray.length; i++) {
                    for (let j = i + 1; j < embeddingArray.length; j++) {
                        const similarity = tf.tensor1d(embeddingArray[i])
                            .dot(tf.tensor1d(embeddingArray[j]))
                            .dataSync()[0];
                        similarities.push(similarity);
                        
                        if (similarity > 0.8) {
                            relatedGoals.push([allGoals[i].category, allGoals[j].category]);
                        }
                    }
                }

                // Generate insights about goal relationships
                if (relatedGoals.length > 0) {
                    const uniquePairs = new Set(relatedGoals.map(pair => pair.sort().join('-')));
                    uniquePairs.forEach(pair => {
                        const [cat1, cat2] = pair.split('-');
                        const capitalizedCat1 = capitalizeWords(cat1);
                        const capitalizedCat2 = capitalizeWords(cat2);
                        if (cat1 !== cat2) {
                            semanticInsights.push(`The plan integrates complementary goals between ${capitalizedCat1} and ${capitalizedCat2}`);
                        }
                    });
                }

                // Cleanup tensors
                embeddings.dispose();
            } catch (error) {
                console.error('Error in semantic analysis:', error);
            }
        }

        // Progress monitoring statement with semantic variation
        const progressStatements = [
            "Formal and informal measures will be utilized throughout intervention to establish goals and monitor progress.",
            "Progress will be tracked through a combination of formal assessments and informal observations during therapy sessions.",
            "Ongoing evaluation using both standardized measures and clinical observations will guide goal adjustment and progress monitoring.",
            "Treatment progress will be assessed through systematic data collection and periodic formal evaluations."
        ];

        // Use USE model to select most appropriate progress statement if available
        let progressStatement = progressStatements[0];
        if (useModel) {
            try {
                const embeddings = await useModel.embed(progressStatements);
                const contextEmbed = await useModel.embed([categoryInsights.join(' ')]);
                
                const similarities = await Promise.all(progressStatements.map(async (_, i) => {
                    const similarity = tf.tensor1d((await embeddings.array())[i])
                        .dot(tf.tensor1d((await contextEmbed.array())[0]))
                        .dataSync()[0];
                    return similarity;
                }));

                const bestIndex = similarities.indexOf(Math.max(...similarities));
                progressStatement = progressStatements[bestIndex];

                embeddings.dispose();
                contextEmbed.dispose();
            } catch (error) {
                console.error('Error selecting progress statement:', error);
            }
        }

        // Combine insights into structured summary
        const summaryParts = [
            `Treatment Summary for ${clientName}:`,
            `\nIntervention Plan:`,
            `• Speech therapy services will be provided ${frequency} times per week for ${duration} minutes.`,
            `• Sessions will be conducted in ${language}.`,
            `\nPrimary Focus Areas:`,
            `• ${selectedCats.map(cat => capitalizeWords(cat)).join('\n• ')}`,
            `\nTreatment Approach:`,
            categoryInsights.map(insight => `• ${insight}.`).join('\n'),
            semanticInsights.length > 0 ? `\nIntegrated Approach:` : '',
            semanticInsights.map(insight => `• ${insight}.`).join('\n'),
            `\nProgress Monitoring:`,
            `• ${progressStatement}`
        ];

        const summary = summaryParts.filter(Boolean).join('\n');

        // Update UI with summary
        updatePreviewWithSummary(summary);
    } catch (error) {
        console.error('Error generating summary:', error);
        alert(error.message || 'Failed to generate summary. Please try again.');
    }
}

// Helper function to update preview with summary
function updatePreviewWithSummary(summary) {
    const container = document.querySelector('.preview-content-container');
    if (!container) return;

    // Remove existing summary if present
    const existingSummary = document.getElementById('planSummary');
    if (existingSummary) {
        existingSummary.remove();
    }

    // Create new summary section
    const summarySection = document.createElement('div');
    summarySection.id = 'planSummary';
    summarySection.className = 'preview-section';
    summarySection.style.display = 'block';
    summarySection.innerHTML = `
        <h3>Plan Summary</h3>
        <p id="summaryText" style="white-space: pre-line;">${summary}</p>
    `;

    // Add to the end of the container
    container.appendChild(summarySection);
}

// Load goals from JSON file into IndexedDB
async function loadGoalBank() {
    try {
        console.log('Fetching goals from JSON file...');
        const response = await fetch('./data/goals.json');
        
        if (!response.ok) {
            throw new Error('Failed to fetch goals data');
        }

        const goals = await response.json();
        console.log(`Received ${goals.length} goals from JSON file`);

        if (!Array.isArray(goals) || goals.length === 0) {
            throw new Error('No goals found in data file');
        }

        console.log('Loading goals into IndexedDB...');
        await goalDB.loadGoalBank(goals);
        console.log('Goals loaded successfully');

        // Update UI to show loaded goals
        const categories = [...new Set(goals.map(g => g.category))];
        console.log('Available categories:', categories);

        // Check checkboxes for available categories
        categories.forEach(category => {
            const checkbox = document.querySelector(`input[value="${category}"]`);
            if (checkbox) {
                checkbox.disabled = false;
            }
        });

        // Show initial goals
        await updateGoalsList();
    } catch (error) {
        console.error('Error loading goal bank:', error);
        
        // Show error message to user
        const goalsListElement = document.getElementById('goalsList');
        goalsListElement.innerHTML = `
            <div class="error-message">
                Failed to load goals: ${error.message}
                <br><br>Please ensure the goals data file exists at:
                <pre>data/goals.json</pre>
            </div>
        `;

        // Disable category checkboxes
        document.querySelectorAll('.goal-categories input[type="checkbox"]').forEach(checkbox => {
            checkbox.disabled = true;
        });
    }
}

// UI Event Handlers
function initializeEventListeners() {
    // Category checkboxes
    document.querySelectorAll('.goal-categories input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', async (e) => {
            const category = e.target.value;
            if (e.target.checked) {
                selectedCategories.add(category);
                // Add long term objective for the category
                currentGoals.longTerm.push({
                    category,
                    text: `To improve overall ${category.toLowerCase()}.`
                });
            } else {
                selectedCategories.delete(category);
                // Remove long term objective for the category
                const index = currentGoals.longTerm.findIndex(g => 
                    g.text === `To improve overall ${category.toLowerCase()}.`
                );
                if (index !== -1) {
                    currentGoals.longTerm.splice(index, 1);
                }
            }
            await updateGoalsList();
            updatePreview();
        });
    });

    // Search input
    let searchTimeout;
    goalSearchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            await updateGoalsList();
        }, 300);
    });

    // Demographics inputs
    [clientNameInput, planDateInput, dobInput, frequencyInput, durationInput, languageSelect].forEach(input => {
        input.addEventListener('input', updatePreview);
    });

    // Save buttons
    saveAsPdfButton.addEventListener('click', exportToPdf);
    saveAsDocButton.addEventListener('click', exportToDocx);
}

// Update goals list based on search and filters
async function updateGoalsList() {
    try {
        const query = goalSearchInput.value;
        const categories = Array.from(selectedCategories);
        
        let goals;
        if (useModel && query) {
            console.log('Using Universal Sentence Encoder for semantic search...');
            const allGoals = await goalDB.searchGoals('', categories);
            goals = await goalDB.searchWithTensorflow(query, allGoals, useModel);
            // Filter out category goals
            goals = goals.filter(goal => !goal.text.toLowerCase().includes('goals'));
            console.log(`Found ${goals.length} goals using semantic search`);
        } else {
            console.log('Using regular text search...');
            goals = await goalDB.searchGoals(query, categories);
            // Filter out category goals
            goals = goals.filter(goal => !goal.text.toLowerCase().includes('goals'));
            console.log(`Found ${goals.length} goals using text search`);
        }

        if (goals.length === 0) {
            goalsListElement.innerHTML = `
                <div class="info-message">
                    No goals found matching your criteria. Try adjusting your search or selecting different categories.
                </div>
            `;
            return;
        }

        renderGoalsList(goals);
    } catch (error) {
        console.error('Error updating goals list:', error);
        goalsListElement.innerHTML = `
            <div class="error-message">
                Error searching goals: ${error.message}
            </div>
        `;
    }
}

// Render goals in the UI
function renderGoalsList(goals) {
    goalsListElement.innerHTML = '';
    
    goals.forEach(goal => {
        const goalElement = document.createElement('div');
        goalElement.className = 'goal-item';
        goalElement.innerHTML = `
            <label class="checkbox-container">
                <input type="checkbox" ${[...currentGoals.longTerm, ...currentGoals.shortTerm].some(g => g.text === goal.text) ? 'checked' : ''}>
                <span class="checkbox-label">${goal.text}</span>
            </label>
        `;

        const checkbox = goalElement.querySelector('input');
        checkbox.addEventListener('change', async () => {
            if (checkbox.checked) {
                // Add to short term with formatted text
                const clientName = clientNameInput.value.split(' ')[0]; // Get first name
                const formattedText = `To improve overall ${goal.category.toLowerCase()} ${clientName} ${goal.text.toLowerCase()}.`;
                currentGoals.shortTerm.push({
                    ...goal,
                    text: formattedText
                });
                await goalDB.addSelectedGoal(goal);
            } else {
                // Remove from appropriate array
                const shortTermIndex = currentGoals.shortTerm.findIndex(g => 
                    g.category === goal.category && g.text.includes(goal.text.toLowerCase())
                );
                
                if (shortTermIndex !== -1) {
                    currentGoals.shortTerm.splice(shortTermIndex, 1);
                }
                await goalDB.removeSelectedGoal(goal.id);
            }
            updatePreview();
        });

        goalsListElement.appendChild(goalElement);
    });
}

// Helper function to create a new page
function createNewPage() {
    const page = document.createElement('div');
    page.className = 'preview-document';
    page.innerHTML = `
        <div class="preview-sidebar">
            <div class="vertical-text">INTERVENTION PLAN</div>
        </div>
        <div class="preview-content-container"></div>
    `;
    return page;
}

// Update preview panel
function updatePreview() {
    const clientName = clientNameInput.value;
    const planDate = planDateInput.value ? new Date(planDateInput.value).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';
    const dob = dobInput.value ? new Date(dobInput.value) : null;
    const frequency = frequencyInput.value;
    const duration = durationInput.value;
    const language = languageSelect.value;

    // Calculate age if both planDate and dob are set
    let ageString = '';
    if (planDate && dob) {
        const planDateTime = new Date(planDateInput.value);
        const years = planDateTime.getFullYear() - dob.getFullYear();
        const months = planDateTime.getMonth() - dob.getMonth();
        ageString = `${years} years, ${months} months`;
    }

    // Create content sections
    const sections = [
        {
            title: null,
            content: `
                <div class="preview-header">
                    <img src="/IPLC-IP/logo.png" alt="IPLC Logo" class="preview-logo">
                </div>
                <div class="preview-section">
                    <p><strong>Name:</strong> ${clientName}</p>
                    <p><strong>Plan Date:</strong> ${planDate}</p>
                    <p><strong>Date of Birth:</strong> ${dob ? dob.toLocaleDateString() : ''}</p>
                    <p><strong>Age:</strong> ${ageString}</p>
                </div>
                <div class="preview-section">
                    <h3>Frequency</h3>
                    <p>Treatment plans are created and modified to each child's individual needs. ${clientName ? clientName + "'s" : ''} speech-language intervention plan currently consists of individual speech-language therapy ${frequency} times a week for ${duration} minutes.</p>
                </div>
            `
        },
        {
            title: 'Long Term Objectives',
            content: `
                <ul>
                    ${currentGoals.longTerm.map(goal => `<li>${goal.text}</li>`).join('\n')}
                </ul>
            `
        },
        {
            title: 'Short Term Objectives',
            content: `
                <ul>
                    ${currentGoals.shortTerm.map(goal => `<li>${goal.text}</li>`).join('\n')}
                </ul>
            `
        }
    ];

    // Store existing summary if it exists
    const existingSummary = document.getElementById('planSummary');
    const existingSummaryText = existingSummary ? existingSummary.querySelector('#summaryText').textContent : '';

    // Clear existing content
    previewDocument.innerHTML = '';

    // Create first page
    let currentPage = createNewPage();
    previewDocument.appendChild(currentPage);
    let currentContainer = currentPage.querySelector('.preview-content-container');

    // Add sections one by one
    let itemsOnCurrentPage = 0;
    const MAX_ITEMS_PER_PAGE = 10; // Maximum number of list items per page

    sections.forEach((section, index) => {
        const sectionContent = section.title ? 
            `<div class="preview-section"><h3>${section.title}</h3>${section.content}</div>` :
            section.content;

        // Count list items in this section
        const listItemCount = (sectionContent.match(/<li>/g) || []).length;

        // If this section would exceed the limit, create new page
        if (itemsOnCurrentPage + listItemCount > MAX_ITEMS_PER_PAGE && index > 0) {
            currentPage = createNewPage();
            previewDocument.appendChild(currentPage);
            currentContainer = currentPage.querySelector('.preview-content-container');
            itemsOnCurrentPage = 0;
        }

        // Add content to current container
        currentContainer.insertAdjacentHTML('beforeend', sectionContent);
        itemsOnCurrentPage += listItemCount;
    });

    // Restore summary if it existed
    if (existingSummaryText) {
        updatePreviewWithSummary(existingSummaryText);
    }
}

// Export functions
async function exportToPdf() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Function to add page header (logo and vertical text)
        const addPageHeader = () => {
            // Add logo
            const logoImg = document.querySelector('.preview-logo');
            if (logoImg.complete) {
                doc.addImage(logoImg, 'PNG', 15, 15, 30, 30);
            }
            
            // Add vertical text
            doc.setFontSize(16);
            doc.text('INTERVENTION PLAN', 25, 100, { angle: 90 });
        };

        // Add first page header
        addPageHeader();
        
        doc.setFontSize(12);
        
        // Process each preview document page
        const pages = previewDocument.querySelectorAll('.preview-document');
        pages.forEach((page, pageIndex) => {
            if (pageIndex > 0) {
                doc.addPage();
                addPageHeader();
            }

            const contentContainer = page.querySelector('.preview-content-container');
            const sections = contentContainer.querySelectorAll('.preview-section');
            let currentY = 60;
            
            sections.forEach(section => {
                // Extract text content
                const lines = section.innerText.split('\n').filter(line => line.trim());
                
                // Write each line
                lines.forEach(line => {
                    const splitText = doc.splitTextToSize(line, 160);
                    doc.text(50, currentY, splitText);
                    currentY += 10 * splitText.length;
                });
                
                currentY += 10; // Add space between sections
            });
        });
        
        // Save the PDF
        const clientName = clientNameInput.value.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `${clientName}_intervention_plan.pdf`;
        doc.save(fileName);
    } catch (error) {
        console.error('Error generating PDF:', error);
    }
}

async function exportToDocx() {
    try {
        // Create a docx file with the content
        const pages = previewDocument.querySelectorAll('.preview-document');
        let content = '';
        
        pages.forEach((page, index) => {
            content += `
                <div class="preview-page" ${index > 0 ? 'style="page-break-before: always;"' : ''}>
                    <div class="preview-sidebar">
                        <div class="vertical-text">INTERVENTION PLAN</div>
                    </div>
                    ${page.querySelector('.preview-content-container').innerHTML}
                </div>
            `;
        });

        // Convert HTML to a format suitable for Word
        const formattedContent = `
            <html>
                <head>
                    <style>
                        .preview-page {
                            position: relative;
                            margin-left: 120px;
                            padding: 20px;
                        }
                        .preview-sidebar {
                            width: 100px;
                            position: absolute;
                            left: -120px;
                            top: 0;
                            bottom: 0;
                            background: #003366;
                        }
                        .vertical-text {
                            color: white;
                            writing-mode: vertical-lr;
                            transform: rotate(180deg);
                            text-align: center;
                            font-size: 24pt;
                            font-weight: normal;
                            letter-spacing: 4pt;
                            position: absolute;
                            left: 0;
                            top: 0;
                            bottom: 0;
                            width: 100px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        }
                        .preview-section {
                            margin-bottom: 20px;
                        }
                        .preview-section h3 {
                            margin-bottom: 10px;
                        }
                        .preview-section ul {
                            margin: 0;
                            padding-left: 20px;
                        }
                        .preview-section li {
                            margin-bottom: 5px;
                        }
                    </style>
                </head>
                <body>
                    ${content}
                </body>
            </html>
        `;
        
        const blob = new Blob([formattedContent], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        
        // Create download link
        const clientName = clientNameInput.value.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `${clientName}_intervention_plan.docx`;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(link.href);
    } catch (error) {
        console.error('Error generating DOCX:', error);
    }
}

// Initialize application
async function initialize() {
    try {
        await Promise.all([
            initializeTensorflow(),
            loadGoalBank()
        ]);
        initializeEventListeners();
        updatePreview();
        
        // Add Generate Summary button handler
        const generateSummaryButton = document.getElementById('generateSummary');
        generateSummaryButton.addEventListener('click', async () => {
            const originalText = generateSummaryButton.textContent;
            generateSummaryButton.disabled = true;
            generateSummaryButton.textContent = 'Generating...';
            
            try {
                await generatePlanSummary();
                generateSummaryButton.textContent = originalText;
                generateSummaryButton.disabled = false;
            } catch (error) {
                generateSummaryButton.textContent = 'Failed to Generate';
                console.error('Failed to generate summary:', error);
                setTimeout(() => {
                    generateSummaryButton.textContent = originalText;
                    generateSummaryButton.disabled = false;
                }, 3000);
            }
        });
    } catch (error) {
        console.error('Error initializing application:', error);
    }
}

// Start the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', initialize);
