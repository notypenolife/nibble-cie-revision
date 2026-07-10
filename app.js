const DATA = window.CIE_DATA;
const STORAGE_KEY = 'nibbleLearnerProgressV3';
let learner = loadLearner();
let activeView = 'home';
let selectedPaper = 'paper2';
let selectedChapterId = DATA.chapters[0]?.id;
let currentQuizIndex = 0;
let currentPracticeIndex = 0;

function defaultLearner(){
  return {
    name: '',
    signedIn: false,
    xp: 0,
    streak: 0,
    goalXp: 10,
    lastActiveDate: '',
    completed: {},
    quizAttempts: [],
    practiceAttempts: [],
    theme: 'cream'
  };
}

function loadLearner(){
  try { return { ...defaultLearner(), ...JSON.parse(localStorage.getItem(STORAGE_KEY)) }; }
  catch { return defaultLearner(); }
}

function saveLearner(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(learner)); }
function todayKey(){ return new Date().toISOString().slice(0, 10); }
function chapterById(id){ return DATA.chapters.find(chapter => chapter.id === id) || DATA.chapters[0]; }
function paperName(paper){ return paper === 'paper1' ? 'Paper 1' : 'Paper 2'; }
function escapeText(value){ return String(value || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function chaptersForPaper(paper){ return DATA.chapters.filter(chapter => chapter.paper === paper); }
function chapterMastery(chapterId){
  const completed = learner.completed[chapterId] ? 45 : 0;
  const quiz = learner.quizAttempts.filter(a => a.chapter === chapterId && a.correct).length * 12;
  const practice = learner.practiceAttempts.filter(a => a.chapter === chapterId).reduce((sum, a) => sum + Math.round(a.score * 20), 0);
  return Math.min(100, completed + quiz + practice);
}
function overallMastery(){
  if(!DATA.chapters.length) return 0;
  return Math.round(DATA.chapters.reduce((sum, chapter) => sum + chapterMastery(chapter.id), 0) / DATA.chapters.length);
}
function weakChapter(){
  return [...DATA.chapters].sort((a, b) => chapterMastery(a.id) - chapterMastery(b.id))[0];
}
function todayChapter(){
  return DATA.chapters.find(chapter => !learner.completed[chapter.id]) || weakChapter() || DATA.chapters[0];
}
function recordActivity(xp){
  const today = todayKey();
  if(learner.lastActiveDate !== today){ learner.streak = (learner.streak || 0) + 1; }
  learner.lastActiveDate = today;
  learner.xp += xp;
  saveLearner();
}

function openLogin(){ document.getElementById('loginModal').hidden = false; }
function closeLogin(){ document.getElementById('loginModal').hidden = true; }
function enterApp(){
  document.getElementById('landingPage').hidden = true;
  document.getElementById('appPage').hidden = false;
  renderApp();
}
function showLanding(){
  document.getElementById('landingPage').hidden = false;
  document.getElementById('appPage').hidden = true;
}
function requireApp(){ learner.signedIn ? enterApp() : openLogin(); }

function switchView(view){
  activeView = view;
  document.querySelectorAll('.app-view').forEach(section => section.classList.toggle('active', section.id === view + 'View'));
  document.querySelectorAll('.app-nav button').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  renderApp();
}

function renderApp(){
  renderHome();
  renderLearn();
  renderPractice();
  renderProgress();
  renderProfile();
}

function renderHome(){
  const chapter = todayChapter();
  const weak = weakChapter();
  const mastery = overallMastery();
  const goalPercent = Math.min(100, Math.round((learner.xp % learner.goalXp) / learner.goalXp * 100));
  document.getElementById('homeView').innerHTML = `
    <header class="app-header">
      <div><p class="eyebrow">Good evening ${escapeText(learner.name)}</p><h1>Today's Bite</h1></div>
      <button class="link-button" onclick="showLanding()">Public site</button>
    </header>
    <section class="today-app-card">
      <div class="nib-mini" aria-hidden="true"></div>
      <div><p class="eyebrow">${paperName(chapter.paper)}</p><h2>${escapeText(chapter.title)}</h2><p>${escapeText(chapter.summary)}</p><span>6 min</span></div>
      <button class="primary" onclick="startChapter('${chapter.id}')">Continue</button>
    </section>
    <section class="metric-grid">
      <article><p>Current streak</p><strong>🔥 ${learner.streak}</strong></article>
      <article><p>Today's goal</p><strong>${learner.xp % learner.goalXp} / ${learner.goalXp} XP</strong><div class="mini-bar"><span style="width:${goalPercent}%"></span></div></article>
      <article><p>Overall mastery</p><strong>${mastery}%</strong><div class="mini-bar"><span style="width:${mastery}%"></span></div></article>
    </section>
    <section class="continue-grid">
      <article><p class="eyebrow">Continue Learning</p><h3>${escapeText(chapter.title)}</h3><div class="mini-bar"><span style="width:${chapterMastery(chapter.id)}%"></span></div><button onclick="startChapter('${chapter.id}')">Continue</button></article>
      <article><p class="eyebrow">Recommended</p><h3>${escapeText(weak.title)}</h3><p>Because this topic has the lowest mastery.</p><button onclick="startChapter('${weak.id}')">Try this bite</button></article>
    </section>
  `;
}

function renderLearn(){
  const chapters = chaptersForPaper(selectedPaper);
  document.getElementById('learnView').innerHTML = `
    <header class="app-header"><div><p class="eyebrow">Learn</p><h1>${paperName(selectedPaper)}</h1></div><div class="segmented"><button class="${selectedPaper === 'paper1' ? 'active' : ''}" onclick="setPaper('paper1')">Paper 1</button><button class="${selectedPaper === 'paper2' ? 'active' : ''}" onclick="setPaper('paper2')">Paper 2</button></div></header>
    <div class="topic-list">
      ${chapters.map(chapter => `
        <article class="learn-topic">
          <div><p class="eyebrow">Chapter ${chapter.number}</p><h2>${escapeText(chapter.title)}</h2><p>${escapeText(chapter.summary)}</p></div>
          <div class="topic-actions"><strong>${chapterMastery(chapter.id)}%</strong><div class="mini-bar"><span style="width:${chapterMastery(chapter.id)}%"></span></div><button onclick="startChapter('${chapter.id}')">Open</button></div>
        </article>
      `).join('')}
    </div>
    <section id="lessonDetail" class="lesson-detail"></section>
  `;
  renderLessonDetail();
}

function renderLessonDetail(){
  const container = document.getElementById('lessonDetail');
  if(!container) return;
  const chapter = chapterById(selectedChapterId);
  const flashcards = DATA.flashcards.filter(card => card.chapter === chapter.id).slice(0, 3);
  container.innerHTML = `
    <p class="eyebrow">${paperName(chapter.paper)} / ${chapter.title}</p>
    <h2>${escapeText(chapter.title)}</h2>
    <div class="bite-steps"><span>Read</span><span>Example</span><span>Mini quiz</span><span>Done</span></div>
    <p>${escapeText(chapter.summary)}</p>
    <ul>${chapter.revise.map(item => `<li>${escapeText(item)}</li>`).join('')}</ul>
    <div class="card-row">${flashcards.map(card => `<article><h3>${escapeText(card.question)}</h3><p>${escapeText(card.answer)}</p></article>`).join('')}</div>
    <p><strong>Exam tip:</strong> ${escapeText(chapter.examTip)}</p>
    <button class="primary" onclick="completeChapter('${chapter.id}')">Done +15 XP</button>
  `;
}

function renderPractice(){
  document.getElementById('practiceView').innerHTML = `
    <header class="app-header"><div><p class="eyebrow">Practice</p><h1>Choose your practice</h1></div></header>
    <div class="practice-menu">
      <button onclick="startQuickQuiz()">Quick Quiz</button>
      <button onclick="startMockExam()">Mock Exam</button>
      <button onclick="startChapter('${todayChapter().id}')">Daily Bite</button>
      <button onclick="startChapter('${weakChapter().id}')">Weak Topics</button>
      <button onclick="randomPractice()">Random</button>
    </div>
    <section id="practiceStage" class="practice-stage"></section>
  `;
}

function renderProgress(){
  const mastery = overallMastery();
  const answered = learner.quizAttempts.length + learner.practiceAttempts.length;
  document.getElementById('progressView').innerHTML = `
    <header class="app-header"><div><p class="eyebrow">Progress</p><h1>Your learning health</h1></div></header>
    <section class="health-grid">
      <article><p>Current streak</p><strong>🔥 ${learner.streak}</strong></article>
      <article><p>Mastery</p><strong>${mastery}%</strong><div class="mini-bar"><span style="width:${mastery}%"></span></div></article>
      <article><p>Study time</p><strong>${Math.max(1, Math.round(answered * 0.08))}h</strong></article>
      <article><p>Questions answered</p><strong>${answered}</strong></article>
    </section>
    <section class="mastery-list">${DATA.chapters.map(chapter => `<div><span>${escapeText(chapter.title)}</span><strong>${chapterMastery(chapter.id)}%</strong><div class="mini-bar"><span style="width:${chapterMastery(chapter.id)}%"></span></div></div>`).join('')}</section>
  `;
}

function renderProfile(){
  document.getElementById('profileView').innerHTML = `
    <header class="app-header"><div><p class="eyebrow">Profile</p><h1>${escapeText(learner.name)}</h1></div></header>
    <section class="profile-panel">
      <article><h2>Settings</h2><p>Theme: Cream</p><p>Notifications: planned</p><p>Subscription: Free prototype</p></article>
      <article><h2>Achievements</h2><div class="achievement-row"><span>🍞 Loop Lover</span><span>🍙 Array Chef</span><span>🍰 Perfect Score</span></div></article>
      <button onclick="resetLocalProgress()">Reset local progress</button>
    </section>
  `;
}

function setPaper(paper){ selectedPaper = paper; renderLearn(); }
function startChapter(chapterId){ selectedChapterId = chapterId; const chapter = chapterById(chapterId); selectedPaper = chapter.paper; switchView('learn'); }
function completeChapter(chapterId){ learner.completed[chapterId] = new Date().toISOString(); recordActivity(15); renderApp(); }

function startQuickQuiz(){
  const questions = DATA.quizQuestions;
  const q = questions[currentQuizIndex % questions.length];
  const chapter = chapterById(q.chapter);
  document.getElementById('practiceStage').innerHTML = `<p class="eyebrow">Quick Quiz / ${chapter.title}</p><h2>${escapeText(q.question)}</h2>${q.options.map(option => `<button class="quiz-option" onclick="answerQuiz('${escapeText(option).replace(/'/g, "\\'")}')">${escapeText(option)}</button>`).join('')}`;
}
function answerQuiz(option){
  const q = DATA.quizQuestions[currentQuizIndex % DATA.quizQuestions.length];
  const correct = option === q.answer;
  learner.quizAttempts.unshift({ chapter: q.chapter, correct, date: new Date().toISOString() });
  learner.quizAttempts = learner.quizAttempts.slice(0, 50);
  recordActivity(correct ? 8 : 3);
  document.getElementById('practiceStage').innerHTML = `<div class="feedback"><h2>${correct ? 'Nice bite' : 'Almost there'}</h2><p><strong>Answer:</strong> ${escapeText(q.answer)}</p><p>${escapeText(q.explanation)}</p><p><strong>${escapeText(q.examTip)}</strong></p><button onclick="nextQuiz()">Next</button></div>`;
}
function nextQuiz(){ currentQuizIndex++; startQuickQuiz(); }
function startMockExam(){ document.getElementById('practiceStage').innerHTML = '<div class="feedback"><h2>Mock Exam</h2><p>Planned for the next build: timed Paper 1 and Paper 2 sets with review mode.</p></div>'; }
function randomPractice(){ currentQuizIndex = Math.floor(Math.random() * DATA.quizQuestions.length); startQuickQuiz(); }
function resetLocalProgress(){ learner = { ...defaultLearner(), signedIn: true, name: learner.name }; saveLearner(); renderApp(); }

window.setPaper = setPaper;
window.startChapter = startChapter;
window.completeChapter = completeChapter;
window.startQuickQuiz = startQuickQuiz;
window.startMockExam = startMockExam;
window.randomPractice = randomPractice;
window.answerQuiz = answerQuiz;
window.nextQuiz = nextQuiz;
window.resetLocalProgress = resetLocalProgress;
window.showLanding = showLanding;

document.getElementById('getStartedBtn').addEventListener('click', requireApp);
document.getElementById('loginTopBtn').addEventListener('click', openLogin);
document.querySelectorAll('.app-nav button').forEach(button => button.addEventListener('click', () => switchView(button.dataset.view)));
document.getElementById('loginForm').addEventListener('submit', event => {
  event.preventDefault();
  const name = document.getElementById('learnerName').value.trim() || 'James';
  learner.name = name;
  learner.signedIn = true;
  saveLearner();
  closeLogin();
  enterApp();
});

if(learner.signedIn){ enterApp(); }
