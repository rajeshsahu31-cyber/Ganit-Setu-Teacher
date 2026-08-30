const params = new URLSearchParams(location.search);

const examType = (params.get('type') || 'primary').toLowerCase();

const testSet = (params.get('set') || 'A').toUpperCase();

const language2 = (params.get('lang') || '').toLowerCase();

let language1 = '';
let selectedSubject = '';

let questions = [];
let answers = {};

let current = 0;

let elapsed = 0;

let timerId = null;


const $ = id => document.getElementById(id);


const esc = v => String(v ?? '')
.replace(/&/g,'&amp;')
.replace(/</g,'&lt;')
.replace(/>/g,'&gt;');


function optionLetter(i){

return ['A','B','C','D'][i];

}



/* =========================
QUESTION DISPLAY
========================= */

function renderQuestion(){

if(!questions.length) return;

const q = questions[current];

$('questionNumber').textContent =
`प्रश्न ${current + 1}`;

$('questionText').textContent =
q.question_text;


const opts = [

q.option_a,

q.option_b,

q.option_c,

q.option_d

];


$('options').innerHTML =
opts.map((text,i)=>{

const letter = optionLetter(i);

const selected =
answers[q.id] === letter
? 'selected'
: '';

return `
<button
type="button"
class="${selected}"
data-letter="${letter}">

<b>${letter}.</b>

${esc(text)}

</button>
`;

}).join('');


document
.querySelectorAll('#options button')
.forEach(b=>{

b.onclick = ()=>{

answers[q.id] =
b.dataset.letter;

renderQuestion();

};

});


$('prevBtn').style.visibility =
current === 0
? 'hidden'
: 'visible';


$('nextBtn').textContent =
current === questions.length - 1
? 'टेस्ट Submit करें ✓'
: 'अगला प्रश्न →';


$('progressText').textContent =
`प्रगति: ${current + 1}/${questions.length} | उत्तर दिए: ${Object.keys(answers).length}`;

}



/* =========================
TIMER
========================= */

function tick(){

elapsed++;

const m =
String(Math.floor(elapsed / 60))
.padStart(2,'0');

const s =
String(elapsed % 60)
.padStart(2,'0');

$('timer').textContent =
`⏱️ ${m}:${s}`;

}



/* =========================
LOAD QUESTIONS
========================= */

async function loadQuestions(){


const isPrimary =
examType === 'primary';


$('testType').textContent =
isPrimary
? 'प्राथमिक शिक्षक पात्रता परीक्षा'
: 'माध्यमिक शिक्षक पात्रता परीक्षा';


if(isPrimary){

$('setLabel').textContent =
'Set ' + testSet +
` • भाषा-2: ${
language2 === 'sanskrit'
? 'संस्कृत'
: 'English'
}`;

}else{

$('setLabel').textContent =
'Set ' + testSet;

}


/* =========================
PRIMARY VALIDATION
========================= */

if(
isPrimary &&
!['english','sanskrit'].includes(language2)
){

$('loadingBox').innerHTML =
'⚠️ पहले भाषा-2 चुनें: English या संस्कृत।';

return;

}


try{


const {data,error} =
await supabaseClient

.from('teacher_questions')

.select('*')

.eq('exam_type',examType)

.eq('set_name',testSet)

.eq('is_active',true)

.order('section_number',{ascending:true})

.order('created_at',{ascending:true});


if(error) throw error;


let rows = data || [];


/* =========================
PRIMARY FILTER
========================= */

if(isPrimary){


rows =
rows.filter(q=>{

if(Number(q.section_number) === 3){

return String(
q.language_option || ''
)
.toLowerCase() === language2;

}

return
!q.language_option ||
String(q.language_option)
.toLowerCase() === 'common';

});


const counts = {

1:0,

2:0,

3:0,

4:0,

5:0

};


rows.forEach(q=>{

if(
counts[q.section_number] !== undefined
){

counts[q.section_number]++;

}

});


const bad =
Object.entries(counts)
.filter(([,n])=>n !== 30);


if(bad.length){

$('loadingBox').innerHTML =
`📭 Set ${esc(testSet)} अभी तैयार नहीं है।
प्रत्येक भाग में 30 प्रश्न आवश्यक हैं।

वर्तमान स्थिति:

भाग 1: ${counts[1]},

भाग 2: ${counts[2]},

भाग 3: ${counts[3]},

भाग 4: ${counts[4]},

भाग 5: ${counts[5]}.`;

return;

}


questions =
rows.slice(0,150);


if(questions.length !== 150){

$('loadingBox').innerHTML =
'⚠️ Primary CBT के लिए ठीक 150 प्रश्न आवश्यक हैं।';

return;

}

}


/* =========================
SECONDARY FILTER
========================= */

else{


if(
!language1 ||
!selectedSubject
){

return;

}


/*

SECTION 1

Hindi OR Sanskrit

8 Questions

*/

const section1 =
rows.filter(q=>{

return

Number(q.section_number) === 1 &&

String(q.language_option || '')
.toLowerCase() === language1;

});


/*

SECTION 2

Common English

5 Questions

*/

const section2 =
rows.filter(q=>{

return
Number(q.section_number) === 2;

});


/*

SECTION 3

GK + Reasoning

7 Questions

*/

const section3 =
rows.filter(q=>{

return
Number(q.section_number) === 3;

});


/*

SECTION 4

Pedagogy

10 Questions

*/

const section4 =
rows.filter(q=>{

return
Number(q.section_number) === 4;

});


/*

SECTION 5

Selected Subject

Mathematics

120 Questions

*/

const section5 =
rows.filter(q=>{

return

Number(q.section_number) === 5 &&

String(q.subject_option || '')
.toLowerCase() === selectedSubject;

});


/* VALIDATION */

const counts = {

section1:section1.length,

section2:section2.length,

section3:section3.length,

section4:section4.length,

section5:section5.length

};


if(

counts.section1 !== 8 ||

counts.section2 !== 5 ||

counts.section3 !== 7 ||

counts.section4 !== 10 ||

counts.section5 !== 120

){


$('loadingBox').innerHTML =

`📭 Secondary Set ${esc(testSet)}
अभी पूरी तरह तैयार नहीं है।

वर्तमान स्थिति:

भाषा-1: ${counts.section1}/8

सामान्य अंग्रेजी: ${counts.section2}/5

GK + Reasoning: ${counts.section3}/7

Pedagogy: ${counts.section4}/10

चुना हुआ Subject: ${counts.section5}/120`;

return;

}


/* EXACTLY 150 QUESTIONS */

questions = [

...section1,

...section2,

...section3,

...section4,

...section5

];


if(questions.length !== 150){

$('loadingBox').innerHTML =
`⚠️ Secondary CBT के लिए ठीक 150 प्रश्न आवश्यक हैं।
अभी ${questions.length} प्रश्न मिले हैं।`;

return;

}

}



/* =========================
START TEST
========================= */

$('testInfo').textContent =
`CBT • ${questions.length} प्रश्न • Live Test`;


if(!questions.length){

$('loadingBox').innerHTML =
'📭 इस परीक्षा और Set के लिए कोई Live Question उपलब्ध नहीं है।';

return;

}


$('loadingBox').style.display =
'none';


$('testContent').style.display =
'block';


renderQuestion();


timerId =
setInterval(tick,1000);


}catch(e){


console.error(
'Question loading error:',
e
);


$('loadingBox').innerHTML =
`❌ Questions load नहीं हो सके:
${esc(e.message || 'Unknown error')}`;

}

}



/* =========================
SECONDARY START
========================= */

function setupSecondarySelection(){


const isPrimary =
examType === 'primary';


if(isPrimary){

loadQuestions();

return;

}


$('secondarySelection').style.display =
'block';


$('loadingBox').style.display =
'none';


$('startSecondaryBtn').onclick = ()=>{


language1 =
$('language1').value;


selectedSubject =
$('subject').value;


if(!language1){

alert(
'कृपया भाषा-1 चुनें।'
);

return;

}


if(!selectedSubject){

alert(
'कृपया Subject चुनें।'
);

return;

}


/* Hide Selection */

$('secondarySelection').style.display =
'none';


$('loadingBox').style.display =
'block';


$('loadingBox').innerHTML =
'⏳ चुने गए विकल्पों के अनुसार Questions लोड हो रहे हैं...';


$('setLabel').textContent =
'Set ' + testSet +
' • भाषा-1: ' +
(language1 === 'hindi'
? 'हिंदी'
: 'संस्कृत') +
' • विषय: गणित';


loadQuestions();

};

}



/* =========================
TEACHER UUID
========================= */

async function resolveTeacherUUID(){

const publicTeacherId =

sessionStorage.getItem(
'ganit_setu_teacher_id'
)

||

localStorage.getItem(
'ganit_setu_teacher_id'
)

||

'';


if(!publicTeacherId){

throw new Error(
'Teacher login नहीं मिला। कृपया दोबारा Login करें।'
);

}


const {data,error} =
await supabaseClient

.from('teachers')

.select('id, teacher_id')

.eq('teacher_id',publicTeacherId)

.maybeSingle();


if(error) throw error;


if(!data?.id){

throw new Error(
`Teacher record नहीं मिला: ${publicTeacherId}`
);

}


return data.id;

}



/* =========================
GET TEST ID
========================= */

async function getCurrentTestId(){

const {data,error} =
await supabaseClient

.from('teacher_tests')

.select('id')

.eq('exam_type',examType)

.eq('test_set',testSet)

.eq('status','active')

.maybeSingle();


if(error) throw error;


if(!data?.id){

throw new Error(
`Active Test नहीं मिला:
${examType} / Set ${testSet}`
);

}


return data.id;

}



/* =========================
SUBMIT TEST
========================= */

async function submitTest(){

if(
!confirm(
'क्या आप टेस्ट Submit करना चाहते हैं?'
)
) return;


clearInterval(timerId);


$('nextBtn').disabled =
true;


$('prevBtn').disabled =
true;


let correct = 0;

let wrong = 0;

let unattempted = 0;


questions.forEach(q=>{


const a =
answers[q.id];


if(!a){

unattempted++;

}

else if(
a === q.correct_answer
){

correct++;

}

else{

wrong++;

}

});


const total =
questions.length;


const attempted =
correct + wrong;


const score =
correct;


const percentage =
total

? Number(
((correct / total) * 100)
.toFixed(2)
)

: 0;


try{


const teacherUUID =
await resolveTeacherUUID();


const testUUID =
await getCurrentTestId();


const attemptRes =
await supabaseClient

.from('teacher_attempts')

.insert({

teacher_id:teacherUUID,

test_id:testUUID,

started_at:
new Date(
Date.now() - elapsed * 1000
).toISOString(),

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


if(attemptRes.error)
throw attemptRes.error;


const attemptId =
attemptRes.data.id;


/* SAVE ANSWERS */

const answerRows =
questions

.filter(q=>answers[q.id])

.map(q=>({

attempt_id:attemptId,

question_id:q.id,

selected_answer:answers[q.id],

is_correct:
answers[q.id] ===
q.correct_answer

}));


if(answerRows.length){


const answersRes =
await supabaseClient

.from('teacher_answers')

.insert(answerRows);


if(answersRes.error)
throw answersRes.error;

}


/* SUBMIT */

const updateRes =
await supabaseClient

.from('teacher_attempts')

.update({

submitted_at:
new Date().toISOString(),

time_taken_seconds:
elapsed,

status:'submitted'

})

.eq('id',attemptId);


if(updateRes.error)
throw updateRes.error;


/* RESULT */

$('testContent').style.display =
'none';


$('testMessage').innerHTML =

`<div class="success-box">

<h2>✅ टेस्ट Submit हो गया</h2>

<p>
कुल प्रश्न:
<b>${total}</b>
</p>

<p>
सही:
<b>${correct}</b>

|

गलत:
<b>${wrong}</b>

|

छोड़े:
<b>${unattempted}</b>
</p>

<p>
स्कोर:

<b>
${score}/${total}
</b>

(${percentage}%)

</p>

<p>
⏱️ समय:

${Math.floor(elapsed/60)}
मिनट

${elapsed%60}
सेकंड

</p>

<p>
☁️ आपका परिणाम Supabase में सुरक्षित हो गया है।
</p>

<a
class="primary-btn"
href="tet.html">

वापस TET Dashboard

</a>

</div>`;



}catch(e){


console.error(
'Result save error:',
e
);


$('nextBtn').disabled =
false;


$('prevBtn').disabled =
false;


$('testMessage').innerHTML =

`<div class="error-box">

<h2>
❌ Result Supabase में Save नहीं हुआ
</h2>

<p>
${esc(e.message || 'Unknown error')}
</p>

<p>
ऊपर वाला exact message screenshot करके भेजें।
</p>

</div>`;

}

}



/* =========================
NEXT
========================= */

$('nextBtn').onclick = ()=>{


if(
current <
questions.length - 1
){

current++;

renderQuestion();

}

else{

submitTest();

}

};



/* =========================
PREVIOUS
========================= */

$('prevBtn').onclick = ()=>{


if(current > 0){

current--;

renderQuestion();

}

};



/* =========================
PAGE LOAD
========================= */

document.addEventListener(
'DOMContentLoaded',
setupSecondarySelection
);
