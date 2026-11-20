from pathlib import Path
import json,html,re
folder=Path(__file__).resolve().parent.parent/'public'/'photos'
items=json.loads((folder/'credits.json').read_text(encoding='utf-8'))
def esc(x):return html.escape(str(x),quote=True)
content=''
for x in items:
    author=re.sub('<[^>]+>','',x['artist'])
    content+=f'<article><img src="{esc(x["file"])}" alt="{esc(x["title"])}"><div><h2>{esc(x["title"])}</h2><p>By {esc(author)}</p><p><a href="{esc(x["source"])}">Original image and author details</a> · <a href="{esc(x["licenseUrl"])}">{esc(x["license"])}</a></p><p>{esc(x["modifications"])}</p></div></article>'
page='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Photography credits · AgriPilot BD</title><style>body{margin:40px auto;max-width:850px;padding:0 24px;background:#f7f8f2;color:#103c30;font:16px/1.7 system-ui}article{display:flex;gap:25px;margin:35px 0;padding-top:25px;border-top:1px solid #dce4d5}img{width:180px;height:150px;object-fit:cover;border-radius:12px}h2{font-size:18px}p{font-size:14px}a{color:#397d5c} @media(max-width:600px){article{display:block}img{width:100%;height:220px}}</style></head><body><a href="/">← AgriPilot BD</a><h1>Photography credits</h1><p>Real photographs from Bangladesh, shared by Wikimedia Commons contributors. Copyright remains with their respective authors. Follow each license link for reuse terms.</p>'''+content+'</body></html>'
(folder/'credits.html').write_text(page,encoding='utf-8')
