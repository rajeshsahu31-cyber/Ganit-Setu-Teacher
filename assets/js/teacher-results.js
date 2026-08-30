const $=id=>document.getElementById(id);

const esc=v=>String(v??'')
 .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
 .replace(/"/g,'&quot;').replace(/'/g,'&#039;');

const formatDate=v=>{
 if(!v) return '—';
 try{
  return new Date(v).toLocaleString('hi-IN',{
   day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'
  });
 }catch(e){return v;}
};

const formatTime=s=>{
 s=Number(s||0);
 return `${Math.floor(s/60)} मिनट ${s%60} सेकंड`;
};

function publicTeacherId(){
 return sessionStorage.getItem('ganit_setu_teacher_id')
     || localStorage.getItem('ganit_setu_teacher_id')
     || '';
}

async function loadTeacherResults(){
 const list=$('resultsList');
 const publicId=publicTeacherId();

 if(!publicId){
   list.innerHTML='<div class="empty-results"><span>🔐</span><h2>Teacher Login आवश्यक है</h2><p>कृपया दोबारा Login करें।</p></div>';
   return;
 }

 list.innerHTML='<div class="empty-results"><span>⏳</span><h2>आपके वास्तविक परिणाम लोड हो रहे हैं...</h2></div>';

 try{
   // Login stores public ID (example GS-T-0001). Convert it to teachers.id UUID.
   const teacherRes=await supabaseClient
     .from('teachers')
     .select('id,teacher_id,full_name')
     .eq('teacher_id',publicId)
     .maybeSingle();

   if(teacherRes.error) throw teacherRes.error;
   if(!teacherRes.data?.id) throw new Error('Teacher record नहीं मिला।');

   const teacherUUID=teacherRes.data.id;

   const attemptsRes=await supabaseClient
     .from('teacher_attempts')
     .select('*')
     .eq('teacher_id',teacherUUID)
     .eq('status','submitted')
     .order('submitted_at',{ascending:false});

   if(attemptsRes.error) throw attemptsRes.error;

   const attempts=attemptsRes.data||[];

   const testIds=[...new Set(attempts.map(a=>a.test_id).filter(Boolean))];
   let testMap={};

   if(testIds.length){
     const testsRes=await supabaseClient
       .from('teacher_tests')
       .select('id,exam_type,test_set,test_title')
       .in('id',testIds);

     if(testsRes.error) throw testsRes.error;
     (testsRes.data||[]).forEach(t=>testMap[t.id]=t);
   }

   const percentages=attempts.map(a=>Number(a.percentage||0));
   const totalCorrect=attempts.reduce((sum,a)=>sum+Number(a.correct_answers||0),0);

   $('totalAttempts').textContent=attempts.length;
   $('averagePercentage').textContent=attempts.length
     ?(percentages.reduce((a,b)=>a+b,0)/attempts.length).toFixed(1)+'%'
     :'0%';
   $('bestPercentage').textContent=attempts.length
     ?Math.max(...percentages).toFixed(1)+'%'
     :'0%';
   $('totalCorrect').textContent=totalCorrect;

   if(!attempts.length){
     list.innerHTML='<div class="empty-results"><span>📋</span><h2>अभी कोई परिणाम उपलब्ध नहीं है</h2><p>टेस्ट पूरा करके Submit करने के बाद आपका वास्तविक Result यहाँ दिखाई देगा।</p></div>';
     return;
   }

   list.innerHTML=attempts.map((a,index)=>{
     const t=testMap[a.test_id]||{};
     const title=t.test_title || `${t.exam_type==='secondary'?'माध्यमिक':'प्राथमिक'} शिक्षक पात्रता परीक्षा`;
     const set=t.test_set ? `Set ${t.test_set}` : '';
     return `<div class="result-card">
       <div class="result-head">
         <div>
           <h2>${esc(title)}</h2>
           <p class="muted-small">${esc(set)} • ${esc(formatDate(a.submitted_at||a.created_at))}</p>
         </div>
         <div><b>${Number(a.percentage||0).toFixed(2)}%</b></div>
       </div>
       <div class="result-meta">
         <div><small>स्कोर</small><br><b>${esc(a.score||0)}/${esc(a.total_questions||0)}</b></div>
         <div><small>सही</small><br><b>${esc(a.correct_answers||0)}</b></div>
         <div><small>गलत</small><br><b>${esc(a.wrong_answers||0)}</b></div>
         <div><small>छोड़े</small><br><b>${esc(a.unanswered_questions||0)}</b></div>
       </div>
       <p class="muted-small">⏱️ समय: ${esc(formatTime(a.time_taken_seconds))} | Attempted: ${esc(a.attempted_questions||0)}</p>
     </div>`;
   }).join('');

 }catch(error){
   console.error('Teacher Results Error:',error);
   list.innerHTML=`<div class="empty-results"><span>❌</span><h2>परिणाम लोड नहीं हो सके</h2><p>${esc(error.message||'Unknown error')}</p></div>`;
 }
}

document.addEventListener('DOMContentLoaded',()=>{
 $('refreshResults').onclick=loadTeacherResults;
 loadTeacherResults();
});
