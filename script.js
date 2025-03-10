// script.js - with dynamic API key input
let quiz = {
    questions: [],
    currentQuestion: 0,
    score: 0
};

// DOM Elements
const uploadSection = document.querySelector('.upload-section');
const quizSection = document.querySelector('.quiz-section');
const generateBtn = document.getElementById('generate-btn');
const questionContainer = document.getElementById('question-container');

// Create API Key UI
const apiKeyGroup = document.createElement('div');
apiKeyGroup.className = 'config-group api-key-group';
apiKeyGroup.innerHTML = `
    <label for="api-key">Perplexity API Key:</label>
    <input type="password" id="api-key" placeholder="Enter your API key">
    <button id="save-api-key" class="btn small-btn">Save</button>
    <button id="clear-api-key" class="btn small-btn">Clear</button>
    <span id="api-status"></span>
`;

// Insert API Key UI before the first child of upload-section
uploadSection.insertBefore(apiKeyGroup, uploadSection.firstChild);

// API Key Elements
const apiKeyInput = document.getElementById('api-key');
const saveApiKeyBtn = document.getElementById('save-api-key');
const clearApiKeyBtn = document.getElementById('clear-api-key');
const apiStatus = document.getElementById('api-status');

// Check for saved API key
const savedApiKey = localStorage.getItem('perplexity_api_key');
if (savedApiKey) {
    apiKeyInput.value = '••••••••••••••••';
    apiStatus.textContent = '✅ API key saved';
    apiStatus.style.color = 'green';
}

// Event Listeners
generateBtn.addEventListener('click', handleGenerate);
document.getElementById('restart-btn').addEventListener('click', resetQuiz);
document.getElementById('file-input').addEventListener('change', updateFileName);

// API Key Buttons
saveApiKeyBtn.addEventListener('click', saveApiKey);
clearApiKeyBtn.addEventListener('click', clearApiKey);

function saveApiKey() {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
        localStorage.setItem('perplexity_api_key', apiKey);
        apiKeyInput.value = '••••••••••••••••';
        apiStatus.textContent = '✅ API key saved';
        apiStatus.style.color = 'green';
    } else {
        apiStatus.textContent = '❌ Please enter an API key';
        apiStatus.style.color = 'red';
    }
}

function clearApiKey() {
    localStorage.removeItem('perplexity_api_key');
    apiKeyInput.value = '';
    apiStatus.textContent = '❌ API key cleared';
    apiStatus.style.color = 'red';
}

function getApiKey() {
    return localStorage.getItem('perplexity_api_key');
}

function updateFileName() {
    const fileInput = document.getElementById('file-input');
    const fileName = document.getElementById('file-name');
    
    if (fileInput.files.length > 0) {
        fileName.textContent = fileInput.files[0].name;
    } else {
        fileName.textContent = 'No file chosen';
    }
}

async function handleGenerate() {
    const apiKey = getApiKey();
    if (!apiKey) {
        alert('Please save your Perplexity API key first');
        apiKeyInput.focus();
        return;
    }

    const content = await getContent();
    if (!content) {
        alert('Please input content or upload a file');
        return;
    }
    
    showLoading(true);
    try {
        quiz.questions = await generateQuestions(content, apiKey);
        startQuiz();
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to generate questions: ' + error.message);
    } finally {
        showLoading(false);
    }
}

async function getContent() {
    const file = document.getElementById('file-input').files[0];
    if (file) {
        return await readFile(file);
    }
    return document.getElementById('text-input').value.trim();
}

function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

async function generateQuestions(content, apiKey) {
    const questionCount = document.getElementById('question-count').value;
    
    try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'pplx-7b-online',
                messages: [{
                    role: 'user',
                    content: `Generate ${questionCount} multiple-choice questions based on the following content. 
                    Format your response as a JSON array with the following structure:
                    [
                        {
                            "question": "Question text",
                            "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
                            "correct": 0,
                            "explanation": "Explanation text"
                        }
                    ]
                    
                    Content: ${content}`
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'API request failed');
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        // Extract JSON from the response
        let jsonStartIndex = content.indexOf('[');
        let jsonEndIndex = content.lastIndexOf(']') + 1;
        
        if (jsonStartIndex === -1 || jsonEndIndex === 0) {
            throw new Error('Invalid response format from API');
        }
        
        const jsonContent = content.substring(jsonStartIndex, jsonEndIndex);
        return JSON.parse(jsonContent);
    } catch (error) {
        console.error('API Error:', error);
        throw new Error('Failed to generate questions: ' + error.message);
    }
}

function startQuiz() {
    uploadSection.classList.add('hidden');
    quizSection.classList.remove('hidden');
    quiz.currentQuestion = 0;
    quiz.score = 0;
    renderQuestion();
}

function renderQuestion() {
    const current = quiz.questions[quiz.currentQuestion];
    
    const optionsHTML = current.options.map((opt, i) => `
        <div class="option" data-index="${i}">${String.fromCharCode(65 + i)}. ${opt}</div>
    `).join('');

    questionContainer.innerHTML = `
        <div class="question">
            <h3>${current.question}</h3>
            <div class="options">${optionsHTML}</div>
        </div>
    `;

    document.querySelectorAll('.option').forEach(option => {
        option.addEventListener('click', handleAnswer);
    });

    updateProgress();
}

function handleAnswer(e) {
    const selectedIndex = parseInt(e.target.dataset.index);
    const current = quiz.questions[quiz.currentQuestion];
    const correctIndex = current.correct;
    
    // Mark correct/incorrect
    document.querySelectorAll('.option').forEach(opt => {
        const optIndex = parseInt(opt.dataset.index);
        if (optIndex === correctIndex) {
            opt.classList.add('correct');
        } else if (optIndex === selectedIndex) {
            opt.classList.add('incorrect');
        }
        opt.style.pointerEvents = 'none';
    });
    
    // Add explanation
    const explanationDiv = document.createElement('div');
    explanationDiv.className = 'explanation';
    explanationDiv.innerHTML = `
        <p><strong>${selectedIndex === correctIndex ? 'Correct!' : 'Incorrect!'}</strong></p>
        <p>${current.explanation}</p>
    `;
    questionContainer.appendChild(explanationDiv);
    
    // Update score
    if (selectedIndex === correctIndex) {
        quiz.score++;
    }
    
    // Enable next button or show final score
    setTimeout(() => {
        quiz.currentQuestion++;
        if (quiz.currentQuestion < quiz.questions.length) {
            renderQuestion();
        } else {
            showFinalScore();
        }
    }, 2000);
    
    updateProgress();
}

function updateProgress() {
    document.getElementById('progress').textContent = 
        `Question ${quiz.currentQuestion + 1}/${quiz.questions.length}`;
    document.getElementById('score').textContent = 
        `Score: ${quiz.score}`;
}

function showFinalScore() {
    questionContainer.innerHTML = `
        <div class="final-score">
            <h2>Quiz Complete!</h2>
            <p>Your score: ${quiz.score} out of ${quiz.questions.length}</p>
            <p class="percentage">
                ${Math.round((quiz.score / quiz.questions.length) * 100)}%
            </p>
        </div>
    `;
}

function resetQuiz() {
    uploadSection.classList.remove('hidden');
    quizSection.classList.add('hidden');
}

function showLoading(show) {
    document.querySelector('.loading-overlay').classList.toggle('hidden', !show);
}

// Add some extra styling for new elements
document.head.insertAdjacentHTML('beforeend', `
<style>
    .api-key-group {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin: 1rem 0;
        justify-content: center;
    }
    
    #api-key {
        padding: 0.5rem;
        border: 2px solid #e2e8f0;
        border-radius: 0.5rem;
        width: 250px;
    }
    
    .small-btn {
        padding: 0.4rem 0.8rem;
        font-size: 0.9rem;
    }
    
    #api-status {
        font-size: 0.9rem;
        margin-left: 0.5rem;
    }
    
    .explanation {
        margin-top: 1rem;
        padding: 1rem;
        background: #f1f5f9;
        border-radius: 0.5rem;
        border-left: 4px solid var(--primary-color);
    }
    
    .final-score {
        text-align: center;
        padding: 2rem;
    }
    
    .percentage {
        font-size: 2rem;
        font-weight: bold;
        color: var(--primary-color);
        margin: 1rem 0;
    }
</style>
`);
