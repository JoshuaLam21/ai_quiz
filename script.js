document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('api-key');
    const saveApiKeyBtn = document.getElementById('save-api-key');
    const clearApiKeyBtn = document.getElementById('clear-api-key');
    const apiStatus = document.getElementById('api-status');
    const generateBtn = document.getElementById('generate-btn');
    const contentInput = document.getElementById('content-input');
    const quizResults = document.getElementById('quiz-results');
    const loading = document.getElementById('loading');

    // 初始化API密鑰
    const savedApiKey = localStorage.getItem('openrouter_api_key');
    if (savedApiKey) {
        apiKeyInput.value = '••••••••••••••••';
        apiStatus.textContent = '✅ 密鑰已保存';
        apiStatus.style.color = 'green';
    }

    // 問題數量處理邏輯
    const finalQuestionCount = document.getElementById('final-question-count');
    const questionCountInput = document.getElementById('question-count');
    const presetButtons = document.querySelectorAll('.question-preset');

    // 設置初始活動狀態
    document.querySelector('.question-preset[data-value="5"]').classList.add('active');

    presetButtons.forEach(button => {
        button.addEventListener('click', function() {
            questionCountInput.value = '';
            presetButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            finalQuestionCount.value = this.dataset.value;
        });
    });

    questionCountInput.addEventListener('input', function() {
        if (this.value.trim()) {
            presetButtons.forEach(btn => btn.classList.remove('active'));
            finalQuestionCount.value = this.value;
        } else {
            document.querySelector('.question-preset[data-value="5"]').classList.add('active');
            finalQuestionCount.value = 5;
        }
    });

    // API密鑰操作
    saveApiKeyBtn.addEventListener('click', saveApiKey);
    clearApiKeyBtn.addEventListener('click', clearApiKey);

    generateBtn.addEventListener('click', async () => {
        const content = contentInput.value.trim();
        const apiKey = localStorage.getItem('openrouter_api_key');

        if (!content) {
            alert('請輸入要生成測驗的內容');
            return;
        }

        if (!apiKey) {
            alert('請先輸入並保存 OpenRouter API 密鑰');
            return;
        }

        try {
            loading.classList.remove('hidden');
            const questions = await generateQuestions(content, apiKey);
            displayQuestions(questions);
        } catch (error) {
            alert(error.message);
        } finally {
            loading.classList.add('hidden');
        }
    });

    function saveApiKey() {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            localStorage.setItem('openrouter_api_key', apiKey);
            apiKeyInput.value = '••••••••••••••••';
            apiStatus.textContent = '✅ 密鑰已保存';
            apiStatus.style.color = 'green';
        } else {
            apiStatus.textContent = '❌ 請輸入 API 密鑰';
            apiStatus.style.color = 'red';
        }
    }

    function clearApiKey() {
        localStorage.removeItem('openrouter_api_key');
        apiKeyInput.value = '';
        apiStatus.textContent = '❌ 密鑰已清除';
        apiStatus.style.color = 'red';
    }

    function getQuestionCount() {
        return parseInt(finalQuestionCount.value) || 5;
    }

    async function generateQuestions(content, apiKey) {
        const questionCount = getQuestionCount();
        
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': window.location.href,
                    'X-Title': 'AI-Powered Quiz Generator'
                },
                body: JSON.stringify({
                    model: 'openai/gpt-4o',
                    temperature: 0.7,
                    max_tokens: 2000,
                    messages: [{
                        role: 'user',
                        content: `生成 ${questionCount} 道選擇題，基於以下內容。請用以下JSON格式回應：[ { "question": "問題", "options": ["選項1", "選項2", "選項3", "選項4"], "correct": 0, "explanation": "解析" } ] 內容：${content}`
                    }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'API請求失敗');
            }

            const data = await response.json();
            const contentString = data.choices[0].message.content;
            
            let jsonStartIndex = contentString.indexOf('[');
            let jsonEndIndex = contentString.lastIndexOf(']') + 1;
            if (jsonStartIndex === -1 || jsonEndIndex === 0) {
                throw new Error('API返回格式錯誤');
            }
            return JSON.parse(contentString.substring(jsonStartIndex, jsonEndIndex));
        } catch (error) {
            console.error('API錯誤:', error);
            throw new Error('生成題目失敗: ' + error.message);
        }
    }

    function displayQuestions(questions) {
        quizResults.innerHTML = questions.map((q, index) => `
            <div class="quiz-item">
                <h3>第 ${index + 1} 題</h3>
                <p>${q.question}</p>
                <ul>${q.options.map((o, i) => `
                    <li>${String.fromCharCode(65 + i)}) ${o}</li>
                `).join('')}</ul>
                <div class="correct-answer">
                    ✅ 正確答案：${String.fromCharCode(65 + q.correct)}<br>
                    📖 解析：${q.explanation}
                </div>
            </div>
        `).join('');
    }
});
