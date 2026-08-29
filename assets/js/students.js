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

    box.innerHTML = `
      <div class="student-row">
        <span>—</span>
        <span><b>इस विद्यालय का कोई विद्यार्थी नहीं मिला</b></span>
        <span>—</span>
        <span>—</span>
      </div>
    `;

    return;
  }


  box.innerHTML = list.map(s => {

    const status = s.status || 'active';

    const statusText =
      status === 'active'
        ? 'सक्रिय'
        : status;


    return `

      <a
        href="student-progress.html?student_id=${encodeURIComponent(s.student_id || '')}"
        class="student-row"
      >

        <span>
          ${escapeHtml(s.student_id || '—')}
        </span>


        <span>
          <b>
            ${escapeHtml(s.full_name || 'विद्यार्थी')}
          </b>
        </span>


        <span>
          कक्षा ${escapeHtml(s.class_level || '—')}
        </span>


        <span class="status">
          ${escapeHtml(statusText)}
        </span>

      </a>

    `;

  }).join('');

}



/* =========================================
   SEARCH STUDENTS
========================================= */

function filterStudents() {

  const q =
    (
      document.getElementById('studentSearch').value || ''
    )
      .trim()
      .toLowerCase();


  const filtered = allStudents.filter(s =>

    String(s.full_name || '')
      .toLowerCase()
      .includes(q)

    ||

    String(s.student_id || '')
      .toLowerCase()
      .includes(q)

    ||

    String(s.school_name || '')
      .toLowerCase()
      .includes(q)

  );


  renderStudents(filtered);

}



/* =========================================
   LOAD ONLY TEACHER'S SCHOOL STUDENTS
========================================= */

async function loadStudents() {

  const box =
    document.getElementById('studentList');


  box.innerHTML = `

    <div class="student-row">

      <span>
        ⏳ लोड हो रहा है...
      </span>

    </div>

  `;


  // Teacher का DISE Code Session से लें

  const teacherDiseCode =
    sessionStorage.getItem(
      'ganit_setu_teacher_dise_code'
    );


  // अगर Teacher Login नहीं हुआ है

  if (!teacherDiseCode) {

    box.innerHTML = `

      <div class="student-row">

        <span>⚠️</span>

        <span>
          <b>
            Teacher का DISE Code नहीं मिला।
          </b>
        </span>

        <span>—</span>

        <span>—</span>

      </div>

    `;


    console.error(
      'Teacher DISE Code missing from session'
    );


    return;

  }


  try {

    const {
      data,
      error
    } = await supabaseClient

      .from('students')

      .select(

        `
        student_id,
        full_name,
        class_level,
        school_name,
        school_dise_code,
        status,
        created_at
        `

      )

      // केवल उसी स्कूल के विद्यार्थी

      .eq(
        'school_dise_code',
        teacherDiseCode
      )

      // केवल Class 9 और 10

      .in(
        'class_level',
        [9, 10]
      )

      .order(
        'class_level',
        {
          ascending: true
        }
      )

      .order(
        'full_name',
        {
          ascending: true
        }
      );


    if (error) throw error;


    allStudents =
      data || [];


    console.log(
      'Teacher DISE Code:',
      teacherDiseCode
    );


    console.log(
      'Students Loaded:',
      allStudents
    );


    renderStudents(
      allStudents
    );


  } catch (error) {

    console.error(
      'Students Load Error:',
      error
    );


    box.innerHTML = `

      <div class="student-row">

        <span>⚠️</span>

        <span>
          <b>
            विद्यार्थियों का डेटा लोड नहीं हो सका
          </b>
        </span>

        <span>—</span>

        <span>—</span>

      </div>

    `;

  }

}



/* =========================================
   PAGE LOAD
========================================= */

document.addEventListener(

  'DOMContentLoaded',

  loadStudents

);
