function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function saveTeacherSession(data) {
  sessionStorage.setItem('ganit_setu_teacher_id', data.teacher_id || '');
  sessionStorage.setItem('ganit_setu_teacher_mobile', data.mobile || '');
  sessionStorage.setItem('ganit_setu_teacher_dise_code', data.school_dise_code || '');
  sessionStorage.setItem('ganit_setu_teacher_name', data.full_name || '');
  sessionStorage.setItem('ganit_setu_teacher_school', data.school_name || '');
}

async function registerTeacher() {
  const fullName = document.getElementById('fullName')?.value.trim();
  const mobile = digitsOnly(document.getElementById('mobile')?.value);
  const password = digitsOnly(document.getElementById('teacherPassword')?.value);
  const schoolName = document.getElementById('schoolName')?.value.trim();
  const schoolDiseCode = digitsOnly(document.getElementById('schoolDiseCode')?.value);
  const district = document.getElementById('district')?.value.trim();
  const block = document.getElementById('block')?.value.trim();
  const status = document.getElementById('registerStatus');
  const btn = document.getElementById('registerBtn');

  if (!fullName || !mobile || !password || !schoolName || !schoolDiseCode || !district || !block) {
    alert('कृपया सभी जानकारी भरें।'); return;
  }
  if (!/^\d{10}$/.test(mobile)) {
    alert('कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें।'); return;
  }
  if (!/^\d{6}$/.test(password)) {
    alert('पासवर्ड केवल 6 अंकों का होना चाहिए।'); return;
  }
  if (!/^\d{11}$/.test(schoolDiseCode)) {
    alert('कृपया सही 11 अंकों का UDISE / DISE Code दर्ज करें।'); return;
  }

  try {
    btn.disabled = true; btn.textContent = 'पंजीकरण हो रहा है...';
    status.textContent = 'कृपया प्रतीक्षा करें...';

    const { data, error } = await supabaseClient.rpc('register_ganit_teacher', {
      p_full_name: fullName,
      p_mobile: mobile,
      p_password: password,
      p_school_name: schoolName,
      p_school_dise_code: schoolDiseCode,
      p_district: district,
      p_block: block
    });

    if (error) throw error;
    const teacher = Array.isArray(data) ? data[0] : data;
    if (!teacher?.teacher_id) throw new Error('Teacher ID generate नहीं हुई।');

    saveTeacherSession(teacher);
    status.textContent = '✅ पंजीकरण सफल। आपकी Teacher ID: ' + teacher.teacher_id;
    alert('🎉 शिक्षक पंजीकरण सफल हुआ।\n\nआपकी Teacher ID:\n' + teacher.teacher_id + '\n\nकृपया इसे सुरक्षित रखें।');
    location.href = 'home.html';
  } catch (error) {
    console.error('Teacher Registration Error:', error);
    status.textContent = '❌ पंजीकरण नहीं हो सका।';
    alert('पंजीकरण नहीं हो सका: ' + (error.message || 'Unknown Error'));
  } finally {
    btn.disabled = false; btn.textContent = 'पंजीकरण करें';
  }
}

async function teacherLogin() {
  const loginId = document.getElementById('loginId')?.value.trim().toUpperCase();
  const password = digitsOnly(document.getElementById('password')?.value);
  const status = document.getElementById('loginStatus');
  const btn = document.getElementById('loginBtn');

  if (!loginId || !password) {
    alert('कृपया Teacher ID / मोबाइल नंबर और पासवर्ड दर्ज करें।'); return;
  }
  if (!/^\d{6}$/.test(password)) {
    alert('कृपया सही 6 अंकों का पासवर्ड दर्ज करें।'); return;
  }

  try {
    btn.disabled = true; btn.textContent = 'लॉगिन हो रहा है...';
    status.textContent = 'कृपया प्रतीक्षा करें...';

    const { data, error } = await supabaseClient.rpc('login_ganit_teacher', {
      p_login: loginId,
      p_password: password
    });

    if (error) throw error;
    const teacher = Array.isArray(data) ? data[0] : data;

    if (!teacher) {
      alert('Teacher ID / मोबाइल नंबर या पासवर्ड सही नहीं है।');
      status.textContent = '❌ जानकारी सही नहीं है।'; return;
    }

    saveTeacherSession(teacher);
    status.textContent = '✅ लॉगिन सफल।';
    location.href = 'home.html';
  } catch (error) {
    console.error('Teacher Login Error:', error);
    status.textContent = '❌ लॉगिन नहीं हो सका।';
    alert('लॉगिन नहीं हो सका: ' + (error.message || 'Unknown Error'));
  } finally {
    btn.disabled = false; btn.textContent = 'लॉगिन करें';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('registerBtn')?.addEventListener('click', registerTeacher);
  document.getElementById('loginBtn')?.addEventListener('click', teacherLogin);

  document.getElementById('password')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') teacherLogin();
  });
  document.getElementById('teacherPassword')?.addEventListener('input', e => {
    e.target.value = digitsOnly(e.target.value).slice(0, 6);
  });
});
