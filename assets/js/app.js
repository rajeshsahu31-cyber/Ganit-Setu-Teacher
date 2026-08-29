document.addEventListener('DOMContentLoaded', async () => {

  const teacherName =
    sessionStorage.getItem('ganit_setu_teacher_name');

  const teacherDiseCode =
    sessionStorage.getItem('ganit_setu_teacher_dise_code');

  const teacherSchool =
    sessionStorage.getItem('ganit_setu_teacher_school');


  /* =====================================
     Teacher Session Check
  ===================================== */

  if (!teacherDiseCode) {

    alert('Teacher की जानकारी नहीं मिली। कृपया दोबारा लॉगिन करें।');

    location.href = 'index.html';

    return;

  }


  /* =====================================
     Teacher Name
  ===================================== */

  const displayName =
    teacherName || 'शिक्षक';


  document.getElementById('teacherName').textContent =
    displayName;


  document.getElementById('welcomeTitle').textContent =
    'नमस्ते, ' + displayName + '! 👋';


  document.getElementById('schoolName').textContent =
    teacherSchool || 'विद्यालय';


  /* =====================================
     Today's Date
  ===================================== */

  document.getElementById('todayDate').textContent =
    new Date().toLocaleDateString(
      'hi-IN',
      {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }
    );


  try {


    /* =====================================
       Load Teacher's School Students
    ===================================== */

    const {
      data: students,
      error: studentsError
    } = await supabaseClient

      .from('students')

      .select(`
        id,
        class_level
      `)

      .eq(
        'school_dise_code',
        teacherDiseCode
      )

      .in(
        'class_level',
        [9, 10]
      )

      .eq(
        'status',
        'active'
      );


    if (studentsError) throw studentsError;


    const schoolStudents =
      students || [];


    const totalStudents =
      schoolStudents.length;


    const class9Students =
      schoolStudents.filter(
        student =>
          Number(student.class_level) === 9
      );


    const class10Students =
      schoolStudents.filter(
        student =>
          Number(student.class_level) === 10
      );


    /* =====================================
       Show Student Counts
    ===================================== */

    document.getElementById('totalStudents').textContent =
      totalStudents;


    document.getElementById('class9Students').textContent =
      class9Students.length;


    document.getElementById('class10Students').textContent =
      class10Students.length;


    /* =====================================
       अगर Students नहीं हैं
    ===================================== */

    if (!totalStudents) {

      return;

    }


    /* =====================================
       Student UUID List
    ===================================== */

    const studentIds =
      schoolStudents.map(
        student => student.id
      );


    /* =====================================
       Submitted Test Attempts
    ===================================== */

    const {
      data: attempts,
      error: attemptsError
    } = await supabaseClient

      .from('test_attempts')

      .select(`
        student_id,
        percentage,
        submitted_at,
        status
      `)

      .in(
        'student_id',
        studentIds
      )

      .eq(
        'status',
        'submitted'
      );


    if (attemptsError) throw attemptsError;


    const submittedAttempts =
      attempts || [];


    /* =====================================
       Total Tests
    ===================================== */

    document.getElementById(
      'totalSubmittedTests'
    ).textContent =
      submittedAttempts.length;


    /* =====================================
       Overall Average
    ===================================== */

    let totalPercentage = 0;


    submittedAttempts.forEach(attempt => {

      totalPercentage +=
        Number(
          attempt.percentage || 0
        );

    });


    const overallAverage =
      submittedAttempts.length

        ? totalPercentage /
          submittedAttempts.length

        : 0;


    document.getElementById(
      'averageScore'
    ).textContent =
      overallAverage.toFixed(1) + '%';


    /* =====================================
       Class 9 Student IDs
    ===================================== */

    const class9Ids =
      class9Students.map(
        student => student.id
      );


    /* =====================================
       Class 10 Student IDs
    ===================================== */

    const class10Ids =
      class10Students.map(
        student => student.id
      );


    /* =====================================
       Class 9 Attempts
    ===================================== */

    const class9Attempts =
      submittedAttempts.filter(
        attempt =>
          class9Ids.includes(
            attempt.student_id
          )
      );


    /* =====================================
       Class 10 Attempts
    ===================================== */

    const class10Attempts =
      submittedAttempts.filter(
        attempt =>
          class10Ids.includes(
            attempt.student_id
          )
      );


    /* =====================================
       Class Average Function
    ===================================== */

    function calculateAverage(list) {

      if (!list.length) return 0;


      const total =
        list.reduce(
          (sum, item) =>
            sum +
            Number(item.percentage || 0),
          0
        );


      return total / list.length;

    }


    const class9Average =
      calculateAverage(
        class9Attempts
      );


    const class10Average =
      calculateAverage(
        class10Attempts
      );


    /* =====================================
       Show Class Data
    ===================================== */

    document.getElementById(
      'class9Average'
    ).textContent =
      class9Average.toFixed(1) + '%';


    document.getElementById(
      'class10Average'
    ).textContent =
      class10Average.toFixed(1) + '%';


    document.getElementById(
      'class9Tests'
    ).textContent =
      class9Attempts.length;


    document.getElementById(
      'class10Tests'
    ).textContent =
      class10Attempts.length;


    /* =====================================
       Excellent Students

       जिनका किसी Submitted Test में
       Percentage 80% या उससे अधिक है
    ===================================== */

    const excellentStudentIds =
      new Set();


    submittedAttempts.forEach(attempt => {

      if (
        Number(
          attempt.percentage || 0
        ) >= 80
      ) {

        excellentStudentIds.add(
          attempt.student_id
        );

      }

    });


    document.getElementById(
      'excellentStudents'
    ).textContent =
      excellentStudentIds.size;


  } catch (error) {


    console.error(
      'Teacher Dashboard Error:',
      error
    );


    alert(
      'विद्यालय की जानकारी लोड नहीं हो सकी: ' +
      (error.message || 'Unknown Error')
    );

  }


});
