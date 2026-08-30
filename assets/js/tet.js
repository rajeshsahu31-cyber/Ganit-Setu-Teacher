const params=new URLSearchParams(location.search);
const examType=(params.get('type')||'primary').toLowerCase();
const testSet=(params.get('set')||'A').toUpperCase();

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

 try{
   // Existing live question bank: first use exact Set, then allow questions with no set.
   let {data,error}=await supabaseClient.from('teacher_questions')
    .select('*')
    .eq('exam_type',examType)
    .eq('set_name',testSet)
    .eq('is_active',true)
    .order('section_number',{ascending:true})
    .order('created_at',{ascending:true});

   if(error) throw error;

   if(!data || !data.length){
     const fallback=await supabaseClient.from('teacher_questions')
      .select('*')
      .eq('exam_type',examType)
      .eq('is_active',true)
      .order('section_number',{ascending:true})
      .order('created_at',{ascending:true});
     if(fallback.error) throw fallback.error;
     data=fallback.data||[];
   }

   questions=data||[];
   $('testInfo').textContent=`CBT • ${questions.length} प्रश्न • Live Test`;

   if(!questions.length){
     $('loadingBox').innerHTML='📭 इस Primary/Secondary और Set के लिए अभी कोई Live Question उपलब्ध नहीं है। पहले Admin Panel से Question जोड़ें।';
     return;
   }

   $('loadingBox').style.display='none';
   $('testContent').style.display='block';
   renderQuestion();
   timerId=setInterval(tick,1000);
 }catch(e){
   console.error(e);
   $('loadingBox').innerHTML=`❌ Questions load नहीं हो सके: ${esc(e.message||'Unknown error')}`;
 }
}

async function submitTest(){
 clearInterval(timerId);
 let correct=0,wrong=0,unattempted=0;
 questions.forEach(q=>{
   const a=answers[q.id];
   if(!a) unattempted++;
   else if(a===q.correct_answer) correct++;
   else wrong++;
 });
 const total=questions.length;
 const score=correct;
 const percentage=total?Number(((correct/total)*100).toFixed(2)):0;

 $('testContent').style.display='none';
 $('testMessage').innerHTML=`<div class="success-box">
 <h2>✅ टेस्ट Submit हो गया</h2>
 <p>कुल प्रश्न: <b>${total}</b></p>
 <p>सही: <b>${correct}</b> | गलत: <b>${wrong}</b> | छोड़े: <b>${unattempted}</b></p>
 <p>स्कोर: <b>${score}/${total}</b> (${percentage}%)</p>
 <p>⏱️ समय: ${Math.floor(elapsed/60)} मिनट ${elapsed%60} सेकंड</p>
 <a class="primary-btn" href="tet.html">वापस TET Dashboard</a>
 </div>`;
}

$('nextBtn').onclick=()=>{
 if(current<questions.length-1){current++;renderQuestion();}
 else submitTest();
};
$('prevBtn').onclick=()=>{if(current>0){current--;renderQuestion();}};
document.addEventListener('DOMContentLoaded',loadQuestions);
