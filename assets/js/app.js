function teacherLogin(){
 const id=document.getElementById('teacherId').value.trim();
 const pass=document.getElementById('password').value.trim();
 if(!id || !pass){alert('कृपया शिक्षक आईडी और पासवर्ड दर्ज करें।');return;}
 location.href='home.html';
}