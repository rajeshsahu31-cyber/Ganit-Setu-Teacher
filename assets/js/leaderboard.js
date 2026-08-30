const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function medal(rank){return rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':'#'+rank;}
function formatTime(s){s=Number(s||0);return `${Math.floor(s/60)} मिनट ${s%60} सेकंड`;}

async function loadLeaderboard(){
 const exam=$('examFilter').value;
 const set=$('setFilter').value;
 const list=$('leaderboardList');
 $('leaderboardInfo').textContent=`${exam==='primary'?'प्राथमिक':'माध्यमिक'} शिक्षक पात्रता परीक्षा • Set ${set} • Score अधिक होने पर ऊपर, बराबर Score पर कम समय को प्राथमिकता।`;
 list.innerHTML='<div class="empty-results"><span>⏳</span><h2>Ranking लोड हो रही है...</h2></div>';
 try{
   const {data,error}=await supabaseClient
     .from('teacher_leaderboard_view')
     .select('*')
     .eq('exam_type',exam)
     .eq('test_set',set)
     .order('score',{ascending:false})
     .order('time_taken_seconds',{ascending:true})
     .order('submitted_at',{ascending:true})
     .limit(100);
   if(error) throw error;
   const rows=data||[];
   if(!rows.length){
     list.innerHTML='<div class="empty-results"><span>📭</span><h2>अभी कोई Submitted Result नहीं है</h2><p>इस परीक्षा और Set का टेस्ट Submit होने पर ranking यहाँ दिखाई देगी।</p></div>';
     return;
   }
   list.innerHTML=rows.map((r,i)=>{
     const rank=i+1;
     return `<div class="lb-row"><div class="lb-rank">${medal(rank)}</div><div class="lb-name"><h3>${esc(r.teacher_name||'Teacher')}</h3><p>${esc(r.school_name||'—')} ${r.district?'• '+esc(r.district):''}</p><p>⏱️ ${esc(formatTime(r.time_taken_seconds))}</p></div><div class="lb-score"><b>${Number(r.score||0)}/${Number(r.total_questions||150)}</b><small>${Number(r.percentage||0).toFixed(2)}%</small></div></div>`;
   }).join('');
 }catch(e){
   console.error('Leaderboard error:',e);
   list.innerHTML=`<div class="empty-results"><span>❌</span><h2>Leaderboard लोड नहीं हो सका</h2><p>${esc(e.message||'Unknown error')}</p></div>`;
 }
}
document.addEventListener('DOMContentLoaded',()=>{$('loadLeaderboard').onclick=loadLeaderboard;loadLeaderboard();});
