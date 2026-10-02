import {test} from 'node:test';
import assert from 'node:assert/strict';
import {displayWeight,toKg,stats,validData} from '../core.js';
test('unit conversions preserve readings',()=>{assert.ok(Math.abs(displayWeight(toKg(209,'lbs'),'lbs')-209)<1e-10)});
test('statistics use chronological order and elapsed weeks',()=>{const s=stats([{id:'b',date:'2026-10-08',kg:90},{id:'a',date:'2026-10-01',kg:92}],180);assert.equal(s.change,-2);assert.equal(s.weekly,-2);assert.equal(s.days,7);assert.ok(Math.abs(s.bmi-27.777777)<0.00001)});
test('single reading has no artificial weekly change',()=>{assert.equal(stats([{id:'a',date:'2026-10-01',kg:92}],180).weekly,0);assert.equal(stats([],180),null)});
test('backup validates data and rejects invalid dates and duplicate IDs',()=>{const d={version:1,profile:{unit:'lbs',heightUnit:'ft',goal:'lose',height:180},readings:[{id:'a',date:'2026-10-01',kg:90,fat:null,note:'',fasting:'No fasting'}]};assert.ok(validData(d));assert.equal(validData({...d,readings:[{...d.readings[0],date:'2026-02-30'}]}),false);assert.equal(validData({...d,readings:[...d.readings,...d.readings]}),false);assert.equal(validData({...d,profile:{...d.profile,height:0}}),false)});
