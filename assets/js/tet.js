const params=new URLSearchParams(location.search);
const examType=(params.get('type')||'primary').toLowerCase();
const testSet=(params.get('set')||'A').toUpperCase();

let questions=[], answers={}, current=0, elapsed=0, timerId=null;
let currentTest=null, currentTeacher=null, attemptId=null;

const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function optionLetter(i){return ['A','B','C','D'][i];}

function getTeacherFromSession(){
  const keys=['ganit_setu_teacher','teacher','teacher_data','currentTeacher','loggedInTeacher'];
  for(const key of keys){
    try{
      const raw=localStorage.getItem(key)||sessionStorage.getItem(key);
      if(raw){
        const obj=JSON.parse(raw);
        if(obj && obj.id) return obj;
      }
    }catch(e){}
  }
  // Common separate ID keys
  const idKeys=['teacher_id','ganit_setu_teacher_id','current_teacher_id'];
  for(const key of idKeys){
    const id=localStorage.getItem(key)||sessionStorage.getItem(key);
    if(id) return {id};
  }
  return null;
}

function renderQuestion(){
 if(!questions.length)return;
 const q=questions[current];
 $('questionNumber').textContent=`प्रश्न ${current+1}`;
 $('questionText').textContent=q.question_text;
 const opts=[q.option_a,q.option_b,q.option_c,q.option_d];
 $('options').innerHTML=opts.map((text,i)=>{
   const letter=optionLetter(i), selected=answers[q.id]===letter?'selected':'';
   return `<button type="button" class="${selected}" data-letter="${letter}"><b>${letter}.</b> ${esc(text)}</button>`;
 }).join('');
 document.querySelectorAll('#options button').forEach(b=>b.onclick=()=>{
   answers[q.id]=b.dataset.letter;
   renderQuestion();
 });
 $('prevBtn').style.visibility=current===0?'hidden':'visible';
 $('nextBtn').textContent=current===questions.length-1?'टेस्ट Submit करें ✓':'अगला प्रश्न →';
 $('progressText').textContent=`प्रगति: ${current+1}/${questions.length} | उत्तर दिए: ${Object.keys(answers).length}`;
}

function tick(){
 elapsed++;
 const m=String(Math.floor(elapsed/60)).padStart(2,'0');
 const s=String(elapsed%60).padStart(2,'0');
 $('timer').textContent=`⏱️ ${m}:${s}`;
}

async function loadQuestions(){
 $('testType').textContent=examType==='secondary'?'माध्यमिक शिक्षक अभ्यास टेस्ट':'प्राथमिक शिक्षक अभ्यास टेस्ट';
 $('setLabel').textContent='Set '+testSet;
 currentTeacher=getTeacherFromSession();

 if(!currentTeacher?.id){
   $('loadingBox').innerHTML='🔐 Teacher की login जानकारी नहीं मिली। कृपया Teacher Panel से दोबारा Login करें।';
   return;
 }

 try{
   // First find the real test record so attempt has a valid test_id.
   const testRes=await supabaseClient.from('teacher_tests')
     .select('*').eq('exam_type',examType).eq('test_set',testSet)
     .eq('status','active').limit(1).maybeSingle();

   if(testRes.error) throw testRes.error;
   currentTest=testRes.data;

   let qres;
   if(currentTest?.id){
     // Preferred: questions assigned to this real test.
     qres=await supabaseClient.from('teacher_test_questions')
       .select('question_order,section_number,teacher_questions(*)')
       .eq('test_id',currentTest.id).order('question_order',{ascending:true});

     if(qres.error) throw qres.error;
     questions=(qres.data||[]).map(x=>x.teacher_questions).filter(Boolean);
   }

   // Fallback for existing setup: live question bank by exam + set.
   if(!questions.length){
     qres=await supabaseClient.from('teacher_questions').select('*')
       .eq('exam_type',examType).eq('set_name',testSet).eq('is_active',true)
       .order('section_number',{ascending:true}).order('created_at',{ascending:true});
     if(qres.error) throw qres.error;
     questions=qres.data||[];
   }

   if(!currentTest){
     $('loadingBox').innerHTML='⚠️ Questions मिल गए, लेकिन इस Exam Type / Set के लिए `teacher_tests` में Active Test नहीं मिला। पहले Admin/Supabase में Primary/Secondary + Set A/B/C का Test record बनाना जरूरी है ताकि Result Save हो सके।';
     return;
   }

   $('testInfo').textContent=`CBT • ${questions.length} प्रश्न • Live Test`;
   if(!questions.length){
     $('loadingBox').innerHTML='📭 इस Test के लिए कोई Live Question उपलब्ध नहीं है।';
     return;
   }

   // Create one in-progress attempt immediately.
   const start=await supabaseClient.from('teacher_attempts').insert({
     teacher_id:currentTeacher.id,
     test_id:currentTest.id,
     total_questions:questions.length,
     status:'in_progress'
   }).select('id').single();

   if(start.error) throw start.error;
   attemptId=start.data.id;

   $('loadingBox').style.display='none';
   $('testContent').style.display='block';
   renderQuestion();
   timerId=setInterval(tick,1000);
 }catch(e){
   console.error('TET load/start error:',e);
   $('loadingBox').innerHTML=`❌ Test शुरू नहीं हो सका: ${esc(e.message||'Unknown error')}`;
 }
}

async function submitTest(){
 if(!attemptId) return alert('Attempt शुरू नहीं हुआ है, इसलिए Result Save नहीं किया जा सकता।');
 if(!confirm('क्या आप टेस्ट Submit करना चाहते हैं?')) return;

 $('nextBtn').disabled=true;
 $('prevBtn').disabled=true;
 clearInterval(timerId);

 let correct=0,wrong=0,unanswered=0;
 const answerRows=questions.map(q=>{
   const selected=answers[q.id]||null;
   const isCorrect=selected ? selected===q.correct_answer : null;
   if(!selected) unanswered++;
   else if(isCorrect) correct++;
   else wrong++;
   return {attempt_id:attemptId,question_id:q.id,selected_answer:selected,is_correct:isCorrect};
 });

 const attempted=correct+wrong;
 const total=questions.length;
 const score=correct;
 const percentage=total?Number(((correct/total)*100).toFixed(2)):0;

 try{
   // Save answers. Unanswered questions are intentionally not inserted because selected_answer is constrained to A-D.
   const answeredRows=answerRows.filter(x=>x.selected_answer);
   if(answeredRows.length){
     const ares=await supabaseClient.from('teacher_answers').insert(answeredRows);
     if(ares.error) throw ares.error;
   }

   const update=await supabaseClient.from('teacher_attempts').update({
     submitted_at:new Date().toISOString(),
     time_taken_seconds:elapsed,
     total_questions:total,
     attempted_questions:attempted,
     correct_answers:correct,
     wrong_answers:wrong,
     unanswered_questions:unanswered,
     score:score,
     percentage:percentage,
     status:'submitted'
   }).eq('id',attemptId);

   if(update.error) throw update.error;

   $('testContent').style.display='none';
   $('testMessage').innerHTML=`<div class="success-box">
    <h2>✅ परिणाम सुरक्षित हो गया</h2>
    <p>कुल प्रश्न: <b>${total}</b></p>
    <p>सही: <b>${correct}</b> | गलत: <b>${wrong}</b> | छोड़े: <b>${unanswered}</b></p>
    <p>स्कोर: <b>${score}/${total}</b> (${percentage}%)</p>
    <p>⏱️ समय: ${Math.floor(elapsed/60)} मिनट ${elapsed%60} सेकंड</p>
    <p>☁️ Result Supabase में सफलतापूर्वक Save हो गया है।</p>
    <a class="primary-btn" href="tet.html">वापस TET Dashboard</a>
   </div>`;
 }catch(e){
   console.error('Save result error:',e);
   // Keep attempt recoverable instead of falsely showing success.
   $('nextBtn').disabled=false;
   $('prevBtn').disabled=false;
   $('testMessage').innerHTML=`<div class="error-box"><h2>❌ Result Supabase में Save नहीं हुआ</h2><p>${esc(e.message||'Unknown error')}</p><p>कृपया screenshot भेजें।</p></div>`;
 }
}

$('nextBtn').onclick=()=>{
 if(current<questions.length-1){current++;renderQuestion();}
 else submitTest();
};
$('prevBtn').onclick=()=>{if(current>0){current--;renderQuestion();}};
document.addEventListener('DOMContentLoaded',loadQuestions);
