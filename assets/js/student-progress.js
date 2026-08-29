document.addEventListener('DOMContentLoaded', async () => {

  /* =========================================
     URL से Student ID लें
  ========================================= */

  const params = new URLSearchParams(window.location.search);

  const studentId = params.get('student_id');


  if (!studentId) {

    alert('विद्यार्थी की जानकारी नहीं मिली।');

    location.href = 'students.html';

    return;

  }


  /* =========================================
     Teacher का DISE Code लें
  ========================================= */

  const teacherDiseCode =
    sessionStorage.getItem(
      'ganit_setu_teacher_dise_code'
    );


  if (!teacherDiseCode) {

    alert('Teacher का DISE Code नहीं मिला। कृपया दोबारा लॉगिन करें।');

    location.href = 'index.html';

    return;

  }


  try {


    /* =========================================
       Student की जानकारी लोड करें

       Security:
       केवल उसी Teacher के School का Student
    ========================================= */

    const {
      data: student,
      error: studentError
    } = await supabaseClient

      .from('students')

      .select(`
        id,
        student_id,
        full_name,
        class_level,
        school_name,
        school_dise_code,
        photo_url,
        status
      `)

      .eq('student_id', studentId)

      .eq('school_dise_code', teacherDiseCode)

      .maybeSingle();


    if (studentError) throw studentError;


    if (!student) {

      alert(
        'यह विद्यार्थी आपके विद्यालय से संबंधित नहीं है या उपलब्ध नहीं है।'
      );

      location.href = 'students.html';

      return;

    }



    /* =========================================
       Student की जानकारी दिखाएं
    ========================================= */

    document.getElementById('studentName').textContent =
      student.full_name || 'विद्यार्थी';


    document.getElementById('studentInfo').textContent =

      '🆔 ' +
      (student.student_id || '—') +

      ' • 📘 कक्षा ' +
      (student.class_level || '—') +

      ' • 🏫 ' +
      (student.school_name || '—');



    /* =========================================
       Profile Photo
    ========================================= */

    const photoBox =
      document.getElementById('studentPhoto');


    if (student.photo_url) {

      photoBox.innerHTML =
        '<img src="' +
        escapeHtml(student.photo_url) +
        '" alt="Student Photo">';

    } else {

      photoBox.textContent =
        getInitials(student.full_name);

    }



    /* =========================================
       केवल इस Student के Submitted Tests लें
    ========================================= */

    const {
      data: attempts,
      error: attemptsError
    } = await supabaseClient

      .from('test_attempts')

      .select(`
        id,
        test_id,
        correct_answers,
        wrong_answers,
        unattempted,
        score,
        total_marks,
        percentage,
        started_at,
        submitted_at,
        time_taken_seconds,
        status,
        tests (
          id,
          title,
          test_type,
          class_level,
          test_date
        )
      `)

      .eq('student_id', student.id)

      .eq('status', 'submitted')

      .order(
        'submitted_at',
        {
          ascending: false
        }
      );


    if (attemptsError) throw attemptsError;


    const submittedAttempts =
      attempts || [];



    /* =========================================
       Safety:
       केवल उसी Class के Tests रखें
    ========================================= */

    const validAttempts =
      submittedAttempts.filter(attempt => {

        if (!attempt.tests) return false;

        return Number(
          attempt.tests.class_level
        ) === Number(
          student.class_level
        );

      });



    /* =========================================
       Progress Statistics
    ========================================= */

    const totalTests =
      validAttempts.length;


    let totalPercentage = 0;

    let bestPercentage = 0;


    validAttempts.forEach(attempt => {

      const percentage =
        Number(attempt.percentage || 0);


      totalPercentage += percentage;


      if (percentage > bestPercentage) {

        bestPercentage = percentage;

      }

    });


    const averagePercentage =
      totalTests > 0
        ? totalPercentage / totalTests
        : 0;



    /* =========================================
       Statistics दिखाएं
    ========================================= */

    document.getElementById('totalTests').textContent =
      totalTests;


    document.getElementById('averagePercentage').textContent =
      averagePercentage.toFixed(1) + '%';


    document.getElementById('bestPercentage').textContent =
      bestPercentage.toFixed(1) + '%';



    /* =========================================
       Result List दिखाएं
    ========================================= */

    renderResults(validAttempts);


  } catch (error) {


    console.error(
      'Student Progress Load Error:',
      error
    );


    document.getElementById('studentName').textContent =
      'जानकारी लोड नहीं हो सकी';


    document.getElementById('studentInfo').textContent =
      'कृपया बाद में पुनः प्रयास करें।';


    document.getElementById('resultList').innerHTML = `

      <div class="error-box">

        ❌ टेस्ट परिणाम लोड नहीं हो सके।

      </div>

    `;


    alert(
      'डेटा लोड नहीं हो सका: ' +
      (error.message || 'Unknown Error')
    );

  }



  /* =========================================
     Results Render करें
  ========================================= */

  function renderResults(attempts) {


    const resultList =
      document.getElementById('resultList');


    if (!attempts.length) {

      resultList.innerHTML = `

        <div class="empty-box">

          📝 इस विद्यार्थी ने अभी तक कोई टेस्ट Submit नहीं किया है।

        </div>

      `;

      return;

    }



    resultList.innerHTML =
      attempts.map(attempt => {


        const test =
          attempt.tests || {};


        const title =
          test.title || 'टेस्ट';


        const score =
          Number(attempt.score || 0);


        const totalMarks =
          Number(attempt.total_marks || 0);


        const percentage =
          Number(attempt.percentage || 0);


        const date =
          formatDate(
            attempt.submitted_at ||
            test.test_date ||
            attempt.started_at
          );


        const correct =
          Number(attempt.correct_answers || 0);


        const wrong =
          Number(attempt.wrong_answers || 0);


        return `

          <div class="mini-result">


            <div class="result-info">

              <b>
                ${escapeHtml(title)}
              </b>


              <small>

                ✅ सही: ${correct}

                &nbsp; | &nbsp;

                ❌ गलत: ${wrong}

              </small>

            </div>



            <div class="result-score">

              ${score}/${totalMarks}

              <br>

              ${percentage.toFixed(1)}%

            </div>



            <div class="result-date">

              📅 ${escapeHtml(date)}

            </div>


          </div>

        `;


      }).join('');

  }



  /* =========================================
     Date Format
  ========================================= */

  function formatDate(value) {


    if (!value) return '—';


    try {

      return new Date(value)
        .toLocaleDateString(
          'hi-IN',
          {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          }
        );

    } catch (error) {

      return '—';

    }

  }



  /* =========================================
     Initials
  ========================================= */

  function getInitials(name) {

    return String(name || 'GS')

      .trim()

      .split(/\s+/)

      .map(word => word.charAt(0))

      .join('')

      .slice(0, 2)

      .toUpperCase();

  }



  /* =========================================
     HTML Escape
  ========================================= */

  function escapeHtml(value) {

    return String(value ?? '')

      .replace(/&/g, '&amp;')

      .replace(/</g, '&lt;')

      .replace(/>/g, '&gt;')

      .replace(/"/g, '&quot;')

      .replace(/'/g, '&#039;');

  }


});
