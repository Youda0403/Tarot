const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const gifenc = require('gifenc');
const calls = [];
const messages = [];
const self = { postMessage: message => messages.push(message) };
let quantizations = 0;
const wrapped = {
  ...gifenc,
  quantize: (...args) => { quantizations++; return gifenc.quantize(...args); },
  GIFEncoder: () => {
    const encoder = gifenc.GIFEncoder();
    return { ...encoder, writeFrame: (pixels, w, h, options) => {
      calls.push({pixels: [...pixels], palette: options.palette});
      encoder.writeFrame(pixels, w, h, options);
    }};
  }
};
const source = ts.transpileModule(fs.readFileSync('lib/gif.worker.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText;
vm.runInNewContext(source, {exports: {}, require: () => wrapped, self, Uint8Array});
const a = new Uint8Array([239,157,173,255, 255,240,220,255]);
const b = new Uint8Array([239,157,173,255, 64,92,150,255]);
self.onmessage({data: {type:'start', data:new Uint8Array([...a,...b]).buffer}});
for (const data of [a,b]) self.onmessage({data:{type:'frame',data:data.buffer,width:2,height:1}});
self.onmessage({data:{type:'finish'}});
assert.equal(quantizations, 1);
assert.equal(calls.length, 2);
assert.strictEqual(calls[0].palette,calls[1].palette);
assert.equal(calls[0].pixels[0],calls[1].pixels[0]);
assert.equal(Buffer.from(messages.at(-1).bytes).subarray(0,6).toString(),'GIF89a');
console.log('PASS: actual GIF worker uses one palette; unchanged pixels keep identical colors.');
