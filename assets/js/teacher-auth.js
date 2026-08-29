function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function makeTeacherId(number) {
  return 'GS-T-' + String(number).padStart(5, '0');
}

async function registerTeacher() {
  const fullName = document.getElementById('fullName')?.value.trim();
  const mobile = digitsOnly(document.getElementById('mobile')?.value);
  const schoolName = document.getElementById('schoolName')?.value.trim();
  const schoolDiseCode = digitsOnly(document.getElementById('schoolDiseCode')?.value);
  const district = document.getElementById('district')?.value.trim();
  const block = document.getElementById('block')?.value.trim();

  const status = document.getElementById('registerStatus');
  const btn = document.getElementById('registerBtn');

  if (!fullName || !mobile || !schoolName || !schoolDiseCode || !district || !block) {
    alert('कृपया सभी जानकारी भरें।');
    return;
  }

  if (!/^\d{10}$/.test(mobile)) {
    alert('कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें।');
    return;
  }

  if (!/^\d{11}$/.test(schoolDiseCode)) {
    alert('कृपया सही 11 अंकों का UDISE / DISE Code दर्ज करें।');
    return;
  }

  try {
    btn.disabled = true;
    btn.textContent = 'पंजीकरण हो रहा है...';
    status.textContent = 'कृपया प्रतीक्षा करें...';

    const { data: existing, error: checkError } = await supabaseClient
      .from('teachers')
      .select('teacher_id')
      .eq('mobile', mobile)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
      alert('इस मोबाइल नंबर से शिक्षक पहले से पंजीकृत हैं। आपकी Teacher ID: ' + (existing.teacher_id || 'अभी उपलब्ध नहीं'));
      status.textContent = 'यह मोबाइल नंबर पहले से पंजीकृत है।';
      return;
    }

    const { data: inserted, error: insertError } = await supabaseClient
      .from('teachers')
      .insert({
        full_name: fullName,
        mobile: mobile,
        school_name: schoolName,
        school_dise_code: schoolDiseCode,
        district: district,
        block: block,
        status: 'active'
      })
      .select('id, teacher_number')
      .single();

    if (insertError) throw insertError;

    const teacherId = makeTeacherId(inserted.teacher_number);

    const { error: updateError } = await supabaseClient
      .from('teachers')
      .update({ teacher_id: teacherId })
      .eq('id', inserted.id);

    if (updateError) throw updateError;

    sessionStorage.setItem('ganit_setu_teacher_id', teacherId);
    sessionStorage.setItem('ganit_setu_teacher_mobile', mobile);
    sessionStorage.setItem('ganit_setu_teacher_dise_code', schoolDiseCode);
    sessionStorage.setItem('ganit_setu_teacher_name', fullName);

    status.textContent = '✅ पंजीकरण सफल हुआ। आपकी Teacher ID: ' + teacherId;

    alert(
      'शिक्षक पंजीकरण सफल हुआ।\n\n' +
      'आपकी Teacher ID: ' + teacherId + '\n\n' +
      'इसे सुरक्षित रखें।'
    );

    location.href = 'home.html';

  } catch (error) {
    console.error('Teacher Registration Error:', error);
    status.textContent = '❌ पंजीकरण नहीं हो सका।';
    alert('पंजीकरण नहीं हो सका: ' + (error.message || 'Unknown Error'));
  } finally {
    btn.disabled = false;
    btn.textContent = 'पंजीकरण करें';
  }
}

async function teacherLogin() {
  const teacherId = document.getElementById('teacherId')?.value.trim().toUpperCase();
  const mobile = digitsOnly(document.getElementById('mobile')?.value);

  const status = document.getElementById('loginStatus');
  const btn = document.getElementById('loginBtn');

  if (!teacherId || !mobile) {
    alert('कृपया Teacher ID और मोबाइल नंबर दर्ज करें।');
    return;
  }

  if (!/^\d{10}$/.test(mobile)) {
    alert('कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें।');
    return;
  }

  try {
    btn.disabled = true;
    btn.textContent = 'लॉगिन हो रहा है...';
    status.textContent = 'कृपया प्रतीक्षा करें...';

    const { data, error } = await supabaseClient
      .from('teachers')
      .select('teacher_id, full_name, mobile, school_name, school_dise_code, status')
      .eq('teacher_id', teacherId)
      .eq('mobile', mobile)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      alert('Teacher ID या मोबाइल नंबर सही नहीं है।');
      status.textContent = '❌ जानकारी नहीं मिली।';
      return;
    }

    if (String(data.status || 'active').toLowerCase() !== 'active') {
      alert('आपका शिक्षक खाता अभी सक्रिय नहीं है।');
      status.textContent = '❌ खाता सक्रिय नहीं है।';
      return;
    }

    sessionStorage.setItem('ganit_setu_teacher_id', data.teacher_id || '');
    sessionStorage.setItem('ganit_setu_teacher_mobile', data.mobile || '');
    sessionStorage.setItem('ganit_setu_teacher_dise_code', data.school_dise_code || '');
    sessionStorage.setItem('ganit_setu_teacher_name', data.full_name || '');
    sessionStorage.setItem('ganit_setu_teacher_school', data.school_name || '');

    status.textContent = '✅ लॉगिन सफल।';
    location.href = 'home.html';

  } catch (error) {
    console.error('Teacher Login Error:', error);
    status.textContent = '❌ लॉगिन नहीं हो सका।';
    alert('लॉगिन नहीं हो सका: ' + (error.message || 'Unknown Error'));
  } finally {
    btn.disabled = false;
    btn.textContent = 'लॉगिन करें';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const registerBtn = document.getElementById('registerBtn');
  const loginBtn = document.getElementById('loginBtn');

  if (registerBtn) registerBtn.addEventListener('click', registerTeacher);
  if (loginBtn) loginBtn.addEventListener('click', teacherLogin);
});
