from pathlib import Path
import requests, json, io
from PIL import Image
root=Path(__file__).resolve().parent.parent
out=root/'public'/'photos'; out.mkdir(parents=True,exist_ok=True)
items={'harvest':'Paddy Harvest 01.jpg','field':'A Farmer walking in paddy field.jpg','leaf':'Leafs of rice plant.jpg','village':'Farmers life in Bangladesh.jpg'}
credits=json.loads((out/'credits.json').read_text(encoding='utf-8')) if (out/'credits.json').exists() else []
session=requests.Session(); session.headers['User-Agent']='AgriPilotBD-Demo/1.0 (educational prototype)'
for name,title in items.items():
    if (out/(name+'.webp')).exists():
        continue
    r=session.get('https://commons.wikimedia.org/w/api.php',params={'action':'query','titles':'File:'+title,'prop':'imageinfo','iiprop':'url|extmetadata','format':'json'},timeout=35); r.raise_for_status()
    data=next(iter(r.json()['query']['pages'].values()))['imageinfo'][0]
    response=session.get(data['url'],timeout=60); response.raise_for_status()
    im=Image.open(io.BytesIO(response.content)).convert('RGB'); im.thumbnail((1920,1920)); im.save(out/(name+'.webp'),'WEBP',quality=83)
    meta=data['extmetadata']; credits.append({'file':name+'.webp','title':title,'source':data['descriptionurl'],'artist':meta.get('Artist',{}).get('value','Wikimedia contributor'),'license':meta.get('LicenseShortName',{}).get('value',''),'licenseUrl':meta.get('LicenseUrl',{}).get('value',''),'modifications':'Resized and converted to WebP; displayed with CSS crop. Original image is not retouched.'})
    (out/'credits.json').write_text(json.dumps(credits,ensure_ascii=False,indent=2),encoding='utf-8')
    print(name,im.size,flush=True)
