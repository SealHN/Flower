// 配置
const REPO_OWNER = 'SealHN';
const REPO_NAME = 'Flower';
const LABEL_NAME = '匿名提问';
const QUESTIONS_PER_PAGE = 5;
const SECRET_LINK = "https://sealhn.github.io/Unweb"; // 替换为你想要跳转的网址

function encrypt(text, salt) {
  return btoa(encodeURIComponent(text + salt).split('').reverse().join(''));
}

function decrypt(encrypted, salt) {
  return decodeURIComponent(atob(encrypted).split('').reverse().join('')).replace(salt, '');
}

const ENCRYPTED_ADMIN_PASSWORD = "NjM5OTk2OTZhdWhpdWs="; 
const ENCRYPTED_EASTER_EGG_CODE = "OTk5MzQ="; 
const SALT = "abc"; 


function checkPassword(input) {
  try {
    const decryptedAdmin = decrypt(ENCRYPTED_ADMIN_PASSWORD, SALT);
    const decryptedEgg = decrypt(ENCRYPTED_EASTER_EGG_CODE, SALT);
    
    return {
      isAdmin: input === decryptedAdmin,
      isEgg: input === decryptedEgg
    };
  } catch (e) {
    return { isAdmin: false, isEgg: false };
  }
}

// 屏蔽关键词列表
const BANNED_KEYWORDS = ['刘卓君', '操你妈', '水泥' ,'钢筋','筷子']; // 替换为你需要屏蔽的词

// 状态管理
let currentPage = 1;
let totalQuestions = 0;
let isAdmin = false;
let currentQuestionId = null;

// DOM元素
const questionForm = document.getElementById('questionForm');
const questionContent = document.getElementById('questionContent');
const formMessage = document.getElementById('formMessage');
const questionsContainer = document.getElementById('questionsContainer');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');

// 管理员相关元素
const adminButton = document.getElementById('adminButton');
const adminModal = document.getElementById('adminModal');
const closeModal = document.querySelector('.close');
const submitAdminCode = document.getElementById('submitAdminCode');
const adminPassword = document.getElementById('adminPassword');
const adminMessage = document.getElementById('adminMessage');

// 回复相关元素
const replyModal = document.getElementById('replyModal');
const closeReplyModal = document.querySelector('.close-reply');
const questionToReply = document.getElementById('questionToReply');
const replyContent = document.getElementById('replyContent');
const submitReply = document.getElementById('submitReply');
const replyMessage = document.getElementById('replyMessage');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadQuestions();
    
    // 每30秒自动刷新
    setInterval(loadQuestions, 30000);
    
    // 管理员按钮事件
    adminButton.addEventListener('click', () => {
        adminModal.style.display = 'block';
    });
    
    // 关闭弹窗
    closeModal.addEventListener('click', () => {
        adminModal.style.display = 'none';
    });
    
    closeReplyModal.addEventListener('click', () => {
        replyModal.style.display = 'none';
    });
    
    // 点击弹窗外关闭
    window.addEventListener('click', (event) => {
        if (event.target === adminModal) {
            adminModal.style.display = 'none';
        }
        if (event.target === replyModal) {
            replyModal.style.display = 'none';
        }
    });
    
    // 提交密码/彩蛋码
    submitAdminCode.addEventListener('click', checkAdminCode);
    
    // 按回车键提交
    adminPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            checkAdminCode();
        }
    });
    
    // 提交回复
    submitReply.addEventListener('click', submitQuestionReply);
});

// 检查管理员密码/彩蛋码
function checkAdminCode() {
    const input = adminPassword.value.trim();
    const result = checkPassword(input);
    
    if (result.isAdmin) {
        isAdmin = true;
        adminMessage.textContent = "管理员登录成功！";
        adminMessage.className = "success";
        adminButton.innerHTML = '<i class="fas fa-user-shield"></i>';
        adminButton.style.opacity = '1';
        adminButton.style.backgroundColor = 'rgba(52, 152, 219, 0.8)';
        
        setTimeout(() => {
            adminModal.style.display = 'none';
            adminPassword.value = '';
        }, 1000);
    } else if (result.isEgg) {
        adminMessage.textContent = "彩蛋解锁！即将跳转...";
        adminMessage.className = "success";
        setTimeout(() => {
            adminModal.style.display = 'none';
            adminPassword.value = '';
            window.open(SECRET_LINK, '_blank');
        }, 1000);
    } else {
        adminMessage.textContent = "密码或彩蛋码错误！";
        adminMessage.className = "error";
    }
}

// 提交问题
questionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const content = questionContent.value.trim();
    
    if (!content) {
        showFormMessage('请输入问题内容', 'error');
        return;
    }
    
    // 检查屏蔽词
    if (containsBannedKeywords(content)) {
        showFormMessage('您的问题包含不被允许的内容', 'error');
        return;
    }
    
    try {
        // 使用 GitHub API 提交问题
        const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`, {
            method: 'POST',
            headers: {
                'Authorization': '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', // 需要有限制的token
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                title: `匿名提问 - ${new Date().toLocaleString()}`,
                body: content,
                labels: [LABEL_NAME]
            })
        });
        
        if (response.ok) {
            showFormMessage('问题提交成功！', 'success');
            questionContent.value = '';
            // 刷新问题列表
            setTimeout(loadQuestions, 1000);
        } else {
            throw new Error('提交失败');
        }
    } catch (error) {
        console.error('提交问题失败:', error);
        showFormMessage(`提交失败: ${error.message}`, 'error');
    }
});

// 加载问题
async function loadQuestions() {
    try {
        questionsContainer.innerHTML = '<p>加载中...</p>';
        
        const response = await fetch(
            `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues?labels=${LABEL_NAME}&state=all&sort=created&direction=desc`
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const questions = await response.json();
        totalQuestions = questions.length;
        
        renderQuestions(questions);
        updatePagination();
    } catch (error) {
        console.error('加载问题失败:', error);
        questionsContainer.innerHTML = `<p class="error">加载问题失败: ${error.message}</p>`;
    }
}

// 渲染问题列表
function renderQuestions(questions) {
    if (questions.length === 0) {
        questionsContainer.innerHTML = '<p>还没有人提问，快来成为第一个吧！</p>';
        return;
    }
    
    // 计算分页
    const startIdx = (currentPage - 1) * QUESTIONS_PER_PAGE;
    const endIdx = startIdx + QUESTIONS_PER_PAGE;
    const paginatedQuestions = questions.slice(startIdx, endIdx);
    
    questionsContainer.innerHTML = '';
    
    paginatedQuestions.forEach(question => {
        const questionElement = document.createElement('div');
        questionElement.className = 'question-item';
        
        // 过滤敏感内容
        let filteredContent = question.body;
        BANNED_KEYWORDS.forEach(word => {
            filteredContent = filteredContent.replace(new RegExp(word, 'gi'), '***');
        });
        
        // 解析点赞数（从标签获取）
        const likeLabel = question.labels.find(label => label.name.startsWith('likes-'));
        const likeCount = likeLabel ? parseInt(likeLabel.name.replace('likes-', '')) : 0;
        
        // 检查是否已点赞（使用localStorage）
        const hasLiked = localStorage.getItem(`liked-${question.id}`) === 'true';
        
        // 解析回复（从评论获取）
        const replyComment = question.comments > 0 ? question.comments_url : null;
        
        questionElement.innerHTML = `
            <div class="question-content">${filteredContent}</div>
            <div class="question-date">${new Date(question.created_at).toLocaleString()}</div>
            
            ${replyComment ? `
            <div class="reply-section">
                <div class="reply-header">
                    <div class="reply-avatar">'回'</div>
                    <strong>'回复：'</strong>
                </div>
                <div class="reply-content">'加载回复中...'</div>
            </div>
            ` : ''}
            
            <div class="like-section">
                <button class="like-button ${hasLiked ? 'liked' : ''}" 
                        data-question-id="${question.id}">
                    <i class="fas fa-heart"></i>
                </button>
                <span class="like-count">${likeCount}</span>
            </div>
        `;
        
        // 如果是管理员，添加回复按钮
        if (isAdmin && !replyComment) {
            const replyBtn = document.createElement('button');
            replyBtn.textContent = '回复';
            replyBtn.className = 'admin-reply-btn';
            replyBtn.onclick = () => openReplyModal(question.id, filteredContent);
            questionElement.appendChild(replyBtn);
        }
        
        questionsContainer.appendChild(questionElement);
        
        // 如果有回复，加载回复内容
        if (replyComment) {
            loadReplyContent(replyComment, questionElement);
        }
    });
    
    // 添加点赞事件监听
    document.querySelectorAll('.like-button').forEach(button => {
        button.addEventListener('click', handleLike);
    });
}

// 加载回复内容
async function loadReplyContent(commentsUrl, questionElement) {
    try {
        const response = await fetch(commentsUrl);
        if (!response.ok) throw new Error('无法加载回复');
        
        const comments = await response.json();
        if (comments.length > 0) {
            const replyContent = questionElement.querySelector('.reply-content');
            replyContent.textContent = comments[0].body;
        }
    } catch (error) {
        console.error('加载回复失败:', error);
    }
}

// 打开回复弹窗
function openReplyModal(questionId, questionContent) {
    if (!isAdmin) return;
    
    currentQuestionId = questionId;
    questionToReply.textContent = questionContent;
    replyContent.value = '';
    replyMessage.textContent = '';
    replyModal.style.display = 'block';
}

// 提交问题回复
async function submitQuestionReply() {
    if (!currentQuestionId) return;
    
    const content = replyContent.value.trim();
    if (!content) {
        replyMessage.textContent = "请输入回复内容";
        replyMessage.className = "error";
        return;
    }
    
    try {
        // 使用 GitHub API 提交评论（回复）
        const response = await fetch(
            `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${currentQuestionId}/comments`, 
            {
                method: 'POST',
                headers: {
                    'Authorization': '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',
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify({
                    body: content
                })
            }
        );
        
        if (response.ok) {
            replyMessage.textContent = "回复成功！";
            replyMessage.className = "success";
            setTimeout(() => {
                replyModal.style.display = 'none';
                loadQuestions(); // 刷新列表
            }, 1000);
        } else {
            throw new Error('回复失败');
        }
    } catch (error) {
        console.error('回复失败:', error);
        replyMessage.textContent = `回复失败: ${error.message}`;
        replyMessage.className = "error";
    }
}

// 处理点赞
async function handleLike(e) {
    const button = e.currentTarget;
    const questionId = button.dataset.questionId;
    const hasLiked = localStorage.getItem(`liked-${questionId}`) === 'true';
    
    if (hasLiked) {
        alert('您已经点过赞了！');
        return;
    }
    
    try {
        // 获取当前点赞数
        const likeCountElement = button.nextElementSibling;
        let likeCount = parseInt(likeCountElement.textContent) || 0;
        
        // 更新本地状态
        localStorage.setItem(`liked-${questionId}`, 'true');
        button.classList.add('liked');
        likeCountElement.textContent = likeCount + 1;
        
        // 更新GitHub标签（模拟）
        // 实际项目中需要通过API更新issue的labels
        console.log(`用户点赞了问题 ${questionId}`);
        
    } catch (error) {
        console.error('点赞失败:', error);
    }
}

// 更新分页状态
function updatePagination() {
    const totalPages = Math.ceil(totalQuestions / QUESTIONS_PER_PAGE);
    
    pageInfo.textContent = `第 ${currentPage} 页 / 共 ${totalPages} 页`;
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
}

// 分页按钮事件
prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        loadQuestions();
    }
});

nextPageBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(totalQuestions / QUESTIONS_PER_PAGE);
    if (currentPage < totalPages) {
        currentPage++;
        loadQuestions();
    }
});

// 显示表单消息
function showFormMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = type;
    setTimeout(() => {
        formMessage.textContent = '';
        formMessage.className = '';
    }, 3000);
}

// 检查屏蔽词
function containsBannedKeywords(text) {
    return BANNED_KEYWORDS.some(word => 
        new RegExp(word, 'i').test(text)
    );
}