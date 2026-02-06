// Email sending logic using EmailJS
// Assumes emailjs library is loaded via CDN in index.html

function buildTxtAttachment(payload){
  const lines = [];
  lines.push(`Exam: ${payload.examTitle}`);
  lines.push(`Student Name: ${payload.student.name}`);
  lines.push(`Email: ${payload.student.email}`);
  lines.push(`Phone: ${payload.student.phone}`);
  lines.push(`Time Used (min): ${payload.timeUsed}`);
  lines.push(`Score: ${payload.correct}/${payload.total}`);
  lines.push('');
  lines.push('Answers:');
  payload.answers.forEach(a=>{
    lines.push(`${a.id}: ${a.answer}`);
  });
  return lines.join('\n');
}

async function sendResults(payload){
  try{
    if (!emailjs) throw new Error('EmailJS not loaded');
    emailjs.init(EMAILJS_PUBLIC_KEY);

    const txt = buildTxtAttachment(payload);
    const base64Txt = btoa(unescape(encodeURIComponent(txt)));

    const params = {
      exam_title: payload.examTitle,
      student_name: payload.student.name,
      student_email: payload.student.email,
      student_phone: payload.student.phone,
      time_used: payload.timeUsed,
      score: `${payload.correct}/${payload.total}`,
      answers_text: txt,
      attachment: base64Txt,
      attachment_filename: 'sat_result.txt'
    };

    const res = await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params);
    return { ok: true, res };
  }catch(err){
    console.error('Email send failed:', err);
    return { ok: false, err };
  }
}
