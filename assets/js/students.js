let allStudents = [];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderStudents(list) {
  const box = document.getElementById('studentList');

  if (!list.length) {
    box.innerHTML = '<div class="student-row"><span>—</span><span><b>कोई विद्यार्थी नहीं मिला</b></span><span>—</span><span>—</span></div>';
    return;
  }

  box.innerHTML = list.map(s => {
    const status = s.status || 'active';
    const statusText = status === 'active' ? 'सक्रिय' : status;
    return `
      <a href="student-progress.html?student_id=${encodeURIComponent(s.student_id || '')}" class="student-row">
        <span>${escapeHtml(s.student_id || '—')}</span>
        <span><b>${escapeHtml(s.full_name || 'विद्यार्थी')}</b></span>
        <span>कक्षा ${escapeHtml(s.class_level || '—')}</span>
        <span class="status">${escapeHtml(statusText)}</span>
      </a>`;
  }).join('');
}

function filterStudents() {
  const q = (document.getElementById('studentSearch').value || '').trim().toLowerCase();
  const filtered = allStudents.filter(s =>
    String(s.full_name || '').toLowerCase().includes(q) ||
    String(s.student_id || '').toLowerCase().includes(q) ||
    String(s.school_name || '').toLowerCase().includes(q)
  );
  renderStudents(filtered);
}

async function loadStudents() {
  const box = document.getElementById('studentList');
  box.innerHTML = '<div class="student-row"><span>लोड हो रहा है...</span></div>';

  try {
    const { data, error } = await supabaseClient
      .from('students')
      .select('student_id, full_name, class_level, school_name, status, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    allStudents = data || [];
    renderStudents(allStudents);
  } catch (error) {
    console.error('Students Load Error:', error);
    box.innerHTML = `
      <div class="student-row">
        <span>⚠️</span>
        <span><b>विद्यार्थियों का डेटा लोड नहीं हो सका</b></span>
        <span>—</span>
        <span>—</span>
      </div>`;
  }
}

document.addEventListener('DOMContentLoaded', loadStudents);
