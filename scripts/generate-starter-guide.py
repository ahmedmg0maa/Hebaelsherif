"""Rebuild the original Arabic workbook. Needs reportlab, arabic-reshaper, python-bidi.
Fonts are supplied by the local OS; no dependencies are added to the web runtime.
"""
import json, os, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
private_packages = ROOT / '.launch-tools' / 'pdf-python'
if private_packages.exists(): sys.path.insert(0, str(private_packages))
import arabic_reshaper
from bidi.algorithm import get_display
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4

data = json.loads((ROOT / 'content/starter/learning.json').read_text(encoding='utf-8'))
font = os.environ.get('HEBA_GUIDE_FONT', 'C:/Windows/Fonts/tahoma.ttf')
pdfmetrics.registerFont(TTFont('Arabic', font))
out = ROOT / 'output/pdf/quiet-first-step.pdf'
out.parent.mkdir(parents=True, exist_ok=True)
c = canvas.Canvas(str(out), pagesize=A4)
c.setTitle(data['book']['title']); c.setAuthor(data['author'])
W,H=A4
def shape(t): return get_display(arabic_reshaper.reshape(t))
def text(t,y,size=12,color='#24545A'):
    c.setFillColor(HexColor(color)); c.setFont('Arabic',size); c.drawRightString(W-55,y,shape(t))
def paragraph(t,y):
    words=t.split(); line=''
    for word in words:
        proposed=(line+' '+word).strip()
        if pdfmetrics.stringWidth(shape(proposed),'Arabic',12)>W-110:
            text(line,y); y-=23; line=word
        else: line=proposed
    if line: text(line,y);y-=23
    return y-15
for i,p in enumerate(data['book']['pages']):
    c.setFillColor(HexColor('#FAF6ED'));c.rect(0,0,W,H,fill=1,stroke=0)
    c.setStrokeColor(HexColor('#B88D52')); c.setLineWidth(.8)
    c.roundRect(25,25,W-50,H-50,20,fill=0,stroke=1)
    c.setStrokeColor(HexColor('#E8E0CF'));c.arc(-110,H-290,240,H+90,0,300)
    text('منصة هبة الشريف  |  دليل مجاني',H-64,10,'#876338')
    text(p['title'],H-118,24);text(p['subtitle'],H-150,12,'#876338')
    y=H-205
    for para in p['paragraphs']: y=paragraph(para,y)
    y-=5; text('مساحتك للكتابة',y,14); y-=30
    y=paragraph(p['prompt'],y)
    c.setStrokeColor(HexColor('#D4CABB')); c.setLineWidth(.5)
    for _ in range(p['lines']):
        if y<100: raise ValueError('Page overflow')
        c.line(55,y,W-55,y);y-=29
    text('إعداد فريق المنصة  •  hebaelsherif.com',62,9,'#876338')
    c.setFont('Arabic',10);c.drawString(55,62,str(i+1));c.showPage()
c.save()
print('Created 6-page Arabic workbook; no customer data.')
