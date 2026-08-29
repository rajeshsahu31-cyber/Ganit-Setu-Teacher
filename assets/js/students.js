let allStudents = [];


/* ================================
   HTML SAFE
================================ */

function escapeHtml(value) {

  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

}


/* ================================
   STUDENT ROW
================================ */

function createStudentRow(s) {

  const status =
    s.status || 'active';


  const statusText =
    status === 'active'
      ? 'सक्रिय'
      : status;


  return `

    <a
      href="student-progress.html?student_id=${encodeURIComponent(
        s.student_id || ''
      )}"
      class="student-row"
    >

      <span>
        ${escapeHtml(s.student_id || '—')}
      </span>


      <span>

        <b>
          ${escapeHtml(
            s.full_name || 'विद्यार्थी'
          )}
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

}


/* ================================
   RENDER CLASS LIST
================================ */

function renderClassStudents(
  list,
  classNumber
) {

  const box =
    document.getElementById(
      classNumber === 9
        ? 'class9List'
        : 'class10List'
    );


  const countBox =
    document.getElementById(
      classNumber === 9
        ? 'class9Count'
        : 'class10Count'
    );


  // Total Count

  countBox.textContent =
    'कुल विद्यार्थी: ' +
    list.length;


  // Empty Message

  if (!list.length) {

    box.innerHTML = `

      <div class="student-row">

        <span>—</span>

        <span>
          <b>
            कोई विद्यार्थी नहीं मिला
          </b>
        </span>

        <span>
          कक्षा ${classNumber}
        </span>

        <span>—</span>

      </div>

    `;

    return;

  }


  box.innerHTML =
    list
      .map(createStudentRow)
      .join('');

}


/* ================================
   RENDER ALL
================================ */

function renderStudents(list) {

  const class9Students =
    list.filter(
      s => Number(s.class_level) === 9
    );


  const class10Students =
    list.filter(
      s => Number(s.class_level) === 10
    );


  renderClassStudents(
    class9Students,
    9
  );


  renderClassStudents(
    class10Students,
    10
  );

}


/* ================================
   SEARCH STUDENTS
================================ */

function filterStudents() {

  const searchInput =
    document.getElementById(
      'studentSearch'
    );


  const q =
    (searchInput?.value || '')
      .trim()
      .toLowerCase();


  if (!q) {

    renderStudents(
      allStudents
    );

    return;

  }


  const filtered =
    allStudents.filter(s =>

      String(
        s.full_name || ''
      )
        .toLowerCase()
        .includes(q)

      ||

      String(
        s.student_id || ''
      )
        .toLowerCase()
        .includes(q)

      ||

      String(
        s.school_name || ''
      )
        .toLowerCase()
        .includes(q)

    );


  renderStudents(
    filtered
  );

}


/* ================================
   LOAD STUDENTS
   ONLY TEACHER'S SCHOOL
================================ */

async function loadStudents() {

  const class9Box =
    document.getElementById(
      'class9List'
    );


  const class10Box =
    document.getElementById(
      'class10List'
    );


  class9Box.innerHTML =
    '<div class="student-row"><span>⏳ लोड हो रहा है...</span></div>';


  class10Box.innerHTML =
    '<div class="student-row"><span>⏳ लोड हो रहा है...</span></div>';


  // Teacher DISE Code

  const teacherDiseCode =
    sessionStorage.getItem(
      'ganit_setu_teacher_dise_code'
    );


  if (!teacherDiseCode) {

    const message = `

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


    class9Box.innerHTML =
      message;


    class10Box.innerHTML =
      message;


    console.error(
      'Teacher DISE Code missing'
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

      .eq(
        'school_dise_code',
        teacherDiseCode
      )

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


    if (error) {

      throw error;

    }


    allStudents =
      data || [];


    renderStudents(
      allStudents
    );


  } catch (error) {

    console.error(
      'Students Load Error:',
      error
    );


    const errorMessage = `

      <div class="student-row">

        <span>⚠️</span>

        <span>
          <b>
            विद्यार्थियों का डेटा लोड नहीं हो सका।
          </b>
        </span>

        <span>—</span>

        <span>—</span>

      </div>

    `;


    class9Box.innerHTML =
      errorMessage;


    class10Box.innerHTML =
      errorMessage;

  }

}


/* ================================
   PAGE LOAD
================================ */

document.addEventListener(
  'DOMContentLoaded',
  loadStudents
);
