const params = new URLSearchParams(location.search);
const requestedTestId = params.get('test_id');
const requestedExamType = (params.get('type') || 'primary').toLowerCase();
const requestedSet = (params.get('set') || 'A').toUpperCase();

let test = null;
let questions = [];
let answers = {};
let current = 0;
let elapsed = 0;
let timerId = null;
let attemptId = null;

const $ = id => document.getElementById(id);
const esc = v => String(v ?? '')
  .replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function getTeacherId(){
  return sessionStorage.getItem('ganit_setu_teacher_id')
      || sessionStorage.getItem('teacher_id')
      || sessionStorage.getItem('teacherId')
      || localStorage.getItem('ganit_setu_teacher_id')
      || localStorage.getItem('teacher_id')
      || null;
}

function optionLetter(i){ return ['A','B','C','D'][i]; }

function tick(){
  elapsed++;
  const m = String(Math.floor(elapsed/60)).padStart(2,'0');
  const s = String(elapsed%60).padStart(2,'0');
  $('timer').textContent = `⏱️ ${m}:${s}`;
}

function renderQuestion(){
  const q = questions[current];
  if(!q) return;

  $('questionNumber').textContent = `प्रश्न ${current + 1} / ${questions.length}`;
  $('questionText').textContent = q.question_text;

  const opts = [q.option_a,q.option_b,q.option_c,q.option_d];
  $('options').innerHTML = opts.map((text,i)=>{
    const letter = optionLetter(i);
    return `<button type="button" class="${answers[q.id]===letter?'selected':''}" data-answer="${letter}">
      <b>${letter}.</b> ${esc(text)}
    </button>`;
  }).join('');

  document.querySelectorAll('#options button').forEach(btn=>{
    btn.onclick = ()=>{
      answers[q.id] = btn.dataset.answer;
      renderQuestion();
    };
  });

  $('prevBtn').style.visibility = current===0 ? 'hidden' : 'visible';
  $('nextBtn').textContent = current===questions.length-1 ? 'टेस्ट Submit करें ✓' : 'अगला प्रश्न →';
  $('progressText').innerHTML =
    `प्रगति: <b>${current+1}/${questions.length}</b> | उत्तर दिए: <b>${Object.keys(answers).length}</b>`;
}

async function resolveTest(){
  if(requestedTestId){
    const {data,error} = await supabaseClient
      .from('teacher_tests')
      .select('*')
      .eq('id', requestedTestId)
      .single();
    if(error) throw error;
    return data;
  }

  const {data,error} = await supabaseClient
    .from('teacher_tests')
    .select('*')
    .eq('exam_type', requestedExamType)
    .eq('test_set', requestedSet)
    .eq('status','active')
    .maybeSingle();

  if(error) throw error;
  return data;
}

async function loadTestQuestions(testId){
  const {data,error} = await supabaseClient
    .from('teacher_test_questions')
    .select(`
      question_id,
      section_number,
      question_order,
      teacher_questions (
        id, question_text,
        option_a, option_b, option_c, option_d,
        correct_answer, section_name
      )
    `)
    .eq('test_id',testId)
    .order('question_order',{ascending:true});

  if(error) throw error;

  return (data||[])
    .map(row=>({
      ...(row.teacher_questions || {}),
      section_number: row.section_number,
      question_order: row.question_order
    }))
    .filter(q=>q.id);
}

async function createAttempt(){
  const teacherId = getTeacherId();

  if(!teacherId){
    throw new Error('Teacher ID नहीं मिला। कृपया Teacher Panel से दोबारा Login करें।');
  }

  const {data,error} = await supabaseClient
    .from('teacher_attempts')
    .insert({
      teacher_id: teacherId,
      test_id: test.id,
      started_at: new Date().toISOString(),
      total_questions: questions.length,
      attempted_questions: 0,
      correct_answers: 0,
      wrong_answers: 0,
      unanswered_questions: questions.length,
      score: 0,
      percentage: 0,
      status: 'in_progress'
    })
    .select('id')
    .single();

  if(error) throw error;
  attemptId = data.id;
}

async function loadEverything(){
  try{
    $('loadingBox').textContent = '⏳ वास्तविक Test खोजा जा रहा है...';

    test = await resolveTest();

    if(!test){
      $('loadingBox').innerHTML =
        `📭 ${esc(requestedExamType)} Set ${esc(requestedSet)} के लिए कोई Active Test नहीं मिला।<br><br>
         पहले Admin/Supabase में <b>teacher_tests</b> में Active Test और उसके Questions जोड़ें।`;
      return;
    }

    $('testType').textContent =
      test.exam_type==='secondary' ? 'माध्यमिक शिक्षक पात्रता परीक्षा' : 'प्राथमिक शिक्षक पात्रता परीक्षा';
    $('setLabel').textContent = `Set ${test.test_set}`;

    $('loadingBox').textContent = '⏳ इस Test के वास्तविक Questions लोड हो रहे हैं...';
    questions = await loadTestQuestions(test.id);

    if(!questions.length){
      $('loadingBox').innerHTML =
        '📭 इस Test में कोई Question नहीं जोड़ा गया है।<br>' +
        'Questions को <b>teacher_test_questions</b> table में इस Test से जोड़ना जरूरी है।';
      return;
    }

    $('testInfo').textContent =
      `${test.test_title || 'TET Test'} • ${questions.length} प्रश्न • ${test.duration_minutes || 0} मिनट`;

    // Attempt create होने के बाद ही Test शुरू होगा
    await createAttempt();

    $('loadingBox').style.display = 'none';
    $('testContent').style.display = 'block';
    renderQuestion();
    timerId = setInterval(tick,1000);

  }catch(error){
    console.error('TET Load Error:',error);
    $('loadingBox').innerHTML =
      `<div class="error-box">❌ <b>Test शुरू नहीं हो सका</b><br>${esc(error.message||'Unknown error')}</div>`;
  }
}

async function submitTest(){
  if(!attemptId){
    alert('Attempt ID उपलब्ध नहीं है। Test सुरक्षित रूप से Submit नहीं किया जा सकता।');
    return;
  }

  clearInterval(timerId);
  $('nextBtn').disabled = true;
  $('prevBtn').disabled = true;

  let correct=0, wrong=0, unanswered=0;

  questions.forEach(q=>{
    const selected = answers[q.id];
    if(!selected) unanswered++;
    else if(selected===q.correct_answer) correct++;
    else wrong++;
  });

  const attempted = questions.length - unanswered;
  const score = correct;
  const percentage = questions.length
    ? Number(((correct/questions.length)*100).toFixed(2))
    : 0;

  $('testContent').style.display='none';
  $('testMessage').innerHTML =
    '<div class="success-box"><h2>⏳ आपका Attempt Supabase में Save हो रहा है...</h2></div>';

  try{
    const answerRows = questions
      .filter(q=>answers[q.id])
      .map(q=>({
        attempt_id: attemptId,
        question_id: q.id,
        selected_answer: answers[q.id],
        is_correct: answers[q.id]===q.correct_answer,
        answered_at: new Date().toISOString()
      }));

    if(answerRows.length){
      const {error:answersError} = await supabaseClient
        .from('teacher_answers')
        .insert(answerRows);
      if(answersError) throw answersError;
    }

    const {error:attemptError} = await supabaseClient
      .from('teacher_attempts')
      .update({
        submitted_at: new Date().toISOString(),
        time_taken_seconds: elapsed,
        total_questions: questions.length,
        attempted_questions: attempted,
        correct_answers: correct,
        wrong_answers: wrong,
        unanswered_questions: unanswered,
        score: score,
        percentage: percentage,
        status: 'submitted'
      })
      .eq('id',attemptId);

    if(attemptError) throw attemptError;

    $('testMessage').innerHTML = `<div class="success-box">
      <h2>✅ टेस्ट सफलतापूर्वक Submit हो गया</h2>
      <p>📚 Test: <b>${esc(test.test_title)}</b></p>
      <p>कुल प्रश्न: <b>${questions.length}</b></p>
      <p>सही: <b>${correct}</b> | गलत: <b>${wrong}</b> | बिना उत्तर: <b>${unanswered}</b></p>
      <p>🎯 Score: <b>${score}/${questions.length}</b> (${percentage}%)</p>
      <p>⏱️ समय: ${Math.floor(elapsed/60)} मिनट ${elapsed%60} सेकंड</p>
      <p>💾 पूरा Attempt और दिए गए Answers Supabase में Save हो गए हैं।</p>
      <a class="primary-btn" href="tet.html">वापस जाएँ</a>
    </div>`;

  }catch(error){
    console.error('Submit Error:',error);
    $('testMessage').innerHTML = `<div class="error-box">
      <h2>⚠️ Result बन गया, लेकिन Supabase में Save नहीं हो सका</h2>
      <p>${esc(error.message||'Unknown error')}</p>
      <p>कृपया इस error का screenshot भेजें।</p>
    </div>`;
  }
}

$('nextBtn').onclick = ()=>{
  if(current < questions.length-1){
    current++;
    renderQuestion();
  }else{
    submitTest();
  }
};

$('prevBtn').onclick = ()=>{
  if(current>0){
    current--;
    renderQuestion();
  }
};

document.addEventListener('DOMContentLoaded',loadEverything);
