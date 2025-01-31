// Import dependencies
import goalDB from './db.js';
import { categoryDescriptions } from './categoryDescriptions.js';

// Global state
let useModel = null;
let selectedCategories = new Set();
let currentGoals = {
    longTerm: [],
    shortTerm: []
};
let activeTab = null;
let pdfWorker = null;
let currentPreviewPdf = null;
let previewUpdateTimeout = null;

// DOM Elements
let clientNameInput, planDateInput, dobInput, frequencyInput, durationInput, 
    languageSelect, goalSearchInput, goalsListElement, goalsTabsElement, 
    previewDocument, saveAsPdfButton, previewLoading;

function initializeDOMElements() {
    clientNameInput = document.getElementById('clientName');
    planDateInput = document.getElementById('planDate');
    dobInput = document.getElementById('dob');
    frequencyInput = document.getElementById('frequency');
    durationInput = document.getElementById('duration');
    languageSelect = document.getElementById('language');
    goalSearchInput = document.getElementById('goalSearch');
    goalsListElement = document.getElementById('goalsList');
    goalsTabsElement = document.getElementById('goalsTabs');
    previewDocument = document.getElementById('previewPages');
    saveAsPdfButton = document.getElementById('saveAsPdf');
    previewLoading = document.querySelector('.preview-loading');

    if (!goalsTabsElement) {
        console.error('Goals tabs element not found');
        return;
    }

    // Initialize PDF Worker
    pdfWorker = new Worker('pdfWorker.js');
    pdfWorker.onmessage = handleWorkerMessage;
}

// Handle messages from PDF Worker
async function handleWorkerMessage(e) {
    const { type, data, error } = e.data;

    switch (type) {
        case 'previewGenerated':
            try {
                await updatePdfPreview(data);
            } finally {
                hideLoading();
            }
            break;
        case 'error':
            console.error('PDF Worker error:', error);
            hideLoading();
            break;
    }
}

// Show/hide loading indicator
function showLoading() {
    previewLoading.classList.add('active');
}

function hideLoading() {
    previewLoading.classList.remove('active');
}

// Debounced preview update
function debouncedUpdatePreview() {
    clearTimeout(previewUpdateTimeout);
    previewUpdateTimeout = setTimeout(() => {
        showLoading();
        generatePreview();
    }, 250);
}

// Generate preview data
function generatePreview() {
    const clientName = clientNameInput.value;
    const planDate = planDateInput.value ? new Date(planDateInput.value).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';
    const dob = dobInput.value ? new Date(dobInput.value) : null;
    const frequency = frequencyInput.value;
    const duration = durationInput.value;
    
    // Calculate age if both planDate and dob are set
    let ageString = '';
    if (planDate && dob) {
        const planDateTime = new Date(planDateInput.value);
        const years = planDateTime.getFullYear() - dob.getFullYear();
        const months = planDateTime.getMonth() - dob.getMonth();
        ageString = `${years} years, ${months} months`;
    }

    const previewData = {
        clientInfo: {
            name: clientName,
            planDate,
            dob: dob ? dob.toLocaleDateString() : '',
            age: ageString,
            frequency,
            duration
        },
        goals: currentGoals,
        summary: document.getElementById('planSummary')?.querySelector('#summaryText')?.textContent
    };

    const cacheKey = JSON.stringify(previewData);
    pdfWorker.postMessage({ type: 'generatePreview', data: previewData, cacheKey });
}

// Update PDF preview using PDF.js
async function updatePdfPreview(pdfBytes) {
    try {
        // Clear existing preview
        previewDocument.innerHTML = '';
        document.getElementById('previewTabs').innerHTML = '';

        // Load PDF document
        const pdfData = new Uint8Array(pdfBytes);
        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
        const pdf = await loadingTask.promise;
        currentPreviewPdf = pdf;

        // Calculate scale to fit preview area
        const previewArea = document.querySelector('.preview-area');
        const firstPage = await pdf.getPage(1);
        const viewport = firstPage.getViewport({ scale: 1.0 });
        
        // Calculate scale to fit height with minimal padding
        const containerHeight = previewArea.clientHeight - 20;
        const heightScale = containerHeight / viewport.height;
        
        // Calculate scale to fit width with minimal padding
        const containerWidth = previewArea.clientWidth - 20;
        const widthScale = containerWidth / viewport.width;
        
        // Use the smaller scale to ensure the page fits both dimensions
        // Multiply by 0.98 to make it 98% of the available space
        const scale = Math.min(heightScale, widthScale) * 0.98;

        // Render each page
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const scaledViewport = page.getViewport({ scale });

            // Create page container
            const pageContainer = document.createElement('div');
            pageContainer.className = 'preview-document';
            pageContainer.style.display = pageNum === 1 ? 'block' : 'none';
            pageContainer.style.width = `${scaledViewport.width}px`;
            pageContainer.style.height = `${scaledViewport.height}px`;
            pageContainer.style.margin = '0 auto';

            // Create canvas
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;

            // Render PDF page
            await page.render({
                canvasContext: context,
                viewport: scaledViewport
            }).promise;

            pageContainer.appendChild(canvas);
            previewDocument.appendChild(pageContainer);

            // Create tab
            const tab = document.createElement('button');
            tab.className = `preview-tab ${pageNum === 1 ? 'active' : ''}`;
            tab.textContent = `Page ${pageNum}`;
            tab.onclick = () => switchPreviewPage(pageNum - 1);
            document.getElementById('previewTabs').appendChild(tab);
        }
    } catch (error) {
        console.error('Error updating PDF preview:', error);
    }
}

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

// Function to update tabs based on selected categories
function updateTabs() {
    if (!goalsTabsElement) return;
    
    goalsTabsElement.innerHTML = '';
    const categories = Array.from(selectedCategories);
    
    // Create "All goals" tab
    const allGoalsTab = document.createElement('button');
    allGoalsTab.className = `goals-tab ${activeTab === null ? 'active' : ''}`;
    allGoalsTab.textContent = 'All goals';
    allGoalsTab.dataset.category = '';
    
    allGoalsTab.addEventListener('click', () => {
        document.querySelectorAll('.goals-tab').forEach(t => t.classList.remove('active'));
        allGoalsTab.classList.add('active');
        activeTab = null;
        updateGoalsList();
    });
    
    goalsTabsElement.appendChild(allGoalsTab);

    // Create tabs for selected categories
    if (categories.length > 0) {
        categories.forEach(category => {
            const tab = document.createElement('button');
            tab.className = `goals-tab ${activeTab === category ? 'active' : ''}`;
            tab.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            tab.dataset.category = category;
            
            tab.addEventListener('click', () => {
                document.querySelectorAll('.goals-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                activeTab = category;
                updateGoalsList();
            });
            
            goalsTabsElement.appendChild(tab);
        });
    }

    // If no active tab is set or the active tab was unselected, select "All goals" tab
    if (activeTab === undefined || (activeTab !== null && !categories.includes(activeTab))) {
        activeTab = null;
        allGoalsTab.classList.add('active');
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

        // Generate category-specific insights with enhanced descriptions
        const categoryInsights = [];
        for (const [category, goals] of Object.entries(goalsByCategory)) {
            if (goals.length > 0) {
                const capitalizedCategory = capitalizeWords(category);
                const description = categoryDescriptions[category];
                const insight = `For ${capitalizedCategory}, the plan includes ${goals.length} specific objectives targeting key areas of development. ${description}`;
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
    // Force a preview update to ensure proper page structure
    updatePreview();
    
    // Create new page for summary
    const summaryPage = createNewPage();
    const summaryContainer = summaryPage.querySelector('.preview-content-container');
    const summarySection = document.createElement('div');
    summarySection.id = 'planSummary';
    summarySection.className = 'preview-section';
    summarySection.innerHTML = `
        <h3>Plan Summary</h3>
        <p id="summaryText" style="white-space: pre-line;">${summary}</p>
    `;
    summaryContainer.appendChild(summarySection);

    // Add summary page to preview
    previewDocument.appendChild(summaryPage);

    // Create new tab for summary page
    const pageIndex = previewDocument.children.length - 1;
    const tab = document.createElement('button');
    tab.className = 'preview-tab';
    tab.textContent = `Page ${pageIndex + 1}`;
    tab.onclick = () => switchPreviewPage(pageIndex);
    document.getElementById('previewTabs').appendChild(tab);
}

// Load goals from JSON file into IndexedDB
async function loadGoalBank() {
    try {
        console.log('Fetching goals from JSON file...');
        const response = await fetch('data/goals.json');
        
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
    if (!saveAsPdfButton) {
        console.error('Save PDF button not found in DOM');
    } else {
        saveAsPdfButton.addEventListener('click', exportToPdf);
    }

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
            updateTabs();
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
}

// Update goals list based on search and filters
async function updateGoalsList() {
    try {
        const query = goalSearchInput.value;
        let categories = Array.from(selectedCategories);
        
        // Filter goals based on active tab
        if (activeTab !== null) {
            categories = [activeTab];
        } else {
            // Show all goals if "All goals" tab is active
            categories = await goalDB.getCategories();
        }
        
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
    page.style.cssText = `
        background-image: url("background_for_preview.png");
        background-size: contain;
        background-position: top center;
        background-repeat: no-repeat;
        min-height: 1056px;
        max-height: 1056px;
        width: 816px;
        margin: 0 auto;
        overflow: hidden;
    `;
    page.innerHTML = `<div class="preview-content-container"></div>`;
    return page;
}

// Update preview panel - now just triggers PDF preview generation
function updatePreview() {
    debouncedUpdatePreview();
}

// Function to switch between preview pages
function switchPreviewPage(pageIndex) {
    // Update tabs
    document.querySelectorAll('.preview-tab').forEach((tab, index) => {
        if (index === pageIndex) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Update pages
    document.querySelectorAll('.preview-document').forEach((page, index) => {
        page.classList.toggle('active', index === pageIndex);
    });
}

// Export function now uses the worker-generated PDF
async function exportToPdf() {
    try {
        showLoading();
        // Use the current preview PDF data
        const pdfBytes = await currentPreviewPdf.getData();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${clientNameInput.value.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_intervention_plan.pdf`;
        link.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error exporting PDF:', error);
    } finally {
        hideLoading();
    }
}

// Initialize application
async function initialize() {
    try {
        initializeDOMElements();
        await Promise.all([
            initializeTensorflow(),
            loadGoalBank()
        ]);
        initializeEventListeners();
        updatePreview();
        
        // Add Generate Summary button handler
        const generateSummaryButton = document.getElementById('generateSummary');
        if (generateSummaryButton) {
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
        }
    } catch (error) {
        console.error('Error initializing application:', error);
    }
}

// Start the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', initialize);
