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
DEPLOYMENT_ORIGIN=re.compile(r'https?://'+re.escape('www.'+'audaqueproxy'+'.com')+r':10223',re.I)
PLAIN_FORMAT='<!-- 业务规格格式:plain-v1 -->'

def plain_format(text):
    return PLAIN_FORMAT in text.splitlines()

def unexecuted_row(row,plain=False):
    if plain:
        return row.strip().strip('|').split('|')[-1].strip()=='未执行'
    return '【拟定，未执行】' in row and '【已执行' not in row

def plain_audit_errors(text,folder):
    """A plain business specification must retain a separate investigation boundary."""
    if not plain_format(text):return []
    audit=folder/'核查记录.md'
    if not audit.is_file():return ['plain: linked audit record missing']
    content=audit.read_text(encoding='utf-8')
    errors=[]
    for title in ['核查结论','外部依赖','验证状态']:
        match=re.search(r'^## '+title+r'\s*\n(.*?)(?=^## |\Z)',content,re.M|re.S)
        if not match or not match.group(1).strip():errors.append(f'plain: audit section {title} missing or empty')
    return errors

def deployment_errors(text,label):
    return [f'{label}: deployment origin must be route-only'] if DEPLOYMENT_ORIGIN.search(text) else []

def development_errors(text,module):
    errors=[];code=module['code'];review=module.get('developmentReview',{})
    detail='**开发处理细则**' if plain_format(text) else '**开发处理细则【拟定需求】**'
    ids=[r['id'] for r in module.get('businessRequirements',[])]
    if review.get('status')!='partial-ui-only' or review.get('productionReady') is not False:
        errors.append(f'{code}: partial evidence cannot be production-ready')
    if not review.get('criticalDecisions') or not review.get('objectBoundary'):
        errors.append(f'{code}: development decisions/boundary missing')
    if review.get('expandedOperations')!=ids:
        errors.append(f'{code}: development operation registry mismatch')
    for rid in ids:
        block=re.search(r'^### '+re.escape(rid)+r'\b(.*?)(?=^### |^## |\Z)',text,re.M|re.S)
        if not block or detail not in block.group(1):
            errors.append(f'{rid}: development handling details missing')
    return errors

def ai_errors(text,records,module_codes,common_acceptance=()):
    errors=[];ids=[r['id'] for r in records]
    if REQ.findall(text)!=ids or len(ids)!=len(set(ids)):
        errors.append('AI: scenario registry/unique ID mismatch')
    expected=[]
    labels=['业务目标与入口','授权输入','输出与依据','操作流程','采纳与写入边界','异常与恢复','依赖与待确认']
    for record in records:
        rid=record['id'];expected+=record.get('acceptance',[])
        if record.get('status')!='proposed-unexecuted' or record.get('priority') not in ['P1','P2']:
            errors.append(f'{rid}: proposal status/priority missing')
        if not record.get('modules') or not set(record['modules'])<=module_codes:
            errors.append(f'{rid}: invalid module association')
        block=re.search(r'^### '+re.escape(rid)+r'\b(.*?)(?=^### |^## |\Z)',text,re.M|re.S)
        if not block or '【拟定需求】' not in block.group(1):
            errors.append(f'{rid}: proposal marker missing');continue
        for label in labels:
            if not re.search(r'\*\*'+label+r'\*\*[：:]\S',block.group(1)):
                errors.append(f'{rid}: missing {label}')
        rows=AC.findall(block.group(1))
        if [r.split('|')[1].strip() for r in rows]!=record.get('acceptance',[]):
            errors.append(f'{rid}: acceptance registry mismatch')
        if not rows:errors.append(f'{rid}: no planned acceptance')
        for row in rows:
            refs=re.findall(r'(?<![A-Z-])AI-\d{3}\b',row)
            if refs!=[rid]:errors.append(f'{rid}: invalid acceptance reference')
    rows=AC.findall(text);expected+=list(common_acceptance)
    if [r.split('|')[1].strip() for r in rows]!=expected or len(expected)!=len(set(expected)):
        errors.append('AI: acceptance set/unique ID mismatch')
    if any('【拟定，未执行】' not in row or '【已执行' in row for row in rows):
        errors.append('AI: acceptance must remain unexecuted')
    return errors

def supplement_errors(text,record):
    errors=[];ids=record.get('requirements',[])
    if REQ.findall(text)!=ids or len(ids)!=len(set(ids)):
        errors.append('user menu: supplement requirement registry mismatch')
    rows=AC.findall(text)
    if [r.split('|')[1].strip() for r in rows]!=record.get('acceptance',[]):
        errors.append('user menu: supplement acceptance registry mismatch')
    for n in range(1,9):
        if not re.search(rf'^## {n}\. ',text,re.M):errors.append(f'user menu: missing section {n}')
    if '【页面观察】' not in text or '目标页' not in text or '待确认' not in text:
        errors.append('user menu: evidence boundary missing')
    for row in rows:
        refs=re.findall(r'(?<![A-Z-])UAC-\d{3}\b',row)
        if len(refs)!=1 or refs[0] not in ids:errors.append('user menu: invalid acceptance reference')
        if '【拟定，未执行】' not in row or '【已执行' in row:
            errors.append('user menu: acceptance must remain unexecuted')
    return errors

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
        if plain_format(text) and not unexecuted_row(row,True):
            errors.append(f'{path.name}: plain acceptance must remain unexecuted; execution status invalid')
        elif not plain_format(text) and '已执行' not in row and '【拟定，未执行】' not in row:
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

def archive_errors(path,module):
    if not path.is_file():
        return [f'{module["code"]}: research archive missing']
    if hashlib.sha256(path.read_bytes()).hexdigest()!=module.get('researchSha256'):
        return [f'{module["code"]}: research archive hash mismatch']
    return []

def module_section(text,number):
    """Read an exact level-two section, excluding similarly numbered nested specs."""
    match=re.search(r'^## '+str(number)+r'\. [^\n]*\n(.*?)(?=^## |\Z)',text,re.M|re.S)
    return match.group(1) if match else ''

def business_errors(text,module,research,data):
    """Validate readable drafts separately from historical observation records."""
    errors=[];code=module['code'];registry=module.get('businessRequirements',[])
    plain=plain_format(text)
    if plain:
        if './核查记录.md' not in LINK.findall(text):errors.append(f'{code}: plain business audit link missing')
        prose=LINK.sub(lambda m:m.group(0).split('](')[0]+']',text)
        if re.search(r'【|】|待确认|拟定需求|本轮|源码|历史DOM',prose):
            errors.append(f'{code}: plain business specification contains research labels')
    ids=[x['id'] for x in registry]
    for n in range(1,9):
        if not re.search(rf'^## {n}\. ',text,re.M):errors.append(f'{code}: business section {n} missing')
    if REQ.findall(text)!=ids:errors.append(f'{code}: business requirement registry mismatch')
    cases=AC.findall(text)
    if [r.split('|')[1].strip() for r in cases]!=module.get('businessAcceptance',[]):
        errors.append(f'{code}: business acceptance registry mismatch')
    for row in cases:
        if not unexecuted_row(row,plain):
            errors.append(f'{code}: business acceptance must remain unexecuted')
        refs=re.findall(r'(?<![A-Z-])[A-Z]+-\d{3}\b',row)
        if not refs or any(ref not in ids for ref in refs):
            errors.append(f'{code}: invalid business acceptance reference')
    source_section=module_section(text,8)
    for req in registry:
        rid=req['id']
        match=re.search(r'^### '+re.escape(rid)+r'\b(.*?)(?=^### |^## |\Z)',text,re.M|re.S)
        if not match:continue
        block=match.group(1)
        if not re.search(r'\*\*业务目的\*\*[：:]\S',block):
            errors.append(f'{rid}: business purpose missing')
        steps=re.findall(r'^\d+\.([^\n]*)',block,re.M)
        if not steps or any(not step.strip() for step in steps):
            errors.append(f'{rid}: missing or empty step')
        result_label='**结果与异常处理**' if plain else '结果与异常处理【拟定需求】'
        if '**操作与规则**' not in block or result_label not in block:
            errors.append(f'{rid}: business behavior structure incomplete')
        row=next((line for line in source_section.splitlines() if line.startswith('| '+rid+' |')),'')
        if not req.get('evidence'):errors.append(f'{rid}: missing business source')
        for key in req.get('evidence',[]):
            if key not in data or f'{key}.png' not in row:
                errors.append(f'{rid}: missing business source {key}')
            elif data[key].get('quality',{}).get('targetValid') is False:
                errors.append(f'{rid}: invalid business source {key}')
    historical=set(re.findall(r'^### ([A-Z]+-\d{3}) .+ — (?:查询与列表|详情|新增|编辑|删除确认)$',research,re.M))
    pending_section=module_section(text,7)
    pending=set(re.findall(r'^\| ([A-Z]+-\d{3}) \|',pending_section,re.M))
    if historical!=((set(ids)&historical)|pending) or (set(ids)&pending):
        errors.append(f'{code}: business operation coverage mismatch')
    by_id={req['id']:req for req in registry}
    for row in text.splitlines():
        if not row.startswith('|') or '当前输入' not in row:continue
        cells=[c.strip() for c in row.strip().strip('|').split('|')]
        if len(cells)!=5:continue
        req=by_id.get(cells[-1],{})
        controls=[c for key in req.get('evidence',[]) for c in
                  (data.get(key,{}).get('controls',[])+data.get(key,{}).get('elements',{}).get('fields',[]))]
        for limit,value in re.findall(r'当前输入(上限|下限)(\d+)字符',row):
            key='maxlength' if limit=='上限' else 'minlength'
            normalize=lambda s:re.sub(r'^(请输入|请选择)','',s or '').strip('：: ')
            if not any(str(c.get(key))==value and normalize(cells[0]) in
                       [normalize(c.get('label')),normalize(c.get('placeholder'))] for c in controls):
                errors.append(f'{code}: unsupported business constraint for {cells[0]}')
    return errors

def live_recheck_errors(root,record):
    """Check the independent live registry without rewriting historical evidence."""
    errors=[]
    path=root/record['manifest']
    if not path.is_file():return ['live: manifest missing']
    live=json.loads(path.read_text(encoding='utf-8'))
    if live.get('businessWritesExecuted') is not False or live.get('readOnly') is not True:
        errors.append('live: business write boundary missing')
    ids=[s['id'] for s in live.get('samples',[])]
    if len(ids)!=len(set(ids)):errors.append('live: duplicate sample id')
    samples={}
    for s in live.get('samples',[]):
        meta=root/s['metadata'];png=root/s['image']
        if not meta.is_file() or not png.is_file():
            errors.append(f'{s["id"]}: live evidence pair missing');continue
        d=json.loads(meta.read_text(encoding='utf-8'));samples[s['id']]=d
        if d.get('id')!=s['id'] or d.get('time')!=s['time'] or d.get('url')!=s['url']:
            errors.append(f'{s["id"]}: live registry mismatch')
        if not s['url'].startswith('/') or s['url'].startswith('//'):
            errors.append(f'{s["id"]}: live route must be relative to application')
        if not s.get('targetValid') and not s.get('limitation'):
            errors.append(f'{s["id"]}: invalid target reason missing')
        if any('value' in c for c in d.get('controls',[])):
            errors.append(f'{s["id"]}: live controls must not store input values')
        if d.get('operation',{}).get('businessWriteExecuted'):
            errors.append(f'{s["id"]}: live business write exceeds scope')
        try:png_check(png)
        except Exception as exc:errors.append(f'{s["id"]}: {exc}')
    registered=set(ids)
    actual={p.stem for p in path.parent.glob('*.png')}
    if registered!=actual:errors.append('live: screenshot set differs from registry; regenerate index')
    seen=set()
    for module in record.get('documents',[]):
        doc=root/module['file']
        if not doc.is_file():errors.append('live: document missing');continue
        text=doc.read_text(encoding='utf-8')
        requirements=REQ.findall(text)
        if requirements!=[r['id'] for r in module['requirements']]:
            errors.append(f'{module["code"]}: live requirement registry mismatch')
        for n in range(1,9):
            if not re.search(rf'^## {n}\. ',text,re.M):errors.append(f'{module["code"]}: section {n} missing')
        for req in module['requirements']:
            if req['id'] in seen:errors.append('live: duplicate requirement across documents')
            seen.add(req['id'])
            if not req.get('evidence') or not set(req['evidence'])<=registered:
                errors.append(f'{req["id"]}: live evidence missing')
            for sid in req.get('evidence',[]):
                sample=next((s for s in live['samples'] if s['id']==sid),{})
                if sample.get('targetValid') is False:errors.append(f'{req["id"]}: invalid target cited')
                block=re.search(r'^### '+re.escape(req['id'])+r'\b(.*?)(?=^### |^## |\Z)',text,re.M|re.S)
                if not block or sid+'.png' not in block.group(1):
                    errors.append(f'{req["id"]}: evidence not linked in requirement')
        for row in AC.findall(text):
            if not unexecuted_row(row,plain_format(text)):
                errors.append(f'{module["code"]}: business acceptance execution overclaim')
            refs=re.findall(r'(?<![A-Z-])[A-Z]+-\d{3}\b',row)
            if len(refs)!=1 or refs[0] not in requirements:
                errors.append(f'{module["code"]}: acceptance reference mismatch')
    return errors

def validate(root):
    errors=[];stats={}
    manifest=json.loads((root/'采样清单.json').read_text(encoding='utf-8'))
    if manifest.get('liveRecheck'):errors+=live_recheck_errors(root,manifest['liveRecheck'])
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
    all_ids=[];business_ids=[]
    for m in modules:
        folder=root/m['directory']
        path=folder/m.get('researchFile','需求说明.md')
        text=path.read_text(encoding='utf-8')
        if m.get('researchFile'):
            errors+=archive_errors(path,m)
            business=(folder/'需求说明.md').read_text(encoding='utf-8')
            errors+=business_errors(business,m,text,data)
            errors+=development_errors(business,m)
            errors+=plain_audit_errors(business,folder)
            business_ids+=REQ.findall(business)+[r.split('|')[1].strip() for r in AC.findall(business)]
        for n in range(1,9):
            if not re.search(rf'^## {n}\. ',text,re.M):errors.append(f'{m["code"]}: missing section {n}')
        actual_req=REQ.findall(text);expected_req=[a['id'] for a in m['requirements']]
        actual_ac=[r.split('|')[1].strip() for r in AC.findall(text)]
        if actual_req!=expected_req:errors.append(f'{m["code"]}: requirement registry mismatch')
        if actual_ac!=[a['id'] for a in m['acceptance']]:errors.append(f'{m["code"]}: acceptance registry mismatch')
        all_ids+=actual_req+actual_ac
        for req in m['requirements']:
            match=re.search(r'^### '+re.escape(req['id'])+r'\b(.*?)(?=^### |^## |\Z)',text,re.M|re.S)
            if not match:continue
            block=match.group(1)
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
    if len(business_ids)!=len(set(business_ids)):errors.append('business IDs overlap across modules')
    ai_path=root/'AI能力规划.md'
    ai_records=manifest.get('aiCapabilities',[])
    if not ai_path.is_file() or len(ai_records)!=10:errors.append('AI: expected 10 proposed scenarios')
    else:errors+=ai_errors(ai_path.read_text(encoding='utf-8'),ai_records,set(codes),manifest.get('aiCommonAcceptance',[]))
    supplements=manifest.get('businessSupplements',[])
    for record in supplements:
        supplement=root/record['file']
        if not supplement.is_file():errors.append('supplement document missing');continue
        errors+=supplement_errors(supplement.read_text(encoding='utf-8'),record)
    user_sources=manifest.get('userSuppliedEvidence',[])
    for record in user_sources:
        path=root/record['image']
        if not path.is_file():errors.append(f'{record["id"]}: user image missing');continue
        try:png_check(path)
        except Exception as exc:errors.append(f'{record["id"]}: {exc}')
        if hashlib.sha256(path.read_bytes()).hexdigest()!=record.get('sha256'):
            errors.append(f'{record["id"]}: user image hash mismatch')
        meta=root/record['metadata']
        if not meta.is_file():errors.append(f'{record["id"]}: user image metadata missing');continue
        captured=json.loads(meta.read_text(encoding='utf-8'))
        if captured.get('sourceType')!='user-supplied-screenshot' or captured.get('capturedAt') is not None:
            errors.append(f'{record["id"]}: user image source/time misclassified')
        if captured.get('targetPagesObserved') is not False or len(captured.get('visibleMenuItems',[]))!=5:
            errors.append(f'{record["id"]}: menu/target observation mismatch')
        if record['image'] not in index or record['metadata'] not in index:
            errors.append(f'{record["id"]}: user image index missing')
    if len(supplements)!=1 or len(user_sources)!=1:errors.append('user menu supplement/evidence registration missing')
    for path in root.rglob('*'):
        if not path.is_file() or path.suffix not in ['.md','.json','.py']:continue
        text=path.read_text(encoding='utf-8')
        errors+=secret_errors(text,str(path.relative_to(root)))
        errors+=deployment_errors(text,str(path.relative_to(root)))
        if any(p in text for p in PLACEHOLDERS):errors.append(f'{path.name}: leftover business replacement placeholder')
        if path.suffix=='.md':errors+=markdown_errors(text,path,root)
    for short in ['E001','E003','E025','E026','E041','E056','E078','E090','E103']:
        status=next(s['status'] for s in samples if s['id'].startswith(short+'-'))
        if status=='有效：页面采样':errors.append(f'{short}: known limitation not classified')
    mdm_mod=next(m for m in modules if m['code']=='MDM')
    mdm=(root/mdm_mod['directory']/mdm_mod.get('researchFile','需求说明.md')).read_text(encoding='utf-8')
    if 'E103' not in mdm or '返回异常' not in mdm or '不判通过' not in mdm:errors.append('metadata cancellation conflict not disclosed')
    idqs=next(m for m in modules if m['code']=='IDQS')
    if any(k.startswith('E048') for k in idqs['evidence']):errors.append('asset evidence incorrectly assigned to intelligent query')
    stats={'modules':len(modules),'crud_objects':len(manifest.get('crudObjects',[])),'samples':len(samples),'requirements':sum(len(m['requirements']) for m in modules),'acceptance_cases':sum(len(m['acceptance']) for m in modules),'business_requirements':sum(len(m.get('businessRequirements',[])) for m in modules),'business_acceptance_cases':sum(len(m.get('businessAcceptance',[])) for m in modules),'research_archives':sum(bool(m.get('researchFile')) for m in modules),'pngs_decoded':len(png_files),'errors':len(errors)}
    stats.update({'development_reviews':sum(bool(m.get('developmentReview')) for m in modules),
                  'production_ready_modules':sum(m.get('developmentReview',{}).get('productionReady') is True for m in modules),
                  'ai_scenarios':len(ai_records),
                  'ai_acceptance_cases':sum(len(r.get('acceptance',[])) for r in ai_records)+len(manifest.get('aiCommonAcceptance',[])),
                  'supplement_requirements':sum(len(r.get('requirements',[])) for r in supplements),
                  'supplement_acceptance_cases':sum(len(r.get('acceptance',[])) for r in supplements),
                  'user_supplied_images':len(user_sources)})
    if manifest.get('liveRecheck'):
        live=json.loads((root/manifest['liveRecheck']['manifest']).read_text(encoding='utf-8'))
        documents=manifest['liveRecheck'].get('documents',[])
        stats.update({'live_samples':len(live.get('samples',[])),
                      'live_invalid_targets':sum(s.get('targetValid') is False for s in live.get('samples',[])),
                      'live_documents':len(documents),
                      'live_requirements':sum(len(d['requirements']) for d in documents),
                      'live_acceptance_cases':sum(len(AC.findall((root/d['file']).read_text(encoding='utf-8'))) for d in documents)})
    return errors,stats

if __name__=='__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    parser=argparse.ArgumentParser();parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]/'doc/requirements');args=parser.parse_args()
    errors,stats=validate(args.root.resolve())
    print(json.dumps(stats,ensure_ascii=False))
    for error in errors:print('ERROR '+error)
    raise SystemExit(bool(errors))
