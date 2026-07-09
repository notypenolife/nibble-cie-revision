const DATA = window.CIE_DATA;
let currentFilter = 'all';
let currentPage = 'dashboard';
let selectedQuizChapter = 'all';
let flashIndex = 0;
let showingAnswer = false;
let quizIndex = 0;
let score = 0;
let answered = false;
let practiceIndex = 0;
const paperLabels = { all: 'All AS chapters', paper1: 'Paper 1 Theory', paper2: 'Paper 2 Problem-solving' };
function chapterById(id){ return DATA.chapters.find(c => c.id === id); }
function paperName(paper){ return paper === 'paper1' ? 'Paper 1' : 'Paper 2'; }
function visibleChapters(){ return DATA.chapters.filter(c => currentFilter === 'all' || c.paper === currentFilter); }
function visibleByChapter(items){ const ids = visibleChapters().map(c => c.id); return items.filter(item => ids.includes(item.chapter)); }
function quizPool(){ const items = visibleByChapter(DATA.quizQuestions); return selectedQuizChapter === 'all' ? items : items.filter(q => q.chapter === selectedQuizChapter); }
function practicePool(){ return visibleByChapter(DATA.practiceTasks); }
function showPage(pageId){ currentPage = pageId; document.querySelectorAll('.page').forEach(p => p.classList.remove('active')); document.getElementById(pageId).classList.add('active'); document.querySelectorAll('.top-nav button').forEach(b => b.classList.toggle('active', b.dataset.page === pageId)); }
function setFilter(filter){ currentFilter = filter; selectedQuizChapter = 'all'; flashIndex = 0; showingAnswer = false; quizIndex = 0; score = 0; practiceIndex = 0; document.getElementById('focusText').textContent = paperLabels[filter]; document.querySelectorAll('.filter-bar button').forEach(b => b.classList.toggle('selected', b.dataset.filter === filter)); renderAll(); }
function renderTopics(){ document.getElementById('topicGrid').innerHTML = visibleChapters().map(c => '<article class="topic-card"><p class="tag">' + paperName(c.paper) + ' - Chapter ' + c.number + '</p><h3>' + c.title + '</h3><p>' + c.summary + '</p><ul>' + c.sections.map(s => '<li>' + s + '</li>').join('') + '</ul></article>').join(''); }
function renderLessons(){ document.getElementById('lessonList').innerHTML = visibleChapters().map(c => '<article class="lesson"><p class="tag">' + paperName(c.paper) + ' - Chapter ' + c.number + '</p><h3>' + c.title + '</h3><p>' + c.summary + '</p><h4>What to revise</h4><ul>' + c.revise.map(r => '<li>' + r + '</li>').join('') + '</ul><p><strong>Exam tip:</strong> ' + c.examTip + '</p></article>').join(''); }
function ensureQuizSelect(){ let s = document.getElementById('quizChapterSelect'); if(!s){ document.getElementById('quizBox').insertAdjacentHTML('beforebegin','<label class="select-label" for="quizChapterSelect">Choose a chapter quiz</label><select id="quizChapterSelect" class="chapter-select"></select>'); s = document.getElementById('quizChapterSelect'); s.addEventListener('change', e => { selectedQuizChapter = e.target.value; quizIndex = 0; score = 0; renderQuiz(); }); } s.innerHTML = '<option value="all">All visible chapters</option>' + visibleChapters().map(c => '<option value="' + c.id + '">Chapter ' + c.number + ': ' + c.title + '</option>').join(''); s.value = selectedQuizChapter; }
function renderFlashcard(){ const cards = visibleByChapter(DATA.flashcards); const card = cards[flashIndex % cards.length]; const c = chapterById(card.chapter); document.getElementById('flashPaper').textContent = paperName(c.paper) + ' - Chapter ' + c.number; document.getElementById('flashQuestion').textContent = card.question; document.getElementById('flashAnswer').textContent = showingAnswer ? card.answer : 'Tap to reveal this bite.'; }
function flipCard(){ showingAnswer = !showingAnswer; renderFlashcard(); }
function nextFlashcard(){ const cards = visibleByChapter(DATA.flashcards); flashIndex = (flashIndex + 1) % cards.length; showingAnswer = false; renderFlashcard(); }
function renderQuiz(){ ensureQuizSelect(); const qs = quizPool(); const q = qs[quizIndex % qs.length]; const c = chapterById(q.chapter); document.getElementById('quizBox').innerHTML = '<p class="tag">' + paperName(c.paper) + ' - Chapter ' + c.number + ': ' + c.title + '</p><h3>' + q.question + '</h3>' + q.options.map(o => '<button class="quiz-option" onclick="checkQuizAnswer(\'' + o.replace(/'/g, "\\'") + '\')">' + o + '</button>').join(''); document.getElementById('quizFeedback').hidden = true; document.getElementById('score').textContent = "Today's Plate: " + score + ' / ' + qs.length; answered = false; }
function checkQuizAnswer(selected){ if(answered) return; answered = true; const qs = quizPool(); const q = qs[quizIndex % qs.length]; const correct = selected === q.answer; if(correct) score++; const fb = document.getElementById('quizFeedback'); fb.hidden = false; fb.innerHTML = '<h3>' + (correct ? 'Nice bite' : 'Almost there') + '</h3><p><strong>Best bite:</strong> ' + q.answer + '</p><p>' + q.explanation + '</p><p><strong>' + q.examTip + '</strong></p><p class="source-line">Source: ' + q.source.reference + '</p>'; document.getElementById('score').textContent = "Today's Plate: " + score + ' / ' + qs.length; }
function nextQuestion(){ const qs = quizPool(); quizIndex++; if(quizIndex >= qs.length){ document.getElementById('quizBox').innerHTML = '<h3>Taste complete</h3><p>Your plate has ' + score + ' / ' + qs.length + '.</p>'; document.getElementById('quizFeedback').hidden = true; return; } renderQuiz(); }
function restartQuiz(){ quizIndex = 0; score = 0; renderQuiz(); }
function renderPractice(){ const tasks = practicePool(); const task = tasks[practiceIndex % tasks.length]; const c = chapterById(task.chapter); document.getElementById('practicePaper').textContent = paperName(c.paper) + ' - Chapter ' + c.number; document.getElementById('practiceQuestion').textContent = task.question; document.getElementById('studentAnswer').value = ''; document.getElementById('practiceFeedback').hidden = true; }
function markPractice(){ const tasks = practicePool(); const task = tasks[practiceIndex % tasks.length]; const answer = document.getElementById('studentAnswer').value.toUpperCase(); const matched = task.keywords.filter(k => answer.includes(k)); const missing = task.keywords.filter(k => !answer.includes(k)); const fb = document.getElementById('practiceFeedback'); fb.hidden = false; fb.innerHTML = '<h3>Bite check: ' + matched.length + ' / ' + task.keywords.length + '</h3><p><strong>Included:</strong> ' + (matched.length ? matched.join(', ') : 'none yet') + '</p><p><strong>Try adding:</strong> ' + (missing.length ? missing.join(', ') : 'nothing - strong answer') + '</p><h4>Suggested recipe</h4><pre><code>' + task.modelAnswer + '</code></pre><p><strong>' + task.examTip + '</strong></p><p class="source-line">Source: ' + task.source.reference + '</p>'; }
function newPracticeTask(){ const tasks = practicePool(); practiceIndex = (practiceIndex + 1) % tasks.length; renderPractice(); }
function renderAll(){ renderTopics(); renderLessons(); renderFlashcard(); renderQuiz(); renderPractice(); }
document.querySelectorAll('.top-nav button').forEach(b => b.addEventListener('click', () => showPage(b.dataset.page)));
document.querySelectorAll('.filter-bar button').forEach(b => b.addEventListener('click', () => setFilter(b.dataset.filter)));
document.getElementById('flashcard').addEventListener('click', flipCard);
document.getElementById('flashcard').addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' ') flipCard(); });
document.getElementById('flipCardBtn').addEventListener('click', flipCard);
document.getElementById('nextCardBtn').addEventListener('click', nextFlashcard);
document.getElementById('nextQuestionBtn').addEventListener('click', nextQuestion);
document.getElementById('restartQuizBtn').addEventListener('click', restartQuiz);
document.getElementById('markPracticeBtn').addEventListener('click', markPractice);
document.getElementById('newPracticeBtn').addEventListener('click', newPracticeTask);
window.checkQuizAnswer = checkQuizAnswer;
renderAll();



