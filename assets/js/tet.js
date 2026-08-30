const params=new URLSearchParams(location.search);
const examType=(params.get('type')||'primary').toLowerCase();
const testSet=(params.get('set')||'A').toUpperCase();
const language2=(params.get('lang')||'').toLowerCase();

let questions=[], answers={}, current=0, elapsed=0, timerId=null;

const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function optionLetter(i){return ['A','B','C','D'][i];}

function renderQuestion(){
 if(!questions.length)return;
 const q=questions[current];
 $('questionNumber').textContent=`प्रश्न ${current+1}`;
 $('questionText').textContent=q.question_text;
 const opts=[q.option_a,q.option_b,q.option_c,q.option_d];

 $('options').innerHTML=opts.map((text,i)=>{
   const letter=optionLetter(i);
   const selected=answers[q.id]===letter?'selected':'';
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

/* =====================================================
   LIVE QUESTION LOADING
   IMPORTANT: This is kept exactly on the old working flow.
   It loads directly from teacher_questions and does not
   depend on teacher_tests or teacher_attempts.
===================================================== */
async function loadQuestions(){
 const isPrimary=examType==='primary';
 $('testType').textContent=isPrimary?'प्राथमिक शिक्षक पात्रता परीक्षा':'माध्यमिक शिक्षक अभ्यास टेस्ट';
 $('setLabel').textContent='Set '+testSet+(isPrimary?` • भाषा-2: ${language2==='sanskrit'?'संस्कृत':'English'}`:'');

 if(isPrimary && !['english','sanskrit'].includes(language2)){
   $('loadingBox').innerHTML='⚠️ पहले भाषा-2 चुनें: English या संस्कृत।';
   return;
 }

 try{
   const {data,error}=await supabaseClient
    .from('teacher_questions')
    .select('*')
    .eq('exam_type',examType)
    .eq('set_name',testSet)
    .eq('is_active',true)
    .order('section_number',{ascending:true})
    .order('created_at',{ascending:true});

   if(error) throw error;
   let rows=data||[];
console.log('=== TET DEBUG START ===');
console.log('examType:', examType);
console.log('testSet:', testSet);
console.log('language2:', language2);
console.log('Total rows from Supabase:', rows.length);
console.log('All rows:', rows);
console.log('=== TET DEBUG END ===');
   if(isPrimary){
     // Sections 1,2,4,5 are common. Section 3 depends on Language-2.
     rows=rows.filter(q=>{
       if(Number(q.section_number)===3) return String(q.language_option||'').toLowerCase()===language2;
       return !q.language_option || String(q.language_option).toLowerCase()==='common';
     });

     const counts={1:0,2:0,3:0,4:0,5:0};
     rows.forEach(q=>{ if(counts[q.section_number]!==undefined) counts[q.section_number]++; });
     const bad=Object.entries(counts).filter(([,n])=>n!==30);

     if(bad.length){
       $('loadingBox').innerHTML=`📭 Set ${esc(testSet)} अभी तैयार नहीं है। प्रत्येक भाग में 30 प्रश्न आवश्यक हैं। वर्तमान स्थिति: `+
         `भाग 1: ${counts[1]}, भाग 2: ${counts[2]}, भाग 3: ${counts[3]}, भाग 4: ${counts[4]}, भाग 5: ${counts[5]}.`;
       return;
     }

     // Exactly 150 questions only.
     questions=rows.slice(0,150);
     if(questions.length!==150){
       $('loadingBox').innerHTML='⚠️ Primary CBT के लिए ठीक 150 प्रश्न आवश्यक हैं।';
       return;
     }
   }else{
     // Preserve the existing Secondary flow, including its old fallback behavior.
     if(!rows.length){
       const fallback=await supabaseClient
        .from('teacher_questions')
        .select('*')
        .eq('exam_type',examType)
        .eq('is_active',true)
        .order('section_number',{ascending:true})
        .order('created_at',{ascending:true});
       if(fallback.error) throw fallback.error;
       rows=fallback.data||[];
     }
     questions=rows;
   }

   $('testInfo').textContent=`CBT • ${questions.length} प्रश्न • Live Test`;
   if(!questions.length){
     $('loadingBox').innerHTML='📭 इस परीक्षा और Set के लिए अभी कोई Live Question उपलब्ध नहीं है।';
     return;
   }

   $('loadingBox').style.display='none';
   $('testContent').style.display='block';
   renderQuestion();
   timerId=setInterval(tick,1000);
 }catch(e){
   console.error('Question loading error:',e);
   $('loadingBox').innerHTML=`❌ Questions load नहीं हो सके: ${esc(e.message||'Unknown error')}`;
 }
}

/* =====================================================
   RESULT SAVE ONLY AFTER TEST SUBMIT
   Question loading is never changed.
===================================================== */
async function resolveTeacherUUID(){
 const publicTeacherId =
   sessionStorage.getItem('ganit_setu_teacher_id') ||
   localStorage.getItem('ganit_setu_teacher_id') || '';

 if(!publicTeacherId){
   throw new Error('Teacher login नहीं मिला। कृपया दोबारा Login करें।');
 }

 const {data,error}=await supabaseClient
   .from('teachers')
   .select('id, teacher_id')
   .eq('teacher_id',publicTeacherId)
   .maybeSingle();

 if(error) throw error;
 if(!data?.id){
   throw new Error(`Teacher record नहीं मिला: ${publicTeacherId}`);
 }

 return data.id;
}

async function getCurrentTestId(){
 const {data,error}=await supabaseClient
   .from('teacher_tests')
   .select('id')
   .eq('exam_type',examType)
   .eq('test_set',testSet)
   .eq('status','active')
   .maybeSingle();

 if(error) throw error;
 if(!data?.id){
   throw new Error(`Active Test नहीं मिला: ${examType} / Set ${testSet}`);
 }

 return data.id;
}

async function submitTest(){
 if(!confirm('क्या आप टेस्ट Submit करना चाहते हैं?')) return;

 clearInterval(timerId);
 $('nextBtn').disabled=true;
 $('prevBtn').disabled=true;

 let correct=0,wrong=0,unattempted=0;

 questions.forEach(q=>{
   const a=answers[q.id];
   if(!a) unattempted++;
   else if(a===q.correct_answer) correct++;
   else wrong++;
 });

 const total=questions.length;
 const attempted=correct+wrong;
 const score=correct;
 const percentage=total
   ?Number(((correct/total)*100).toFixed(2))
   :0;

 try{
   // These lookups happen ONLY now, after the test is completed.
   const teacherUUID=await resolveTeacherUUID();
   const testUUID=await getCurrentTestId();

   // 1. Create the attempt.
   const attemptRes=await supabaseClient
     .from('teacher_attempts')
     .insert({
       teacher_id:teacherUUID,
       test_id:testUUID,
       started_at:new Date(Date.now()-elapsed*1000).toISOString(),
       total_questions:total,
       attempted_questions:attempted,
       correct_answers:correct,
       wrong_answers:wrong,
       unanswered_questions:unattempted,
       score:score,
       percentage:percentage,
       status:'in_progress'
     })
     .select('id')
     .single();

   if(attemptRes.error) throw attemptRes.error;

   const attemptId=attemptRes.data.id;

   // 2. Save only answered questions.
   // selected_answer table constraint accepts A/B/C/D.
   const answerRows=questions
     .filter(q=>answers[q.id])
     .map(q=>({
       attempt_id:attemptId,
       question_id:q.id,
       selected_answer:answers[q.id],
       is_correct:answers[q.id]===q.correct_answer
     }));

   if(answerRows.length){
     const answersRes=await supabaseClient
       .from('teacher_answers')
       .insert(answerRows);

     if(answersRes.error) throw answersRes.error;
   }

   // 3. Mark the attempt as submitted.
   const updateRes=await supabaseClient
     .from('teacher_attempts')
     .update({
       submitted_at:new Date().toISOString(),
       time_taken_seconds:elapsed,
       status:'submitted'
     })
     .eq('id',attemptId);

   if(updateRes.error) throw updateRes.error;

   $('testContent').style.display='none';
   $('testMessage').innerHTML=`<div class="success-box">
     <h2>✅ टेस्ट Submit हो गया</h2>
     <p>कुल प्रश्न: <b>${total}</b></p>
     <p>सही: <b>${correct}</b> | गलत: <b>${wrong}</b> | छोड़े: <b>${unattempted}</b></p>
     <p>स्कोर: <b>${score}/${total}</b> (${percentage}%)</p>
     <p>⏱️ समय: ${Math.floor(elapsed/60)} मिनट ${elapsed%60} सेकंड</p>
     <p>☁️ आपका परिणाम Supabase में सुरक्षित हो गया है।</p>
     <a class="primary-btn" href="tet.html">वापस TET Dashboard</a>
   </div>`;

 }catch(e){
   console.error('Result save error:',e);

   // Do not falsely show a saved result.
   $('nextBtn').disabled=false;
   $('prevBtn').disabled=false;

   $('testMessage').innerHTML=`<div class="error-box">
     <h2>❌ Result Supabase में Save नहीं हुआ</h2>
     <p>${esc(e.message||'Unknown error')}</p>
     <p>ऊपर वाला exact message screenshot करके भेजें।</p>
   </div>`;
 }
}

$('nextBtn').onclick=()=>{
 if(current<questions.length-1){
   current++;
   renderQuestion();
 }else{
   submitTest();
 }
};

$('prevBtn').onclick=()=>{
 if(current>0){
   current--;
   renderQuestion();
 }
};

document.addEventListener('DOMContentLoaded',loadQuestions);
