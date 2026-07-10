const DATA = window.CIE_DATA;
const STORAGE_KEY = 'nibbleLearnerProgressV2';
let currentFilter = 'all';
let currentPage = 'dashboard';
let selectedQuizChapter = 'all';
let flashIndex = 0;
let showingAnswer = false;
let quizIndex = 0;
let score = 0;
let answered = false;
let practiceIndex = 0;
let learner = loadLearner();

const paperLabels = { all: 'All AS chapters', paper1: 'Paper 1 Theory', paper2: 'Paper 2 Problem-solving' };

function todayKey(){ return new Date().toISOString().slice(0, 10); }
function chapterById(id){ return DATA.chapters.find(c => c.id === id); }
function paperName(paper){ return paper === 'paper1' ? 'Paper 1' : 'Paper 2'; }
function visibleChapters(){ return DATA.chapters.filter(c => currentFilter === 'all' || c.paper === currentFilter); }
function visibleByChapter(items){ const ids = visibleChapters().map(c => c.id); return items.filter(item => ids.includes(item.chapter)); }
function quizPool(){ const items = visibleByChapter(DATA.quizQuestions); return selectedQuizChapter === 'all' ? items : items.filter(q => q.chapter === selectedQuizChapter); }
function practicePool(){ return visibleByChapter(DATA.practiceTasks); }
function escapeText(value){ return String(value).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function defaultLearner(){
  return { name: '', signedIn: false, crumbs: 0, streak: 0, lastActiveDate: '', completedChapters: {}, quizAttempts: [], practiceAttempts: [] };
}

function loadLearner(){
  try { return { ...defaultLearner(), ...JSON.parse(localStorage.getItem(STORAGE_KEY)) }; }
  catch { return defaultLearner(); }
}

function saveLearner(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(learner)); }

function recordActivity(extraCrumbs){
  const today = todayKey();
  const wasAnotherDay = learner.lastActiveDate !== today;
  learner.lastActiveDate = today;
  learner.streak = wasAnotherDay ? (learner.streak || 0) + 1 : (learner.streak || 1);
  learner.crumbs += extraCrumbs || 0;
  saveLearner();
  renderProfile();
}

function chapterProgress(){
  const total = DATA.chapters.length;
  const done = Object.keys(learner.completedChapters || {}).length;
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
}

function ensureV2Shell(){
  if(!document.getElementById('profileStrip')){
    document.querySelector('.top-nav').insertAdjacentHTML('afterend', '<section id="profileStrip" class="profile-strip"></section>');
  }
  if(!document.getElementById('loginOverlay')){
    document.body.insertAdjacentHTML('beforeend', '<div id="loginOverlay" class="login-overlay" hidden><form id="loginForm" class="login-card"><span class="nibble-logo login-logo" aria-hidden="true"></span><p class="eyebrow">Personal Nibble</p><h2>Save your streak and progress</h2><p>Use a simple local profile for now. Later, this becomes Supabase login for real student accounts.</p><label for="learnerName">Name</label><input id="learnerName" name="learnerName" placeholder="e.g. Alex" autocomplete="given-name"><button class="primary" type="submit">Start</button></form></div>');
    document.getElementById('loginForm').addEventListener('submit', event => {
      event.preventDefault();
      const name = document.getElementById('learnerName').value.trim() || 'Learner';
      learner.name = name;
      learner.signedIn = true;
      saveLearner();
      document.getElementById('loginOverlay').hidden = true;
      renderAll();
    });
  }
  if(!learner.signedIn){ document.getElementById('loginOverlay').hidden = false; }
}

function renderProfile(){
  const progress = chapterProgress();
  const profile = document.getElementById('profileStrip');
  if(!profile) return;
  profile.innerHTML = '<div><p class="eyebrow">Nibble v2 prototype</p><h2>' + (learner.signedIn ? 'Hi, ' + escapeText(learner.name) : 'Create your local profile') + '</h2></div>' +
    '<div class="profile-stats"><span><strong>' + learner.streak + '</strong> day streak</span><span><strong>' + learner.crumbs + '</strong> crumbs</span><span><strong>' + progress.done + '/' + progress.total + '</strong> bites</span></div>' +
    '<button id="editProfileBtn">' + (learner.signedIn ? 'Switch learner' : 'Log in') + '</button>';
  document.getElementById('editProfileBtn').addEventListener('click', () => { document.getElementById('loginOverlay').hidden = false; });
  const plateText = document.querySelector('.hero-panel .small-text');
  if(plateText) plateText.textContent = progress.done + ' / ' + progress.total + ' Bites Finished';
}

function showPage(pageId){
  currentPage = pageId;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  document.querySelectorAll('.top-nav button').forEach(b => b.classList.toggle('active', b.dataset.page === pageId));
  if(pageId === 'mistakes') renderProgressPage();
}

function setFilter(filter){
  currentFilter = filter;
  selectedQuizChapter = 'all';
  flashIndex = 0;
  showingAnswer = false;
  quizIndex = 0;
  score = 0;
  practiceIndex = 0;
  document.getElementById('focusText').textContent = paperLabels[filter];
  document.querySelectorAll('.filter-bar button').forEach(b => b.classList.toggle('selected', b.dataset.filter === filter));
  renderAll();
}

function completeChapter(chapterId){
  if(!learner.completedChapters[chapterId]){
    learner.completedChapters[chapterId] = new Date().toISOString();
    recordActivity(35);
  } else {
    recordActivity(5);
  }
  renderAll();
}

function renderTopics(){
  document.getElementById('topicGrid').innerHTML = visibleChapters().map((c, index) => {
    const done = Boolean(learner.completedChapters[c.id]);
    return '<article class="topic-card map-card ' + (done ? 'done' : '') + '"><div class="map-node"><span>' + (done ? '✓' : index + 1) + '</span></div><p class="tag">' + paperName(c.paper) + ' - Chapter ' + c.number + '</p><h3>' + c.title + '</h3><p>' + c.summary + '</p><ul>' + c.sections.map(s => '<li>' + s + '</li>').join('') + '</ul><div class="button-row"><button class="primary" onclick="openChapterBite(\'' + c.id + '\')">Start bite</button><button onclick="completeChapter(\'' + c.id + '\')">' + (done ? 'Review bite' : 'Mark done') + '</button></div></article>';
  }).join('');
}

function openChapterBite(chapterId){
  const chapter = chapterById(chapterId);
  currentFilter = chapter.paper;
  document.getElementById('focusText').textContent = chapter.title;
  document.querySelectorAll('.filter-bar button').forEach(b => b.classList.toggle('selected', b.dataset.filter === currentFilter));
  const firstCard = DATA.flashcards.findIndex(card => card.chapter === chapterId);
  if(firstCard >= 0) flashIndex = firstCard;
  showingAnswer = false;
  showPage('learn');
  renderAll();
}

function renderLessons(){
  document.getElementById('lessonList').innerHTML = visibleChapters().map(c => {
    const done = Boolean(learner.completedChapters[c.id]);
    return '<article class="lesson ' + (done ? 'done' : '') + '"><p class="tag">' + paperName(c.paper) + ' - Chapter ' + c.number + '</p><h3>' + c.title + '</h3><p>' + c.summary + '</p><h4>What to revise</h4><ul>' + c.revise.map(r => '<li>' + r + '</li>').join('') + '</ul><p><strong>Exam tip:</strong> ' + c.examTip + '</p><button onclick="completeChapter(\'' + c.id + '\')">' + (done ? 'Add review crumbs' : 'Complete this bite') + '</button></article>';
  }).join('');
}

function ensureQuizSelect(){
  let s = document.getElementById('quizChapterSelect');
  if(!s){
    document.getElementById('quizBox').insertAdjacentHTML('beforebegin','<label class="select-label" for="quizChapterSelect">Choose a chapter quiz</label><select id="quizChapterSelect" class="chapter-select"></select>');
    s = document.getElementById('quizChapterSelect');
    s.addEventListener('change', e => { selectedQuizChapter = e.target.value; quizIndex = 0; score = 0; renderQuiz(); });
  }
  s.innerHTML = '<option value="all">All visible chapters</option>' + visibleChapters().map(c => '<option value="' + c.id + '">Chapter ' + c.number + ': ' + c.title + '</option>').join('');
  s.value = selectedQuizChapter;
}

function renderFlashcard(){
  const cards = visibleByChapter(DATA.flashcards);
  if(!cards.length) return;
  const card = cards[flashIndex % cards.length];
  const c = chapterById(card.chapter);
  document.getElementById('flashPaper').textContent = paperName(c.paper) + ' - Chapter ' + c.number;
  document.getElementById('flashQuestion').textContent = card.question;
  document.getElementById('flashAnswer').textContent = showingAnswer ? card.answer : 'Tap to reveal this bite.';
}

function flipCard(){ showingAnswer = !showingAnswer; renderFlashcard(); }
function nextFlashcard(){ const cards = visibleByChapter(DATA.flashcards); flashIndex = (flashIndex + 1) % cards.length; showingAnswer = false; renderFlashcard(); recordActivity(1); }

function renderQuiz(){
  ensureQuizSelect();
  const qs = quizPool();
  if(!qs.length){ document.getElementById('quizBox').innerHTML = '<h3>No questions yet</h3><p>Add more questions in data/site-data.js.</p>'; return; }
  const q = qs[quizIndex % qs.length];
  const c = chapterById(q.chapter);
  document.getElementById('quizBox').innerHTML = '<p class="tag">' + paperName(c.paper) + ' - Chapter ' + c.number + ': ' + c.title + '</p><h3>' + q.question + '</h3>' + q.options.map(o => '<button class="quiz-option" onclick="checkQuizAnswer(\'' + o.replace(/'/g, "\\'") + '\')">' + o + '</button>').join('');
  document.getElementById('quizFeedback').hidden = true;
  document.getElementById('score').textContent = "Today's Plate: " + score + ' / ' + qs.length;
  answered = false;
}

function checkQuizAnswer(selected){
  if(answered) return;
  answered = true;
  const qs = quizPool();
  const q = qs[quizIndex % qs.length];
  const correct = selected === q.answer;
  if(correct) score++;
  learner.quizAttempts.unshift({ chapter: q.chapter, correct, date: new Date().toISOString() });
  learner.quizAttempts = learner.quizAttempts.slice(0, 25);
  recordActivity(correct ? 12 : 4);
  const fb = document.getElementById('quizFeedback');
  fb.hidden = false;
  fb.innerHTML = '<h3>' + (correct ? 'Nice bite' : 'Almost there') + '</h3><p><strong>Best bite:</strong> ' + q.answer + '</p><p>' + q.explanation + '</p><p><strong>' + q.examTip + '</strong></p><p class="source-line">Source: ' + q.source.reference + '</p>';
  document.getElementById('score').textContent = "Today's Plate: " + score + ' / ' + qs.length;
}

function nextQuestion(){
  const qs = quizPool();
  quizIndex++;
  if(quizIndex >= qs.length){
    document.getElementById('quizBox').innerHTML = '<h3>Taste complete</h3><p>Your plate has ' + score + ' / ' + qs.length + '.</p><p>Crumbs and streak progress were saved to this device.</p>';
    document.getElementById('quizFeedback').hidden = true;
    return;
  }
  renderQuiz();
}
function restartQuiz(){ quizIndex = 0; score = 0; renderQuiz(); }

function renderPractice(){
  const tasks = practicePool();
  if(!tasks.length) return;
  const task = tasks[practiceIndex % tasks.length];
  const c = chapterById(task.chapter);
  document.getElementById('practicePaper').textContent = paperName(c.paper) + ' - Chapter ' + c.number;
  document.getElementById('practiceQuestion').textContent = task.question;
  document.getElementById('studentAnswer').value = '';
  document.getElementById('practiceFeedback').hidden = true;
}

function markPractice(){
  const tasks = practicePool();
  const task = tasks[practiceIndex % tasks.length];
  const answer = document.getElementById('studentAnswer').value.toUpperCase();
  const matched = task.keywords.filter(k => answer.includes(k));
  const missing = task.keywords.filter(k => !answer.includes(k));
  learner.practiceAttempts.unshift({ chapter: task.chapter, score: matched.length / task.keywords.length, date: new Date().toISOString() });
  learner.practiceAttempts = learner.practiceAttempts.slice(0, 25);
  recordActivity(Math.max(4, matched.length * 4));
  const fb = document.getElementById('practiceFeedback');
  fb.hidden = false;
  fb.innerHTML = '<h3>Bite check: ' + matched.length + ' / ' + task.keywords.length + '</h3><p><strong>Included:</strong> ' + (matched.length ? matched.join(', ') : 'none yet') + '</p><p><strong>Try adding:</strong> ' + (missing.length ? missing.join(', ') : 'nothing - strong answer') + '</p><h4>Suggested recipe</h4><pre><code>' + task.modelAnswer + '</code></pre><p><strong>' + task.examTip + '</strong></p><p class="source-line">Source: ' + task.source.reference + '</p>';
}
function newPracticeTask(){ const tasks = practicePool(); practiceIndex = (practiceIndex + 1) % tasks.length; renderPractice(); }

function renderProgressPage(){
  const progress = chapterProgress();
  const list = document.querySelector('#mistakes .mistake-list');
  if(!list) return;
  const quizCorrect = learner.quizAttempts.filter(a => a.correct).length;
  const quizTotal = learner.quizAttempts.length;
  list.outerHTML = '<div class="progress-dashboard"><article><p class="eyebrow">Today\'s Plate</p><h3>' + progress.percent + '% complete</h3><div class="plate-bar"><span style="width:' + progress.percent + '%"></span></div><p>' + progress.done + ' of ' + progress.total + ' chapter bites finished.</p></article><article><p class="eyebrow">Streak</p><h3>' + learner.streak + ' days</h3><p>Complete at least one bite each day to keep it moving.</p></article><article><p class="eyebrow">Crumbs</p><h3>' + learner.crumbs + '</h3><p>Earned from quizzes, practice and completed bites.</p></article><article><p class="eyebrow">Taste Tests</p><h3>' + quizCorrect + ' / ' + quizTotal + '</h3><p>Recent multiple-choice answers saved on this device.</p></article></div><div class="mistake-list"><li>Next upgrade: Supabase Auth for real personal logins.</li><li>Next upgrade: database tables for progress, streaks and quiz attempts.</li><li>Next upgrade: teacher dashboard for adding questions without editing code.</li></div>';
}

function renderAll(){
  ensureV2Shell();
  renderProfile();
  renderTopics();
  renderLessons();
  renderFlashcard();
  renderQuiz();
  renderPractice();
  if(currentPage === 'mistakes') renderProgressPage();
}

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
window.completeChapter = completeChapter;
window.openChapterBite = openChapterBite;
renderAll();
