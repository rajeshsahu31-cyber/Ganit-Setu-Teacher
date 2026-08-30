const params = new URLSearchParams(location.search);

const examType = (params.get('type') || 'primary').toLowerCase();
const testSet = (params.get('set') || 'A').toUpperCase();
const language2 = (params.get('lang') || '').toLowerCase();

let language1 = '';
let selectedSubject = '';

let questions = [];
let answers = {};
let current = 0;
let elapsed = 0;
let timerId = null;

const $ = id => document.getElementById(id);

const esc = v => String(v ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

function optionLetter(i) {
  return ['A', 'B', 'C', 'D'][i];
}

/* =========================================
   QUESTION DISPLAY
========================================= */

function renderQuestion() {
  if (!questions.length) return;

  const q = questions[current];

  $('questionNumber').textContent = `प्रश्न ${current + 1}`;
  $('questionText').textContent = q.question_text;

  const opts = [
    q.option_a,
    q.option_b,
    q.option_c,
    q.option_d
  ];

  $('options').innerHTML = opts.map((text, i) => {
    const letter = optionLetter(i);
    const selected = answers[q.id] === letter ? 'selected' : '';

    return `
      <button type="button"
        class="${selected}"
        data-letter="${letter}">
        <b>${letter}.</b> ${esc(text)}
      </button>
    `;
  }).join('');

  document.querySelectorAll('#options button').forEach(button => {
    button.onclick = () => {
      answers[q.id] = button.dataset.letter;
      renderQuestion();
    };
  });

  $('prevBtn').style.visibility =
    current === 0 ? 'hidden' : 'visible';

  $('nextBtn').textContent =
    current === questions.length - 1
      ? 'टेस्ट Submit करें ✓'
      : 'अगला प्रश्न →';

  $('progressText').textContent =
    `प्रगति: ${current + 1}/${questions.length} | उत्तर दिए: ${Object.keys(answers).length}`;
}

/* =========================================
   TIMER
========================================= */

function tick() {
  elapsed++;

  const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');

  $('timer').textContent = `⏱️ ${m}:${s}`;
}

/* =========================================
   LOAD QUESTIONS
========================================= */

async function loadQuestions() {

  const isPrimary = examType === 'primary';

  $('testType').textContent =
    isPrimary
      ? 'प्राथमिक शिक्षक पात्रता परीक्षा'
      : 'माध्यमिक शिक्षक पात्रता परीक्षा';

  /* -------- PRIMARY -------- */

  if (isPrimary) {

    $('setLabel').textContent =
      `Set ${testSet} • भाषा-2: ${
        language2 === 'sanskrit'
          ? 'संस्कृत'
          : 'English'
      }`;

    if (!['english', 'sanskrit'].includes(language2)) {
      $('loadingBox').innerHTML =
        '⚠️ पहले भाषा-2 चुनें: English या संस्कृत।';
      return;
    }

  } else {

    $('setLabel').textContent =
      `Set ${testSet} • भाषा-1: ${
        language1 === 'hindi' ? 'हिंदी' : 'संस्कृत'
      } • विषय: ${
        selectedSubject === 'mathematics' ? 'गणित' : selectedSubject
      }`;

  }

  try {

    const { data, error } = await supabaseClient
      .from('teacher_questions')
      .select('*')
      .eq('exam_type', examType)
      .eq('set_name', testSet)
      .eq('is_active', true)
      .order('section_number', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;

    let rows = data || [];

    console.log('========== TET DEBUG ==========');
    console.log('examType:', examType);
    console.log('testSet:', testSet);
    console.log('language1:', language1);
    console.log('language2:', language2);
    console.log('selectedSubject:', selectedSubject);
    console.log('Total rows:', rows.length);
    console.log('Rows:', rows);
    console.log('================================');


    /* =========================================
       PRIMARY FILTER
    ========================================= */

    if (isPrimary) {

      rows = rows.filter(q => {

        const section = Number(q.section_number);
        const lang = String(q.language_option || '').toLowerCase();

        if (section === 3) {
          return lang === language2;
        }

        return lang === '' || lang === 'common';
      });

      const counts = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0
      };

      rows.forEach(q => {
        const sec = Number(q.section_number);

        if (counts[sec] !== undefined) {
          counts[sec]++;
        }
      });

      const bad = Object.entries(counts)
        .filter(([, count]) => count !== 30);

      if (bad.length) {

        $('loadingBox').innerHTML =
          `📭 Set ${esc(testSet)} अभी तैयार नहीं है।<br><br>
          प्रत्येक भाग में 30 प्रश्न आवश्यक हैं।<br><br>
          वर्तमान स्थिति:<br>
          भाग 1: ${counts[1]}/30<br>
          भाग 2: ${counts[2]}/30<br>
          भाग 3: ${counts[3]}/30<br>
          भाग 4: ${counts[4]}/30<br>
          भाग 5: ${counts[5]}/30`;

        return;
      }

      questions = rows.slice(0, 150);

    }


    /* =========================================
       SECONDARY FILTER
    ========================================= */

    else {

      if (!language1 || !selectedSubject) {

        $('loadingBox').innerHTML =
          '⚠️ कृपया पहले भाषा और विषय चुनें।';

        return;
      }


      const section1 = rows.filter(q =>
        Number(q.section_number) === 1 &&
        String(q.language_option || '').toLowerCase() === language1
      );


      const section2 = rows.filter(q =>
        Number(q.section_number) === 2 &&
        String(q.language_option || '').toLowerCase() === 'common'
      );


      const section3 = rows.filter(q =>
        Number(q.section_number) === 3 &&
        String(q.language_option || '').toLowerCase() === 'common'
      );


      const section4 = rows.filter(q =>
        Number(q.section_number) === 4 &&
        String(q.language_option || '').toLowerCase() === 'common'
      );


      const section5 = rows.filter(q =>
        Number(q.section_number) === 5 &&
        String(q.subject_option || '').toLowerCase() === selectedSubject
      );


      console.log('SECONDARY COUNTS:', {
        language: section1.length,
        english: section2.length,
        gk_reasoning: section3.length,
        pedagogy: section4.length,
        subject: section5.length
      });


      /* -------- VALIDATION -------- */

      if (
        section1.length !== 8 ||
        section2.length !== 5 ||
        section3.length !== 7 ||
        section4.length !== 10 ||
        section5.length !== 120
      ) {

        $('loadingBox').innerHTML =
          `📭 Secondary Set ${esc(testSet)} अभी पूरी तरह तैयार नहीं है।<br><br>

          वर्तमान स्थिति:<br><br>

          भाषा-1: ${section1.length}/8<br>
          सामान्य अंग्रेजी: ${section2.length}/5<br>
          GK + Reasoning: ${section3.length}/7<br>
          Pedagogy: ${section4.length}/10<br>
          चुना हुआ Subject: ${section5.length}/120`;

        return;
      }


      /* EXACTLY 150 QUESTIONS */

      questions = [
        ...section1,
        ...section2,
        ...section3,
        ...section4,
        ...section5
      ];

    }


    /* =========================================
       FINAL VALIDATION
    ========================================= */

    if (questions.length !== 150) {

      $('loadingBox').innerHTML =
        `⚠️ टेस्ट के लिए ठीक 150 प्रश्न आवश्यक हैं।<br>
        अभी ${questions.length} प्रश्न मिले हैं।`;

      return;
    }


    /* =========================================
       START TEST
    ========================================= */

    $('testInfo').textContent =
      `CBT • ${questions.length} प्रश्न • Live Test`;

    $('loadingBox').style.display = 'none';
    $('testContent').style.display = 'block';

    renderQuestion();

    if (timerId) clearInterval(timerId);

    timerId = setInterval(tick, 1000);

  } catch (e) {

    console.error('Question loading error:', e);

    $('loadingBox').innerHTML =
      `❌ Questions load नहीं हो सके:<br>
      ${esc(e.message || 'Unknown error')}`;
  }
}


/* =========================================
   SECONDARY SELECTION SCREEN
========================================= */

function setupSecondarySelection() {

  const isPrimary = examType === 'primary';

  if (isPrimary) {
    loadQuestions();
    return;
  }


  $('secondarySelection').style.display = 'block';
  $('loadingBox').style.display = 'none';


  $('startSecondaryBtn').onclick = () => {

    language1 = $('language1').value;
    selectedSubject = $('subject').value;


    if (!language1) {
      alert('कृपया भाषा-1 चुनें।');
      return;
    }


    if (!selectedSubject) {
      alert('कृपया विषय चुनें।');
      return;
    }


    /* Reset test state */

    questions = [];
    answers = {};
    current = 0;
    elapsed = 0;


    $('timer').textContent = '⏱️ 00:00';


    $('secondarySelection').style.display = 'none';

    $('loadingBox').style.display = 'block';

    $('loadingBox').innerHTML =
      '⏳ चुने गए विकल्पों के अनुसार प्रश्न लोड हो रहे हैं...';


    loadQuestions();

  };
}


/* =========================================
   RESULT SAVE
========================================= */

async function resolveTeacherUUID() {

  const publicTeacherId =
    sessionStorage.getItem('ganit_setu_teacher_id') ||
    localStorage.getItem('ganit_setu_teacher_id') ||
    '';

  if (!publicTeacherId) {
    throw new Error(
      'Teacher login नहीं मिला। कृपया दोबारा Login करें।'
    );
  }

  const { data, error } = await supabaseClient
    .from('teachers')
    .select('id, teacher_id')
    .eq('teacher_id', publicTeacherId)
    .maybeSingle();

  if (error) throw error;

  if (!data?.id) {
    throw new Error(
      `Teacher record नहीं मिला: ${publicTeacherId}`
    );
  }

  return data.id;
}


async function getCurrentTestId() {

  const { data, error } = await supabaseClient
    .from('teacher_tests')
    .select('id')
    .eq('exam_type', examType)
    .eq('test_set', testSet)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;

  if (!data?.id) {
    throw new Error(
      `Active Test नहीं मिला: ${examType} / Set ${testSet}`
    );
  }

  return data.id;
}


async function submitTest() {

  if (!confirm('क्या आप टेस्ट Submit करना चाहते हैं?')) {
    return;
  }

  clearInterval(timerId);

  $('nextBtn').disabled = true;
  $('prevBtn').disabled = true;

  let correct = 0;
  let wrong = 0;
  let unattempted = 0;


  questions.forEach(q => {

    const answer = answers[q.id];

    if (!answer) {
      unattempted++;
    } else if (answer === q.correct_answer) {
      correct++;
    } else {
      wrong++;
    }

  });


  const total = questions.length;
  const attempted = correct + wrong;
  const score = correct;

  const percentage = total
    ? Number(((correct / total) * 100).toFixed(2))
    : 0;


  try {

    const teacherUUID = await resolveTeacherUUID();
    const testUUID = await getCurrentTestId();


    const attemptRes = await supabaseClient
      .from('teacher_attempts')
      .insert({
        teacher_id: teacherUUID,
        test_id: testUUID,
        started_at: new Date(
          Date.now() - elapsed * 1000
        ).toISOString(),
        total_questions: total,
        attempted_questions: attempted,
        correct_answers: correct,
        wrong_answers: wrong,
        unanswered_questions: unattempted,
        score: score,
        percentage: percentage,
        status: 'in_progress'
      })
      .select('id')
      .single();


    if (attemptRes.error) throw attemptRes.error;

    const attemptId = attemptRes.data.id;


    const answerRows = questions
      .filter(q => answers[q.id])
      .map(q => ({
        attempt_id: attemptId,
        question_id: q.id,
        selected_answer: answers[q.id],
        is_correct:
          answers[q.id] === q.correct_answer
      }));


    if (answerRows.length) {

      const answersRes = await supabaseClient
        .from('teacher_answers')
        .insert(answerRows);

      if (answersRes.error) throw answersRes.error;
    }


    const updateRes = await supabaseClient
      .from('teacher_attempts')
      .update({
        submitted_at: new Date().toISOString(),
        time_taken_seconds: elapsed,
        status: 'submitted'
      })
      .eq('id', attemptId);


    if (updateRes.error) throw updateRes.error;


    $('testContent').style.display = 'none';

    $('testMessage').innerHTML = `
      <div class="success-box">

        <h2>✅ टेस्ट Submit हो गया</h2>

        <p>कुल प्रश्न: <b>${total}</b></p>

        <p>
          सही: <b>${correct}</b> |
          गलत: <b>${wrong}</b> |
          छोड़े: <b>${unattempted}</b>
        </p>

        <p>
          स्कोर:
          <b>${score}/${total}</b>
          (${percentage}%)
        </p>

        <p>
          ⏱️ समय:
          ${Math.floor(elapsed / 60)} मिनट
          ${elapsed % 60} सेकंड
        </p>

        <p>☁️ आपका परिणाम Supabase में सुरक्षित हो गया है।</p>

        <a class="primary-btn" href="tet.html">
          वापस TET Dashboard
        </a>

      </div>
    `;

  } catch (e) {

    console.error('Result save error:', e);

    $('nextBtn').disabled = false;
    $('prevBtn').disabled = false;

    $('testMessage').innerHTML = `
      <div class="error-box">

        <h2>❌ Result Supabase में Save नहीं हुआ</h2>

        <p>${esc(e.message || 'Unknown error')}</p>

        <p>ऊपर वाला exact message screenshot करके भेजें।</p>

      </div>
    `;
  }
}


/* =========================================
   NEXT / PREVIOUS
========================================= */

$('nextBtn').onclick = () => {

  if (current < questions.length - 1) {
    current++;
    renderQuestion();
  } else {
    submitTest();
  }
};


$('prevBtn').onclick = () => {

  if (current > 0) {
    current--;
    renderQuestion();
  }
};


/* =========================================
   PAGE START
========================================= */

document.addEventListener(
  'DOMContentLoaded',
  setupSecondarySelection
);
