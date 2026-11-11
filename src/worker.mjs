const html = __HTML__;
const json = (data,status=200) => new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function generate(request, fetcher=fetch) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({error:'請從網站內送出請求。'},403);
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) return json({error:'請求格式錯誤。'},400);
  if (Number(request.headers.get('content-length')||0)>12000000) return json({error:'圖片檔案過大。'},413);
  let form; try { form=await request.formData(); } catch { return json({error:'無法讀取圖片。'},400); }
  const key=form.get('key'), provider=form.get('provider'), prompt=form.get('prompt'), map=form.get('map'), ref=form.get('reference'), shape=form.get('shape')||'square';
  if (!['square','landscape','portrait'].includes(shape)) return json({error:'圖片比例設定無效。'},400);
  if (typeof key!=='string'||!key.trim()||key.length>500||typeof prompt!=='string'||!prompt||prompt.length>12000||!(map instanceof File)||map.size>5000000||!map.type.startsWith('image/')) return json({error:'請確認金鑰、地圖與輸入資料。'},400);
  if (ref && (!(ref instanceof File)||ref.size>5000000||!['image/png','image/jpeg','image/webp'].includes(ref.type))) return json({error:'參考圖格式或大小不支援。'},400);
  if (!['openai','gemini'].includes(provider)) return json({error:'不支援這個服務。'},400);
  try {
    let response;
    if(provider==='openai') {
      const body=new FormData(); body.set('model','gpt-image-1.5'); body.set('prompt',prompt); body.set('size',({square:'1024x1024',landscape:'1536x1024',portrait:'1024x1536'})[shape]); body.set('quality','medium'); body.append('image[]',map,'map.png'); if(ref) body.append('image[]',ref,'style.'+(ref.type==='image/jpeg'?'jpg':ref.type==='image/webp'?'webp':'png'));
      response=await fetcher('https://api.openai.com/v1/images/edits',{method:'POST',headers:{Authorization:'Bearer '+key.trim()},body});
    } else {
      const base64=async file=>{const bytes=new Uint8Array(await file.arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s)};
      const parts=[{text:prompt},{inline_data:{mime_type:map.type,data:await base64(map)}}];if(ref)parts.push({inline_data:{mime_type:ref.type,data:await base64(ref)}});
      response=await fetcher('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key.trim()},body:JSON.stringify({contents:[{parts}],generationConfig:{responseModalities:['TEXT','IMAGE'],imageConfig:{aspectRatio:({square:'1:1',landscape:'3:2',portrait:'2:3'})[shape]}}})});
    }
    if(!response.ok) {
      let detail={}; try {detail=await response.json()} catch {}
      const info=detail?.error || {}; const code=typeof info.code==='string'?info.code:''; const param=typeof info.param==='string'?info.param:''; const message=typeof info.message==='string'?info.message:'';
      let reason='服務拒絕了請求；目前無法從回應判別確切原因。';
      if (param === 'model' || /model.*(not found|access|permission|available)|does not have access/i.test(message)) reason='AI 服務不接受目前設定的生圖模型，請檢查模型名稱或帳號權限。';
      else if (/verif(y|ied|ication)/i.test(message)) reason='此模型可能要求完成組織驗證，請至 OpenAI Platform 檢查組織驗證狀態。';
      else if (/billing|quota|credit|insufficient_quota/i.test(code+' '+message)) reason='API 額度、餘額或計費限制可能不足，請檢查 API 的 Billing 與 Limits。';
      else if (/unsupported|invalid.*image|image.*invalid|image.*format/i.test(message)) reason='服務不接受輸入圖片或其格式；請檢查參考圖格式與大小，或先移除參考圖再試。';
      else if (/model.*(not found|access|permission|available)|does not have access/i.test(message)) reason='目前的專案或金鑰可能沒有此模型的使用權限。';
      else if(response.status===401) reason='金鑰無法通過驗證，請確認服務與金鑰是否對應。';
      else if(response.status===429) reason='服務回報請求或額度限制，請檢查用量並稍後再試。';
      else if(response.status===400) reason='服務認為請求內容有誤；可能與圖片或參數有關，請先嘗試不使用風格參考圖。';
      const safeCode=/^[a-zA-Z0-9_.-]{1,80}$/.test(code)?code:null;
      const safeParam=/^[a-zA-Z0-9_.\[\]-]{1,80}$/.test(param)?param:null;
      const meta=[safeCode?'代碼：'+safeCode:null,safeParam?'欄位：'+safeParam:null].filter(Boolean).join('；');
      return json({error:`AI 服務回應錯誤（${response.status}）。${reason}${meta?' '+meta:''}`},response.status===401||response.status===403?401:502);
    }
    const result=await response.json(); let image;
    if(provider==='openai') image=result?.data?.[0]?.b64_json;
    else image=result?.candidates?.flatMap(c=>c.content?.parts||[]).find(p=>p.inlineData?.data||p.inline_data?.data)?.inlineData?.data || result?.candidates?.flatMap(c=>c.content?.parts||[]).find(p=>p.inline_data?.data)?.inline_data?.data;
    if(!image) return json({error:'AI 沒有回傳圖片，請調整設定或重試。'},502);
    return json({image});
  } catch {return json({error:'無法連線 AI 服務，請稍後再試。'},502)}
}
export {generate};
export default {async fetch(request) {const url=new URL(request.url);if(url.pathname==='/api/generate'&&request.method==='POST')return generate(request);if(url.pathname==='/'&&request.method==='GET')return new Response(html,{headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});return new Response('Not found',{status:404});}};
