function selectOption(btn){
 document.querySelectorAll('.options button').forEach(b=>b.classList.remove('selected'));
 btn.classList.add('selected');
}
let sec=0;
setInterval(()=>{
 sec++;
 const t=document.querySelector('.test-meta span:last-child');
 if(t){const m=String(Math.floor(sec/60)).padStart(2,'0');const s=String(sec%60).padStart(2,'0');t.textContent='⏱️ '+m+':'+s;}
},1000);
const params=new URLSearchParams(location.search);
const type=params.get('type');
const set=params.get('set')||'A';
const title=document.getElementById('testType');
if(title) title.textContent=type==='secondary'?'माध्यमिक शिक्षक अभ्यास टेस्ट':'प्राथमिक शिक्षक अभ्यास टेस्ट';
const setLabel=document.getElementById('setLabel'); if(setLabel) setLabel.textContent='Set '+set;
function finishTest(){
 document.getElementById('testMessage').innerHTML='<div class="success-box">✓ Demo उत्तर रिकॉर्ड हो गया। वास्तविक प्रश्न और परिणाम आगे Supabase से जोड़े जाएंगे।</div>';
}