import pathlib
import re
import urllib.parse
import urllib.request

root = pathlib.Path(__file__).resolve().parent.parent
source = '\n'.join((root / p).read_text() for p in ['src/i18n.ts', 'src/localization.ts', 'src/languages.ts'])
text = ''.join(sorted(set(source)))
for region in ['JP', 'SC', 'TC', 'KR']:
    query = urllib.parse.urlencode({'family': f'Noto Serif {region}:wght@400', 'text': text})
    request = urllib.request.Request('https://fonts.googleapis.com/css2?' + query, headers={'User-Agent': 'Mozilla/5.0'})
    css = urllib.request.urlopen(request).read().decode()
    url = re.search(r'url\(([^)]+)\)', css)[1]
    data = urllib.request.urlopen(url).read()
    assert data[:4] in [b"\x00\x01\x00\x00", b"OTTO"], "Expected an OpenType font"
    path = root / f'public/assets/fonts/noto-serif-{region.lower()}.ttf'
    path.write_bytes(data)
    print(region, len(data), data[:4])
    license_url = f'https://raw.githubusercontent.com/google/fonts/main/ofl/notoserif{region.lower()}/OFL.txt'
    (root / f'public/assets/fonts/OFL-{region}.txt').write_bytes(urllib.request.urlopen(license_url).read())
