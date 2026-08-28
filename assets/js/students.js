const students=[
['GS-00001','प्रियंका साहू','कक्षा 10'],['GS-00012','राहुल साहू','कक्षा 10'],
['GS-00018','कविता यादव','कक्षा 10'],['GS-00024','अमन पटेल','कक्षा 9'],
['GS-00031','पूजा वर्मा','कक्षा 10'],['GS-00036','रोहित ठाकुर','कक्षा 9'],
['GS-00042','नेहा साहू','कक्षा 10'],['GS-00050','विकास कुमार','कक्षा 10']];
function render(list){
 document.getElementById('studentList').innerHTML=list.map(s=>`<a href="student-progress.html" class="student-row"><span>${s[0]}</span><span><b>${s[1]}</b></span><span>${s[2]}</span><span class="status">सक्रिय</span></a>`).join('');
}
function filterStudents(){
 const q=document.getElementById('studentSearch').value.toLowerCase();
 render(students.filter(s=>s[1].toLowerCase().includes(q)||s[0].toLowerCase().includes(q)));
}
render(students);