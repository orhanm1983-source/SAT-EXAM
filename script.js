// Simple exam runner for 2 modules with a single 70-minute timer
let STATE = {
  started: false,
  totalSeconds: 70*60,
  remaining: 70*60,
  moduleIndex: 0, // 0 -> M1, 1 -> M2
  modules: [],
  answers: {},
  student: {name:'', email:'', phone:''},
};

function formatTime(sec){
  const m = Math.floor(sec/60);
  const s = sec%60;
  return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
}

let timerId = null;
function startTimer(){
  timerId = setInterval(()=>{
    if(STATE.remaining<=0){
      clearInterval(timerId);
      submitExam();
      return;
    }
    STATE.remaining--; 
    document.getElementById('timer').textContent = formatTime(STATE.remaining);
  },1000);
}

async function loadData(){
  const m1 = await fetch('data/module1.json').then(r=>r.json());
  const m2 = await fetch('data/module2.json').then(r=>r.json());
  STATE.modules = [m1, m2];
}

function renderModule(){
  const container = document.getElementById('module');
  const mod = STATE.modules[STATE.moduleIndex];
  container.innerHTML = '';

  const h2 = document.createElement('h2');
  h2.textContent = mod.title;
  container.appendChild(h2);

  let qNumber = 1;
  mod.sections.forEach(section=>{
    section.items.forEach(item=>{
      const qId = item.id;
      const wrap = document.createElement('div');
      wrap.className = 'question';

      const title = document.createElement('div');
      title.className = 'q-title';
      title.textContent = item.title || qId;
      wrap.appendChild(title);

      if(section.type==='mcq'){
        const options = item.options || ['A','B','C','D'];
        options.forEach((opt,idx)=>{
          const id = `${qId}_${idx}`;
          const lab = document.createElement('label');
          lab.className = 'opt';
          const radio = document.createElement('input');
          radio.type = 'radio';
          radio.name = qId;
          radio.value = item.letters? item.letters[idx] : ['A','B','C','D'][idx];
          radio.id = id;
          radio.checked = (STATE.answers[qId]===radio.value);
          radio.addEventListener('change',()=>{
            STATE.answers[qId] = radio.value;
          });
          lab.appendChild(radio);
          const span = document.createElement('span');
          span.textContent = `${radio.value}`;
          lab.appendChild(span);
          wrap.appendChild(lab);
        });
      } else if(section.type==='gridin'){
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.placeholder = 'Enter numeric answer';
        inp.value = STATE.answers[qId] || '';
        inp.addEventListener('input',()=>{
          STATE.answers[qId] = inp.value.trim();
        });
        wrap.appendChild(inp);
      }

      container.appendChild(wrap);
      qNumber++;
    });
  });

  const nav = document.getElementById('nav');
  nav.innerHTML = '';
  if(STATE.moduleIndex===0){
    const next = document.createElement('button');
    next.textContent = 'Submit Module 1 & Go to Module 2';
    next.onclick = ()=>{
      STATE.moduleIndex = 1; 
      renderModule();
      window.scrollTo(0,0);
    };
    nav.appendChild(next);
  } else {
    const submit = document.createElement('button');
    submit.textContent = 'Submit Exam';
    submit.onclick = submitExam;
    nav.appendChild(submit);
  }
}

function scoreExam(){
  let correct = 0, total = 0;
  STATE.modules.forEach(mod=>{
    mod.sections.forEach(sec=>{
      sec.items.forEach(item=>{
        total++;
        const ans = STATE.answers[item.id];
        if(sec.type==='mcq'){
          if(ans && ans.toUpperCase() === item.answer){
            correct++;
          }
        } else {
          if(ans){
            const norm = ans.replace(/\s+/g,'').toLowerCase();
            const ok = (item.answers||[]).some(a=> String(a).replace(/\s+/g,'').toLowerCase()===norm);
            if(ok) correct++;
          }
        }
      });
    });
  });
  return {correct, total};
}

async function submitExam(){
  // Stop timer
  if(timerId) clearInterval(timerId);

  const {correct,total} = scoreExam();
  const used = Math.round((STATE.totalSeconds-STATE.remaining)/60);

  // Prepare payload
  const payload = {
    examTitle: 'SAT Math – Practice Test',
    student: STATE.student,
    timeUsed: used,
    correct, total,
    answers: Object.keys(STATE.answers).map(k=>({id:k, answer: STATE.answers[k]}))
  };

  // send email
  const result = await sendResults(payload);

  // Save to localStorage for admin.html view
  const log = JSON.parse(localStorage.getItem('submissions')||'[]');
  log.unshift({ts: new Date().toISOString(), payload});
  localStorage.setItem('submissions', JSON.stringify(log.slice(0,50)));

  // Show thank you page
  document.getElementById('app').innerHTML = `
    <div class="thanks">
      <h2>Thank you</h2>
      <p>Your responses have been submitted.</p>
    </div>
  `;
}

function startExam(){
  if(STATE.started) return;
  STATE.started = true;
  STATE.student.name = document.getElementById('s_name').value.trim();
  STATE.student.email = document.getElementById('s_email').value.trim();
  STATE.student.phone = document.getElementById('s_phone').value.trim();
  document.getElementById('start').style.display='none';
  document.getElementById('exam').style.display='block';
  startTimer();
  renderModule();
}

window.addEventListener('DOMContentLoaded', async ()=>{
  await loadData();
  document.getElementById('timer').textContent = formatTime(STATE.remaining);
  document.getElementById('btnStart').addEventListener('click', startExam);
});
