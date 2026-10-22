"""Validate evidence-linked Markdown; this does not test the target application."""
import argparse
import hashlib
import json
import re
import struct
import sys
import zlib
from pathlib import Path
from urllib.parse import unquote,urlparse

LINK=re.compile(r'!?\[[^\]]*\]\(([^)]+)\)')
REQ=re.compile(r'^### ([A-Z]+-\d{3})\b',re.M)
AC=re.compile(r'^\| [A-Z]+-AC-\d{3} \|.*$',re.M)
PLACEHOLDERS=('['+'当前用户'+']','['+'当前账号'+']','['+'样本数据行已隐去'+']')

def heading_anchors(text):
    anchors=set();counts={}
    for title in re.findall(r'^#{1,6}\s+(.+?)\s*#*$',text,re.M):
        base=re.sub(r'[^\w\-\s]','',title).lower().replace(' ','-')
        n=counts.get(base,0);counts[base]=n+1
        anchors.add(base if not n else f'{base}-{n}')
    return anchors

def markdown_errors(text,path,root):
    errors=[];anchor_cache={}
    for target in LINK.findall(text):
        target=target.strip().strip('<>')
        if urlparse(target).scheme:continue
        local=unquote(target.split('#',1)[0])
        dest=(path.parent/local).resolve() if local else path.resolve()
        if not dest.is_file():errors.append(f'{path.relative_to(root)}: missing link {local}')
        elif '#' in target and dest.suffix=='.md':
            if dest not in anchor_cache:anchor_cache[dest]=heading_anchors(dest.read_text(encoding='utf-8'))
            if unquote(target.split('#',1)[1]) not in anchor_cache[dest]:
                errors.append(f'{path.relative_to(root)}: missing fragment {target}')
    for pattern,label in [(REQ,'requirement'),(AC,'acceptance')]:
        values=pattern.findall(text)
        if pattern is AC:values=[row.split('|')[1].strip() for row in values]
        if len(values)!=len(set(values)):errors.append(f'{path.name}: duplicate {label} id')
    for row in AC.findall(text):
        if '已执行' not in row and '【拟定，未执行】' not in row:
            errors.append(f'{path.name}: acceptance lacks explicit execution status')
        if '【拟定需求】' in row and '【已执行' in row:
            errors.append(f'{path.name}: proposed acceptance claimed executed')
    return errors

def secret_errors(text,label):
    patterns=[
        ('private key',r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
        ('bearer credential',r'(?i)Bearer\s+[A-Za-z0-9._~-]{12,}'),
        ('JWT',r'eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}'),
        ('secret assignment',r'''(?i)["']?(?:password|passwd|pwd|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|authorization[_-]?code)["']?\s*[:=]\s*["']([^"'\s]{6,})["']'''),
        ('cookie assignment',r'(?i)(?:set-cookie|cookie)\s*:\s*[A-Za-z0-9_]+=\S{8,}'),
        ('password-shaped value',r'(?<![A-Za-z0-9])[A-Z][a-z]{2,8}@[0-9]{4,}(?![A-Za-z0-9])')]
    return [f'{label}: possible {name}; inspect locally' for name,pattern in patterns if re.search(pattern,text)]

def png_check(path):
    raw=path.read_bytes()
    if raw[:8]!=b'\x89PNG\r\n\x1a\n':raise ValueError('bad PNG signature')
    pos=8;compressed=bytearray();header=None;ended=False
    while pos<len(raw):
        length=struct.unpack('>I',raw[pos:pos+4])[0]
        typ=raw[pos+4:pos+8];payload=raw[pos+8:pos+8+length]
        crc=struct.unpack('>I',raw[pos+8+length:pos+12+length])[0]
        if zlib.crc32(typ+payload)&0xffffffff!=crc:raise ValueError('PNG CRC mismatch')
        if typ==b'IHDR':header=struct.unpack('>IIBBBBB',payload)
        if typ==b'IDAT':compressed.extend(payload)
        if typ==b'IEND':ended=True
        pos+=12+length
    if not ended or not header:raise ValueError('incomplete PNG')
    width,height,depth,color,_,_,interlace=header
    pixels=zlib.decompress(compressed)
    channels={0:1,2:3,3:1,4:2,6:4}.get(color)
    if not channels:raise ValueError('unknown color type')
    if interlace==0:
        stride=(width*channels*depth+7)//8+1
        if len(pixels)!=height*stride:raise ValueError('PNG row length mismatch')
    if width<100 or height<100:raise ValueError('unexpected screenshot size')
    return width,height

def crud_errors(objects,data):
    errors=[];seen=set()
    for obj in objects:
        key=(obj.get('module'),obj.get('name'))
        if key in seen:errors.append(f'{key}: duplicate CRUD object')
        seen.add(key)
        ops=obj.get('operations',{})
        if set(ops)!={'list','detail','add','edit','delete'}:errors.append(f'{key}: incomplete CRUD status coverage')
        for kind,op in ops.items():
            sources=op.get('evidence',[])
            if not sources or any(k not in data for k in sources):errors.append(f'{key}/{kind}: missing CRUD evidence')
            if op.get('businessWriteExecuted'):errors.append(f'{key}/{kind}: business write exceeds read-only scope')
            if op.get('opened') and any(data.get(k,{}).get('quality',{}).get('targetValid') is False for k in sources):
                errors.append(f'{key}/{kind}: opened claim includes invalid target content')
            structured=any(data.get(k,{}).get('elements',{}).get(a) for k in sources for a in ['fields','forms','headers','rows','options'])
            legacy_controls=any(c.get('tag') in ['INPUT','TEXTAREA','SELECT'] for k in sources for c in data.get(k,{}).get('controls',[]))
            card_labels=op.get('observedCards',[])
            cards=kind=='list' and bool(card_labels) and any(all(label in (data.get(k,{}).get('text') or '') for label in card_labels) for k in sources)
            if op.get('opened') and not (structured or legacy_controls or cards):errors.append(f'{key}/{kind}: opened claim has navigation-only evidence')
    return errors

def field_constraint_errors(text,data,module):
    """Check both historical and expanded field tables against raw captures."""
    errors=[]
    for row in text.splitlines():
        if not row.startswith('|') or 'maxlength=' not in row:continue
        if len(row.strip().strip('|').split('|')) not in [5,6]:continue
        sources=re.findall(r'\]\(\.\./evidence/([^)]*)\.png\)',row)
        if not sources:continue
        label=row.split('|')[1].strip()
        controls=[c for key in sources for c in (data.get(key,{}).get('controls',[])+data.get(key,{}).get('elements',{}).get('fields',[]))]
        for value in re.findall(r'maxlength=(\d+)',row):
            if not any(str(c.get('maxlength'))==value and label in [c.get('label'),c.get('placeholder')] for c in controls):
                errors.append(f'{module}: unsupported maxlength for {label}')
    return errors

def validate(root):
    errors=[];stats={}
    manifest=json.loads((root/'采样清单.json').read_text(encoding='utf-8'))
    modules=manifest['modules'];samples=manifest['samples']
    codes=[m['code'] for m in modules];keys=[s['id'] for s in samples]
    if len(codes)!=35 or len(codes)!=len(set(codes)):errors.append('expected 35 unique modules')
    if len(keys)!=len(set(keys)):errors.append('duplicate sample id')
    json_files={p.stem:p for p in (root/'evidence').glob('*.json')}
    png_files={p.stem:p for p in (root/'evidence').glob('*.png')}
    if set(keys)!=set(json_files) or set(keys)!=set(png_files):errors.append('manifest/JSON/PNG set mismatch')
    data={k:json.loads(p.read_text(encoding='utf-8')) for k,p in json_files.items()}
    errors+=crud_errors(manifest.get('crudObjects',[]),data)
    index=(root/'证据索引.md').read_text(encoding='utf-8')
    for k in keys:
        if f'./evidence/{k}.png' not in index or f'./evidence/{k}.json' not in index:errors.append(f'{k}: index links missing')
        a=data[k]
        if a.get('text') is None:
            replacement=a.get('replacementTextSample')
            if replacement not in data or not data[replacement].get('text'):errors.append(f'{k}: missing complete replacement text')
            elif data[replacement]['url']!=a['url']:errors.append(f'{k}: replacement URL mismatch')
        if a['time']!=next(s['time'] for s in samples if s['id']==k):errors.append(f'{k}: manifest time mismatch')
        try:png_check(png_files[k])
        except Exception as exc:errors.append(f'{k}: {exc}')
    all_ids=[]
    for m in modules:
        path=root/m['directory']/'需求说明.md'
        text=path.read_text(encoding='utf-8')
        for n in range(1,9):
            if not re.search(rf'^## {n}\. ',text,re.M):errors.append(f'{m["code"]}: missing section {n}')
        actual_req=REQ.findall(text);expected_req=[a['id'] for a in m['requirements']]
        actual_ac=[r.split('|')[1].strip() for r in AC.findall(text)]
        if actual_req!=expected_req:errors.append(f'{m["code"]}: requirement registry mismatch')
        if actual_ac!=[a['id'] for a in m['acceptance']]:errors.append(f'{m["code"]}: acceptance registry mismatch')
        all_ids+=actual_req+actual_ac
        for req in m['requirements']:
            block=re.search(r'^### '+re.escape(req['id'])+r'\b(.*?)(?=^### |^## |\Z)',text,re.M|re.S).group(1)
            if req['kind']=='【拟定需求】':
                if '【拟定，未执行】' not in block:errors.append(f'{req["id"]}: proposal execution status absent')
            else:
                if not req['evidence']:errors.append(f'{req["id"]}: observed requirement has no source')
                for k in req['evidence']:
                    if k not in data or f'{k}.png' not in block:errors.append(f'{req["id"]}: invalid source {k}')
        for case,row in zip(m['acceptance'],AC.findall(text)):
            if case['executed'] and not case['evidence']:errors.append(f'{case["id"]}: executed case lacks evidence')
            if not case['executed'] and '【拟定，未执行】' not in row:errors.append(f'{case["id"]}: planned case mislabeled')
        errors+=field_constraint_errors(text,data,m['code'])
    if len(all_ids)!=len(set(all_ids)):errors.append('IDs overlap across modules')
    for path in root.rglob('*'):
        if not path.is_file() or path.suffix not in ['.md','.json','.py']:continue
        text=path.read_text(encoding='utf-8')
        errors+=secret_errors(text,str(path.relative_to(root)))
        if any(p in text for p in PLACEHOLDERS):errors.append(f'{path.name}: leftover business replacement placeholder')
        if path.suffix=='.md':errors+=markdown_errors(text,path,root)
    for short in ['E001','E003','E025','E026','E041','E056','E078','E090','E103']:
        status=next(s['status'] for s in samples if s['id'].startswith(short+'-'))
        if status=='有效：页面采样':errors.append(f'{short}: known limitation not classified')
    mdm=(root/'19-元数据管理'/'需求说明.md').read_text(encoding='utf-8')
    if 'E103' not in mdm or '返回异常' not in mdm or '不判通过' not in mdm:errors.append('metadata cancellation conflict not disclosed')
    idqs=next(m for m in modules if m['code']=='IDQS')
    if any(k.startswith('E048') for k in idqs['evidence']):errors.append('asset evidence incorrectly assigned to intelligent query')
    stats={'modules':len(modules),'crud_objects':len(manifest.get('crudObjects',[])),'samples':len(samples),'requirements':sum(len(m['requirements']) for m in modules),'acceptance_cases':sum(len(m['acceptance']) for m in modules),'pngs_decoded':len(png_files),'errors':len(errors)}
    return errors,stats

if __name__=='__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    parser=argparse.ArgumentParser();parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]/'doc/requirements');args=parser.parse_args()
    errors,stats=validate(args.root.resolve())
    print(json.dumps(stats,ensure_ascii=False))
    for error in errors:print('ERROR '+error)
    raise SystemExit(bool(errors))
