const DATA = window.CIE_DATA || { chapters: [], flashcards: [], quizQuestions: [], practiceTasks: [] };
const STORAGE_KEY = 'nibbleLearnerProgressV6';
const THEMES = ['cream', 'matcha', 'blueberry', 'peach', 'cocoa'];

let learner = loadLearner();
let activeView = 'home';
let selectedChapterId = DATA.chapters[0]?.id || 'ch1';
let biteStep = 'overview';
let currentQuizSession = null;

function defaultLearner(){
  return {
    name: '',
    email: '',
    signedIn: false,
    xp: 0,
    streak: 0,
    goalXp: 30,
    theme: 'cream',
    lastActiveDate: '',
    activityDates: {},
    reviewedCards: {},
    quizAttempts: [],
    completedBites: {},
    practiceAttempts: []
  };
}

function loadLearner(){
  try { return normalizeLearner(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}); }
  catch { return defaultLearner(); }
}

function normalizeLearner(value){
  const merged = { ...defaultLearner(), ...value };
  merged.activityDates = merged.activityDates || {};
  merged.reviewedCards = merged.reviewedCards || {};
  merged.completedBites = merged.completedBites || {};
  merged.quizAttempts = Array.isArray(merged.quizAttempts) ? merged.quizAttempts : [];
  merged.practiceAttempts = Array.isArray(merged.practiceAttempts) ? merged.practiceAttempts : [];
  merged.theme = THEMES.includes(merged.theme) ? merged.theme : 'cream';
  merged.goalXp = Number(merged.goalXp) || 30;
  return merged;
}

function saveLearner(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(learner)); }
function todayKey(){ return new Date().toISOString().slice(0, 10); }
function courseChapters(){ return DATA.chapters; }
function paperChapters(paper){ return courseChapters().filter(chapter => chapter.paper === paper); }
function chapterById(id){ return courseChapters().find(chapter => chapter.id === id) || courseChapters()[0]; }
function chapterCards(chapterId){ return DATA.flashcards.filter(card => card.chapter === chapterId); }
function chapterQuestions(chapterId){ return DATA.quizQuestions.filter(question => question.chapter === chapterId); }
function chapterPractice(chapterId){ return DATA.practiceTasks.filter(task => task.chapter === chapterId); }
function courseQuestions(){ return DATA.quizQuestions; }
function coursePractice(){ return DATA.practiceTasks; }
function escapeText(value){ return String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
function percent(value, total){ return total ? Math.min(100, Math.round((value / total) * 100)) : 0; }

function todayXp(){ return (learner.activityDates[todayKey()] || { xp: 0 }).xp; }
function studyMinutes(){ return Object.values(learner.activityDates).reduce((sum, day) => sum + (day.minutes || 0), 0); }
function completedBiteCount(){ return Object.keys(learner.completedBites).length; }
function reviewedCardCount(){ return Object.keys(learner.reviewedCards).length; }
function totalQuestionsAnswered(){ return learner.quizAttempts.length + learner.practiceAttempts.length; }

function recordActivity(xp, details = {}){
  const today = todayKey();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if(learner.lastActiveDate !== today){
    learner.streak = learner.lastActiveDate === yesterday ? (learner.streak || 0) + 1 : 1;
  }
  learner.lastActiveDate = today;
  learner.xp += xp;
  const day = learner.activityDates[today] || { xp: 0, questions: 0, bites: 0, minutes: 0 };
  day.xp += xp;
  day.questions += details.questions || 0;
  day.bites += details.bites || 0;
  day.minutes += details.minutes || Math.max(1, Math.round(xp / 5));
  learner.activityDates[today] = day;
  saveLearner();
}

function chapterMastery(chapterId){
  const cards = chapterCards(chapterId);
  const reviewed = cards.filter(card => learner.reviewedCards[card.id]).length;
  const cardScore = cards.length ? (reviewed / cards.length) * 20 : 0;
  const attempts = learner.quizAttempts.filter(attempt => attempt.chapter === chapterId);
  const correct = attempts.filter(attempt => attempt.correct).length;
  const quizScore = attempts.length ? Math.min(35, (correct / attempts.length) * 35) : 0;
  const practice = learner.practiceAttempts.filter(attempt => attempt.chapter === chapterId);
  const practiceAverage = practice.length ? practice.reduce((sum, item) => sum + item.score, 0) / practice.length : 0;
  const practiceScore = Math.min(25, practiceAverage * 25);
  const completionScore = learner.completedBites[chapterId] ? 20 : 0;
  return Math.min(100, Math.round(cardScore + quizScore + practiceScore + completionScore));
}

function overallMastery(){
  const chapters = courseChapters();
  return chapters.length ? Math.round(chapters.reduce((sum, chapter) => sum + chapterMastery(chapter.id), 0) / chapters.length) : 0;
}

function weakChapter(){ return [...courseChapters()].sort((a, b) => chapterMastery(a.id) - chapterMastery(b.id))[0] || courseChapters()[0]; }
function todayChapter(){ return courseChapters().find(chapter => !learner.completedBites[chapter.id]) || weakChapter(); }

function achievementDefinitions(){
  const perfect = learner.quizAttempts.some(attempt => attempt.sessionScore === 1);
  return [
    { title: 'First Bite', detail: 'Finish one learning bite.', unlocked: completedBiteCount() >= 1 },
    { title: 'Taste Tester', detail: 'Answer 5 quiz questions.', unlocked: learner.quizAttempts.length >= 5 },
    { title: 'Question Taster', detail: 'Answer 10 total questions.', unlocked: totalQuestionsAnswered() >= 10 },
    { title: '3 Day Streak', detail: 'Study on 3 different days.', unlocked: Object.keys(learner.activityDates).length >= 3 || learner.streak >= 3 },
    { title: '100 Bite Points', detail: 'Earn 100 XP.', unlocked: learner.xp >= 100 },
    { title: 'Perfect Plate', detail: 'Score 100% in a quiz.', unlocked: perfect },
    { title: 'Paper 1 Explorer', detail: 'Reach 50% in one Paper 1 chapter.', unlocked: paperChapters('paper1').some(ch => chapterMastery(ch.id) >= 50) },
    { title: 'Paper 2 Builder', detail: 'Reach 50% in one Paper 2 chapter.', unlocked: paperChapters('paper2').some(ch => chapterMastery(ch.id) >= 50) }
  ];
}

function applyTheme(){
  document.body.dataset.theme = learner.theme;
  const appPage = document.getElementById('appPage');
  if(appPage) appPage.dataset.theme = learner.theme;
}

function setAppTheme(view){
  const appPage = document.getElementById('appPage');
  if(!appPage) return;
  appPage.classList.remove('app-home', 'app-learn', 'app-practice', 'app-progress', 'app-profile');
  appPage.classList.add('app-' + view);
  applyTheme();
}

function openLogin(){ document.getElementById('loginModal').hidden = false; }
function closeLogin(){ document.getElementById('loginModal').hidden = true; }
function showLanding(){ document.getElementById('landingPage').hidden = false; document.getElementById('appPage').hidden = true; }
function requireApp(){ learner.signedIn ? enterApp() : openLogin(); }

function enterApp(){
  document.getElementById('landingPage').hidden = true;
  document.getElementById('appPage').hidden = false;
  setAppTheme(activeView);
  renderApp();
}

function openAppView(view){
  if(!learner.signedIn){ sessionStorage.setItem('nibblePendingView', view); openLogin(); return; }
  activeView = view;
  enterApp();
  switchView(view);
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
  const goalPercent = percent(todayXp(), learner.goalXp);
  const unlocked = achievementDefinitions().filter(item => item.unlocked).length;
  document.getElementById('homeView').innerHTML = `
    <header class="app-header hero-header">
      <div><p class="eyebrow">Good evening ${escapeText(learner.name || 'Learner')}</p><h1>Today's Bite</h1><p>${escapeText(learner.email || 'Local learner profile')}</p></div>
      <button class="link-button" onclick="showLanding()">Public site</button>
    </header>
    <section class="today-app-card expanded-card">
      <div class="home-dessert-cluster" aria-hidden="true"><span class="home-sweet scoop"></span><span class="home-sweet cupcake"></span><span class="home-sweet cookie"></span></div>
      <div><p class="eyebrow">Recommended bite</p><h2>${escapeText(chapter.title)}</h2><p>${escapeText(chapter.summary)}</p><span>Estimated time: 5-10 min</span></div>
      <button class="primary" onclick="startChapter('${chapter.id}')">Start Bite</button>
    </section>
    <section class="metric-grid dashboard-grid">
      <article><p>Current streak</p><strong>${learner.streak} days</strong><small>Keep it calm and consistent.</small></article>
      <article><p>Today's goal</p><strong>${todayXp()} / ${learner.goalXp} XP</strong><div class="mini-bar"><span style="width:${goalPercent}%"></span></div></article>
      <article><p>Overall mastery</p><strong>${mastery}%</strong><div class="mini-bar"><span style="width:${mastery}%"></span></div></article>
      <article><p>Achievements</p><strong>${unlocked} / ${achievementDefinitions().length}</strong><small>Unlocked recipes.</small></article>
    </section>
    <section class="two-column-section">
      <article class="content-panel"><p class="eyebrow">Continue Learning</p><h2>${escapeText(chapter.title)}</h2><p>${escapeText(chapter.sections.join(' / '))}</p><div class="mini-bar"><span style="width:${chapterMastery(chapter.id)}%"></span></div><button onclick="startChapter('${chapter.id}')">Continue</button></article>
      <article class="content-panel"><p class="eyebrow">Weak Topic</p><h2>${escapeText(weak.title)}</h2><p>Lowest current mastery: ${chapterMastery(weak.id)}%. Try a small review and one question.</p><button onclick="startChapter('${weak.id}')">Strengthen this</button></article>
    </section>
    <section class="content-panel"><p class="eyebrow">Quick Map</p><div class="chapter-strip">${courseChapters().map(chapter => `<button onclick="startChapter('${chapter.id}')"><span>${chapter.number}</span><strong>${escapeText(chapter.title)}</strong><small>${chapterMastery(chapter.id)}%</small></button>`).join('')}</div></section>
    <section class="content-panel"><p class="eyebrow">Recent progress</p>${renderRecentActivity()}</section>
  `;
}

function renderRecentActivity(){
  const recent = [...learner.quizAttempts, ...learner.practiceAttempts].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5);
  if(recent.length === 0) return '<p>No activity yet. Start a bite or quick quiz to begin tracking.</p>';
  return `<div class="activity-list">${recent.map(item => `<div><strong>${escapeText(chapterById(item.chapter)?.title || 'Practice')}</strong><span>${item.correct === undefined ? Math.round((item.score || 0) * 100) + '%' : (item.correct ? 'Correct' : 'Review')}</span></div>`).join('')}</div>`;
}

function renderLearn(){
  document.getElementById('learnView').innerHTML = `
    <header class="app-header"><div><p class="eyebrow">Learn</p><h1>Content Map</h1><p>Cambridge AS Computer Science Paper 1 and Paper 2.</p></div><p class="course-pill">${courseChapters().length} chapters</p></header>
    <section class="paper-map">
      ${renderPaperBlock('paper1', 'Paper 1', 'Theory fundamentals')}
      ${renderPaperBlock('paper2', 'Paper 2', 'Algorithms and programming')}
    </section>
    <section id="lessonDetail" class="lesson-detail rich-lesson"></section>
  `;
  renderLessonDetail();
}

function renderPaperBlock(paper, title, subtitle){
  return `<article class="content-panel"><p class="eyebrow">${title}</p><h2>${subtitle}</h2><div class="topic-list compact-list">${paperChapters(paper).map(chapter => `
    <button class="chapter-row ${selectedChapterId === chapter.id ? 'selected' : ''}" onclick="startChapter('${chapter.id}')">
      <span>${chapter.number}</span><div><strong>${escapeText(chapter.title)}</strong><small>${escapeText(chapter.summary)}</small></div><em>${chapterMastery(chapter.id)}%</em>
    </button>`).join('')}</div></article>`;
}

function renderLessonDetail(){
  const container = document.getElementById('lessonDetail');
  if(!container) return;
  const chapter = chapterById(selectedChapterId);
  const cards = chapterCards(chapter.id);
  const question = chapterQuestions(chapter.id)[0] || courseQuestions()[0];
  const task = chapterPractice(chapter.id)[0] || coursePractice()[0];
  const stepClass = step => biteStep === step ? 'active' : '';
  let body = '';
  if(biteStep === 'overview'){
    body = `<div class="lesson-grid"><article><h3>What to know</h3><ul>${chapter.revise.map(item => `<li>${escapeText(item)}</li>`).join('')}</ul></article><article><h3>Syllabus sections</h3><ul>${chapter.sections.map(item => `<li>${escapeText(item)}</li>`).join('')}</ul></article></div><button class="primary" onclick="setBiteStep('cards')">Start training</button>`;
  }
  if(biteStep === 'cards'){
    body = `<div class="card-row">${cards.map(card => `<article><h3>${escapeText(card.question)}</h3><p>${escapeText(card.answer)}</p><button onclick="reviewCard('${card.id}')">Mark reviewed</button></article>`).join('') || '<p>No cards yet for this bite.</p>'}</div><button class="primary" onclick="setBiteStep('quiz')">Go to mini quiz</button>`;
  }
  if(biteStep === 'quiz'){
    body = `<div class="quiz-panel"><h3>${escapeText(question.question)}</h3>${question.options.map(option => `<button class="quiz-option" onclick="answerBiteQuiz('${question.id}', '${escapeText(option).replace(/'/g, "\\'")}')">${escapeText(option)}</button>`).join('')}</div><div id="biteFeedback" class="feedback" hidden></div>`;
  }
  if(biteStep === 'practice') body = renderPracticeTask(task, true);
  if(biteStep === 'done'){
    body = `<div class="completion-card"><span class="sweet-object cupcake"></span><h3>Bite finished</h3><p>Mastery updated. You earned XP for this chapter.</p><button onclick="switchView('home')">Back home</button></div>`;
  }
  container.innerHTML = `
    <p class="eyebrow">${chapter.paper === 'paper1' ? 'Paper 1' : 'Paper 2'} / Chapter ${chapter.number}</p>
    <h2>${escapeText(chapter.title)}</h2><p>${escapeText(chapter.summary)}</p>
    <div class="bite-steps"><button class="${stepClass('overview')}" onclick="setBiteStep('overview')">Read</button><button class="${stepClass('cards')}" onclick="setBiteStep('cards')">Cards</button><button class="${stepClass('quiz')}" onclick="setBiteStep('quiz')">Quiz</button><button class="${stepClass('practice')}" onclick="setBiteStep('practice')">Exam practice</button><button class="${stepClass('done')}" onclick="finishBite('${chapter.id}')">Done</button></div>
    ${body}
    <p><strong>Exam tip:</strong> ${escapeText(chapter.examTip || 'Use exact Cambridge vocabulary and show enough working to earn method marks.')}</p>`;
}

function renderPractice(){
  document.getElementById('practiceView').innerHTML = `
    <header class="app-header"><div><p class="eyebrow">Practice</p><h1>Challenge Plate</h1><p>Choose a quick quiz, topical quiz, weak topic, or short exam-style answer.</p></div><p class="course-pill">${totalQuestionsAnswered()} answered</p></header>
    <div class="practice-menu rich-menu">
      <button onclick="startQuickQuiz('all')"><span class="mini-sweet"></span>Mixed Quiz</button>
      <button onclick="startQuickQuiz('${weakChapter().id}')"><span class="mini-sweet"></span>Weak Topic</button>
      <button onclick="startChapter('${todayChapter().id}')"><span class="mini-sweet"></span>Daily Bite</button>
      <button onclick="startPracticeTask('${coursePractice()[0]?.id || ''}')"><span class="mini-sweet"></span>Exam Answer</button>
      <button onclick="startMockExam()"><span class="mini-sweet"></span>Mock Exam</button>
    </div>
    <section class="content-panel"><p class="eyebrow">Topical quizzes</p><div class="chapter-strip">${courseChapters().map(chapter => `<button onclick="startQuickQuiz('${chapter.id}')"><span>${chapter.number}</span><strong>${escapeText(chapter.title)}</strong><small>${chapterQuestions(chapter.id).length} questions</small></button>`).join('')}</div></section>
    <section id="practiceStage" class="practice-stage"><h2>Pick a practice mode</h2><p>Feedback appears instantly and progress is saved to your profile.</p></section>
  `;
}

function startQuickQuiz(chapterId = 'all'){
  const pool = chapterId === 'all' ? courseQuestions() : chapterQuestions(chapterId);
  const questions = (pool.length ? pool : courseQuestions()).slice(0, 5);
  currentQuizSession = { questions, index: 0, correct: 0, chapterId };
  renderQuizQuestion();
}

function renderQuizQuestion(){
  const q = currentQuizSession.questions[currentQuizSession.index];
  const chapter = chapterById(q.chapter);
  document.getElementById('practiceStage').innerHTML = `<p class="eyebrow">Question ${currentQuizSession.index + 1} of ${currentQuizSession.questions.length} / ${escapeText(chapter.title)}</p><h2>${escapeText(q.question)}</h2>${q.options.map(option => `<button class="quiz-option" onclick="answerPracticeQuiz('${q.id}', '${escapeText(option).replace(/'/g, "\\'")}')">${escapeText(option)}</button>`).join('')}<div id="practiceFeedback" class="feedback" hidden></div>`;
}

function answerPracticeQuiz(questionId, option){
  const q = courseQuestions().find(question => question.id === questionId);
  const correct = option === q.answer;
  if(correct) currentQuizSession.correct += 1;
  const isLast = currentQuizSession.index >= currentQuizSession.questions.length - 1;
  const sessionScore = isLast ? currentQuizSession.correct / currentQuizSession.questions.length : undefined;
  learner.quizAttempts.unshift({ id: q.id, chapter: q.chapter, correct, sessionScore, date: new Date().toISOString() });
  learner.quizAttempts = learner.quizAttempts.slice(0, 120);
  recordActivity(correct ? 8 : 3, { questions: 1, minutes: 2 });
  const feedback = document.getElementById('practiceFeedback');
  feedback.hidden = false;
  feedback.innerHTML = `<h3>${correct ? 'Nice bite' : 'Almost there'}</h3><p><strong>Answer:</strong> ${escapeText(q.answer)}</p><p>${escapeText(q.explanation)}</p><p><strong>Exam tip:</strong> ${escapeText(q.examTip)}</p><button onclick="${isLast ? 'finishQuizSession()' : 'nextQuizQuestion()'}">${isLast ? 'Show score' : 'Next question'}</button>`;
}

function nextQuizQuestion(){ currentQuizSession.index += 1; renderQuizQuestion(); }
function finishQuizSession(){
  const score = percent(currentQuizSession.correct, currentQuizSession.questions.length);
  document.getElementById('practiceStage').innerHTML = `<div class="feedback score-card"><h2>${score}%</h2><p>${currentQuizSession.correct} / ${currentQuizSession.questions.length} correct.</p><p>${score === 100 ? 'Perfect plate. That achievement is now unlocked.' : 'Review the chapter map and try the weak topic again.'}</p><button class="primary" onclick="startQuickQuiz('${currentQuizSession.chapterId}')">Try again</button></div>`;
  renderApp();
}

function renderPracticeTask(task, insideLesson = false){
  if(!task) return '<p>No practice task yet.</p>';
  return `<div class="exam-task"><p class="eyebrow">Exam-style answer</p><h3>${escapeText(task.question)}</h3><textarea id="practiceAnswer" rows="6" placeholder="Write your answer here..."></textarea><button class="primary" onclick="markPracticeAnswer('${task.id}', ${insideLesson})">Check answer</button><div id="taskFeedback" class="feedback" hidden></div></div>`;
}

function startPracticeTask(taskId){
  const task = coursePractice().find(item => item.id === taskId) || coursePractice()[0];
  document.getElementById('practiceStage').innerHTML = renderPracticeTask(task, false);
}

function markPracticeAnswer(taskId, insideLesson){
  const task = coursePractice().find(item => item.id === taskId) || chapterPractice(selectedChapterId)[0];
  const answer = document.getElementById('practiceAnswer')?.value || '';
  const upper = answer.toUpperCase();
  const matched = task.keywords.filter(keyword => upper.includes(keyword.toUpperCase()));
  const score = task.keywords.length ? matched.length / task.keywords.length : 0;
  learner.practiceAttempts.unshift({ id: task.id, chapter: task.chapter, score, matched, date: new Date().toISOString() });
  learner.practiceAttempts = learner.practiceAttempts.slice(0, 80);
  recordActivity(Math.max(3, Math.round(score * 12)), { questions: 1, minutes: 4 });
  const feedback = document.getElementById('taskFeedback');
  feedback.hidden = false;
  feedback.innerHTML = `<h3>${score >= 0.75 ? 'Strong answer' : 'Almost there'}</h3><p><strong>Score:</strong> ${Math.round(score * 100)}%</p><p><strong>Keywords found:</strong> ${matched.map(escapeText).join(', ') || 'None yet'}</p><p><strong>Model answer:</strong> ${escapeText(task.modelAnswer)}</p><p><strong>Exam tip:</strong> ${escapeText(task.examTip)}</p>${insideLesson ? `<button onclick="finishBite('${task.chapter}')">Finish bite</button>` : ''}`;
  renderProgress();
  renderProfile();
}

function startMockExam(){
  const tasks = coursePractice().slice(0, 3);
  document.getElementById('practiceStage').innerHTML = `<div class="content-panel"><p class="eyebrow">Mock Exam Pack</p><h2>Mini mock: 3 short questions</h2><ol>${tasks.map(task => `<li>${escapeText(task.question)}</li>`).join('')}</ol><p>Use the Exam Answer mode to mark each one. Full timed mock exams are the next backend feature.</p></div>`;
}

function renderProgress(){
  const mastery = overallMastery();
  document.getElementById('progressView').innerHTML = `
    <header class="app-header"><div><p class="eyebrow">Progress</p><h1>Your learning health</h1><p>Mastery is built from cards, quizzes, exam practice, and completed bites.</p></div></header>
    <section class="health-grid expanded-health"><article><p>Current streak</p><strong>${learner.streak} days</strong></article><article><p>Mastery</p><strong>${mastery}%</strong><div class="mini-bar"><span style="width:${mastery}%"></span></div></article><article><p>Study time</p><strong>${Math.round(studyMinutes() / 60)}h ${studyMinutes() % 60}m</strong></article><article><p>Questions answered</p><strong>${totalQuestionsAnswered()}</strong></article></section>
    <section class="two-column-section"><article class="content-panel"><p class="eyebrow">Paper 1 mastery</p>${renderMasteryList('paper1')}</article><article class="content-panel"><p class="eyebrow">Paper 2 mastery</p>${renderMasteryList('paper2')}</article></section>
    <section class="content-panel"><p class="eyebrow">Achievement recipes</p><div class="achievement-grid">${achievementDefinitions().map(renderAchievement).join('')}</div></section>
  `;
}

function renderMasteryList(paper){
  return `<div class="mastery-list compact-mastery">${paperChapters(paper).map(chapter => `<div><span>${escapeText(chapter.title)}</span><strong>${chapterMastery(chapter.id)}%</strong><div class="mini-bar"><span style="width:${chapterMastery(chapter.id)}%"></span></div></div>`).join('')}</div>`;
}

function renderAchievement(item){
  return `<article class="achievement-card ${item.unlocked ? 'unlocked' : ''}"><span></span><h3>${escapeText(item.title)}</h3><p>${escapeText(item.detail)}</p><strong>${item.unlocked ? 'Unlocked' : 'Locked'}</strong></article>`;
}

function renderProfile(){
  const unlocked = achievementDefinitions().filter(item => item.unlocked).length;
  document.getElementById('profileView').innerHTML = `
    <header class="app-header"><div><p class="eyebrow">Profile</p><h1>${escapeText(learner.name || 'Learner')}</h1><p>${escapeText(learner.email || 'No email saved')}</p></div><p class="course-pill">${unlocked} achievements</p></header>
    <section class="profile-panel rich-profile">
      <article class="content-panel"><h2>Account</h2><label>Name<input id="settingsName" value="${escapeText(learner.name)}"></label><label>Email<input id="settingsEmail" value="${escapeText(learner.email)}" type="email"></label><label>Daily XP goal<input id="settingsGoal" value="${learner.goalXp}" type="number" min="5" step="5"></label><button class="primary" onclick="saveSettings()">Save settings</button></article>
      <article class="content-panel"><h2>Theme gradients</h2><div class="theme-grid">${THEMES.map(theme => `<button class="theme-chip theme-${theme} ${learner.theme === theme ? 'active' : ''}" onclick="setTheme('${theme}')"><span></span>${theme}</button>`).join('')}</div><p>Changes the cream-gradient mood across the app.</p></article>
      <article class="content-panel"><h2>Stats</h2><p>XP: ${learner.xp}</p><p>Cards reviewed: ${reviewedCardCount()}</p><p>Bites finished: ${completedBiteCount()}</p><p>Practice answers: ${learner.practiceAttempts.length}</p><button onclick="resetLocalProgress()">Reset local progress</button></article>
    </section>
    <section class="content-panel"><p class="eyebrow">Achievements</p><div class="achievement-grid">${achievementDefinitions().map(renderAchievement).join('')}</div></section>
  `;
}

function startChapter(chapterId){ selectedChapterId = chapterId; biteStep = 'overview'; switchView('learn'); setTimeout(() => document.getElementById('lessonDetail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0); }
function setBiteStep(step){ biteStep = step; renderLessonDetail(); }
function reviewCard(cardId){ learner.reviewedCards[cardId] = new Date().toISOString(); recordActivity(2, { minutes: 1 }); renderLessonDetail(); renderProgress(); }
function finishBite(chapterId){ learner.completedBites[chapterId] = new Date().toISOString(); recordActivity(15, { bites: 1, minutes: 5 }); biteStep = 'done'; renderApp(); }

function answerBiteQuiz(questionId, option){
  const question = courseQuestions().find(q => q.id === questionId);
  const correct = question && option === question.answer;
  learner.quizAttempts.unshift({ id: questionId, chapter: question.chapter, correct, date: new Date().toISOString() });
  learner.quizAttempts = learner.quizAttempts.slice(0, 120);
  recordActivity(correct ? 8 : 3, { questions: 1, minutes: 2 });
  const feedback = document.getElementById('biteFeedback');
  feedback.hidden = false;
  feedback.innerHTML = `<h3>${correct ? 'Nice bite' : 'Almost there'}</h3><p><strong>Answer:</strong> ${escapeText(question.answer)}</p><p>${escapeText(question.explanation)}</p><p><strong>Exam tip:</strong> ${escapeText(question.examTip)}</p><button class="primary" onclick="setBiteStep('practice')">Try exam practice</button>`;
}

function setTheme(theme){ learner.theme = THEMES.includes(theme) ? theme : 'cream'; saveLearner(); applyTheme(); renderProfile(); }
function saveSettings(){ learner.name = document.getElementById('settingsName')?.value.trim() || learner.name || 'Learner'; learner.email = document.getElementById('settingsEmail')?.value.trim() || learner.email; learner.goalXp = Math.max(5, Number(document.getElementById('settingsGoal')?.value) || 30); saveLearner(); renderApp(); }
function resetLocalProgress(){ learner = { ...defaultLearner(), signedIn: true, name: learner.name, email: learner.email, theme: learner.theme }; saveLearner(); renderApp(); }

window.startChapter = startChapter;
window.setBiteStep = setBiteStep;
window.reviewCard = reviewCard;
window.finishBite = finishBite;
window.answerBiteQuiz = answerBiteQuiz;
window.startQuickQuiz = startQuickQuiz;
window.answerPracticeQuiz = answerPracticeQuiz;
window.nextQuizQuestion = nextQuizQuestion;
window.finishQuizSession = finishQuizSession;
window.startPracticeTask = startPracticeTask;
window.markPracticeAnswer = markPracticeAnswer;
window.startMockExam = startMockExam;
window.resetLocalProgress = resetLocalProgress;
window.showLanding = showLanding;
window.switchView = switchView;
window.openAppView = openAppView;
window.setTheme = setTheme;
window.saveSettings = saveSettings;

function setPublicTheme(view){
  const landing = document.getElementById('landingPage');
  if(!landing) return;
  landing.classList.remove('landing-home', 'landing-learn', 'landing-practice', 'landing-progress', 'landing-profile');
  landing.classList.add('landing-' + view);
  document.querySelectorAll('.public-app-nav button').forEach(btn => btn.classList.toggle('active', btn.dataset.publicView === view));
}

function showAppError(message){
  const landing = document.getElementById('landingPage');
  const appPage = document.getElementById('appPage');
  if(landing) landing.hidden = true;
  if(appPage){
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
    learner.name = document.getElementById('learnerName')?.value.trim() || 'Learner';
    learner.email = document.getElementById('learnerEmail')?.value.trim() || learner.email || 'learner@nibble.local';
    learner.signedIn = true;
    saveLearner();
    closeLogin();
    const pendingView = sessionStorage.getItem('nibblePendingView');
    if(pendingView){ sessionStorage.removeItem('nibblePendingView'); activeView = pendingView; }
    enterApp();
    switchView(activeView);
  });
}

function bootApp(){
  try {
    if(!DATA || !Array.isArray(DATA.chapters) || courseChapters().length === 0) throw new Error('The lesson data did not load.');
    applyTheme();
    bindAppEvents();
    setPublicTheme('home');
    learner.signedIn ? enterApp() : showLanding();
  } catch(error) {
    console.error(error);
    showAppError(error.message || 'The app could not start.');
  }
}

bootApp();
