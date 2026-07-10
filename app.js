const DATA = window.CIE_DATA;
const STORAGE_KEY = 'nibbleLearnerProgressV4';
const COURSE_PAPER = 'paper2';
const COURSE_CHAPTER_IDS = ['ch9', 'ch10', 'ch11', 'ch12'];

let learner = loadLearner();
let activeView = 'home';
let selectedChapterId = COURSE_CHAPTER_IDS[0];
let biteStep = 'overview';
let currentQuizIndex = 0;

function defaultLearner(){
  return {
    name: '',
    signedIn: false,
    xp: 0,
    streak: 0,
    goalXp: 25,
    lastActiveDate: '',
    reviewedCards: {},
    quizAttempts: [],
    completedBites: {},
    practiceAttempts: []
  };
}

function loadLearner(){
  try { return { ...defaultLearner(), ...JSON.parse(localStorage.getItem(STORAGE_KEY)) }; }
  catch { return defaultLearner(); }
}

function saveLearner(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(learner)); }
function todayKey(){ return new Date().toISOString().slice(0, 10); }
function courseChapters(){ return DATA.chapters.filter(chapter => COURSE_CHAPTER_IDS.includes(chapter.id)); }
function chapterById(id){ return courseChapters().find(chapter => chapter.id === id) || courseChapters()[0]; }
function paperName(){ return 'AS 9618 Paper 2'; }
function escapeText(value){ return String(value || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function chapterCards(chapterId){ return DATA.flashcards.filter(card => card.chapter === chapterId); }
function chapterQuestions(chapterId){ return DATA.quizQuestions.filter(question => question.chapter === chapterId); }
function courseQuestions(){ return DATA.quizQuestions.filter(question => COURSE_CHAPTER_IDS.includes(question.chapter)); }
function coursePractice(){ return DATA.practiceTasks.filter(task => COURSE_CHAPTER_IDS.includes(task.chapter)); }

function recordActivity(xp){
  const today = todayKey();
  if(learner.lastActiveDate !== today) learner.streak = (learner.streak || 0) + 1;
  learner.lastActiveDate = today;
  learner.xp += xp;
  saveLearner();
}

function chapterMastery(chapterId){
  const cards = chapterCards(chapterId);
  const reviewed = cards.filter(card => learner.reviewedCards[card.id]).length;
  const cardScore = cards.length ? (reviewed / cards.length) * 25 : 0;
  const quizAttempts = learner.quizAttempts.filter(attempt => attempt.chapter === chapterId);
  const correct = quizAttempts.filter(attempt => attempt.correct).length;
  const quizScore = quizAttempts.length ? Math.min(40, (correct / Math.max(1, quizAttempts.length)) * 40) : 0;
  const completionScore = learner.completedBites[chapterId] ? 35 : 0;
  return Math.min(100, Math.round(cardScore + quizScore + completionScore));
}

function overallMastery(){
  const chapters = courseChapters();
  return Math.round(chapters.reduce((sum, chapter) => sum + chapterMastery(chapter.id), 0) / chapters.length);
}

function todayChapter(){
  return courseChapters().find(chapter => !learner.completedBites[chapter.id]) || weakChapter();
}

function weakChapter(){
  return [...courseChapters()].sort((a, b) => chapterMastery(a.id) - chapterMastery(b.id))[0];
}

function openLogin(){ document.getElementById('loginModal').hidden = false; }
function closeLogin(){ document.getElementById('loginModal').hidden = true; }
function enterApp(){
  document.getElementById('landingPage').hidden = true;
  document.getElementById('appPage').hidden = false;
  setAppTheme(activeView);
  renderApp();
}
function showLanding(){
  document.getElementById('landingPage').hidden = false;
  document.getElementById('appPage').hidden = true;
}
function requireApp(){ learner.signedIn ? enterApp() : openLogin(); }

function openAppView(view){
  if(!learner.signedIn){
    sessionStorage.setItem('nibblePendingView', view);
    openLogin();
    return;
  }
  activeView = view;
  enterApp();
  switchView(view);
}


function setAppTheme(view){
  const appPage = document.getElementById('appPage');
  if(!appPage) return;
  appPage.classList.remove('app-home', 'app-learn', 'app-practice', 'app-progress', 'app-profile');
  appPage.classList.add('app-' + view);
}

function switchView(view){
  activeView = view;
  setAppTheme(view);
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
  const todayXp = learner.xp % learner.goalXp;
  const goalPercent = Math.min(100, Math.round((todayXp / learner.goalXp) * 100));
  document.getElementById('homeView').innerHTML = `
    <header class="app-header">
      <div><p class="eyebrow">Good evening ${escapeText(learner.name)}</p><h1>Today's Bite</h1></div>
      <button class="link-button" onclick="showLanding()">Public site</button>
    </header>
    <section class="today-app-card">
      <div class="home-dessert-cluster" aria-hidden="true"><span class="home-sweet scoop"></span><span class="home-sweet cupcake"></span><span class="home-sweet cookie"></span></div>
      <div><p class="eyebrow">${paperName()}</p><h2>${escapeText(chapter.title)}</h2><p>${escapeText(chapter.summary)}</p><span>5-10 min</span></div>
      <button class="primary" onclick="startChapter('${chapter.id}')">Start Bite</button>
    </section>
    <section class="metric-grid">
      <article><p>Current streak</p><strong>${learner.streak} days</strong></article>
      <article><p>Today's goal</p><strong>${todayXp} / ${learner.goalXp} XP</strong><div class="mini-bar"><span style="width:${goalPercent}%"></span></div></article>
      <article><p>Overall mastery</p><strong>${mastery}%</strong><div class="mini-bar"><span style="width:${mastery}%"></span></div></article>
    </section>
    <section class="continue-grid">
      <article><p class="eyebrow">Continue Learning</p><h3>${escapeText(chapter.title)}</h3><div class="mini-bar"><span style="width:${chapterMastery(chapter.id)}%"></span></div><button onclick="startChapter('${chapter.id}')">Continue</button></article>
      <article><p class="eyebrow">Recommended</p><h3>${escapeText(weak.title)}</h3><p>Because this topic has the lowest mastery.</p><button onclick="startChapter('${weak.id}')">Try this bite</button></article>
    </section>
  `;
}

function renderLearn(){
  const chapters = courseChapters();
  document.getElementById('learnView').innerHTML = `
    <header class="app-header"><div><p class="eyebrow">Learn</p><h1>Paper 2</h1></div><p class="course-pill">Sections 9-12 only</p></header>
    <div class="topic-list">
      ${chapters.map(chapter => `
        <article class="learn-topic ${selectedChapterId === chapter.id ? 'selected' : ''}">
          <span class="topic-sweet" aria-hidden="true"></span>
          <div><p class="eyebrow">Section ${chapter.number}</p><h2>${escapeText(chapter.title)}</h2><p>${escapeText(chapter.summary)}</p></div>
          <div class="topic-actions"><strong>${chapterMastery(chapter.id)}%</strong><div class="mini-bar"><span style="width:${chapterMastery(chapter.id)}%"></span></div><button onclick="startChapter('${chapter.id}')">Start Bite</button></div>
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
  const cards = chapterCards(chapter.id);
  const question = chapterQuestions(chapter.id)[0] || courseQuestions()[0];
  const stepClass = step => biteStep === step ? 'active' : '';
  let body = '';

  if(biteStep === 'overview'){
    body = `<p>${escapeText(chapter.summary)}</p><ul>${chapter.revise.map(item => `<li>${escapeText(item)}</li>`).join('')}</ul><button class="primary" onclick="setBiteStep('cards')">Start training</button>`;
  }

  if(biteStep === 'cards'){
    body = `<div class="card-row">${cards.map(card => `<article><h3>${escapeText(card.question)}</h3><p>${escapeText(card.answer)}</p><button onclick="reviewCard('${card.id}')">Reviewed</button></article>`).join('') || '<p>No cards yet for this bite.</p>'}</div><button class="primary" onclick="setBiteStep('quiz')">Go to mini quiz</button>`;
  }

  if(biteStep === 'quiz'){
    body = `<div class="quiz-panel"><h3>${escapeText(question.question)}</h3>${question.options.map(option => `<button class="quiz-option" onclick="answerBiteQuiz('${question.id}', '${escapeText(option).replace(/'/g, "\\'")}')">${escapeText(option)}</button>`).join('')}</div><div id="biteFeedback" class="feedback" hidden></div>`;
  }

  if(biteStep === 'done'){
    body = `<div class="completion-card"><span class="sweet-object cupcake"></span><h3>Bite finished</h3><p>You earned XP and updated your mastery for this topic.</p><button onclick="switchView('home')">Back home</button></div>`;
  }

  container.innerHTML = `
    <p class="eyebrow">${paperName()} / Section ${chapter.number}</p>
    <h2>${escapeText(chapter.title)}</h2>
    <div class="bite-steps"><button class="${stepClass('overview')}" onclick="setBiteStep('overview')">Read</button><button class="${stepClass('cards')}" onclick="setBiteStep('cards')">Cards</button><button class="${stepClass('quiz')}" onclick="setBiteStep('quiz')">Mini quiz</button><button class="${stepClass('done')}" onclick="finishBite('${chapter.id}')">Done</button></div>
    ${body}
    <p><strong>Exam tip:</strong> ${escapeText(chapter.examTip || 'Use official Cambridge pseudocode conventions and show your working clearly.')}</p>
  `;
}

function renderPractice(){
  document.getElementById('practiceView').innerHTML = `
    <header class="app-header"><div><p class="eyebrow">Exam Prep</p><h1>Practice</h1></div><p class="course-pill">Paper 2: 2 hours, 75 marks</p></header>
    <div class="practice-menu">
      <button onclick="startQuickQuiz()"><span class="mini-sweet"></span>Quick Quiz</button>
      <button onclick="startMockExam()"><span class="mini-sweet"></span>Mock Exam</button>
      <button onclick="startChapter('${todayChapter().id}')"><span class="mini-sweet"></span>Daily Bite</button>
      <button onclick="startChapter('${weakChapter().id}')"><span class="mini-sweet"></span>Weak Topics</button>
      <button onclick="randomPractice()"><span class="mini-sweet"></span>Random</button>
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
      <article><p>Current streak</p><strong>${learner.streak} days</strong></article>
      <article><p>Mastery</p><strong>${mastery}%</strong><div class="mini-bar"><span style="width:${mastery}%"></span></div></article>
      <article><p>Study time</p><strong>${Math.max(1, Math.round(answered * 0.08))}h</strong></article>
      <article><p>Questions answered</p><strong>${answered}</strong></article>
    </section>
    <section class="mastery-list">${courseChapters().map(chapter => `<div><span>${escapeText(chapter.title)}</span><strong>${chapterMastery(chapter.id)}%</strong><div class="mini-bar"><span style="width:${chapterMastery(chapter.id)}%"></span></div></div>`).join('')}</section>
  `;
}

function renderProfile(){
  document.getElementById('profileView').innerHTML = `
    <header class="app-header"><div><p class="eyebrow">Profile</p><h1>${escapeText(learner.name)}</h1></div></header>
    <section class="profile-panel">
      <article><h2>Settings</h2><p>Theme: glossy dessert</p><p>Notifications: planned</p><p>Subscription: Free prototype</p></article>
      <article><h2>Achievements</h2><div class="achievement-row"><span>Loop Lover</span><span>Array Chef</span><span>Perfect Score</span></div></article>
      <button onclick="resetLocalProgress()">Reset local progress</button>
    </section>
  `;
}

function startChapter(chapterId){
  selectedChapterId = chapterId;
  biteStep = 'overview';
  switchView('learn');
  setTimeout(() => document.getElementById('lessonDetail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
}
function setBiteStep(step){ biteStep = step; renderLessonDetail(); }
function reviewCard(cardId){ learner.reviewedCards[cardId] = new Date().toISOString(); recordActivity(2); renderLessonDetail(); }
function finishBite(chapterId){ learner.completedBites[chapterId] = new Date().toISOString(); recordActivity(15); biteStep = 'done'; renderApp(); }

function answerBiteQuiz(questionId, option){
  const question = courseQuestions().find(q => q.id === questionId);
  const correct = question && option === question.answer;
  learner.quizAttempts.unshift({ id: questionId, chapter: question.chapter, correct, date: new Date().toISOString() });
  learner.quizAttempts = learner.quizAttempts.slice(0, 60);
  recordActivity(correct ? 8 : 3);
  const feedback = document.getElementById('biteFeedback');
  feedback.hidden = false;
  feedback.innerHTML = `<h3>${correct ? 'Nice bite' : 'Almost there'}</h3><p><strong>Answer:</strong> ${escapeText(question.answer)}</p><p>${escapeText(question.explanation)}</p><p><strong>${escapeText(question.examTip)}</strong></p><button class="primary" onclick="finishBite('${question.chapter}')">Finish bite</button>`;
}

function startQuickQuiz(){
  const questions = courseQuestions();
  const q = questions[currentQuizIndex % questions.length];
  const chapter = chapterById(q.chapter);
  document.getElementById('practiceStage').innerHTML = `<p class="eyebrow">Quick Quiz / ${escapeText(chapter.title)}</p><h2>${escapeText(q.question)}</h2>${q.options.map(option => `<button class="quiz-option" onclick="answerPracticeQuiz('${q.id}', '${escapeText(option).replace(/'/g, "\\'")}')">${escapeText(option)}</button>`).join('')}`;
}
function answerPracticeQuiz(questionId, option){
  const q = courseQuestions().find(question => question.id === questionId);
  const correct = option === q.answer;
  learner.quizAttempts.unshift({ id: q.id, chapter: q.chapter, correct, date: new Date().toISOString() });
  learner.quizAttempts = learner.quizAttempts.slice(0, 60);
  recordActivity(correct ? 8 : 3);
  document.getElementById('practiceStage').innerHTML = `<div class="feedback"><h2>${correct ? 'Nice bite' : 'Almost there'}</h2><p><strong>Answer:</strong> ${escapeText(q.answer)}</p><p>${escapeText(q.explanation)}</p><p><strong>${escapeText(q.examTip)}</strong></p><button onclick="nextQuiz()">Next</button></div>`;
}
function nextQuiz(){ currentQuizIndex++; startQuickQuiz(); }
function startMockExam(){ document.getElementById('practiceStage').innerHTML = '<div class="feedback"><h2>Mock Exam</h2><p>Planned next: generated Paper 2 tests that keep selected question IDs for review. Full mock: 2 hours, 75 marks.</p></div>'; }
function randomPractice(){ currentQuizIndex = Math.floor(Math.random() * courseQuestions().length); startQuickQuiz(); }
function resetLocalProgress(){ learner = { ...defaultLearner(), signedIn: true, name: learner.name }; saveLearner(); renderApp(); }

window.startChapter = startChapter;
window.setBiteStep = setBiteStep;
window.reviewCard = reviewCard;
window.finishBite = finishBite;
window.answerBiteQuiz = answerBiteQuiz;
window.startQuickQuiz = startQuickQuiz;
window.startMockExam = startMockExam;
window.randomPractice = randomPractice;
window.answerPracticeQuiz = answerPracticeQuiz;
window.nextQuiz = nextQuiz;
window.resetLocalProgress = resetLocalProgress;
window.showLanding = showLanding;
window.switchView = switchView;
window.openAppView = openAppView;

function showAppError(message){
  const landing = document.getElementById('landingPage');
  const appPage = document.getElementById('appPage');
  if(landing) landing.hidden = true;
  if(appPage) {
    appPage.hidden = false;
    appPage.innerHTML = `<main class="app-main"><section class="app-error"><h1>Nibble needs a refresh</h1><p>${escapeText(message)}</p><button class="primary" onclick="window.location.reload()">Refresh</button></section></main>`;
  }
}

function bindAppEvents(){
  document.getElementById('getStartedBtn')?.addEventListener('click', requireApp);
  document.getElementById('loginTopBtn')?.addEventListener('click', requireApp);
  document.querySelectorAll('.app-nav button').forEach(button => button.addEventListener('click', () => switchView(button.dataset.view)));
  document.querySelectorAll('.public-app-nav button').forEach(button => button.addEventListener('click', () => openAppView(button.dataset.publicView)));
  document.querySelectorAll('.public-app-nav button').forEach(button => button.addEventListener('mouseenter', () => setPublicTheme(button.dataset.publicView)));

  document.getElementById('loginForm')?.addEventListener('submit', event => {
    event.preventDefault();
    learner.name = document.getElementById('learnerName').value.trim() || 'Learner';
    learner.signedIn = true;
    saveLearner();
    closeLogin();
    const pendingView = sessionStorage.getItem('nibblePendingView');
    if(pendingView){
      sessionStorage.removeItem('nibblePendingView');
      activeView = pendingView;
    }
    enterApp();
    switchView(activeView);
  });
}

function bootApp(){
  try {
    if(!DATA || !Array.isArray(DATA.chapters) || courseChapters().length === 0){
      throw new Error('The lesson data did not load.');
    }
    bindAppEvents();
    setPublicTheme('home');
    if(learner.signedIn){
      activeView = activeView || 'home';
      enterApp();
      switchView(activeView);
    } else {
      showLanding();
    }
  } catch(error) {
    console.error(error);
    showAppError(error.message || 'The app could not start.');
  }
}

bootApp();
