document.addEventListener('DOMContentLoaded', async () => {
  const resultList = document.getElementById('resultList');
  const totalResultsEl = document.getElementById('totalResults');
  const averageScoreEl = document.getElementById('averageScore');
  const bestScoreEl = document.getElementById('bestScore');

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  const formatTime = (seconds) => {
    const s = Number(seconds || 0);
    if (!s) return '—';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2,'0')}`;
  };

  const teacherDiseCode = sessionStorage.getItem('ganit_setu_teacher_dise_code');
  if (!teacherDiseCode) {
    resultList.innerHTML = '<div class="empty-results"><span>🔐</span><h2>Teacher लॉगिन आवश्यक है</h2><p>कृपया दोबारा लॉगिन करें।</p></div>';
    return;
  }

  resultList.innerHTML = '<div class="result-row"><span>⏳ परिणाम लोड हो रहे हैं...</span></div>';

  try {
    const { data: students, error: studentError } = await supabaseClient
      .from('students')
      .select('id, full_name, class_level, school_dise_code')
      .eq('school_dise_code', teacherDiseCode)
      .eq('status', 'active');

    if (studentError) throw studentError;

    const studentList = students || [];
    const studentMap = Object.fromEntries(studentList.map(s => [s.id, s]));

    if (!studentList.length) {
      totalResultsEl.textContent = '0';
      averageScoreEl.textContent = '0%';
      bestScoreEl.textContent = '0%';
      resultList.innerHTML = '<div class="empty-results"><span>📋</span><h2>अभी कोई विद्यार्थी उपलब्ध नहीं है</h2><p>इस विद्यालय के registered students दिखाई देंगे।</p></div>';
      return;
    }

    const studentIds = studentList.map(s => s.id);

    const { data: attempts, error: attemptsError } = await supabaseClient
      .from('test_attempts')
      .select(`id, student_id, test_id, score, total_marks, percentage, time_taken_seconds, submitted_at, status,
        tests (id, title, class_level, test_type, test_date)`)
      .in('student_id', studentIds)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false });

    if (attemptsError) throw attemptsError;

    const valid = (attempts || []).filter(a => {
      const student = studentMap[a.student_id];
      return student && a.tests && Number(a.tests.class_level) === Number(student.class_level);
    });

    const percentages = valid.map(a => Number(a.percentage || 0));
    totalResultsEl.textContent = valid.length;
    averageScoreEl.textContent = valid.length
      ? (percentages.reduce((x,y)=>x+y,0) / valid.length).toFixed(1) + '%'
      : '0%';
    bestScoreEl.textContent = valid.length
      ? Math.max(...percentages).toFixed(1) + '%'
      : '0%';

    if (!valid.length) {
      resultList.innerHTML = '<div class="empty-results"><span>📝</span><h2>अभी कोई वास्तविक परिणाम उपलब्ध नहीं है</h2><p>विद्यार्थी टेस्ट Submit करने के बाद उसका Live Result यहाँ दिखाई देगा।</p></div>';
      return;
    }

    // Rank is calculated only inside the same test and same class.
    const groups = {};
    valid.forEach(a => {
      const student = studentMap[a.student_id];
      const key = `${a.test_id}__${student.class_level}`;
      (groups[key] ||= []).push(a);
    });
    Object.values(groups).forEach(group => {
      group.sort((a,b) => Number(b.percentage||0)-Number(a.percentage||0) ||
        new Date(a.submitted_at||0)-new Date(b.submitted_at||0));
      group.forEach((a,i) => a._rank = i+1);
    });

    resultList.innerHTML = valid.map(a => {
      const student = studentMap[a.student_id];
      const test = a.tests || {};
      const score = `${Number(a.score||0)}/${Number(a.total_marks||0)}`;
      return `<div class="result-row">
        <span><b>${escapeHtml(student.full_name)}</b><br><small>कक्षा ${escapeHtml(student.class_level)}</small></span>
        <span>${escapeHtml(test.title || 'टेस्ट')}</span>
        <span><b>${escapeHtml(score)}</b><br><small>${Number(a.percentage||0).toFixed(1)}%</small></span>
        <span>${escapeHtml(formatTime(a.time_taken_seconds))}</span>
        <span><b>#${a._rank}</b></span>
      </div>`;
    }).join('');

  } catch (error) {
    console.error('School Results Load Error:', error);
    resultList.innerHTML = `<div class="empty-results"><span>❌</span><h2>परिणाम लोड नहीं हो सके</h2><p>${escapeHtml(error.message || 'Unknown error')}</p></div>`;
  }
});
