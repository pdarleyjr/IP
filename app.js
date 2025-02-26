// app.js
document.addEventListener('DOMContentLoaded', function() {
    // IndexedDB setup
    const db = new Dexie('InterventionDB');
    // Add state object to store client information
    let clientState = {
        name: '',
        dob: '',
        ageYears: '',
        ageMonths: '',
        planDate: '',
        frequency: '' // Added frequency
    };

    // Function to update client state
    function updateClientState() {
        const clientNameInput = document.getElementById('clientName');
        const dobInput = document.getElementById('dob');
        const planDateInput = document.getElementById('planDate');
        const ageYearsInput = document.getElementById('ageYears');
        const ageMonthsInput = document.getElementById('ageMonths');
        const frequencyInput = document.getElementById('frequency');
        
        if (clientNameInput && dobInput && planDateInput && ageYearsInput && ageMonthsInput && frequencyInput) {
            clientState.name = clientNameInput.value;
            clientState.dob = dobInput.value;
            clientState.ageYears = ageYearsInput.value;
            clientState.ageMonths = ageMonthsInput.value;
            clientState.planDate = planDateInput.value;
            clientState.frequency = frequencyInput.value;
            console.log('Client state updated:', clientState);
        }
    }

    // Database schema definition
    // Add after populateDatabase function
    function analyzeGoals(goals) {
        const patterns = {
            language: 0,
            articulation: 0,
            fluency: 0,
            voice: 0,
            pragmatic: 0,
            cognitive: 0,
            executive: 0
        };

        const domainKeywords = {
            language: ['vocabulary', 'grammar', 'syntax', 'comprehension', 'expression'],
            articulation: ['sound', 'pronunciation', 'phonology', 'intelligibility'],
            fluency: ['stuttering', 'rhythm', 'rate', 'fluency'],
            voice: ['vocal', 'resonance', 'pitch', 'loudness'],
            pragmatic: ['social', 'conversation', 'interaction', 'nonverbal'],
            cognitive: ['memory', 'attention', 'processing', 'problem-solving'],
            executive: ['planning', 'organization', 'self-regulation', 'metacognition']
        };

        goals.forEach(goal => {
            const text = goal.text.toLowerCase();
            Object.entries(domainKeywords).forEach(([domain, keywords]) => {
                if (keywords.some(keyword => text.includes(keyword))) {
                    patterns[domain]++;
                }
            });
        });

        return patterns;
    }

    // Define database schema with an incremented version number
    db.version(5).stores({
        categories: 'id, name',
        goals: 'id, category, text, domain, complexity',
        sampleText: 'id, category, text',
        interventionTemplates: 'id, content, type, domain',
        categoryDescriptions: 'id, category, description',
        assessmentInfo: 'id, domain, description, approach'
    });
    
        // Add assessment information population
        async function populateAssessmentInfo() {
            const assessmentData = [
                {
                    id: 1,
                    domain: 'comprehensive',
                    description: 'Based on thorough standardized and informal assessments',
                    approach: 'Multimodal evaluation incorporating both clinical observation and structured testing'
                },
                {
                    id: 2,
                    domain: 'functional',
                    description: 'Analysis of real-world communication needs',
                    approach: 'Assessment of daily communication challenges and opportunities'
                },
                {
                    id: 3,
                    domain: 'cognitive',
                    description: 'Evaluation of supporting cognitive skills',
                    approach: 'Assessment of executive functioning and cognitive communication abilities'
                }
            ];
            await db.assessmentInfo.bulkAdd(assessmentData);
        }

        // Add category descriptions population
        async function populateCategoryDescriptions() {
            const categoryDescriptionsData = [
                {
                    id: 1,
                    category: 'articulation',
                    description: `Articulation goals are centered on improving the clarity of speech sounds and the precision of pronunciation. 
                    These goals typically involve exercises to correct tongue placement, strengthen the muscles used in speech, 
                    and enhance overall intelligibility in conversational speech. Specific tasks may include reducing tongue protrusion, 
                    improving labial seals (the ability to close lips fully), correcting specific sound production such as lingual alveolar 
                    sounds like /t, d, n/, and decreasing errors like final consonant deletion and velar assimilation.`
                },
                {
                    id: 2,
                    category: 'attention',
                    description: `Attention goals focus on enhancing the ability to maintain focus and engagement during tasks and conversations. 
                    These are crucial for effective communication and learning in therapy settings and real-world interactions. 
                    Typical objectives include consistently responding to one's name, participating in turn-taking activities, 
                    improving the capacity to follow multi-step directions, and increasing the duration and quality of attention 
                    during less preferred or adult-directed tasks.`
                },
                {
                    id: 3,
                    category: 'executive',
                    description: `Executive functioning goals aim to boost higher-level cognitive skills that influence communication, 
                    such as working memory, problem-solving, planning, and sequencing. Improving these skills helps clients better 
                    manage and organize their thoughts and actions, particularly in complex communicative situations. Goals often include 
                    sequencing picture scenes or steps in a process, making inferences and improving problem-solving abilities, 
                    organizing thoughts coherently when recounting events or stories, and prioritizing tasks and managing time 
                    effectively during communication tasks.`
                },
                {
                    id: 4,
                    category: 'expressive',
                    description: `Expressive language goals target the enhancement of spoken language abilities. This includes increasing 
                    vocabulary, sentence length, grammatical accuracy, and the ability to express thoughts, feelings, and ideas more clearly. 
                    Objectives might involve expanding the variety and complexity of words used in conversation, formulating sentences that 
                    are both age-appropriate and grammatically correct, and using language for different functions such as requesting, 
                    narrating, or explaining.`
                },
                {
                    id: 5,
                    category: 'fluency',
                    description: `Fluency goals focus on smoothing the flow of speech. This category often addresses issues such as stuttering 
                    or cluttering, where the flow of speech may be interrupted by repetitions, prolongations, or unnecessary fillers. 
                    Goals here might include using techniques like slow speech, light contact, and easy onset to manage and reduce disfluencies, 
                    and discriminating between "smooth" and "bumpy" speech to increase self-awareness of fluency issues.`
                },
                {
                    id: 6,
                    category: 'pragmatic',
                    description: `Pragmatic goals aim to enhance social communication skills. This includes improving the use of language in 
                    social contexts, such as knowing when and how to use polite forms, understanding and using body language, and improving 
                    conversational skills. Objectives in this category could involve identifying and using appropriate language in different 
                    social situations, understanding and expressing emotions through language, and enhancing problem-solving skills in social interactions.`
                },
                {
                    id: 7,
                    category: 'receptive',
                    description: `Receptive language goals focus on improving the ability to understand and process language. These goals ensure 
                    that individuals can follow conversations, comprehend instructions, and make sense of the information they receive through 
                    listening or reading. Common goals include enhancing the ability to follow spoken directions of increasing complexity, 
                    improving comprehension of questions and stories, and increasing the capacity to recognize and understand vocabulary and concepts.`
                }
            ];
            await db.categoryDescriptions.bulkAdd(categoryDescriptionsData);
        }
    
        // Enhance the intro text generation
        // Update the generateIntroText function for better content structure
            function generateIntroText(patterns, clientName) {
                const dominantDomains = Object.entries(patterns)
                    .filter(([_, count]) => count > 0)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4)
                    .map(([domain]) => domain);
            const domainDescriptions = {
                language: 'receptive-expressive language development',
                articulation: 'speech sound production and intelligibility',
                fluency: 'speech fluency and rhythm patterns',
                voice: 'voice quality and resonance',
                pragmatic: 'social communication and pragmatic language',
                cognitive: 'cognitive-communication abilities',
                executive: 'executive functioning and self-regulation'
            };
            
            // Get more detailed descriptions for the dominant domains
            const focusAreas = dominantDomains.map(d => domainDescriptions[d]).join(', ');
            
            // Create a more comprehensive introduction
            return `
                ${clientName} was evaluated through comprehensive diagnostic assessment procedures 
                including standardized testing, clinical observation, and analysis of functional 
                communication needs. Based on the evaluation results, this intervention plan has 
                been developed to address ${clientName}'s needs in ${focusAreas}.
                
                This intervention plan is designed to target specific areas of communication development
                through evidence-based therapeutic approaches. The goals outlined in this plan are
                structured to build progressively on ${clientName}'s current abilities, with regular
                assessment of progress to ensure optimal outcomes. Therapy will incorporate a variety
                of modalities including direct instruction, guided practice, and naturalistic
                communication opportunities to promote generalization of skills across different
                contexts and environments.
        `;
    }
    // Add implementation strategy generation
    function generateImplementationStrategy(clientName, patterns) {
        const strategies = [];
        if (patterns.language > 0) {
            strategies.push(`Language development activities will be integrated throughout sessions, focusing on both comprehension and expression in natural communication contexts.`);
        }
        if (patterns.articulation > 0) {
            strategies.push(`Speech production exercises will utilize a systematic approach, incorporating visual and tactile cues to support accurate sound production.`);
        }
        if (patterns.pragmatic > 0) {
            strategies.push(`Social communication skills will be addressed through structured activities and real-world practice opportunities.`);
        }
        if (patterns.executive > 0) {
            strategies.push(`Executive functioning support will be embedded within activities to enhance planning, organization, and self-monitoring skills.`);
        }
        if (patterns.receptive > 0) {
            strategies.push(`Receptive language activities will focus on improving comprehension of increasingly complex language concepts and following multi-step directions.`);
        }
        if (patterns.attention > 0) {
            strategies.push(`Attention-focused strategies will be incorporated to improve sustained focus during communication tasks and increase engagement in therapeutic activities.`);
        }
    
        return `
                To achieve these objectives, ${clientName}'s intervention plan incorporates:
                ${strategies.join(' ')}
        
                Progress will be monitored through ongoing assessment and data collection, allowing for dynamic 
                adjustment of therapeutic strategies to ensure optimal outcomes. Parent/caregiver education and 
                involvement will be emphasized to support carryover of skills to home and community settings.
                
                Therapy sessions will utilize a combination of structured activities and naturalistic 
                communication opportunities to promote generalization of skills. Materials and activities 
                will be selected based on ${clientName}'s interests and developmental level to maximize 
                engagement and motivation. Regular progress updates will be provided to track advancement 
                toward the established goals.
        `;
    }
    function generateLongTermObjectives(patterns, clientName, selectedCategories = []) {
        const objectives = [];
        const thresholds = {
            // Domain thresholds
            language: 2,
            articulation: 2,
            fluency: 1,
            voice: 1,
            pragmatic: 2,
            cognitive: 2,
            executive: 2
        };
    
        
        // Add objectives based on selected categories
        if (selectedCategories.includes('articulation')) {
            objectives.push(`${clientName} will achieve improved speech intelligibility through accurate production of age-appropriate speech sounds.`);
        }
        if (selectedCategories.includes('executive')) {
            objectives.push(`To improve executive functioning and self-regulation skills`);
        }
        if (selectedCategories.includes('pragmatic')) {
            objectives.push(`To enhance social communication skills and pragmatic language abilities`);
        }
        if (selectedCategories.includes('attention')) {
            objectives.push(`To improve attention and auditory processing skills`);
        }
        if (selectedCategories.includes('expressive')) {
            objectives.push(`${clientName} will demonstrate age-appropriate expressive language skills for functional communication needs.`);
        }
        if (selectedCategories.includes('fluency')) {
            objectives.push(`To improve speech fluency and communication confidence`);
        }
        if (selectedCategories.includes('receptive')) {
            objectives.push(`${clientName} will demonstrate age-appropriate receptive language skills for functional communication needs.`);
        }
        
        Object.entries(patterns).forEach(([domain, count]) => {
            if (count >= thresholds[domain]) {
                switch(domain) {
                    case 'language':
                        objectives.push(`${clientName} will demonstrate age-appropriate receptive and expressive language skills for functional communication needs.`);
                        break;
                    case 'articulation':
                        objectives.push(`${clientName} will achieve improved speech intelligibility through accurate production of age-appropriate speech sounds.`);
                        break;
                    case 'fluency':
                        objectives.push('To improve speech fluency and communication confidence');
                        break;
                    case 'voice':
                        objectives.push('To develop appropriate vocal quality and resonance');
                        break;
                    case 'pragmatic':
                        objectives.push('To enhance social communication skills and pragmatic language abilities');
                        break;
                    case 'cognitive':
                        objectives.push('To strengthen cognitive-communication skills');
                        break;
                    case 'executive':
                        objectives.push('To improve executive functioning and self-regulation skills');
                        break;
                }
            }
        });
    
        return objectives;
    }
    // Function to populate database (if empty)
    async function populateDatabase() {
        try {
            const categoriesCount = await db.categories.count();
            
            if (categoriesCount === 0) {
                // Load and parse goals.json
                const response = await fetch('data/goals.json');
                if (!response.ok) throw new Error('Failed to load goals.json');
                
                const goalsData = await response.json();
                
                // Extract unique categories and create category records
                const uniqueCategories = [...new Set(goalsData.map(goal => goal.category))];
                const categories = uniqueCategories.map((name, index) => ({
                    id: index + 1,
                    name: name
                }));
                
                // Batch insert categories
                await db.categories.bulkAdd(categories);
                
                // Prepare and insert goals
                const goals = goalsData.map((goal, index) => ({
                    id: index + 1,
                    category: goal.category,
                    text: goal.text,
                    domain: goal.domain || 'general',
                    complexity: goal.complexity || 'medium'
                }));
                
                await db.goals.bulkAdd(goals);
                
                console.log('Database successfully populated');
                await populateAssessmentInfo();
                await populateCategoryDescriptions();
            }
        } catch (error) {
            console.error('Error populating database:', error);
            throw error;
        }
    }

    const appContainer = document.getElementById('app-container');

    // Step 1: Client Information
    function showClientInfo() {
        const section = document.createElement('div');
        section.className = 'client-info-section';
    
        const form = document.createElement('form');

        // Add logo to the top of the client info page
        const logoContainer = document.createElement('div');
        logoContainer.className = 'logo-container';
 
        logoContainer.innerHTML = `<img src="logo.png" alt="IPLC Logo" class="logo">`;
        section.appendChild(logoContainer);
        
        form.className = 'client-info';
        form.innerHTML = `
            <h2 class="client-info-title">Client Information</h2>
            <div>
                <label for="clientName">Client Name:</label>
                <input type="text" id="clientName" name="clientName" required>
            </div>
            <div>
                <label for="dob">Date of Birth:</label>
                <input type="date" id="dob" name="dob" required>
            </div>
            <div>
                <label for="planDate">Plan Date:</label>
                <input type="date" id="planDate" name="planDate" required>
            </div>
            <div>
                <input type="hidden" id="ageYears" name="ageYears">
                <input type="hidden" id="ageMonths" name="ageMonths">
                <label for="ageDisplay">Age:</label>
                <input type="text" id="ageDisplay" name="ageDisplay" readonly>
            </div>
            <div>
                <label for="frequency">Sessions per Week:</label>
                <input type="number" id="frequency" name="frequency" min="1" max="7" required>
            </div>
            <div>
                <label for="sessionDuration">Session Duration:</label>
                <select id="sessionDuration" name="sessionDuration" required>
                    <option value="">Select duration</option>
                    <option value="15">15 minutes</option>
                    <option value="20">20 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="120">2 hours</option>
                </select>
            </div>
            <div class="button-group">
                <button type="button" id="nextButton">Next: Select Categories</button>
            </div>
        `;
    // Add to DOM before getting elements
    section.appendChild(form);
    appContainer.innerHTML = '';
    appContainer.appendChild(section);
    // Function to calculate age based on DOB and plan date
    function calculateAge() {
        const dob = dobInput.value;
        const planDate = planDateInput.value;
        
        if (dob && planDate) {
            const dobDate = new Date(dob);
            const planDateTime = new Date(planDate);
            const diffTime = planDateTime - dobDate;
            const diffDays = diffTime / (1000 * 60 * 60 * 24);
            const years = Math.floor(diffDays / 365.25);
            const remainingDays = diffDays % 365.25;
            const months = Math.floor(remainingDays / 30.44);
            
            ageYearsInput.value = years;
            ageMonthsInput.value = months;
            ageDisplay.value = `${years} years, ${months} months`;
        }
    }
    // Add event listeners for automatic age calculation
    const dobInput = document.getElementById('dob');
    const planDateInput = document.getElementById('planDate');
    const ageYearsInput = document.getElementById('ageYears');
    const ageMonthsInput = document.getElementById('ageMonths');
    const ageDisplay = document.getElementById('ageDisplay');
    const clientNameInput = document.getElementById('clientName');
    const frequencyInput = document.getElementById('frequency');
    
    // Add event listener for the next button
    const nextButton = document.getElementById('nextButton');
    nextButton.addEventListener('click', showCategorySelection);
    
    // Add event listeners to trigger age calculation when either date changes
    dobInput.addEventListener('change', calculateAge);
    planDateInput.addEventListener('change', calculateAge);
    
    // Add event listeners to update client state when form values change
    document.querySelectorAll('input, select').forEach(input => input.addEventListener('change', updateClientState));
}    // Step 2: Category Selection
    async function showCategorySelection() {
        const categories = await db.categories.toArray();
        
        const section = document.createElement('div');
        section.className = 'category-selection';
    
        const heading = document.createElement('h2');
        heading.textContent = 'Select Categories';
        section.appendChild(heading);
    
        const grid = document.createElement('div');
        grid.className = 'category-grid';
    
        categories.forEach(category => {
            const card = document.createElement('div');
            card.className = 'category-card';
            
            // Format category names properly
            let displayName = category.name;
            switch(category.name.toLowerCase()) {
                case 'articulation':
                    displayName = 'Articulation';
                    break;
                case 'executive':
                    displayName = 'Executive functioning';
                    break;
                case 'pragmatic':
                    displayName = 'Pragmatics';
                    break;
                case 'attention':
                    displayName = 'Attention';
                    break;
                case 'expressive':
                    displayName = 'Expressive language skills';
                    break;
                case 'fluency':
                    displayName = 'Fluency';
                    break;
                case 'receptive':
                    displayName = 'Receptive language skills';
                    break;
            }
            card.textContent = displayName;
            card.dataset.category = category.name;
            
            card.addEventListener('click', () => {
                card.classList.toggle('selected');
            });
            
            grid.appendChild(card);
        });
    
        section.appendChild(grid);
    
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'button-group';
    
        const backButton = document.createElement('button');
        backButton.textContent = 'Back to Client Info';
        backButton.className = 'secondary';
        backButton.addEventListener('click', showClientInfo);
    
        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next: Select Goals';
        nextButton.addEventListener('click', () => {
            const selectedCategories = Array.from(document.querySelectorAll('.category-card.selected'))
                .map(card => card.dataset.category);
    
            if (selectedCategories.length > 0) {
                showGoalSelection(selectedCategories);
            } else {
                alert('Please select at least one category');
            }
        });
    
        buttonGroup.appendChild(backButton);
        buttonGroup.appendChild(nextButton);
        section.appendChild(buttonGroup);
    
        appContainer.innerHTML = '';
        appContainer.appendChild(section);
    }
    
    // Step 3: Goal Selection
    async function showGoalSelection(selectedCategories) {
        const section = document.createElement('div');
        section.className = 'goal-selection';
    
        const heading = document.createElement('h2');
        heading.textContent = 'Select Goals';
        section.appendChild(heading);
    
        const goalList = document.createElement('ul');
        goalList.className = 'goal-list';

        // Create tabs for categories
        const tabContainer = document.createElement('div');
        tabContainer.className = 'category-tabs';
        
        // Create content container for goals
        const goalContentContainer = document.createElement('div');
        goalContentContainer.className = 'goal-content-container';
    
        for (const category of selectedCategories) {
            // Create tab for this category
            const tab = document.createElement('div');
          tab.className = 'category-tab';
            tab.dataset.category = category;
            
            // Format category names properly
            let displayName = category;
            switch(category.toLowerCase()) {
                case 'articulation':
                    displayName = 'Articulation';
                    break;
                case 'executive':
                    displayName = 'Executive functioning';
                    break;
                case 'pragmatic':
                    displayName = 'Pragmatics';
                    break;
                case 'attention':
                    displayName = 'Attention';
                    break;
                case 'expressive':
                    displayName = 'Expressive language skills';
                    break;
                case 'fluency':
                    displayName = 'Fluency';
                    break;
                case 'receptive':
                    displayName = 'Receptive language skills';
                    break;
            }
            tab.textContent = displayName;
            tabContainer.appendChild(tab);
            
            // Create content div for this category
            const categoryContent = document.createElement('div');
            categoryContent.className = 'category-content';
            categoryContent.dataset.category = category;
            categoryContent.style.display = 'none'; // Hide initially
    
            const goals = await db.goals.where('category').equals(category).toArray();
            
            goals.forEach(goal => {
                // Ensure goal text starts with lowercase "will"
                goal.text = goal.text.replace(/^Will /, 'will ');
                
                if (goal.text !== 'Articulation goals' && goal.text !== 'Apraxia' && 
                    goal.text !== 'Serial recall' && goal.text !== 'Identify what comes before versus after' && 
                    goal.text !== 'Unscramble words' && goal.text !== 'Sort items by category' && 
                    !goal.text.match(/^Regular |^Future |^Pronouns|^Irregular /)) {
                    
                      const li = document.createElement('li');
    
    
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.id = `goal-${goal.id}`;
                    checkbox.value = goal.id;
    
                checkbox.dataset.category = category;
        
                    const label = document.createElement('label');
                    label.htmlFor = `goal-${goal.id}`;
                    label.textContent = goal.text;
    
    
                    li.appendChild(checkbox);
                    li.appendChild(label);
                    categoryContent.appendChild(li);
                }
            });
            
            goalContentContainer.appendChild(categoryContent);
        }
        
        // Make the first tab active
        if (selectedCategories.length > 0) {
            const firstTab = tabContainer.querySelector('.category-tab');
            const firstContent = goalContentContainer.querySelector('.category-content');
            if (firstTab && firstContent) {
                firstTab.classList.add('active');
                firstContent.style.display = 'block';
            }
        }
        
        // Add tab click event listeners
        tabContainer.querySelectorAll('.category-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                // Hide all content and deactivate all tabs
                goalContentContainer.querySelectorAll('.category-content').forEach(content => {
                    content.style.display = 'none';
                });
                tabContainer.querySelectorAll('.category-tab').forEach(t => {
                    t.classList.remove('active');
                });
                
                // Show selected content and activate tab
                const category = tab.dataset.category;
                goalContentContainer.querySelector(`.category-content[data-category="${category}"]`).style.display = 'block';
                tab.classList.add('active');
            });
        }
);
    
        section.appendChild(tabContainer);
        section.appendChild(goalContentContainer);
    
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'button-group';
    
        const backButton = document.createElement('button');
        backButton.textContent = 'Back to Categories';
        backButton.className = 'secondary';
        backButton.addEventListener('click', () => showCategorySelection());
    
        const nextButton = document.createElement('button');
        nextButton.textContent = 'Generate Summary';
        nextButton.addEventListener('click', () => {
            const selectedGoalsCount = document.querySelectorAll('input[type="checkbox"]:checked').length;
            if (selectedGoalsCount > 0) {
                updateClientState(); // Update client state before generating summary
                generateSummary();
            } else {
                alert('Please select at least one goal');
            }
        });
    
        buttonGroup.appendChild(backButton);
        buttonGroup.appendChild(nextButton);
        section.appendChild(buttonGroup);
    
        appContainer.innerHTML = '';
        appContainer.appendChild(section);
    }
    
    /**
     * Step 4: Generate Summary and Preview
     */
    // Update generateSummary function with enhanced styling and structure
    async function generateSummary() {
        console.log('Generating summary with client state:', clientState);
        const {name: clientName, dob, ageYears, ageMonths, planDate, frequency } = clientState;
        const selectedGoals = [];
        const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
        for (const checkbox of checkboxes) {
            const goalId = checkbox.value;
            const goal = await db.goals.get(parseInt(goalId));
            // Add category to the goal object
            goal.category = checkbox.dataset.category;
            // Ensure goal text starts with lowercase "will"
            goal.text = goal.text.replace(/^Will /, 'will ');
            selectedGoals.push(goal);
        }
    
        const patterns = analyzeGoals(selectedGoals);
        const introText = generateIntroText(patterns, clientName);
        
        // Extract unique categories from selected goals
        const selectedCategories = Array.from(new Set(selectedGoals.map(goal => goal.category)));
        
        const longTermObjectives = generateLongTermObjectives(patterns, clientName, selectedCategories);
        const implementationText = generateImplementationStrategy(clientName, patterns);
        
        // Create the preview window
        const previewWindow = window.open('', '_blank');
        if (!previewWindow) {
            alert('Please allow pop-ups to view the summary');
            return;
        }

        // Create the HTML content for the preview window
        const summaryHTML = `<!DOCTYPE html>
<html lang="en" class="hyphenate">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Intervention Plan Preview</title>
    <style>
        @page {
            margin: 0.5in;
            size: letter;
        }
        body {
            font-family: 'Times New Roman', Times, serif;
            line-height: 1.6;
            color: #000;
            margin: 0;
            padding: 0;
            font-size: 12pt;
            -webkit-hyphens: auto;
            -ms-hyphens: auto;
            -moz-hyphens: auto;
            hyphens: auto;
            hyphenate-limit-chars: 6 3 3;
            hyphenate-limit-lines: 2;
            hyphenate-limit-last: always;
            hyphenate-limit-zone: 8%;
            hyphenate-limit-after: 3;
            hyphenate-limit-before: 3;
            word-wrap: break-word;
            background-color: white;
        }
        #plan-container {
            width: 8.5in;
            max-width: 100%;
            margin: 0 auto;
            background: white;
            position: relative;
            box-sizing: border-box;
            flex-direction: column;
        }
        .document-content {
            display: flex;
            align-items: flex-start;
            margin: 0;
            position: relative;
        }
        .banner-image {
            width: 115px;
            margin-right: 20px;
        }
        .text-content {
            flex: 1;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.2in;
            padding: 0.3in 0.5in 0.1in 0.5in;
            border-bottom: 1px solid #f0f0f0;

        }
        .header img {
            height: 1.5in; /* Increased by 30% */
            float: right; /* Move to the right */
        }

        .client-info {
            width: 98%;
            margin: 0;
            background-color: #f5f5f5;
            padding: 12px;
            border-radius: 5px;
        }
        .client-info p {
            margin: 0.1in 0;
            font-size: 11.5pt;
        }
        .summary {
            padding: 0;
        }
        h2 {
            color: #003366;
            font-size: 14pt;
            page-break-before: auto;
            font-weight: 600;
            margin-top: 0.3in;
            margin-bottom: 0.2in;
            border-bottom: 1px solid #003366;
            padding-bottom: 0.1in;
        }
        ul {
            margin: 0.2in 0;
            padding-left: 0.25in;
        }
        .summary-text {
            page-break-inside: avoid;
            margin-top: 0.1in;
            break-inside: avoid;
        }
        .objectives-list {
            page-break-before: auto;
            page-break-after: auto;
            text-align: justify;
            margin: 0.15in 0;
        }
        li {
            margin-bottom: 0.12in;
            page-break-inside: avoid;
            break-inside: avoid;
            text-align: justify;
            line-height: 1.4;
            font-size: 11.5pt;
            -webkit-hyphens: auto;
            -ms-hyphens: auto;
            -moz-hyphens: auto;
            hyphens: auto;
        }
        .summary p {
            text-align: justify;
            margin: 0.2in 0;
            line-height: 1.6;
            font-size: 12pt;
        }
        .implementation-text {
            page-break-before: auto;
            page-break-after: auto;
            text-align: justify;
            line-height: 1.6;
            -webkit-hyphens: auto;
            -ms-hyphens: auto;
            -moz-hyphens: auto;
            hyphens: auto;
        }
        @media print {
            .download-btn {
                display: none !important;
                visibility: hidden !important;
            }
        }
        .footer {
            margin-top: 0.8in;
            text-align: center;
            font-size: 11pt;
            line-height: 1.8;
            border-top: 1px solid #003366;
            padding: 0.2in 0.5in 0.5in 0.5in;
            background-color: #f5f5f5;
        }
        .footer a {
            color: #003366;
            text-decoration: none;
        }
        .download-btn {
            text-align: center;
            margin-top: 20px;
            padding-bottom: 20px;
        }
        .download-btn button {
            padding: 10px 20px;
            background-color: #003366;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        }
        .page-break {
            page-break-before: always;
        }
        .avoid-break {
            page-break-inside: avoid;
        }
        .html2pdf__page-break {
            height: 0;
            page-break-before: always;
            margin: 0;
        }
        .page-header-container {
            display: flex;
        }
        .page-content {
            display: flex;
            flex-direction: column;
        }
    </style>
</head>
<body>
    <div id="plan-container">
        <!-- Header with logo -->
        <div class="header">
            <div></div>
            <img src="logo.png" alt="IPLC Logo" style="margin-left: auto;">
            
        </div>

        <!-- Document content with banner image and text -->
        <div class="document-content">
            <!-- Banner image on the left -->
            <div class="banner-image">
                <img src="images/Intervention Plan.png" alt="Intervention Plan Banner" style="width: 100%;">
            </div>
            
            <!-- Text content on the right -->
            <div class="text-content">
                <div class="client-info">
                    <p><strong>Name:</strong> ${clientName}</p>
                    <p><strong>Date of Birth:</strong> ${new Date(dob).toLocaleDateString()}</p>
                    <p><strong>Age:</strong> ${ageYears || ''} years, ${ageMonths || ''} months</p>
                    <p><strong>Frequency:</strong> ${frequency} sessions per week</p>
                    <p><strong>Plan Date:</strong> ${new Date(planDate).toLocaleDateString()}</p>
                </div>
                
                <h2>Intervention Plan Summary</h2>
                <div class="summary-text" contenteditable="true">${introText}</div>
                
                <div>
                    <h2>Long Term Objectives</h2>
                    <ul class="objectives-list" contenteditable="true">
                        ${longTermObjectives.map(obj => `<li>${obj.endsWith('.') ? obj : obj + '.'}</li>`).join('')}
                    </ul>
                
                </div>

                <div>
                    <h2>Short Term Objectives</h2>
                    <ul class="objectives-list">
                        ${selectedGoals.map(goal => {
                            // Format category name properly
                            let categoryDisplay = goal.category.charAt(0).toUpperCase() + goal.category.slice(1).toLowerCase();
                            let goalText = goal.text.charAt(0).toLowerCase() + goal.text.slice(1);
                            if (!goalText.endsWith('.')) {
                                goalText += '.';
                            }
                            return `<li contenteditable="true">To improve overall ${categoryDisplay}, ${clientName} ${goalText}</li>`;
                        }).join('')}
                    </ul>
                </div>
                
                <div>
                    <h2>Implementation Plan</h2>
                    <div class="implementation-text" contenteditable="true">${implementationText}</div>
                </div>
            </div>
        </div>
        <div class="footer">
            <strong>Innovative Pediatric Learning Center of Miami</strong><br>
            7780 SW 87th Avenue, Suite 203, Miami, FL 33173<br>
            <a href="tel:786-622-2353">786-622-2353</a> | 
            <a href="mailto:info@IPLCmiami.com">info@IPLCmiami.com</a> | 
            <a href="https://www.IPLCmiami.com">www.IPLCmiami.com</a>
        </div>
        <div class="download-btn no-print">
            <button id="downloadPdfBtn">Download PDF</button>
        </div>
    </div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    <script>
            // Function to handle PDF generation
        document.getElementById('downloadPdfBtn').addEventListener('click', function() {
            const element = document.getElementById('plan-container');
            const options = {
                filename: '${clientName.replace(/[^a-z0-9]/gi, '_')}_intervention_plan.pdf',
                margin: [0.5, 0.5, 0.5, 0.5],
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { 
                    scale: 2,
                        ignoreElements: (element) => element.classList.contains('no-print'),
                    useCORS: true,
                    letterRendering: true,
                    scrollY: 0
                },
                jsPDF: { 
                    unit: 'in',
                    format: 'letter',
                    orientation: 'portrait',
                    compress: true,
                    enableLinks: true
                },
                pagebreak: { 
                    mode: ['css', 'legacy'], 
                    before: '.page-break', 
                    after: '.page-break', 
                    avoid: 'h2',
                    allowOrphans: true
                }
            };
            
            // Generate PDF
            html2pdf().set(options).from(element).save();
        });
    </script>
</body>
</html>`;

        previewWindow.document.open();
        previewWindow.document.write(summaryHTML);
        previewWindow.document.close();
    }

    // Initialize the app
    populateDatabase().then(() => {
        showClientInfo();
    }).catch(error => {
        console.error('Error initializing app:', error);
    });
}); // Add closing brace and parenthesis for DOMContentLoaded event listener