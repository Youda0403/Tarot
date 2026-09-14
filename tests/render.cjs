// NODE_PATH=<directory containing @napi-rs/canvas> node tests/render.cjs
const fs=require('node:fs');
const vm=require('node:vm');
const os=require('node:os');
const path=require('node:path');
const assert=require('node:assert/strict');
const ts=require('typescript');
const {createCanvas}=require('@napi-rs/canvas');
const {GIFEncoder,quantize,applyPalette}=require('gifenc');
const exportsObject={};
const source=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/crane.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
vm.runInNewContext(source,{exports:exportsObject});
const {pose,renderScene,DURATION,THEMES}=exportsObject;
for(let time=0;time<DURATION;time+=10){const p=pose(time);for(const key of ['x','y','prizeX','prizeY','open'])assert(Number.isFinite(p[key]));assert(p.open>=0&&p.open<=1);}
for(const boundary of [1000,2000,2400,3300,4000]){const before=pose(boundary-.01),after=pose(boundary+.01);assert(Math.abs(before.prizeY-after.prizeY)<1);assert(Math.abs(before.prizeX-after.prizeX)<1);}
const image=createCanvas(140,220);const brush=image.getContext('2d');brush.fillStyle='#dab4c6';brush.beginPath();brush.roundRect(10,15,120,200,50);brush.fill();brush.fillStyle='#665167';brush.fillRect(42,85,8,13);brush.fillRect(90,85,8,13);
const photo={image,thumbnail:'',name:'TEST',scale:1,rotation:0,flip:false};
for(const n of [1,2]){const c=createCanvas(480,640),ctx=c.getContext('2d');const scene={photos:Array(n).fill(photo),theme:0,title:'CATCH ME!',message:''};const gif=GIFEncoder();for(let time=0;time<DURATION;time+=100){renderScene(ctx,scene,time);const rgba=ctx.getImageData(0,0,480,640).data;const palette=quantize(rgba,256);gif.writeFrame(applyPalette(rgba,palette),480,640,{palette,delay:100,repeat:0});if([0,2800,4900].includes(time))fs.writeFileSync(path.join(os.tmpdir(),`catchu-${n}-${time}.png`),c.toBuffer('image/png'));}gif.finish();const bytes=gif.bytes();assert.equal(Buffer.from(bytes.slice(0,6)).toString(),'GIF89a');fs.writeFileSync(path.join(os.tmpdir(),`catchu-render-${n}.gif`),bytes);console.log(`${n} photo GIF: ${bytes.length} bytes`);}
for(let i=0;i<THEMES.length;i++){const c=createCanvas(720,960);renderScene(c.getContext('2d'),{photos:[photo],theme:i,title:'CATCH ME!',message:'GET!'},5000);}
console.log('PASS: all poses finite, pickup transitions continuous, five themes, two output sizes, single/pair rendering and GIF encoding.');
