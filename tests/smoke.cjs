// Run against npm run dev: NODE_PATH=<directory containing playwright> node tests/smoke.cjs
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const os=require('node:os');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.TEST_CHROME_PATH||undefined,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:1280,height:1100}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.TEST_URL||'http://localhost:3000');
 await page.getByRole('heading',{name:'오늘의 경품은, 나의 최애.'}).waitFor();
 assert(await page.getByRole('button',{name:'나의 경품 GIF 만들기'}).isDisabled());
 await page.screenshot({path:path.join(os.tmpdir(),'catchu-desktop.png'),fullPage:true});
 const sample=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=400;c.height=600;const x=c.getContext('2d');x.fillStyle='#e0adc6';x.beginPath();x.roundRect(120,140,160,310,70);x.fill();x.fillStyle='#51465a';x.fillRect(160,230,8,12);x.fillRect(230,230,8,12);return c.toDataURL().split(',')[1];});
 const file={name:'sample.png',mimeType:'image/png',buffer:Buffer.from(sample,'base64')};
 await page.getByLabel('캐릭터 1 사진 선택').setInputFiles(file);
 await page.getByLabel('캐릭터 1 이름').fill('서윤');
 await page.getByLabel('간판 문구').fill('우리의 작은 경품');
 await page.getByRole('button',{name:'소다',exact:true}).click();
 await page.getByRole('button',{name:'뽑아보기'}).click();
 await page.waitForTimeout(3000);
 await page.getByRole('button',{name:'정지',exact:false}).click();
 await page.getByRole('button',{name:'나의 경품 GIF 만들기'}).click();
 await page.getByRole('link',{name:'GIF 저장하기'}).waitFor({timeout:120000});
 const pending=page.waitForEvent('download');await page.getByRole('link',{name:'GIF 저장하기'}).click();const dl=await pending;
 await dl.saveAs(path.join(os.tmpdir(),'catchu-single.gif'));
 await page.getByLabel('캐릭터 2 사진 선택').setInputFiles(file);
 await page.getByLabel('캐릭터 2 이름').fill('친구');
 assert.equal(await page.getByRole('link',{name:'GIF 저장하기'}).count(),0);
 await page.getByRole('button',{name:'나의 경품 GIF 만들기'}).click();await page.getByRole('button',{name:'취소',exact:true}).click();
 assert(await page.getByRole('button',{name:'나의 경품 GIF 만들기'}).isEnabled());
 await page.getByRole('button',{name:'나의 경품 GIF 만들기'}).click();
 await page.getByRole('link',{name:'GIF 저장하기'}).waitFor({timeout:120000});
 const pendingPair=page.waitForEvent('download');await page.getByRole('link',{name:'GIF 저장하기'}).click();await (await pendingPair).saveAs(path.join(os.tmpdir(),'catchu-pair.gif'));
 await page.setViewportSize({width:360,height:800});
 await page.screenshot({path:path.join(os.tmpdir(),'catchu-mobile.png'),fullPage:true});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 await page.getByRole('button',{name:'삭제',exact:true}).first().click();
 assert.equal(await page.getByLabel('캐릭터 1 이름').inputValue(),'친구');
 assert.deepEqual(errors,[]);
 console.log('PASS: upload, Korean text, theme, preview, single/pair GIF, cancel/retry, stale download removal, mobile overflow, photo deletion; no browser errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
