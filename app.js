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

async function initializeDOMElements() {
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
    
    // Load and initialize worker with template
    try {
        console.log('Loading template PDF...');
        const templateResponse = await fetch('IP_Blank.pdf');
        if (!templateResponse.ok) {
            throw new Error(`Failed to load template: ${templateResponse.status} ${templateResponse.statusText}`);
        }
        
        const templateBuffer = await templateResponse.arrayBuffer();
        const base64Template = btoa(String.fromCharCode(...new Uint8Array(templateBuffer)));
        console.log('Template loaded, initializing worker...');
        
        await new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('Worker initialization timeout'));
            }, 5000);

            const messageHandler = (e) => {
                if (e.data.type === 'initialized') {
                    clearTimeout(timeoutId);
                    pdfWorker.removeEventListener('message', messageHandler);
                    resolve();
                }
            };

            pdfWorker.addEventListener('message', messageHandler);
            pdfWorker.postMessage({ 
                type: 'init',
                templateData: base64Template
            });
        });

        console.log('Worker initialized successfully');
    } catch (error) {
        console.error('Failed to initialize worker with template:', error);
        throw error;
    }
}

// Handle messages from PDF Worker
async function handleWorkerMessage(e) {
    const { type, data, error } = e.data;

    switch (type) {
        case 'initialized':
            console.log('PDF Worker initialized with template');
            break;
            
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
    const language = languageSelect.value;
    
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
            duration,
            language
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
        
        const containerHeight = previewArea.clientHeight - 20;
        const heightScale = containerHeight / viewport.height;
        
        const containerWidth = previewArea.clientWidth - 20;
        const widthScale = containerWidth / viewport.width;
        
        const scale = Math.min(heightScale, widthScale) * 0.98;

        // Create tab container if it doesn't exist
        const tabsContainer = document.getElementById('previewTabs');
        if (!tabsContainer) {
            const tabs = document.createElement('div');
            tabs.id = 'previewTabs';
            previewArea.insertBefore(tabs, previewDocument);
        }

        // Render each page
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const scaledViewport = page.getViewport({ scale });

            // Create page container
            const pageContainer = document.createElement('div');
            pageContainer.className = 'preview-document';
            pageContainer.style.display = 'none';
            pageContainer.style.width = `${scaledViewport.width}px`;
            pageContainer.style.height = `${scaledViewport.height}px`;
            pageContainer.style.margin = '0 auto';
            pageContainer.dataset.pageNumber = pageNum;

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
            tab.className = 'preview-tab';
            tab.textContent = `Page ${pageNum}`;
            tab.dataset.pageNumber = pageNum;
            tab.onclick = () => switchPreviewPage(pageNum - 1);
            document.getElementById('previewTabs').appendChild(tab);
        }

        // Show first page and activate first tab
        switchPreviewPage(0);
    } catch (error) {
        console.error('Error updating PDF preview:', error);
    }
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
        if (index === pageIndex) {
            page.style.display = 'block';
            page.classList.add('active');
        } else {
            page.style.display = 'none';
            page.classList.remove('active');
        }
    });

    // Scroll the active tab into view
    const activeTab = document.querySelector('.preview-tab.active');
    if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
}

// Update preview panel
function updatePreview() {
    showLoading();
    // Clear existing preview
    previewDocument.innerHTML = '';
    document.getElementById('previewTabs').innerHTML = '';
    debouncedUpdatePreview();
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

// Update tabs based on selected categories
function updateTabs() {
    if (!goalsTabsElement) return;
    
    goalsTabsElement.innerHTML = '';
    
    // Create "All goals" tab
    const allTab = document.createElement('button');
    allTab.className = `goals-tab ${activeTab === null ? 'active' : ''}`;
    allTab.textContent = 'All goals';
    allTab.onclick = async () => {
        activeTab = null;
        document.querySelectorAll('.goals-tab').forEach(tab => tab.classList.remove('active'));
        allTab.classList.add('active');
        await updateGoalsList();
    };
    goalsTabsElement.appendChild(allTab);
    
    // Create tab for each selected category
    selectedCategories.forEach(category => {
        const tab = document.createElement('button');
        tab.className = `goals-tab ${activeTab === category ? 'active' : ''}`;
        tab.textContent = capitalizeWords(category);
        tab.onclick = async () => {
            activeTab = category;
            document.querySelectorAll('.goals-tab').forEach(tab => tab.classList.remove('active'));
            tab.classList.add('active');
            await updateGoalsList();
        };
        goalsTabsElement.appendChild(tab);
    });
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
        min-height: 1056px;
        max-height: 1056px;
        width: 816px;
        margin: 0 auto;
        overflow: hidden;
        position: relative;
    `;
    page.innerHTML = `<div class="preview-content-container"></div>`;
    return page;
}

// Export function uses html2pdf.js for final PDF generation
async function exportToPdf() {
    try {
        showLoading();

        // Create a container for the PDF content
        const container = document.createElement('div');
        container.style.visibility = 'hidden';
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        document.body.appendChild(container);

        // Clone the current preview pages
        const previewPages = document.querySelectorAll('.preview-document');
        previewPages.forEach(page => {
            const clonedPage = page.cloneNode(true);
            // Remove any display:none styling
            clonedPage.style.display = 'block';
            container.appendChild(clonedPage);
        });

        // Configure html2pdf options
        const opt = {
            margin: [108, 54, 108, 126], // [top, right, bottom, left] in points (72 points = 1 inch)
            filename: `${clientNameInput.value.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_intervention_plan.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2,
                useCORS: true,
                letterRendering: true,
                backgroundColor: '#ffffff'
            },
            jsPDF: { 
                unit: 'pt', 
                format: 'letter', 
                orientation: 'portrait'
            },
            pagebreak: {
                mode: ['avoid-all', 'css', 'legacy'],
                before: '.preview-document',
                after: '.preview-document',
                avoid: ['tr', 'td', '.goal-item'],
                bottomMargin: 108 // 1.5 inches in points (72 points = 1 inch)
            }
        };

        // Generate and save PDF
        await html2pdf().from(container).set(opt).save();

        // Clean up
        document.body.removeChild(container);
    } catch (error) {
        console.error('Error exporting PDF:', error);
        alert('Failed to export PDF. Please try again.');
    } finally {
        hideLoading();
    }
}

// Initialize TensorFlow and Universal Sentence Encoder
async function initializeTensorflow() {
    try {
        console.log('Loading Universal Sentence Encoder...');
        useModel = await use.load();
        console.log('Universal Sentence Encoder loaded successfully');
    } catch (error) {
        console.error('Error loading Universal Sentence Encoder:', error);
        useModel = null;
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
